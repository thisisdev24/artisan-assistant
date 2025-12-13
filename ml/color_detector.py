# ml/color_detector.py
"""
Robust color extraction pipeline.
Tries rembg,
and finally a naive no-mask approach.

Returns: list of dicts: { hex: "#rrggbb", percentage: 0.35, name: "blue", source_image: "<url>" }
"""
import io
import os
import math
import requests
from typing import List, Dict, Optional, Tuple
from PIL import Image, ImageStat
import numpy as np
from sklearn.cluster import KMeans

# Optional dependencies
try:
    import torch
    TORCH_AVAILABLE = True
except Exception:
    TORCH_AVAILABLE = False

# rembg fallback
REMBG_AVAILABLE = False
try:
    from rembg import remove as rembg_remove
    REMBG_AVAILABLE = True
except Exception:
    REMBG_AVAILABLE = False

# Helper: download image bytes (timeout and safe)
def download_image(url: str, timeout: int = 10) -> Optional[bytes]:
    try:
        r = requests.get(url, timeout=timeout, headers={"User-Agent": "artisan-assistant/1.0"})
        r.raise_for_status()
        return r.content
    except Exception:
        return None

# Helper: open image into RGBA PIL image
def pil_from_bytes(b: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(b)).convert("RGBA")
    return img

# rembg based alpha mask
def mask_with_rembg(pil_img: Image.Image) -> Optional[np.ndarray]:
    if not REMBG_AVAILABLE:
        return None
    try:
        # rembg returns RGBA bytes with transparent background where foreground remains
        input_bytes = io.BytesIO()
        pil_img.convert("RGBA").save(input_bytes, format="PNG")
        out_bytes = rembg_remove(input_bytes.getvalue())
        out_img = Image.open(io.BytesIO(out_bytes)).convert("RGBA")
        alpha = np.array(out_img.split()[-1])  # alpha channel
        # consider pixels with alpha > 10 as foreground
        return (alpha > 10).astype(np.uint8)
    except Exception:
        return None

# Final fallback: simple non-white non-near-transparent threshold
def naive_mask(pil_img: Image.Image) -> np.ndarray:
    rgba = np.array(pil_img)
    alpha = rgba[..., 3]
    rgb = rgba[..., :3].astype(int)
    # mask where alpha large and not very near-white (helps ignore paper)
    luminance = rgb.mean(axis=2)
    mask = (alpha > 30) & (luminance < 245)
    return mask.astype(np.uint8)

# Convert rgb -> lab might help clustering; we use simple rgb clustering but convert to float32
def extract_colors_from_pixels(pixels: np.ndarray, n_colors: int = 3) -> List[Tuple[Tuple[int,int,int], float]]:
    """
    pixels: Nx3 uint8
    return list of (rgb_tuple, fraction)
    """
    if len(pixels) == 0:
        return []
    # KMeans in RGB space (fast and adequate). Convert to float.
    X = pixels.astype(float) / 255.0
    n_clusters = min(n_colors, len(pixels))
    try:
        km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        km.fit(X)
        centers = (km.cluster_centers_ * 255).astype(int)
        labels = km.labels_
        counts = np.bincount(labels, minlength=n_clusters)
        total = counts.sum()
        results = []
        for c, cnt in zip(centers, counts):
            r, g, b = int(c[0]), int(c[1]), int(c[2])
            frac = float(cnt) / float(total)
            results.append(((r,g,b), frac))
        # sort by frac desc
        results.sort(key=lambda x: x[1], reverse=True)
        return results
    except Exception:
        # fallback to sampling median color
        med = np.median(pixels, axis=0).astype(int)
        return [((int(med[0]), int(med[1]), int(med[2])), 1.0)]

