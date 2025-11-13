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
                 mongo_uri="mongodb+srv://imdevkhare_db_user:Dev%401234@cluster0.vmp6708.mongodb.net/?appName=Cluster0"):
        self.db_name = db_name
        self.collection_name = collection_name
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)

        self.index_path = os.path.join(self.data_dir, "index.faiss")
        self.meta_path = os.path.join(self.data_dir, "meta.json")

        # MongoDB Connection
        logger.info("Connecting to MongoDB...")
        self.client = MongoClient(mongo_uri)
        self.db = self.client[self.db_name]
        self.collection = self.db[self.collection_name]

        # Sentence Transformer
        logger.info("Loading text embedding model...")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.dim = self.model.get_sentence_embedding_dimension()

        # FAISS Index Setup
        self.index = self._load_or_create()
        self.id_to_meta = self._load_meta()

    # ------------------------------
    # Helper Methods
    # ------------------------------
    def _load_or_create(self):
        if os.path.exists(self.index_path):
            logger.info(f"Loading existing FAISS index from {self.index_path}")
            return faiss.read_index(self.index_path)
        logger.info("Creating new FAISS index...")
        return faiss.IndexIDMap(faiss.IndexFlatIP(self.dim))

    def _load_meta(self):
        if os.path.exists(self.meta_path):
            with open(self.meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _persist(self):
        logger.info("Saving FAISS index and metadata...")
        start = time.time()
        faiss.write_index(self.index, self.index_path)
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self.id_to_meta, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved successfully in {time.time() - start:.2f} sec.")

    def _normalize(self, vecs):
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1
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
        query_vec = self.model.encode([query], convert_to_numpy=True)
        query_vec = self._normalize(query_vec.astype("float32"))
        scores, ids = self.index.search(query_vec, k)

        results = []
        for idx, score in zip(ids[0], scores[0]):
            meta = self.id_to_meta.get(str(idx))
            if meta:
                meta["score"] = float(score)
                results.append(meta)
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
