import os
import json
import time
import datetime
import logging
import numpy as np
import faiss
from pymongo import MongoClient
from bson import ObjectId
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import pytz  # for IST timezone

# ------------------------------
# Logging Setup
# ------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ------------------------------
# FAISS Text Indexer Class
# ------------------------------
class FaissTextIndexer:
    def __init__(self,
                 db_name="test",
                 collection_name="listings",
                 data_dir="data",
                 mongo_uri="mongodb://localhost:27017"):
        self.db_name = db_name
        self.collection_name = collection_name
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)

        self.index_path = os.path.join(self.data_dir, "index.faiss")
        self.meta_path = os.path.join(self.data_dir, "meta.json")

        # load or create index + meta
        self.index = self._load_or_create()
        self.id_to_meta = self._load_meta()

        # infer dim from index if available
        try:
            self.dim = self.index.d if hasattr(self.index, "d") else (self.index.reconstruct_n(0, 1).shape[1] if self.index.ntotal > 0 else None)
        except Exception:
            self.dim = None

    # ------------------------------
    # Helper Methods
    # ------------------------------
    def _load_or_create(self):
        if os.path.exists(self.index_path):
            try:
                logger.info("Loading existing FAISS index from %s", self.index_path)
                idx = faiss.read_index(self.index_path)
                return idx
            except Exception as e:
                logger.warning("Failed to load existing FAISS index: %s. Creating new.", e)
        # default dim unknown until first rebuild; use a placeholder small dim that will be replaced on rebuild
        logger.info("Creating new FAISS Index (IndexFlatIP + ID map) with placeholder dim (will be rebuilt).")
        flat = faiss.IndexFlatIP(512)  # placeholder; real Index will be created in rebuild_index
        return faiss.IndexIDMap(flat)

    def _load_meta(self):
        if os.path.exists(self.meta_path):
            try:
                with open(self.meta_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning("Failed to read meta file: %s. Starting fresh meta.", e)
        return {}

    def _persist(self):
        try:
            t0 = time.time()
            faiss.write_index(self.index, self.index_path)
            with open(self.meta_path + ".tmp", "w", encoding="utf-8") as f:
                json.dump(self.id_to_meta, f, ensure_ascii=False, indent=2)
            os.replace(self.meta_path + ".tmp", self.meta_path)
            logger.info("Persisted FAISS index (%d entries) and meta in %.2fs", self.index.ntotal, time.time() - t0)
        except Exception as e:
            logger.exception("Failed to persist index/meta: %s", e)

    def _normalize(self, vecs):
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return vecs / norms

    def _flatten(self, value):
        """Convert lists/dicts/None into clean strings."""
        if isinstance(value, list):
            return ", ".join(map(str, value))
        elif isinstance(value, dict):
            return json.dumps(value, ensure_ascii=False)
        elif value is None:
            return ""
        return str(value)

    # ------------------------------
    # Index Rebuilding
    # ------------------------------
    def rebuild_index(self, batch_size=64):
        total_start = time.time()

        # 1. Fetch Data
        logger.info("Fetching documents from MongoDB...")
        cursor = self.collection.find(
            {},
            {"title": 1, "description": 1, "features": 1, "price": 1, "category": 1}
        )
        docs = list(tqdm(cursor, desc="Fetching", ncols=100))
        total_docs = len(docs)
        logger.info(f"Fetched {total_docs} documents.")

        if not docs:
            logger.warning("No documents found in MongoDB.")
            return

        # 2. Prepare Text
        logger.info("Preparing text for embeddings...")
        texts, metas, id_list = [], [], []
        for doc in tqdm(docs, desc="Preprocessing", ncols=100):
            text_parts = [
                self._flatten(doc.get("title", "")),
                self._flatten(doc.get("description", "")),
                self._flatten(doc.get("features", "")),
                self._flatten(doc.get("price", "")),
                self._flatten(doc.get("category", ""))
            ]
            text = ". ".join([t for t in text_parts if t.strip()])
            texts.append(text)
            metas.append({
                "listing_id": str(doc["_id"]),
                "title": self._flatten(doc.get("title", "")),
                "description": self._flatten(doc.get("description", "")),
                "features": self._flatten(doc.get("features", "")),
                "price": doc.get("price", None),
                "category": self._flatten(doc.get("category", ""))
            })
            id_list.append(int(str(doc["_id"]), 16) % (2**63 - 1))  # FAISS-safe 64-bit int

        # 3. Encode Texts
        logger.info("Encoding text embeddings...")
        embeddings = []
        for i in tqdm(range(0, total_docs, batch_size), desc="Encoding", ncols=100):
            batch = texts[i:i + batch_size]
            batch_emb = self.model.encode(batch, convert_to_numpy=True)
            embeddings.append(batch_emb)
        embeddings = np.vstack(embeddings).astype("float32")
        embeddings = self._normalize(embeddings)

        # 4. Build FAISS Index
        logger.info("Building FAISS index with ID mapping...")
        self.index = faiss.IndexIDMap(faiss.IndexFlatIP(self.dim))
        ids = np.array(id_list).astype("int64")
        self.index.add_with_ids(embeddings, ids)
        logger.info(f"FAISS index built with {self.index.ntotal} entries.")

        # 5. Save Index and Metadata
        logger.info("Saving index and metadata files...")
        self.id_to_meta = {str(id_list[i]): metas[i] for i in range(len(metas))}
        self._persist()

        # 6. Update MongoDB
        logger.info("Updating MongoDB with FAISS metadata...")
        ist = pytz.timezone("Asia/Kolkata")
        now_ist = datetime.datetime.now(ist)
        updated_count = 0
        for i, meta in tqdm(self.id_to_meta.items(), ncols=100):
            try:
                update_data = {
                    "faiss_vector_id": int(i),
                    "embedding_created_at": now_ist,
                    "title": meta["title"],
                    "description": meta["description"],
                    "features": meta["features"],
                    "price": meta["price"],
                    "category": meta["category"]
                }
                result = self.collection.update_one(
                    {"_id": ObjectId(meta["listing_id"])},
                    {"$set": update_data}
                )
                if result.modified_count > 0:
                    updated_count += 1
            except Exception as e:
                logger.warning(f"Failed to update {meta['listing_id']}: {e}")
        logger.info(f"MongoDB updated for {updated_count} documents.")

        total_time = time.time() - total_start
        logger.info(f"TOTAL TIME: {total_time/60:.2f} minutes")

    # ------------------------------
    # Search
    # ------------------------------
    def search(self, query, k=5):
        """
        Run a text query (string) using the internal SentenceTransformer model (if present)
        or assume `query` is a vector. This function expects the caller to have encoded the
        query if needed. Here we handle the common case where query is a string: encode it
        using an embedded model if available (not implemented here). For your current pipeline,
        the caller (ml/app.py) uses the same SentenceTransformer and passes a string; this method
        assumes the index was built using the same text model.
        """
        # quick guard
        try:
            if self.index is None or self.index.ntotal == 0:
                logger.info("FAISS index is empty (ntotal=0). Returning empty results.")
                return []
        except Exception:
            # index might not be usable
            logger.exception("Index not usable - returning empty.")
            return []

        # If query is a vector (ndarray), use it directly
        qvec = None
        if isinstance(query, np.ndarray):
            qvec = query
        else:
            # if non-vector (string) -- try to encode if you have a local model stored in meta
            # Fallback: try to convert to bytes and treat as empty (caller should ideally encode)
            try:
                # try to look for a sentence-transformer model in self (not implemented here)
                # raise NotImplementedError to force caller to encode
                raise NotImplementedError("Caller must pass an encoded query vector to FaissTextIndexer.search() in this wrapper.")
            except Exception as e:
                logger.debug("FaissTextIndexer.search: encoding fallback not available: %s", e)
                return []

        q = np.asarray(qvec).astype("float32")
        if q.ndim == 1:
            q = q.reshape(1, -1)

        # validate dim
        if self.dim is not None and q.shape[1] != self.dim:
            logger.warning("Query dim %d does not match index dim %s. Attempting to continue.", q.shape[1], self.dim)

        # cap k to ntotal
        max_k = min(int(k or 5), max(1, int(self.index.ntotal)))
        try:
            scores, ids = self.index.search(q, max_k)
        except Exception as e:
            logger.exception("FAISS search failed: %s", e)
            return []

        ids_list = ids[0].tolist()
        scores_list = scores[0].tolist()

        results = []
        seen = set()
        for idx_val, sc in zip(ids_list, scores_list):
            # skip empty
            if idx_val == -1:
                continue
            if idx_val in seen:
                continue
            seen.add(idx_val)
            meta = self.id_to_meta.get(str(int(idx_val)))
            if meta:
                entry = dict(meta)
                entry["score"] = float(sc)
                results.append(entry)
            else:
                # include minimal info if meta missing
                results.append({"faiss_id": int(idx_val), "score": float(sc)})
            if len(results) >= max_k:
                break

        return results


# ------------------------------
# Run Script
# ------------------------------
if __name__ == "__main__":
    indexer = FaissTextIndexer(
        db_name="test",
        collection_name="listings",
        data_dir="data",
        mongo_uri="mongodb+srv://imdevkhare_db_user:Dev%401234@cluster0.vmp6708.mongodb.net/?appName=Cluster0"
    )

    indexer.rebuild_index(batch_size=64)
