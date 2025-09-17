from sentence_transformers import SentenceTransformer
texts = [
    "Handmade wooden bowl, diameter 8 inches, polished cherry wood.",
    "Cotton block-printed scarf, vibrant indigo pattern, 180x50 cm.",
    "Brass candle holder with floral engravings, local artisan handwork."
]

model = SentenceTransformer('all-MiniLM-L6-v2')  # good small model
embeddings = model.encode(texts)
for t, emb in zip(texts, embeddings):
    print("TEXT:", t)
    print("EMB len:", len(emb), "sample:", emb[:8].tolist())
    print("----")
