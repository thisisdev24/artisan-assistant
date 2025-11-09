# ml/models.py
from sentence_transformers import SentenceTransformer
import threading

# load models once (thread-safe)
_text_model = None
_image_model = None
_lock = threading.Lock()

def get_text_model():
    global _text_model
    with _lock:
        if _text_model is None:
            _text_model = SentenceTransformer('all-MiniLM-L6-v2')
        return _text_model

def get_image_model():
    global _image_model
    with _lock:
        if _image_model is None:
            # clip model for images
            _image_model = SentenceTransformer('clip-ViT-B-32')
        return _image_model
