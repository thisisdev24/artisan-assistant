# ml/app.py
from dotenv import load_dotenv
import os
import logging
from contextlib import asynccontextmanager
from typing import Optional, List

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from huggingface_hub import snapshot_download
from sentence_transformers import SentenceTransformer

from faiss_index import FaissTextIndexer

# Import the generator implemented above
from generate_description import generate_description as generate_desc_fn

# import our detector
from color_detector import aggregate_images as detect_colors_aggregate

from clip_tagging import ClipTagger

import psutil
SYSTEM_RAM = int((psutil.virtual_memory().total)/(1024**3))

load_dotenv(dotenv_path='../backend/.env')

# ---------------------------
# Configuration
# ---------------------------
DATA_DIR = os.environ.get("ML_DATA_DIR")
TEXT_EMBED_MODEL = os.environ.get("TEXT_EMBED_MODEL", "all-MiniLM-L6-v2")
MONGO_URI = os.environ.get("MONGO_URI")
ML_DB = os.environ.get("ML_DB")
ML_COLLECTION = os.environ.get("ML_COLLECTION")
DEFAULT_K = int(os.environ.get("DEFAULT_K", 10))

# ---------------------------
# Logging
# ---------------------------
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
LOG = logging.getLogger("ml_service")

# ---------------------------
# Globals (initialized in lifespan)
# ---------------------------
text_model: Optional[SentenceTransformer] = None
indexer: Optional[FaissTextIndexer] = None
index_ntotal: int = 0
index_dim: Optional[int] = None
clip_tagger: Optional[ClipTagger] = None
clip_tagger_model_name: Optional[str] = None

