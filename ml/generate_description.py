"""
Generate product descriptions (CPU-only, sampling + selection) using Flan-T5.

This file contains the minimal HuggingFace Transformers usage required to
perform local generation with the google/flan-t5-* family. All remote HF
Inference Client code and related branches have been removed — the module
only attempts local generation with Transformers + torch and otherwise falls
back to a lightweight template.

Environment variables (optional):
- GEN_DESC_MODEL (default: "google/flan-t5-base")
- GEN_DESC_MAX_TOKENS (default: 240)
- GEN_DESC_TEMPERATURE (default: 0.8)
- GEN_DESC_TOP_P (default: 0.95)
- GEN_DESC_MAX_LINES (default: 10)
- GEN_DESC_FEATURE_LIMIT (default: 12)
- GEN_DESC_MIN_CHARS (default: 60)
- GEN_DESC_NUM_CANDIDATES (default: 3)

Notes:
- This file is CPU-first. If you install torch and transformers, it will
  attempt local sampling with the specified Flan-T5 model.
- All HF Inference (remote) code was removed as requested.
"""
from dotenv import load_dotenv
import os
import time
import logging
import re
from typing import List, Optional, Union

# optional deps
try:
    import torch
except Exception:
    torch = None

try:
    from transformers import T5Tokenizer, T5ForConditionalGeneration
except Exception:
    T5Tokenizer = None
    T5ForConditionalGeneration = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gen_desc")

load_dotenv(dotenv_path='../backend/.env')  # This loads the .env file

# config
DEFAULT_MODEL = os.environ.get("GEN_DESC_MODEL", "google/flan-t5-base")
MAX_TOKENS = int(os.getenv("GEN_DESC_MAX_TOKENS", "240"))
TEMPERATURE = float(os.getenv("GEN_DESC_TEMPERATURE", "0.8"))
TOP_P = float(os.getenv("GEN_DESC_TOP_P", "0.95"))
MAX_LINES = int(os.getenv("GEN_DESC_MAX_LINES", "10"))
_FEATURE_LIMIT = int(os.getenv("GEN_DESC_FEATURE_LIMIT", "12"))
_TOKENIZER_MAX_LENGTH = int(os.getenv("GEN_DESC_TOKENIZER_MAX_LEN", "512"))
MIN_CHARS = int(os.getenv("GEN_DESC_MIN_CHARS", "60"))
NUM_CANDIDATES = int(os.getenv("GEN_DESC_NUM_CANDIDATES", "3"))

