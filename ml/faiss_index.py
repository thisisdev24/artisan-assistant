# ml/faiss_index.py
import faiss
import numpy as np
import json
import os

class FaissIndex:
    def __init__(self, dim, index_path='data/index.faiss', meta_path='data/meta.json'):
        self.dim = dim
        self.index_path = index_path
        self.meta_path = meta_path
        self.index = None
        self.id_to_meta = {}   # id (int) -> metadata dict
        self._load_or_create()

    def _load_or_create(self):
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        if os.path.exists(self.index_path) and os.path.exists(self.meta_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.meta_path, 'r', encoding='utf8') as f:
                self.id_to_meta = json.load(f)
            # ensure numpy dtype
        else:
            # use IndexFlatIP for inner-product on normalized vectors
            self.index = faiss.IndexFlatIP(self.dim)

    def _normalize(self, vecs: np.ndarray):
        # normalize rows to unit length for cosine via inner product
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return vecs / norms

    def add(self, vectors: np.ndarray, metas: list):
        """
        vectors: np.array shape (n, dim)
        metas: list of dicts length n, must include 'listing_id'
        """
        n = vectors.shape[0]
        vectors = vectors.astype('float32')
        vectors = self._normalize(vectors)
        next_id = self.index.ntotal
        self.index.add(vectors)
        for i, meta in enumerate(metas):
            self.id_to_meta[str(next_id + i)] = meta
        self._persist()

    def search(self, query_vec: np.ndarray, top_k=10):
        q = query_vec.astype('float32').reshape(1, -1)
        q = self._normalize(q)
        D, I = self.index.search(q, top_k)
        results = []
        for score, idx in zip(D[0].tolist(), I[0].tolist()):
            if idx == -1:
                continue
            meta = self.id_to_meta.get(str(int(idx)), {})
            results.append({'score': float(score), 'meta': meta})
        return results

    def _persist(self):
        faiss.write_index(self.index, self.index_path)
        with open(self.meta_path, 'w', encoding='utf8') as f:
            json.dump(self.id_to_meta, f, ensure_ascii=False, indent=2)
