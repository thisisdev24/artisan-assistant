# ml/generate_description.py
"""
Generate high-quality product descriptions using Hugging Face's InferenceClient.

This version accepts an optional `tone` parameter and integrates it into the prompt.
It uses InferenceClient.text_generation(...) and includes fallback logic.
"""

import os
import time
import logging
from typing import List, Optional
from huggingface_hub import InferenceClient

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gen_desc")

# Config via env
HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN", None)
DEFAULT_MODEL = os.getenv("GEN_DESC_MODEL", "mistral-instruct/mistral-7b-instruct")
MAX_TOKENS = int(os.getenv("GEN_DESC_MAX_TOKENS", "240"))
TEMPERATURE = float(os.getenv("GEN_DESC_TEMPERATURE", "0.6"))
TOP_P = float(os.getenv("GEN_DESC_TOP_P", "0.95"))
MAX_LINES = int(os.getenv("GEN_DESC_MAX_LINES", "10"))

# Initialize client
try:
    _client = InferenceClient(token=HF_TOKEN)
    logger.info("InferenceClient initialized")
except Exception as e:
    logger.warning("Could not init InferenceClient: %s", e)
    _client = None


def _build_prompt(title: str,
                  features: Optional[List[str]] = None,
                  category: Optional[str] = None,
                  tone: Optional[str] = None) -> str:
    """
    Build prompt. If `tone` is provided, include it as generation style hint.
    """
    features = features or []
    parts = []
    if category:
        parts.append(f"Category: {category.strip()}.")
    parts.append(f"Product title: {title.strip()}.")
    if features:
        feat_list = "; ".join(str(f).strip() for f in features if f)
        parts.append(
            "Key features (do not copy verbatim, paraphrase & weave into fluent sentences): "
            f"{feat_list}."
        )

    tone_hint = f"Use a {tone} tone." if tone else "Use a friendly, informative, persuasive tone."
    instructions = (
        "Write an engaging product description for an online product page. "
        "Paraphrase each given feature rather than copying it exactly. "
        "Explain the benefit or user-facing value of each feature. "
        f"{tone_hint} "
        f"Return at most {MAX_LINES} short paragraphs or lines. "
        "Prefer complete sentences. Do not invent technical details not provided."
    )
    parts.append(instructions)
    prompt = "\n\n".join(parts)
    return prompt


def _call_hf_inference(prompt: str,
                       model: str = DEFAULT_MODEL,
                       max_tokens: int = MAX_TOKENS,
                       temperature: float = TEMPERATURE,
                       top_p: float = TOP_P,
                       retries: int = 2,
                       backoff: float = 1.0):
    """
    Call InferenceClient.text_generation (with correct args).
    """
    if _client is None:
        raise RuntimeError("InferenceClient not initialized. Set HUGGINGFACE_API_TOKEN if required.")

    last_exc = None
    for attempt in range(retries + 1):
        try:
            logger.debug("Calling text_generation (attempt %d) model=%s", attempt + 1, model)
            resp = _client.text_generation(
                prompt,
                model=model,
                max_new_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
            )
            return resp
        except Exception as e:
            last_exc = e
            wait = backoff * (2 ** attempt)
            logger.warning("HF call failed (attempt %d/%d): %s. Retrying in %.1fs", attempt + 1, retries + 1, e, wait)
            time.sleep(wait)
    logger.error("HF inference failed after %d attempts: %s", retries + 1, last_exc)
    raise last_exc


def _extract_text_from_response(resp) -> str:
    """
    Normalize common response shapes from InferenceClient.text_generation.
    """
    if resp is None:
        return ""
    # If it's already a string
    if isinstance(resp, str):
        return resp
    # If dict with typical keys
    if isinstance(resp, dict):
        for k in ("generated_text", "text", "content", "result"):
            if k in resp and isinstance(resp[k], str):
                return resp[k]
        if "choices" in resp and isinstance(resp["choices"], list) and len(resp["choices"]) > 0:
            first = resp["choices"][0]
            for k in ("text", "message", "content", "generated_text"):
                if k in first and isinstance(first[k], str):
                    return first[k]
        return str(resp)
    # If list-like
    if isinstance(resp, list) and len(resp) > 0:
        first = resp[0]
        if isinstance(first, dict):
            for k in ("generated_text", "text", "content"):
                if k in first and isinstance(first[k], str):
                    return first[k]
            return str(first)
        if isinstance(first, str):
            return first
    return str(resp)


def _post_process_description(text: str, max_lines: int = MAX_LINES) -> str:
    if not text:
        return ""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        import re
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
        return "\n".join(sentences[:max_lines])
    trimmed = lines[:max_lines]
    if len(trimmed) == 1 and len(trimmed[0]) > 400:
        import re
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', trimmed[0]) if s.strip()]
        return "\n".join(sentences[:max_lines])
    return "\n".join(trimmed)


def _template_fallback(title: str, features: List[str], category: Optional[str]) -> str:
    title = (title or "").strip() or "Handcrafted product"
    category_part = f"Category: {category}. " if category else ""
    frags = []
    for feat in (features or []):
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


def generate_description(title: str,
                         features: Optional[List[str]] = None,
                         category: Optional[str] = None,
                         tone: Optional[str] = None,
                         max_lines: int = MAX_LINES,
                         use_model: bool = True) -> str:
    """
    Public function to generate a description.
    Accepts optional `tone` which will be included in the prompt.
    """
    features = features or []
    prompt = _build_prompt(title, features, category, tone=tone)
    if not use_model or _client is None:
        logger.info("Model disabled or unavailable; using template fallback.")
        return _template_fallback(title, features, category)

    try:
        raw = _call_hf_inference(prompt, model=DEFAULT_MODEL, max_tokens=MAX_TOKENS, temperature=TEMPERATURE, top_p=TOP_P, retries=2, backoff=1.0)
        text = _extract_text_from_response(raw)
        cleaned = _post_process_description(text, max_lines=max_lines)
        if len(cleaned.strip()) < 30:
            logger.warning("Generated text appears too short; falling back to template.")
            return _template_fallback(title, features, category)
        return cleaned
    except Exception as e:
        logger.exception("Generation failed, returning fallback: %s", e)
        return _template_fallback(title, features, category)


# CLI quick test
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate product description (InferenceClient)")
    parser.add_argument("--title", "-t", required=True)
    parser.add_argument("--features", "-f", help="Pipe-separated features, e.g. 'f1|f2'")
    parser.add_argument("--category", "-c", help="Category")
    parser.add_argument("--tone", help="Tone hint for the generator (e.g., 'exciting and premium')")
    parser.add_argument("--no-model", action="store_true", help="Use fallback only")
    parser.add_argument("--max-lines", type=int, default=MAX_LINES)
    args = parser.parse_args()

    feats = [s.strip() for s in args.features.split("|")] if args.features else []
    desc = generate_description(title=args.title, features=feats, category=args.category, tone=args.tone, max_lines=args.max_lines, use_model=(not args.no_model))
    print("\n=== DESCRIPTION ===\n")
    print(desc)
    print("\n===================\n")
