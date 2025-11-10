# ml/app.py
import os
from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
import numpy as np
import io
from PIL import Image
import requests
from models import get_text_model, get_image_model
from faiss_index import FaissIndex
from generate_description import generate_description

APP_PORT = int(os.environ.get("PORT", 8000))
DATA_DIR = os.environ.get("DATA_DIR", "data")
os.makedirs(DATA_DIR, exist_ok=True)

# models
text_model = get_text_model()
image_model = get_image_model()

# dimension (models should match)
DIM = text_model.get_sentence_embedding_dimension()  # note: clip model may have different dim; choose strategy
# If dim differs between text and image models, project to same dim or average after mapping. For simplicity require same dim.
index = FaissIndex(dim=DIM, index_path=os.path.join(DATA_DIR, 'index.faiss'), meta_path=os.path.join(DATA_DIR, 'meta.json'))

app = FastAPI(title="Embedding & FAISS Service")

class GenReq(BaseModel):
    title: str
    features: list = None
    category: str = None
    tone: str = "friendly and concise"

@app.post("/generate_description")
async def gen_description(req: GenReq):
    desc = generate_description(title=req.title, features=req.features or [], category=req.category, tone=req.tone)
    return {"description": desc}

class IndexRequest(BaseModel):
    listing_id: str
    title: str = None
    description: str = None
    image_urls: list = None  # optional list of image URLs

def _fetch_image_bytes(url):
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.content

def _encode_text(texts):
    return np.array(text_model.encode(texts, convert_to_numpy=True))

def _encode_images(img_bytes_list):
    imgs = []
    for b in img_bytes_list:
        img = Image.open(io.BytesIO(b)).convert('RGB')
        imgs.append(img)
    return np.array(image_model.encode(imgs, convert_to_numpy=True))

@app.post("/embed")
async def embed_text(text: str = Form(None), file: UploadFile = File(None)):
    """
    Returns embedding for provided text or uploaded image.
    """
    if file:
        b = await file.read()
        img_vec = _encode_images([b])[0]
        return {"embedding": img_vec.tolist()}
    if text is None:
        return {"error": "text or file required"}
    vec = _encode_text([text])[0]
    return {"embedding": vec.tolist()}

@app.post("/index")
async def index_listing(req: IndexRequest):
    """
    Build embedding for a listing (text + images), add to FAISS index.
    """
    # Build text vector
    vectors = []
    metas = []
    text_parts = []
    if req.title:
        text_parts.append(req.title)
    if req.description:
        text_parts.append(req.description)
    if len(text_parts) > 0:
        txt = " . ".join(text_parts)
        txt_vec = _encode_text([txt])[0]
    else:
        txt_vec = None

    img_vecs = []
    if req.image_urls:
        for url in req.image_urls:
            try:
                b = _fetch_image_bytes(url)
                v = _encode_images([b])[0]
                img_vecs.append(v)
            except Exception as e:
                print("image fetch/encode failed", url, e)

    # Strategy: combine text vec and average image vecs (if present)
    if txt_vec is not None and len(img_vecs) > 0:
        img_mean = np.mean(np.stack(img_vecs), axis=0)
        combined = (txt_vec + img_mean) / 2.0
    elif txt_vec is not None:
        combined = txt_vec
    elif len(img_vecs) > 0:
        combined = np.mean(np.stack(img_vecs), axis=0)
    else:
        return {"error": "no content to index"}, 400

    vectors.append(combined)
    metas.append({"listing_id": req.listing_id, "title": req.title, "image_count": len(img_vecs)})

    index.add(np.vstack(vectors), metas)
    return {"status": "ok", "indexed": req.listing_id}

@app.post("/search")
async def search(text: str = Form(None), k: int = Form(10), file: UploadFile = File(None)):
    # build query embedding
    if file:
        b = await file.read()
        qvec = _encode_images([b])[0]
    elif text:
        qvec = _encode_text([text])[0]
    else:
        return {"error": "text or image required"}, 400

    results = index.search(qvec, top_k=k)
    return {"results": results}

@app.post("/reindex_all")
async def reindex_all():
    # helper placeholder to call backend API to fetch listings and reindex
    backend_url = os.environ.get("BACKEND_API_URL", "http://localhost:5000")
    resp = requests.get(f"{backend_url}/api/listings?limit=1000")
    resp.raise_for_status()
    docs = resp.json().get("results", resp.json())
    for doc in docs:
        image_urls = [img.get('url') for img in doc.get('images', []) if img.get('url')]
        payload = {"listing_id": str(doc.get('_id')), "title": doc.get('title'), "description": doc.get('description'), "image_urls": image_urls}
        try:
            requests.post(f"http://localhost:{APP_PORT}/index", json=payload, timeout=30)
        except Exception as e:
            print("index error for", doc.get('_id'), e)
    return {"status": "reindex_started", "count": len(docs)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=APP_PORT)