def rgb_to_hex(rgb: Tuple[int,int,int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)

# Map color to closest CSS3 name using webcolors if available; else return None
# Robust color name mapping using webcolors when available.

# Try to use skimage for Lab conversion (recommended). Fall back to simple RGB if unavailable.
_SKIMAGE_AVAILABLE = False
try:
    from skimage.color import rgb2lab
    import numpy as np
    _SKIMAGE_AVAILABLE = True
except Exception:
    _SKIMAGE_AVAILABLE = False

# Build HEX_TO_NAMES palette robustly (prefer webcolors if present).
try:
    import webcolors
    # prefer CSS3 palette if available
    names_to_hex = getattr(webcolors, "CSS3_NAMES_TO_HEX", None)
    if not names_to_hex:
        # older/newer webcolors may expose different maps; try CSS3_HEX_TO_NAMES -> reverse
        if hasattr(webcolors, "CSS3_HEX_TO_NAMES"):
            # reverse map
            names_to_hex = {v: k for k, v in webcolors.CSS3_HEX_TO_NAMES.items()}
        else:
            # fallback to webcolors' generic dict (if exists)
            names_to_hex = {}
    # names_to_hex maps name -> hex (e.g., 'red' -> '#ff0000')
    if isinstance(names_to_hex, dict) and len(names_to_hex) > 0:
        HEX_TO_NAMES: Dict[str, str] = {v.lower(): k for k, v in names_to_hex.items()}
    else:
        HEX_TO_NAMES = {}
except Exception:
    HEX_TO_NAMES = {}

# Fallback small palette if webcolors not available or empty
if not HEX_TO_NAMES:
    # a compact but useful palette of common colour names (hex lowercased)
    _FALLBACK_PALETTE = {
        "#000000": "black",
        "#ffffff": "white",
        "#808080": "gray",
        "#c0c0c0": "silver",
        "#800000": "maroon",
        "#ff0000": "red",
        "#800080": "purple",
        "#ffa500": "orange",
        "#ffff00": "yellow",
        "#008000": "green",
        "#00ff00": "lime",
        "#008080": "teal",
        "#000080": "navy",
        "#0000ff": "blue",
        "#00ffff": "cyan",
        "#ffc0cb": "pink",
        "#a52a2a": "brown",
        "#f5deb3": "wheat",
        "#2f4f4f": "darkslategray",
        "#b8860b": "darkgoldenrod",
    }
    HEX_TO_NAMES = {k: v for k, v in _FALLBACK_PALETTE.items()}

    # Helper: hex -> RGB tuple (0-255)
def _hex_to_rgb_tuple(hex_color: str) -> Tuple[int,int,int]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = ''.join([c*2 for c in h])
    return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16))

# Precompute palette arrays for fast nearest lookup
_PALETTE_HEX: List[str] = list(HEX_TO_NAMES.keys())
_PALETTE_NAMES: List[str] = [HEX_TO_NAMES[h] for h in _PALETTE_HEX]

if _SKIMAGE_AVAILABLE:
    # build Nx3 Lab array from palette RGB (values 0-1 -> rgb2lab expects float in [0,1])
    import numpy as np
    palette_rgb = np.array([_hex_to_rgb_tuple(h) for h in _PALETTE_HEX], dtype=float) / 255.0
    try:
        PALETTE_LAB = rgb2lab(palette_rgb.reshape(-1,1,3)).reshape(-1,3)  # shape (N,3)
    except Exception:
        # fallback to manual conversion if rgb2lab fails
        PALETTE_LAB = None
else:
    PALETTE_LAB = None

def _rgb_tuple_to_lab(rgb: Tuple[int,int,int]) -> Tuple[float,float,float]:
    """Convert 0-255 RGB tuple to Lab using skimage if available, else approximate by scaling."""
    if _SKIMAGE_AVAILABLE and PALETTE_LAB is not None:
        import numpy as np
        arr = np.array(rgb, dtype=float) / 255.0
        lab = rgb2lab(arr.reshape(1,1,3)).reshape(3,)
        return float(lab[0]), float(lab[1]), float(lab[2])
    else:
        # fallback: approximate Lab by simple transform (less accurate). Still deterministic.
        r, g, b = rgb
        # convert to linearized sRGB
        def _to_lin(c):
            c = c / 255.0
            return (c/12.92) if c <= 0.04045 else pow((c+0.055)/1.055, 2.4)
        R, G, B = _to_lin(r), _to_lin(g), _to_lin(b)
        # convert to XYZ
        X = 0.4124564*R + 0.3575761*G + 0.1804375*B
        Y = 0.2126729*R + 0.7151522*G + 0.0721750*B
        Z = 0.0193339*R + 0.1191920*G + 0.9503041*B
        # reference white D65
        Xn, Yn, Zn = 0.95047, 1.00000, 1.08883
        def f(t):
            return pow(t, 1/3) if t > 0.008856 else (7.787 * t + 16/116)
        L = 116 * f(Y/Yn) - 16
        a = 500 * (f(X/Xn) - f(Y/Yn))
        b = 200 * (f(Y/Yn) - f(Z/Zn))
        return L, a, b

