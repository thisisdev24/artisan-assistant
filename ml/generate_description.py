"""
generate_description.py

Generates a short product description for an uploaded product.

Usage:
    from generate_description import generate_description
    desc = generate_description(title="Handmade wooden bowl",
                                features=["hand-carved", "oak wood", "eco-friendly"],
                                category="kitchenware")
"""

from typing import List, Optional
import os
import logging

# Try to import transformers. If not present, the code will still work using fallback.
try:
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
    _TRANSFORMERS_AVAILABLE = True
except Exception:
    _TRANSFORMERS_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gen_desc")

# Module-level cached generator
_generator = None
_MODEL_NAME = os.getenv("GEN_DESC_MODEL", "google/flan-t5-large")  # small, fast
_MAX_TOKENS = int(os.getenv("GEN_DESC_MAX_TOKENS", "200"))


def _init_generator():
    global _generator
    if _generator is not None:
        return _generator

    if not _TRANSFORMERS_AVAILABLE:
        logger.warning("transformers not available; falling back to template-based generator.")
        _generator = None
        return None

    try:
        device_map = "auto"
        # if torch and cuda available you may use device_map or set device to 0
        # But keep it simple and portable (CPU).
        tok = AutoTokenizer.from_pretrained(_MODEL_NAME)
        model = AutoModelForSeq2SeqLM.from_pretrained(_MODEL_NAME)
        gen = pipeline("text2text-generation", model=model, tokenizer=tok, device=-1)
        _generator = gen
        logger.info(f"Loaded generation model {_MODEL_NAME}")
        return _generator
    except Exception as e:
        logger.exception("Failed to initialize transformer model. Falling back to template.")
        _generator = None
        return None


def _build_prompt(title: str, features: Optional[List[str]] = None, category: Optional[str] = None,
                  tone: Optional[str] = "friendly and concise") -> str:
    parts = []
    if category:
        parts.append(f"Category: {category.strip()}.")
    parts.append(f"Product title: {title.strip()}.")
    if features:
        feat_str = ", ".join([str(f).strip() for f in features if f])
        if feat_str:
            parts.append(f"Key features: {feat_str}.")
    parts.append(f"Write a short product description (one or two sentences). Tone: {tone}.")
    prompt = " ".join(parts)
    return prompt


def _template_description(title: str, features: Optional[List[str]] = None,
                          category: Optional[str] = None) -> str:
    # Conservative short fallback
    base = title.strip()
    if not base:
        base = "Handcrafted product"
    fragments = [base]
    if features:
        f = ", ".join([str(x).strip() for x in features if x])
        if f:
            fragments.append(f"Features include {f}")
    if category:
        fragments.append(f"Category: {category.strip()}")
    # assemble 1-2 short sentences
    desc = ". ".join(fragments) + "."
    # keep it concise
    if len(desc) > 240:
        desc = desc[:237].rsplit(" ", 1)[0] + "..."
    return desc


def generate_description(title: str,
                         features: Optional[List[str]] = None,
                         category: Optional[str] = None,
                         tone: Optional[str] = "friendly and concise",
                         max_tokens: int = _MAX_TOKENS) -> str:
    """
    Generate a short description (string).
    - title: product title (required)
    - features: optional list of short feature strings
    - category: optional category string
    - tone: stylistic hint for the generator
    - max_tokens: max tokens for transformer (if used)
    """
    title = title or ""
    features = features or []
    category = category or None

    # Build prompt
    prompt = _build_prompt(title, features, category, tone)

    # Try transformer generator
    gen = _init_generator()
    if gen:
        try:
            # Use pipeline with controlled parameters
            out = gen(prompt, max_length=max_tokens, do_sample=False)
            if isinstance(out, list) and len(out) > 0 and "generated_text" in out[0]:
                raw = out[0]["generated_text"].strip()
                # small post-processing: if empty, fallback
                if raw:
                    # ensure concise: trim long outputs
                    if len(raw) > 500:
                        raw = raw[:497].rsplit(" ", 1)[0] + "..."
                    return raw
        except Exception as e:
            logger.exception("Transformer generation failed, falling back to template.")

    # Fallback
    return _template_description(title, features, category)


# CLI support for quick manual testing
if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Generate short product description.")
    parser.add_argument("--title", "-t", required=True, help="Product title")
    parser.add_argument("--features", "-f", help="Comma-separated features")
    parser.add_argument("--category", "-c", help="Category")
    parser.add_argument("--tone", help="Tone hint (default: friendly and concise)")
    args = parser.parse_args()

    feats = [s.strip() for s in args.features.split(",")] if args.features else None
    desc = generate_description(args.title, feats, args.category, tone=args.tone)
    print(desc)
