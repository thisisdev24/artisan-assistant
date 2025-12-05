# ml/color_detector.py
"""
Robust color extraction pipeline.
Tries SAM (if installed + GPU) for foreground masks, falls back to rembg,
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

# segment-anything is optional (SAM)
SAM_AVAILABLE = False
try:
    # package name may differ; we try the one generally used in python repos
    import segment_anything as sam
    SAM_AVAILABLE = True
except Exception:
    SAM_AVAILABLE = False

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

# Helper: get mask from SAM if available
def mask_with_sam(pil_img: Image.Image, device: str = "cpu") -> Optional[np.ndarray]:
    if not SAM_AVAILABLE or not TORCH_AVAILABLE:
        return None
    try:
        # Minimal dynamic import usage to avoid hard dependency at install time
        from segment_anything import SamAutomaticMaskGenerator, sam_model_registry

        # Paths
        self.ml_data_dir = "data"
        os.makedirs(self.ml_data_dir, exist_ok=True)

        # choose a default model; if user has custom weights they can set env var SAM_WEIGHTS
        self.weight_path = os.path.join(self.ml_data_dir, "sam_vit_l_0b3195.pth")
        sam_weights = os.environ.get(self.weight_path)
        # choose model name consistent with segment-anything wrapper
        model_type = os.environ.get("SAM_MODEL_TYPE", "vit_l")  # vit_h is heavy (GPU preferred)
        # load model - this will be skipped if not present or no GPU
        if sam_weights:
            sam_model = sam_model_registry[model_type](checkpoint=sam_weights)
        else:
            # attempt to use registry w/o checkpoint (may fail)
            sam_model = sam_model_registry[model_type](checkpoint=None)
        if device == "cuda" and torch.cuda.is_available():
            sam_model.to(device)
        mask_gen = SamAutomaticMaskGenerator(sam_model)
        # convert PIL->numpy RGB
        arr = np.array(pil_img.convert("RGB"))
        masks = mask_gen.generate(arr)
        if not masks:
            return None
        # pick the largest mask by area
        largest = max(masks, key=lambda m: m["area"])
        mask = largest["segmentation"].astype(np.uint8)  # boolean mask
        return mask
    except Exception:
        return None

# Helper: rembg based alpha mask
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
try:
    import webcolors

    # webcolors exposes different maps depending on version. Build a hex->name map robustly.
    if hasattr(webcolors, "CSS3_HEX_TO_NAMES") and isinstance(webcolors.CSS3_HEX_TO_NAMES, dict):
        HEX_TO_NAMES = {k.lower(): v for k, v in webcolors.CSS3_HEX_TO_NAMES.items()}
    else:
        # reverse CSS3_NAMES_TO_HEX into hex -> name
        names_to_hex = getattr(webcolors, "CSS3_NAMES_TO_HEX", {})
        HEX_TO_NAMES = {v.lower(): k for k, v in names_to_hex.items()}

    def nearest_color_name(hex_color):
        try:
            h = hex_color.lower()
            # exact match first
            if h in HEX_TO_NAMES:
                return HEX_TO_NAMES[h]
            # compute nearest by Euclidean distance in RGB
            rgb = tuple(int(hex_color[i:i+2], 16) for i in (1, 3, 5))
            min_dist = None
            closest = None
            for hexv, name in HEX_TO_NAMES.items():
                crgb = tuple(int(hexv[i:i+2], 16) for i in (1, 3, 5))
                dist = (rgb[0]-crgb[0])**2 + (rgb[1]-crgb[1])**2 + (rgb[2]-crgb[2])**2
                if min_dist is None or dist < min_dist:
                    min_dist = dist
                    closest = name
            return closest
        except Exception:
            return None

except Exception:
    # webcolors not available — fallback to None-namer
    webcolors = None
    def nearest_color_name(hex_color):
        return None

def process_image_url(url: str, top_k: int = 3, device: str = "cpu") -> List[Dict]:
    """Process single image URL into list of colors with percentages."""
    data = download_image(url)
    if not data:
        return []
    pil = pil_from_bytes(data)

    mask = None
    # Prefer SAM (GPU) if available and running on cuda
    if SAM_AVAILABLE and TORCH_AVAILABLE:
        try:
            device_try = device
            mask = mask_with_sam(pil, device=device_try)
        except Exception:
            mask = None

    # fallback rembg
    if mask is None and REMBG_AVAILABLE:
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
