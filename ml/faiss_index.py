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
import pytz

# ------------------------------
# Logging
# ------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ==========================================================
#                 FAISS TEXT INDEXER (UPGRADED)
# ==========================================================
class FaissTextIndexer:
    def __init__(
        self,
        db_name="test",
        collection_name="listings",
        data_dir="data",
        mongo_uri=None
    ):
        # SECURITY: Get MongoDB URI from environment variable
        if mongo_uri is None:
            mongo_uri = os.environ.get("MONGO_URI")
            if not mongo_uri:
                raise ValueError("MONGO_URI environment variable is required. Set it in your .env file.")

        # MongoDB
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        self.collection = self.db[collection_name]

        # Paths
        self.ml_data_dir = data_dir
        os.makedirs(self.ml_data_dir, exist_ok=True)

        self.index_path = os.path.join(self.ml_data_dir, "index.faiss")
        self.meta_path = os.path.join(self.ml_data_dir, "meta.json")

        # Transform model
        logger.info("Loading SentenceTransformer model...")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

        # Load or create index
        self.index = self._load_or_create()
        self.id_to_meta = self._load_meta()

        self.dim = None  # will be set when building embeddings


    # ==========================================================
    #            HELPER FUNCTIONS
    # ==========================================================
    def _faiss_id(self, oid):
        return int(str(oid), 16) % (2**63 - 1)

    def _load_or_create(self):
        if os.path.exists(self.index_path):
            try:
                logger.info("Loading existing FAISS index...")
                return faiss.read_index(self.index_path)
            except Exception as e:
                logger.warning("Failed to load FAISS index: %s", e)

        logger.info("No index found. Will be created later.")
        return None

    def _load_meta(self):
        if os.path.exists(self.meta_path):
            try:
                with open(self.meta_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning("Failed to load meta.json: %s", e)
        return {}

    def _persist(self):
        if self.index is None:
            return
        try:
            faiss.write_index(self.index, self.index_path)
            with open(self.meta_path, "w", encoding="utf-8") as f:
                json.dump(self.id_to_meta, f, ensure_ascii=False, indent=2)
            logger.info("Saved FAISS index + metadata.")
        except Exception as e:
            logger.error("Persist failed: %s", e)

    def _normalize(self, vecs):
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return vecs / norms

    def _flatten(self, value):
        if isinstance(value, list):
            return " ".join(map(str, value))
        if isinstance(value, dict):
            return json.dumps(value)
        if value is None:
            return ""
        return str(value)

    def _to_ist(self, dt):
        if not dt:
            return ""

        ist = pytz.timezone("Asia/Kolkata")

        if isinstance(dt, datetime.datetime):
            if dt.tzinfo is None:
                dt_utc = pytz.utc.localize(dt)
            else:
                dt_utc = dt.astimezone(pytz.utc)
            dt_ist = dt_utc.astimezone(ist)
            return dt_ist.replace(tzinfo=None)

        if isinstance(dt, str):
            for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
                try:
                    parsed = datetime.datetime.strptime(dt, fmt)
                    dt_utc = pytz.utc.localize(parsed)
                    dt_ist = dt_utc.astimezone(ist)
                    return dt_ist.replace(tzinfo=None)
                except Exception:
                    continue
            try:
                parsed = datetime.datetime.fromisoformat(dt)
                if parsed.tzinfo is None:
                    parsed = pytz.utc.localize(parsed)
                dt_ist = parsed.astimezone(ist)
                return dt_ist.replace(tzinfo=None)
            except Exception:
                logger.debug("Unable to parse date string: %s", dt)
                return ""

        return ""

    # NEW: Write embedding data back to MongoDB
    def _update_mongo_embedding_info(self, listing_id, faiss_id, created_at):
        try:
            self.collection.update_one(
                {"_id": listing_id},
                {
                    "$set": {
                        "faiss_vector_id": faiss_id,
                        "embedding_created_at": created_at
                    }
                }
            )
        except Exception as e:
            logger.error("Failed to update MongoDB for %s: %s", listing_id, e)


    # ==========================================================
    #                   FULL REBUILD INDEX
    # ==========================================================
    def rebuild_index(self, batch_size=64):

        total_start = time.time()
        logger.info("Fetching documents...")

        cursor = self.collection.find(
            {},
            {
                "title": 1,
                "description": 1,
                "features": 1,
                "price": 1,
                "main_category": 1,
                "categories": 1,
                "store": 1,
                "average_rating": 1,
                "rating_number": 1,
                "images": 1,
                "details": 1,
                "parent_asin": 1,
                "updatedAt": 1
            }
        )

        docs = list(tqdm(cursor, desc="Fetching", ncols=100))
        total_docs = len(docs)
        logger.info("Fetched %d documents", total_docs)

        if total_docs == 0:
            logger.warning("No documents found.")
            return

        texts = []
        metas = []
        ids = []

        logger.info("Preparing text + metadata...")
        for doc in tqdm(docs, desc="Preprocessing", ncols=100):

            parts = [
                self._flatten(doc.get("title")),
                self._flatten(doc.get("description")),
                self._flatten(doc.get("features")),
                self._flatten(doc.get("main_category")),
                self._flatten(doc.get("categories")),
                self._flatten(doc.get("store")),
                self._flatten(doc.get("details"))
            ]

            searchable_text = ". ".join([p for p in parts if p.strip()])
            texts.append(searchable_text)

            fid = self._faiss_id(doc["_id"])
            ids.append(fid)

            created_at = str(self._to_ist(datetime.datetime.now(datetime.UTC)))

            meta = {
                "listing_id": str(doc["_id"]),
                "title": self._flatten(doc.get("title")),
                "description": self._flatten(doc.get("description")),
                "features": self._flatten(doc.get("features")),
                "main_category": self._flatten(doc.get("main_category")),
                "categories": doc.get("categories", []),
                "price": doc.get("price"),
                "store": self._flatten(doc.get("store")),
                "average_rating": doc.get("average_rating"),
                "rating_number": doc.get("rating_number"),
                "images": doc.get("images", []),
                "details": doc.get("details", {}),
                "parent_asin": self._flatten(doc.get("parent_asin")),
                "updatedAt": str(self._to_ist(doc.get("updatedAt"))),
                "faiss_vector_id": fid,
                "embedding_created_at": created_at
            }
            metas.append(meta)

            # NEW: write embedding info back to MongoDB
            self._update_mongo_embedding_info(doc["_id"], fid, created_at)

        logger.info("Encoding embeddings...")
        all_embeddings = []

        for i in tqdm(range(0, total_docs, batch_size), desc="Encoding", ncols=100):
            batch = texts[i:i + batch_size]
            batch_vecs = self.model.encode(batch, convert_to_numpy=True)
            all_embeddings.append(batch_vecs)

        embeddings = np.vstack(all_embeddings).astype("float32")
        embeddings = self._normalize(embeddings)

        self.dim = embeddings.shape[1]
        logger.info("Detected embedding dimension = %d", self.dim)

        base_index = faiss.IndexFlatIP(self.dim)
        self.index = faiss.IndexIDMap(base_index)

        ids_np = np.array(ids, dtype="int64")
        self.index.add_with_ids(embeddings, ids_np)

        logger.info("FAISS index built with %d vectors", self.index.ntotal)

        self.id_to_meta = {str(meta["faiss_vector_id"]): meta for meta in metas}
        self._persist()

        logger.info("TOTAL REBUILD TIME: %.2f minutes", (time.time() - total_start) / 60)


    # ==========================================================
    #                    INCREMENTAL OPERATIONS
    # ==========================================================
    def add_listing(self, doc):
        text = " ".join([
            self._flatten(doc.get("title")),
            self._flatten(doc.get("description"))
        ])

        vec = self.model.encode([text], convert_to_numpy=True)
        vec = self._normalize(vec.astype("float32"))

        fid = self._faiss_id(doc["_id"])

        if self.index is None:
            sample = vec
            dim = sample.shape[1]
            base_index = faiss.IndexFlatIP(dim)
            self.index = faiss.IndexIDMap(base_index)
            self.dim = dim

        self.index.add_with_ids(vec, np.array([fid], dtype="int64"))

        created_at = str(self._to_ist(datetime.datetime.now(datetime.UTC)))

        self.id_to_meta[str(fid)] = {
            "listing_id": str(doc["_id"]),
            "title": doc.get("title"),
            "description": doc.get("description"),
            "updatedAt": str(self._to_ist(doc.get("updatedAt"))),
            "faiss_vector_id": fid,
            "embedding_created_at": created_at
        }

        # NEW: write to MongoDB
        self._update_mongo_embedding_info(doc["_id"], fid, created_at)

    def remove_listing(self, listing_id):
        fid = self._faiss_id(listing_id)
        try:
            self.index.remove_ids(np.array([fid], dtype="int64"))
        except Exception as e:
            logger.debug("remove_ids failed for %s: %s", fid, e)
        self.id_to_meta.pop(str(fid), None)

    def update_listing(self, doc):
        self.remove_listing(doc["_id"])
        self.add_listing(doc)


    # ==========================================================
    #                 CHANGE DETECTION & AUTO SYNC
    # ==========================================================
    def detect_changes(self):
        mongo_docs = list(self.collection.find({}))
        mongo_map = {str(d["_id"]): d for d in mongo_docs}

        mongo_ids = set(mongo_map.keys())
        indexed_ids = set(m["listing_id"] for m in self.id_to_meta.values())

        new_ids = mongo_ids - indexed_ids
        deleted_ids = indexed_ids - mongo_ids

        updated_ids = []
        for lid in mongo_ids & indexed_ids:
            mongo_time = str(self._to_ist(mongo_map[lid].get("updatedAt")))
            fid = str(self._faiss_id(lid))
            stored_time = str(self.id_to_meta.get(fid, {}).get("updatedAt", ""))
            if mongo_time != stored_time:
                updated_ids.append(lid)

        return {
            "new": new_ids,
            "deleted": deleted_ids,
            "updated": updated_ids,
            "mongo_map": mongo_map
        }


    def sync_index(self):
        if self.index is None or (hasattr(self.index, "ntotal") and self.index.ntotal == 0):
            logger.info("Index does not exist or is empty. Doing full rebuild.")
            return self.rebuild_index()

        changes = self.detect_changes()
        new_count = len(changes["new"])
        deleted_count = len(changes["deleted"])
        updated_count = len(changes["updated"])

        total_changes = new_count + deleted_count + updated_count
        total_indexed = len(self.id_to_meta)

        if total_indexed == 0:
            return self.rebuild_index()

        change_ratio = total_changes / total_indexed if total_indexed > 0 else 1.0

        logger.info(f"Detected {total_changes} changes ({change_ratio:.2%})")

        if change_ratio > 0.05:
            logger.info("Large number of changes. Performing full rebuild.")
            return self.rebuild_index()

        logger.info("Applying incremental updates...")

        for lid in changes["new"]:
            doc = changes["mongo_map"][lid]
            try:
                self.add_listing(doc)
            except Exception as e:
                logger.error("Failed to add listing %s: %s", lid, e)

        for lid in changes["deleted"]:
            try:
                self.remove_listing(lid)
            except Exception as e:
                logger.error("Failed to remove listing %s: %s", lid, e)

        for lid in changes["updated"]:
            doc = changes["mongo_map"][lid]
            try:
                self.update_listing(doc)
            except Exception as e:
                logger.error("Failed to update listing %s: %s", lid, e)

        self._persist()
        logger.info("Incremental sync completed.")


    # ==========================================================
    #                           SEARCH
    # ==========================================================
    def search(self, query, k=5):
        if self.index is None or (hasattr(self.index, "ntotal") and self.index.ntotal == 0):
            return []

        if isinstance(query, str):
            q = self.model.encode([query], convert_to_numpy=True)
            q = self._normalize(q.astype("float32"))
        else:
            # Assume it is a numpy vector
            q = query
            if not isinstance(q, np.ndarray):
                q = np.array(q, dtype="float32")
            if len(q.shape) == 1:
                q = q.reshape(1, -1)
            q = self._normalize(q.astype("float32"))

        scores, ids = self.index.search(q, k)

        results = []
        for score, doc_id in zip(scores[0], ids[0]):
            meta = self.id_to_meta.get(str(doc_id))
            if meta:
                item = dict(meta)
                item["score"] = float(score)
                results.append(item)

        return results


# ==========================================================
#                 MANUAL REBUILD
# ==========================================================
if __name__ == "__main__":
    # Load environment variables from backend/.env
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path='../backend/.env')
    except ImportError:
        print("Note: python-dotenv not installed, using system environment variables only")
    
    # SECURITY: MongoDB URI must be set via environment variable
    mongo_uri = os.environ.get("MONGO_URI")
    if not mongo_uri:
        print("ERROR: MONGO_URI environment variable is required.")
        print("Set it in your .env file or export it in your shell.")
        exit(1)
    
    indexer = FaissTextIndexer(
        db_name=os.environ.get("ML_DB", "test"),
        collection_name=os.environ.get("ML_COLLECTION", "listings"),
        data_dir="data",
        mongo_uri=mongo_uri
    )

    indexer.rebuild_index(batch_size=64)
