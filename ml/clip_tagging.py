# ml/clip_tagging.py
"""
CLIP zero-shot tagger with:
 - robust model loading (ViT-H-14 preferred, fallback to ViT-B-32)
 - image fetching (http(s), data: URIs, local files) with browser-like headers
 - multi-crop support to handle multi-object images
 - text-label suggestion utility (domain tuning) using CountVectorizer
 - merging helpers for color signals (to be combined with your detect_colors_aggregate)
"""

from typing import List, Dict, Optional, Tuple
from PIL import Image
import io, base64, re, time, math
import os
import requests
import numpy as np
import torch
import open_clip
from sklearn.feature_extraction.text import CountVectorizer

# Default candidate label lists (you will extend these via the suggest_labels endpoint)
DEFAULT_MATERIALS = [
    "cotton", "silk", "wool", "linen", "leather", "metal", "wood", "ceramic", "glass",
    "paper", "bamboo", "stone", "jute", "synthetic", "plastic", "khadi", "chanderi", "kantha"
]
DEFAULT_STYLES = [
    "traditional", "modern", "rustic", "bohemian", "minimalist", "vintage", "retro",
    "folk", "handmade", "contemporary", "ethnic", "industrial", "artisanal"
]
DEFAULT_OCCASIONS = [
    "casual", "formal", "wedding", "party", "home decor", "gift", "festival", "daily use",
    "office", "outdoor", "religious", "ceremony"
]
DEFAULT_COLORS = [
    "black", "white", "red", "blue", "navy", "navy blue", "dark blue" "green", "yellow", "brown", "gray", "orange", "pink",
    "beige", "maroon", "gold", "silver", "purple", "pastel", "muted", "vibrant"
]

def _is_url(uri: str) -> bool:
    return uri.startswith("http://") or uri.startswith("https://")

CACHE_DIR = os.environ.get("HF_HOME", "./model_cache")
os.makedirs(CACHE_DIR, exist_ok=True)
# 2. Tell open_clip where to look
os.environ["OPEN_CLIP_CACHE"] = CACHE_DIR