# ---------------------------
# FastAPI app with lifespan
# ---------------------------
app = FastAPI(title="Embedding & FAISS Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://artisan-point.vercel.app/"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global text_model, indexer, index_ntotal, index_dim, clip_tagger, clip_tagger_model_name
    # startup
    try:
        LOG.info("Checking for text model: %s", TEXT_EMBED_MODEL)
        # If TEXT_EMBED_MODEL is a repo ID, this ensures it's cached locally
        # If it's a local path that doesn't exist, this will try to fetch it from HF
        model_path = TEXT_EMBED_MODEL
        if not os.path.exists(model_path):
            LOG.info("Model not found locally. Downloading from Hugging Face...")
            model_path = snapshot_download(repo_id=TEXT_EMBED_MODEL, library_name="sentence-transformers")
        
        text_model = SentenceTransformer(model_path)
        LOG.info("Text model loaded from: %s", model_path)
    except Exception as e:
        LOG.exception("Failed to load/download text model: %s", e)
        text_model = None

    try:
        LOG.info("Initializing FaissTextIndexer (mongo=%s db=%s coll=%s)", MONGO_URI, ML_DB, ML_COLLECTION)
        indexer = FaissTextIndexer(db_name=ML_DB, collection_name=ML_COLLECTION, data_dir=DATA_DIR, mongo_uri=MONGO_URI)
        try:
            index_ntotal = int(getattr(indexer.index, "ntotal", 0))
        except Exception:
            index_ntotal = 0
        index_dim = getattr(indexer, "dim", None)
        LOG.info("Indexer ready. ntotal=%s dim=%s", index_ntotal, index_dim)
    except Exception as e:
        LOG.exception("Failed to initialize indexer: %s", e)
        indexer = None
        index_ntotal = 0
        index_dim = None

    try:
        LOG.info("Initializing ClipTagger with default model.")
        clip_tagger = ClipTagger(model_preference=clip_tagger_model_name)
        clip_tagger_model_name = clip_tagger.model_name
        LOG.info("ClipTagger initialized with model: %s", clip_tagger_model_name)
    except Exception as e:
        LOG.exception("ClipTagger init failed: %s", e)
        LOG.info("tags: [], error: clip_init_failed, detail: %s", str(e))
        clip_tagger = None
        clip_tagger_model_name = None

    yield

    # shutdown
    LOG.info("Shutting down ML service.")
    # (no explicit cleanup required for current objects)

app.router.lifespan_context = lifespan

# ---------------------------
# Request models
# ---------------------------
class GenerateSearchReq(BaseModel):
    query: str
    k: int = DEFAULT_K

class GenDescReq(BaseModel):
    title: str
    features: Optional[list] = None
    category: Optional[str] = "Handmade"
    tone: str = "friendly and concise"

class DetectColorsReq(BaseModel):
    images: List[str]
    top_k_per_image: int = 3
    device: str = "cuda"

class ZeroShotTagReq(BaseModel):
    images: List[str]
    top_k_per_attr: int = 3
    device: str = "cpu"
    model_name: Optional[str] = "H-14" if SYSTEM_RAM > 8 else "B-32"  # optional override, default uses the high-quality H/14

class SuggestLabelsReq(BaseModel):
    texts: List[str]
    top_k: int = 50
    ngram_min: int = 1
    ngram_max: int = 2

# ---------------------------
# Endpoints
# ---------------------------
@app.get("/health")
def health():
    return {
        "ok": True,
        "text_model_loaded": text_model is not None,
        "index_loaded": indexer is not None,
        "index_ntotal": index_ntotal,
        "index_dim": index_dim
    }

@app.post("/generate_search_results")
def generate_search_results(req: GenerateSearchReq):
    q = (req.query or "").strip()
    k = max(1, min(int(req.k or DEFAULT_K), 100))
    if not q:
        return {"results": []}

    if text_model is None:
        LOG.error("Text model not loaded.")
        return {"results": [], "error": "text_model_not_loaded"}
    if indexer is None:
        LOG.error("Indexer not initialized.")
        return {"results": [], "error": "index_not_initialized"}

    try:
        qvec = text_model.encode([q], convert_to_numpy=True)
        if qvec is None or len(qvec) == 0:
            LOG.error("Empty encoding for query.")
            return {"results": []}
        query_vector = np.asarray(qvec[0], dtype="float32")
    except Exception as e:
        LOG.exception("Encoding failed: %s", e)
        return {"results": [], "error": "encode_failed", "detail": str(e)}

    try:
        results = indexer.search(query_vector, k=k)
        out = []
        seen = set()
        for r in results:
            lid = r.get("listing_id") or r.get("_id") or r.get("faiss_id") or None
            if lid is None:
                lid = str(r.get("id", r.get("faiss_id", "")))
            if lid in seen:
                continue
            seen.add(lid)
            out.append(r)
            if len(out) >= k:
                break
        return {"results": out}
    except Exception as e:
        LOG.exception("Search failed: %s", e)
        return {"results": [], "error": "search_failed", "detail": str(e)}

@app.post("/generate_description")
def generate_description_endpoint(req: GenDescReq):
    """
    Use the generate_description function from generate_description.py
    This will try the local Transformers model (google/flan-t5-large) and revert to safe fallback if needed.
    """
    title = (req.title or "").strip()
    features = req.features or []
    category = req.category or None
    tone = req.tone or None

    if not title:
        return {"description": ""}

    try:
        desc = generate_desc_fn(title=title, features=features, category=category, tone=tone, max_lines=int(os.getenv("GEN_DESC_MAX_LINES", "10")))
        return {"description": desc}
    except Exception as e:
        LOG.exception("Description generation endpoint failed: %s", e)
        # final safety: return a simple constructed description rather than crashing
        fallback = f"{title}. Features: {', '.join(features or [])}."
        return {"description": fallback, "error": "generation_failed", "detail": str(e)}

@app.post("/detect_colors")
def detect_colors_endpoint(req: DetectColorsReq):
    """POST with json: { images: [url1, url2, ...], top_k_per_image: 3 }"""
    imgs = [i for i in (req.images or []) if isinstance(i, str) and i]
    if not imgs:
        return {"colors": []}
    # choose device if cuda available
    device = req.device
    try:
        import torch
        if device == "cuda" and not torch.cuda.is_available():
            device = "cpu"
    except Exception:
        device = "cpu"

    try:
        colors = detect_colors_aggregate(imgs, top_k_per_image=int(req.top_k_per_image or 3), device=device)
        # return top 6 overall
        return {"colors": colors[:6]}
    except Exception as e:
        LOG.exception("Color detection failed: %s", e)
        return {"colors": [], "error": str(e)}

@app.post("/zero_shot_tags")
def zero_shot_tags(req: ZeroShotTagReq):
    """
    POST JSON:
      { "images": ["url1","url2"], "top_k_per_attr": 3, "device": "cuda", "model_name": "ViT-H-14" }
    Workflow:
      1) Use detect_colors_aggregate for exact colors
      2) Use CLIP zero-shot tagging (multi-crop) for materials/styles/colors/occasions
      3) Merge color signals trusting detect_colors for exact colors + CLIP for stylistic colors
    """
    imgs = [i for i in (req.images or []) if isinstance(i, str) and i]
    if not imgs:
        return {"tags": []}
    device = req.device

    # 1) exact colors from your existing color detector
    try:
        exact_colors_resp = detect_colors_aggregate(imgs, top_k_per_image=3, device=device)
        # detect_colors_aggregate returns list-structured results per image; normalize to list of color names
    except Exception as e:
        LOG.exception("detect_colors_aggregate failed: %s", e)
        exact_colors_resp = [ [] for _ in imgs ]

    # 2) CLIP zero-shot tagging (multi-crop)
    try:
        clip_results = clip_tagger.zero_shot_batch(imgs, top_k_per_attr=int(req.top_k_per_attr or 3), multi_crop=True)
    except Exception as e:
        LOG.exception("CLIP tagging failed: %s", e)
        return {"tags": [], "error": "clip_tagging_failed", "detail": str(e)}

    # 3) merge color signals per image
    out = []
    for i, img in enumerate(imgs):
        clip_r = clip_results[i] if i < len(clip_results) else {"image": img, "materials":[], "styles":[], "colors":[], "occasions":[]}
        exact_colors = []
        try:
            # The shape of exact color results depends on your color_detector implementation.
            # If detect_colors_aggregate returns objects with 'colors' or strings, adapt accordingly.
            ec = exact_colors_resp[i] if i < len(exact_colors_resp) else []
            # normalize to list of color names if needed
            if isinstance(ec, dict):
                # try keys
                exact_colors = ec.get("colors", []) or ec.get("dominant_colors", []) or []
            elif isinstance(ec, list):
                exact_colors = ec
            # flatten non-string entries
            exact_colors = [str(x).lower() for x in exact_colors if x]
        except Exception:
            exact_colors = []

        # clip color preds come as list of {'label','score'}
        clip_color_preds = clip_r.get("colors", [])
        merged_colors = ClipTagger.merge_colors(exact_colors, clip_color_preds, threshold=0.22)

        # final object: keep CLIP materials/styles/occasions; replace colors with merged list
        final = {
            "image": clip_r.get("image", img),
            "materials": clip_r.get("materials", []),
            "styles": clip_r.get("styles", []),
            # expose both raw clip color preds and merged canonical colors
            "clip_colors": clip_color_preds,
            "merged_colors": merged_colors,
            "occasions": clip_r.get("occasions", [])
        }
        out.append(final)

    return {"tags": out}

@app.post("/suggest_labels")
def suggest_labels(req: SuggestLabelsReq):
    texts = [t for t in (req.texts or []) if isinstance(t, str) and t.strip()]
    if not texts:
        return {"suggestions": []}
    try:
        pairs = ClipTagger.suggest_labels_from_texts(texts, top_k=int(req.top_k), ngram_range=(int(req.ngram_min), int(req.ngram_max)))
        # return as list of objects
        out = [{"phrase": p[0], "count": int(p[1])} for p in pairs]
        return {"suggestions": out}
    except Exception as e:
        LOG.exception("Label suggestion failed: %s", e)
        return {"suggestions": [], "error": str(e)}

@app.post("/rebuild_index")
def rebuild_index():
    if indexer is None:
        return {"error": "index_not_initialized"}
    try:
        if hasattr(indexer, "rebuild_index"):
            LOG.info("Starting FAISS rebuild...")
            indexer.rebuild_index(batch_size=64)
            try:
                global index_ntotal
                index_ntotal = int(getattr(indexer.index, "ntotal", 0))
            except Exception:
                index_ntotal = 0
            LOG.info("Rebuild finished. ntotal=%s", index_ntotal)
            return {"status": "ok", "ntotal": index_ntotal}
        return {"error": "rebuild_not_supported"}
    except Exception as e:
        LOG.exception("Rebuild failed: %s", e)
        return {"error": "rebuild_failed", "detail": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