CACHE_DIR = os.environ.get("HF_HOME", "./model_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Set environment variables for Transformers
os.environ["TRANSFORMERS_CACHE"] = CACHE_DIR
os.environ["HF_HOME"] = CACHE_DIR

# lazy globals
_local_tokenizer = None
_local_model = None

# ----------------------
# Utility functions
# ----------------------
_WORD_RE = re.compile(r"[A-Za-z0-9]+")

def _words_set(text: str) -> set:
    return set(m.group(0).lower() for m in _WORD_RE.finditer(text or ""))

def _normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def _init_local_model(model_name: str = DEFAULT_MODEL):
    """
    Load tokenizer & model with defensive CPU-only strategy.
    Returns (tokenizer, model) or (None, None) if not available.
    """
    global _local_tokenizer, _local_model
    if _local_model is not None and _local_tokenizer is not None:
        return _local_tokenizer, _local_model

    if T5Tokenizer is None or T5ForConditionalGeneration is None or torch is None:
        logger.warning("transformers or torch not available. Install 'transformers' and 'torch' for local generation.")
        return None, None

    try:
        logger.info("Loading tokenizer: %s", model_name)
        tokenizer = T5Tokenizer.from_pretrained(model_name, use_fast=True, cache_dir=CACHE_DIR)
    except Exception as e:
        logger.exception("Failed to load tokenizer: %s", e)
        return None, None

    try:
        logger.info("Loading model (CPU) for: %s", model_name)
        # Prefer a safe CPU load; do not assume GPU availability.
        model = T5ForConditionalGeneration.from_pretrained(model_name, cache_dir=CACHE_DIR)
        # Move to CPU explicitly if torch and the model support it
        try:
            device = torch.device("cpu")
            model.to(device)
        except Exception:
            # best-effort; ignore if cannot move
            pass
        _local_tokenizer = tokenizer
        _local_model = model
        logger.info("Local model loaded.")
        return _local_tokenizer, _local_model
    except Exception as e:
        logger.exception("Failed to load model: %s", e)
        return None, None

# ----------------------
# Prompt building & sanitize
# ----------------------
def sanitize_features(features: Optional[Union[List, str, object]]) -> List[str]:
    out = []
    if features is None:
        return out
    if isinstance(features, list):
        for f in features:
            if f is None:
                continue
            s = str(f).strip()
            if s:
                out.append(s)
            if len(out) >= _FEATURE_LIMIT:
                break
        return out
    s = str(features).strip()
    if not s:
        return []
    parts = []
    if "|" in s:
        parts = [p.strip() for p in s.split("|") if p.strip()]
    elif "\n" in s:
        parts = [p.strip() for p in s.splitlines() if p.strip()]
    elif "," in s and len(s) > 80:
        parts = [p.strip() for p in s.split(",") if p.strip()]
    else:
        parts = [s]
    for p in parts:
        if p:
            out.append(p)
        if len(out) >= _FEATURE_LIMIT:
            break
    return out

# Few-shot examples
_FEW_SHOT = [
    {
        "title": "Organic Shea Butter Soap - 3oz",
        "features": ["Nourishing shea butter", "Vegan formula", "Handmade in small batches"],
        "category": "Personal Care",
        "tone": "gentle and natural",
        "example": "A luxuriously creamy soap made with nourishing shea butter to hydrate and soothe dry skin. Vegan and handcrafted in small batches, it leaves skin feeling soft and refreshed without harsh chemicals."
    },
    {
        "title": "Bamboo Bed Tray with Foldable Legs",
        "features": ["Solid bamboo", "Foldable legs", "Oil-finished surface"],
        "category": "Home & Living",
        "tone": "practical and warm",
        "example": "A sturdy bamboo bed tray designed for comfortable breakfasts in bed — its foldable legs save space when not in use, and the oil-finished surface resists stains while showcasing natural grain."
    }
]

def _build_prompt(title: str,
                  features: Optional[List[str]] = None,
                  category: Optional[str] = None,
                  tone: Optional[str] = None,
                  strict: bool = False) -> str:
    features = features or []
    inst = [
        "Instruction: Write a concise e-commerce product description based on the product information below.",
        "- Output only the description (no headings, labels, or bullet lists).",
        "- DO NOT repeat the input labels ('Title', 'Category', 'Features') or copy features verbatim.",
        "- Paraphrase each feature and clearly explain the user benefit.",
        f"- Produce 1–3 short sentences (or up to {MAX_LINES} short lines). Keep it suitable for a product listing.",
    ]
    if tone:
        inst.append(f"- Tone: {tone}.")
    if strict:
        inst.append("- STRICT: If your output contains verbatim input text, rewrite to remove it.")

    instruction_text = "\n".join(inst)

    # Attach few-shot examples
    examples = []
    for ex in _FEW_SHOT:
        ex_feats = "\n".join(f"- {f}" for f in ex["features"])
        examples.append(
            f"Example Input:\nTitle: {ex['title']}\nCategory: {ex['category']}\nFeatures:\n{ex_feats}\nTone: {ex['tone']}\nExample Output: {ex['example']}"
        )
    examples_text = "\n\n".join(examples)

    # Product info
    parts = []
    parts.append(f"Title: {title.strip()}" if title else "Title: ")
    if category:
        parts.append(f"Category: {category.strip()}")
    if features:
        parts.append("Features:\n" + "\n".join(f"- {f}" for f in features))
    info = "\n".join(parts)

    prompt = instruction_text + "\n\n" + examples_text + "\n\n" + "Product information:\n" + info + "\n\nOutput:"
    if len(prompt) > 12000:
        prompt = prompt[:12000]
    return prompt

# ----------------------
# Post-processing & fallback
# ----------------------
def _post_process_description(text: str, max_lines: int = MAX_LINES) -> str:
    """
    Clean up generated text:
     - Normalize whitespace
     - Remove any lines that start with 'Category:' or 'Product title:' or 'Title:' (accidental echoes)
     - Trim to max_lines
    """
    if not text:
        return ""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    filtered = []
    for ln in lines:
        low = ln.lower()
        if low.startswith("category:") or low.startswith("product title:") or low.startswith("product_title:") or low.startswith("title:"):
            continue
        filtered.append(ln)
    if not filtered:
        filtered = lines
    if not filtered:
        return ""
    trimmed = filtered[:max_lines]
    return "\n".join(trimmed)


def _template_fallback(title: str, features: List[str], category: Optional[str]) -> str:
    title = (title or "").strip() or "Handcrafted product"
    category_part = f"Category: {category}. " if category else ""
    frags = []
    for feat in (features or [])[:4]:
        f = str(feat).strip()
        if not f:
            continue
        low = f.lower()
        if low.startswith("made of ") or low.startswith("made from "):
            rest = " ".join(f.split(" ")[2:]) if len(f.split(" ")) > 2 else f
            frag = f"Crafted from {rest}"
        elif "quartz" in low and "glass" in low:
            frag = "Crafted from quartz glass"
        elif low.startswith("hand-") or ("hand" in low and ("carv" in low or "made" in low)):
            frag = "Hand-finished by skilled artisans"
        elif "eco" in low or "recycl" in low or "sustain" in low:
            frag = "Made with eco-friendly materials"
        else:
            frag = f.capitalize()
        frags.append(frag.rstrip(".") + ".")
    if not frags:
        frags = ["A thoughtfully crafted product that blends quality and value."]
    out = f"{title}. {category_part}" + " ".join(frags[:4])
    return _post_process_description(out, max_lines=MAX_LINES)

# ----------------------
# Candidate generation (local sampling)
# ----------------------
def _strip_echo_lines(text: str) -> str:
    if not text:
        return ""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    filtered = []
    for ln in lines:
        low = ln.lower()
        if low.startswith("title:") or low.startswith("category:") or low.startswith("features:") or low.startswith("- "):
            continue
        filtered.append(ln)
    return "\n".join(filtered) if filtered else " ".join(lines)


def _overlap_count(candidate: str, title: str, features: List[str]) -> int:
    cand_words = _words_set(candidate)
    src_words = _words_set(title) if title else set()
    for f in features:
        src_words |= _words_set(f)
    src_words = set(w for w in src_words if len(w) > 2)
    return len(cand_words & src_words)


def _select_best_candidate(candidates: List[str], title: str, features: List[str], min_chars: int = MIN_CHARS):
    scored = []
    for c in candidates:
        text = _normalize_text(c)
        if not text:
            continue
        overlap = _overlap_count(text, title, features)
        score = len(text) - 3 * overlap
        scored.append((score, overlap, text))
    if not scored:
        return None
    scored.sort(key=lambda x: (x[0], len(x[2])), reverse=True)
    for score, overlap, text in scored:
        if len(text) >= min_chars and overlap < max(1, int(0.25 * len(_words_set(title)) + 0.5)):
            return text
    top = scored[0]
    if len(top[2]) >= int(min_chars / 2):
        return top[2]
    return None


def _generate_with_local_transformers_sampling(prompt: str,
                                               model_name: str = DEFAULT_MODEL,
                                               max_tokens: int = MAX_TOKENS,
                                               temperature: float = TEMPERATURE,
                                               top_p: float = TOP_P,
                                               num_return_sequences: int = NUM_CANDIDATES):
    """
    Use HuggingFace Transformers locally to sample multiple candidates.
    Raises RuntimeError if transformers/torch aren't available or model fails to load.
    """
    if T5Tokenizer is None or T5ForConditionalGeneration is None or torch is None:
        raise RuntimeError("Local Transformers / torch not available in environment.")
    tokenizer, model = _init_local_model(model_name)
    if tokenizer is None or model is None:
        raise RuntimeError("Failed to initialize local model/tokenizer.")

    # Tokenize (CPU tensors)
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=_TOKENIZER_MAX_LENGTH)
    input_ids = inputs.input_ids
    attention_mask = inputs.attention_mask if "attention_mask" in inputs else None

    # Ensure tensors on the same device as model parameters (best-effort)
    try:
        emb = getattr(model.get_input_embeddings(), "weight", None)
        if emb is not None and hasattr(emb, "device") and emb.device.type != "meta":
            dev = emb.device
            input_ids = input_ids.to(dev)
            if attention_mask is not None:
                attention_mask = attention_mask.to(dev)
        else:
            input_ids = input_ids.to("cpu")
            if attention_mask is not None:
                attention_mask = attention_mask.to("cpu")
    except Exception:
        input_ids = input_ids.to("cpu")
        if attention_mask is not None:
            attention_mask = attention_mask.to("cpu")

    gen_kwargs = {
        "max_new_tokens": int(max_tokens),
        "do_sample": True,
        "temperature": float(temperature),
        "top_p": float(top_p),
        "num_return_sequences": int(num_return_sequences),
        "eos_token_id": tokenizer.eos_token_id,
        "min_length": 12,
    }

    with torch.no_grad():
        outputs = model.generate(input_ids=input_ids, attention_mask=attention_mask, **gen_kwargs)

    results = []
    for i in range(outputs.shape[0]):
        results.append(tokenizer.decode(outputs[i], skip_special_tokens=True))
    return results

