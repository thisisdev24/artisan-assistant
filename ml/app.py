# ml/app.py
import os
import logging
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

from faiss_index import FaissTextIndexer

# Import the generator implemented above
from generate_description import generate_description as generate_desc_fn

# ---------------------------
# Configuration
# ---------------------------
APP_PORT = int(os.environ.get("PORT", 8000))
DATA_DIR = os.environ.get("DATA_DIR", "data")
TEXT_EMBED_MODEL = os.environ.get("TEXT_EMBED_MODEL", "all-MiniLM-L6-v2")
MONGO_URI = os.environ.get("MONGO_URI", "mongodb+srv://imdevkhare_db_user:Dev%401234@cluster0.vmp6708.mongodb.net/?appName=Cluster0")
ML_DB = os.environ.get("ML_MONGO_DB", "test")
ML_COLLECTION = os.environ.get("ML_MONGO_COLLECTION", "listings")
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

# ---------------------------
# FastAPI app with lifespan
# ---------------------------
app = FastAPI(title="Embedding & FAISS Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global text_model, indexer, index_ntotal, index_dim
    # startup
    try:
        LOG.info("Loading text embedding model: %s", TEXT_EMBED_MODEL)
        text_model = SentenceTransformer(TEXT_EMBED_MODEL)
        LOG.info("Text model loaded.")
    except Exception as e:
        LOG.exception("Failed to load text model: %s", e)
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
    category: Optional[str] = None
    tone: str = "friendly and concise"

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
    uvicorn.run(app, host="0.0.0.0", port=APP_PORT)