def nearest_color_name(hex_color: str) -> str:
    """
    Returns the perceptually nearest color name (guaranteed non-empty).
    Uses CIE76 (Euclidean in Lab) if skimage available, else a deterministic fallback.
    """
    try:
        h = hex_color.lower()
        if not h.startswith("#"):
            h = "#" + h
        # exact match
        if h in HEX_TO_NAMES:
            return HEX_TO_NAMES[h]
        # compute Lab for input
        rgb = _hex_to_rgb_tuple(h)
        lab = _rgb_tuple_to_lab(rgb)
        # if we have precomputed palette Lab, compute distances vectorized
        best_idx = None
        best_dist = None
        if PALETTE_LAB is not None:
            # numpy vectorized distance (fast)
            import numpy as np
            arr_lab = PALETTE_LAB  # shape (N,3)
            dists = np.sqrt(np.sum((arr_lab - np.array(lab).reshape(1,3))**2, axis=1))
            idx = int(np.argmin(dists))
            best_idx = idx
            best_dist = float(dists[idx])
        else:
            # fallback loop over palette using Lab computed per-entry
            for idx, ph in enumerate(_PALETTE_HEX):
                prgb = _hex_to_rgb_tuple(ph)
                plab = _rgb_tuple_to_lab(prgb)
                dist = (lab[0]-plab[0])**2 + (lab[1]-plab[1])**2 + (lab[2]-plab[2])**2
                if best_idx is None or dist < best_dist:
                    best_idx = idx
                    best_dist = dist
            if best_dist is not None:
                best_dist = math.sqrt(best_dist)
        # fallback if nothing found
        if best_idx is None:
            # return first palette name as ultimate fallback
            return _PALETTE_NAMES[0]
        return _PALETTE_NAMES[best_idx]
    except Exception:
        # ultimate safe fallback
        try:
            # try webcolors' hex_to_name if available
            import webcolors as _wc
            return _wc.hex_to_name(hex_color)
        except Exception:
            return _PALETTE_NAMES[0]

def process_image_url(url: str, top_k: int, device: str) -> List[Dict]:
    """Process single image URL into list of colors with percentages."""
    data = download_image(url)
    if not data:
        return []
    pil = pil_from_bytes(data)

    mask = None

    # rembg
    if REMBG_AVAILABLE:
        try:
            mask = mask_with_rembg(pil)
        except Exception:
            mask = None

    if mask is None:
        mask = naive_mask(pil)

    # extract masked pixels
    arr = np.array(pil.convert("RGB"))
    h,w,_ = arr.shape
    mask_bool = mask.astype(bool)
    if mask_bool.sum() == 0:
        # fallback: use all pixels
        pixels = arr.reshape(-1,3)
    else:
        pixels = arr[mask_bool].reshape(-1,3)

    # downsample for speed if huge
    if len(pixels) > 20000:
        idx = np.random.choice(len(pixels), 20000, replace=False)
        pixels = pixels[idx]

    clusters = extract_colors_from_pixels(pixels, n_colors=top_k)
    out = []
    for rgb, frac in clusters:
        hexc = rgb_to_hex(rgb)
        name = nearest_color_name(hexc)
        out.append({
            "hex": hexc,
            "percentage": round(float(frac), 4),
            "name": name,
            "source_image": url
        })
    return out

def aggregate_images(urls: List[str], top_k_per_image: int = 3, device: str = "cpu") -> List[Dict]:
    """Process multiple images, merge and sort by global percentage."""
    acc = {}  # hex -> total frac (averaged across images weighted by image area)
    meta_for_hex = {}  # sample source
    for url in urls:
        try:
            colors = process_image_url(url, top_k=top_k_per_image, device=device)
        except Exception:
            colors = []
        # weight each image equally (optionally weight by image size)
        for c in colors:
            hexc = c["hex"].lower()
            frac = c.get("percentage", 0.0)
            acc[hexc] = acc.get(hexc, 0.0) + frac
            if hexc not in meta_for_hex:
                meta_for_hex[hexc] = {"name": c.get("name"), "source_image": c.get("source_image")}
    # normalize totals
    total = sum(acc.values()) or 1.0
    out = []
    for hexc, tot in acc.items():
        entry = {"hex": hexc, "percentage": round(float(tot) / float(total), 4)}
        entry.update(meta_for_hex.get(hexc, {}))
        out.append(entry)
    out.sort(key=lambda x: x["percentage"], reverse=True)
    return out