# ----------------------
# Public entry
# ----------------------
def generate_description(title: str,
                         features: Optional[Union[List[str], str]] = None,
                         category: Optional[str] = None,
                         tone: Optional[str] = None,
                         max_lines: int = MAX_LINES,
                         use_model: bool = True) -> str:
    features_list = sanitize_features(features)
    logger.info("generate_description called | title='%s' | features_count=%d | category='%s' | model=%s",
                (title or "")[:140], len(features_list), (category or "")[:60], DEFAULT_MODEL)

    if not use_model:
        return _template_fallback(title, features_list, category)

    prompt = _build_prompt(title or "", features_list, category, tone, strict=False)
    logger.debug("Prompt preview: %s", prompt[:1200])

    try:
        # Try local generation only (minimal HF usage as requested)
        candidates = _generate_with_local_transformers_sampling(prompt, model_name=DEFAULT_MODEL, max_tokens=MAX_TOKENS, temperature=TEMPERATURE, top_p=TOP_P, num_return_sequences=NUM_CANDIDATES)
        if not isinstance(candidates, list):
            candidates = [str(candidates)]

        cleaned_candidates = [_strip_echo_lines(c) for c in candidates]
        best = _select_best_candidate(cleaned_candidates, title or "", features_list, min_chars=MIN_CHARS)
        if best:
            final = _post_process_description(best, max_lines=max_lines)
            if final and len(final.strip()) >= 30:
                return final

        # retry with strict prompt
        logger.warning("No satisfactory candidate from first pass. Retrying with stricter prompt.")
        strict_prompt = _build_prompt(title or "", features_list, category, tone, strict=True)
        candidates2 = _generate_with_local_transformers_sampling(strict_prompt, model_name=DEFAULT_MODEL, max_tokens=min(MAX_TOKENS, 320), temperature=max(0.6, TEMPERATURE - 0.1), top_p=min(0.98, TOP_P), num_return_sequences=NUM_CANDIDATES)
        if not isinstance(candidates2, list):
            candidates2 = [str(candidates2)]
        cleaned2 = [_strip_echo_lines(c) for c in candidates2]
        best2 = _select_best_candidate(cleaned2, title or "", features_list, min_chars=int(MIN_CHARS * 0.8))
        if best2:
            final2 = _post_process_description(best2, max_lines=max_lines)
            if final2 and len(final2.strip()) >= 30:
                return final2

        # fallback choices
        all_cands = cleaned_candidates + cleaned2
        all_cands = [c for c in all_cands if c and len(c.strip()) > 20]
        if all_cands:
            longest = max(all_cands, key=lambda s: len(s))
            final_longest = _post_process_description(longest, max_lines=max_lines)
            if final_longest and len(final_longest.strip()) >= 30:
                return final_longest

        logger.warning("All generation attempts failed to produce substantial text. Returning template fallback.")
        return _template_fallback(title, features_list, category)

    except Exception as e:
        logger.exception("Generation error: %s. Falling back to template.", e)
        return _template_fallback(title, features_list, category)

# ----------------------
# CLI quick test
# ----------------------
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate product description (sampling + selection) using Flan-T5")
    parser.add_argument("--title", "-t", required=True)
    parser.add_argument("--features", "-f", help="Pipe/comma/newline separated features or JSON-like list")
    parser.add_argument("--category", "-c", help="Category")
    parser.add_argument("--tone", help="Tone hint")
    parser.add_argument("--no-model", action="store_true", help="Use fallback only")
    parser.add_argument("--max-lines", type=int, default=MAX_LINES)
    args = parser.parse_args()

    feats = args.features
    desc = generate_description(title=args.title, features=feats, category=args.category, tone=args.tone, max_lines=args.max_lines, use_model=(not args.no_model))
    print("\n=== DESCRIPTION ===\n")
    print(desc)
    print("\n===================\n")