class ClipTagger:
    def __init__(self, model_preference: Optional[str] = None, device: Optional[str] = None):
        """
        model_preference: "ViT-H-14" or "ViT-B-32" or None
        device: "cuda" or "cpu" or None (auto)
        """
        if device:
            self.device = torch.device(device)
        else:
            self.device = "cpu"

        # Try to load requested high-quality model, fallback to ViT-L-14 if necessary.
        # Use laion checkpoints for quality.
        candidates = []
        if model_preference:
            candidates.append((model_preference, "laion2b_s32b_b79k" if "H-14" in model_preference else "laion2b_s34b_b79k"))
        candidates += [("ViT-H-14", "laion2b_s32b_b79k"), ("ViT-B-32", "laion2b_s34b_b79k")]

        last_errs = []
        for candidate_name, pretrained_tag in candidates:
            try:
                # open_clip will now automatically use CACHE_DIR
                self.model, _, self.preprocess = open_clip.create_model_and_transforms(
                    candidate_name, 
                    pretrained=pretrained_tag,
                    cache_dir=CACHE_DIR  # Explicitly passing it here as well
                )
                # tokenizer helper
                self.tokenizer = open_clip.get_tokenizer(candidate_name)
                self.model.to(self.device)
                self.model.eval()
                self.model_name = candidate_name
                break
            except Exception as e:
                last_errs.append((candidate_name, str(e)))
                continue
        if not hasattr(self, "model"):
            raise RuntimeError(f"Failed to load any CLIP model. Attempts: {last_errs}")

    # -------------------------
    # Image loading utilities
    # -------------------------
    def _fetch_image(self, uri: str) -> Image.Image:
        """
        Robust loader: supports http[s], data: URI, local file path.
        Sends browser-like headers to reduce 403s, does small retries.
        """
        try:
            if uri.startswith("data:"):
                m = re.match(r"data:(image/[^;]+);base64,(.*)", uri, re.I)
                if not m:
                    raise RuntimeError("Malformed data URI")
                b = base64.b64decode(m.group(2))
                return Image.open(io.BytesIO(b)).convert("RGB")

            if _is_url(uri):
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                                  "Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "image/avif,image/webp,*/*;q=0.8",
                    "Referer": "https://www.google.com/"
                }
                last_exc = None
                for attempt in range(3):
                    try:
                        r = requests.get(uri, headers=headers, timeout=10, stream=True, allow_redirects=True)
                        r.raise_for_status()
                        content = r.content
                        return Image.open(io.BytesIO(content)).convert("RGB")
                    except requests.exceptions.HTTPError as he:
                        last_exc = he
                        # If forbidden/unauthorized, do not retry
                        if getattr(he.response, "status_code", None) in (401, 403):
                            break
                    except Exception as e:
                        last_exc = e
                        time.sleep(0.6 * (attempt + 1))
                raise RuntimeError(f"Failed to fetch URL {uri}: {last_exc}")

            # assume local path
            return Image.open(uri).convert("RGB")
        except Exception as e:
            raise RuntimeError(f"Failed to load image {uri}: {e}")

    # -------------------------
    # Multi-crop utilities
    # -------------------------
    def _generate_crops(self, img: Image.Image, crop_size: Optional[int] = None) -> List[Image.Image]:
        """
        Returns a list of crops: full image, center crop, 4 corner crops.
        crop_size: if None, use min(width,height) * 0.7 then resize to model input via preprocess.
        """
        w, h = img.size
        crops = [img.copy()]  # full image

        # define base crop size
        base = int(min(w, h) * 0.7)
        if crop_size:
            base = crop_size
        # helper to crop center and corners
        def crop_at(cx, cy, size):
            left = max(0, int(cx - size // 2))
            upper = max(0, int(cy - size // 2))
            right = min(w, left + size)
            lower = min(h, upper + size)
            return img.crop((left, upper, right, lower))

        # center
        crops.append(crop_at(w//2, h//2, base))
        # corners: top-left, top-right, bottom-left, bottom-right (use quarter offsets)
        offsets = [(base//2, base//2), (w - base//2, base//2), (base//2, h - base//2), (w - base//2, h - base//2)]
        for ox, oy in offsets:
            crops.append(crop_at(ox, oy, base))
        # optionally add a few scaled down versions
        # return unique crops (dedupe by size)
        uniq = []
        seen_sizes = set()
        for c in crops:
            s = c.size
            if s not in seen_sizes:
                uniq.append(c)
                seen_sizes.add(s)
        return uniq

    # -------------------------
    # Encoding helpers
    # -------------------------
    def _encode_image_batch(self, images: List[Image.Image]) -> torch.Tensor:
        """
        Accepts list of PIL images, returns l2-normalized embedding (cpu tensor) aggregated across crops.
        Strategy: compute embedding for each crop on device, gather to CPU, l2-normalize mean embedding.
        """
        embs = []
        for img in images:
            inp = self.preprocess(img).unsqueeze(0).to(self.device)
            with torch.no_grad():
                e = self.model.encode_image(inp)  # (1, D) on device
                e = e.detach().cpu()
                embs.append(e)
        if not embs:
            raise RuntimeError("No embeddings computed.")
        embs = torch.cat(embs, dim=0)  # (C, D)
        # aggregate — mean then normalize
        agg = embs.mean(dim=0, keepdim=True)
        agg = agg / agg.norm(dim=-1, keepdim=True)
        return agg  # CPU tensor shape (1, D)

    def _encode_texts(self, texts: List[str]) -> torch.Tensor:
        tokens = self.tokenizer(texts).to(self.device)
        with torch.no_grad():
            txt_emb = self.model.encode_text(tokens)
        txt_emb = txt_emb.detach().cpu()
        txt_emb = txt_emb / txt_emb.norm(dim=-1, keepdim=True)
        return txt_emb  # (N, D) on CPU

    # -------------------------
    # Main zero-shot tagging method
    # -------------------------
    def zero_shot_tags_for_image(
        self,
        uri: str,
        top_k_per_attr: int = 3,
        material_labels: Optional[List[str]] = None,
        style_labels: Optional[List[str]] = None,
        color_labels: Optional[List[str]] = None,
        occasion_labels: Optional[List[str]] = None,
        multi_crop: bool = True,
    ) -> Dict:
        material_labels = material_labels or DEFAULT_MATERIALS
        style_labels = style_labels or DEFAULT_STYLES
        color_labels = color_labels or DEFAULT_COLORS
        occasion_labels = occasion_labels or DEFAULT_OCCASIONS

        image = self._fetch_image(uri)
        crops = self._generate_crops(image) if multi_crop else [image]
        img_emb = self._encode_image_batch(crops)  # (1, D) CPU tensor

        def score_and_top(labels):
            txt_emb = self._encode_texts(labels)  # (N, D)
            sims = (img_emb @ txt_emb.T).squeeze(0).numpy().tolist()
            pairs = list(zip(labels, sims))
            pairs_sorted = sorted(pairs, key=lambda x: x[1], reverse=True)[:top_k_per_attr]
            return [{"label": p[0], "score": float(p[1])} for p in pairs_sorted]

        mats = score_and_top(material_labels)
        stys = score_and_top(style_labels)
        cols = score_and_top(color_labels)
        occs = score_and_top(occasion_labels)

        return {
            "image": uri,
            "materials": mats,
            "styles": stys,
            "colors": cols,
            "occasions": occs
        }

    def zero_shot_batch(self, uris: List[str], top_k_per_attr: int = 3, **kwargs) -> List[Dict]:
        out = []
        for u in uris:
            try:
                out.append(self.zero_shot_tags_for_image(u, top_k_per_attr=top_k_per_attr, **kwargs))
            except Exception as e:
                out.append({"image": u, "error": str(e)})
        return out

    # -------------------------
    # Domain tuning: label suggestion
    # -------------------------
    @staticmethod
    def suggest_labels_from_texts(texts: List[str], top_k: int = 50, ngram_range: Tuple[int,int]=(1,2)) -> List[Tuple[str,int]]:
        """
        Suggest candidate labels from a list of short documents (titles, descriptions).
        Returns list of (phrase, count) sorted by frequency. Uses sklearn CountVectorizer.
        """
        if not texts:
            return []
        # basic cleaning: join, lower
        vectorizer = CountVectorizer(ngram_range=ngram_range, stop_words='english', max_features=10000)
        X = vectorizer.fit_transform(texts)
        sums = X.sum(axis=0).A1  # counts per feature
        features = vectorizer.get_feature_names_out()
        pairs = list(zip(features, sums))
        # sort by count desc
        pairs = sorted(pairs, key=lambda x: int(x[1]), reverse=True)
        return [(p[0], int(p[1])) for p in pairs[:top_k]]

    # -------------------------
    # Color merging helper
    # -------------------------
    @staticmethod
    def merge_colors(detected_colors: List[str], clip_color_preds: List[Dict], threshold: float = 0.22) -> List[str]:
        """
        Combine exact color detector output (detected_colors — e.g., ['beige','#c3b5a3'])
        with CLIP top color labels (clip_color_preds: [{'label':..., 'score':...}, ...]).
        Strategy: keep exact detected colors first, then append CLIP labels that exceed threshold and are not duplicates.
        """
        out = []
        # normalized lower-case detected colors (keep order)
        for c in detected_colors:
            if not c:
                continue
            cl = c.strip().lower()
            if cl not in out:
                out.append(cl)
        for pred in clip_color_preds:
            lbl = pred.get("label", "").strip().lower()
            score = float(pred.get("score", 0.0))
            if score >= threshold and lbl and lbl not in out:
                out.append(lbl)
        return out
