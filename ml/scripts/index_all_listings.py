# ml/scripts/index_all_listings.py
import os, requests, time
BACKEND = os.environ.get("BACKEND_API_URL", "http://localhost:5000")
ML_ENDPOINT = os.environ.get("ML_ENDPOINT", "http://localhost:8000/index")

resp = requests.get(f"{BACKEND}/api/listings?limit=1000")
resp.raise_for_status()
docs = resp.json().get("results", resp.json())
count = 0
for d in docs:
    image_urls = [img.get('url') for img in d.get('images', []) if img.get('url')]
    payload = {"listing_id": str(d.get('_id')), "title": d.get('title'), "description": d.get('description'), "image_urls": image_urls}
    r = requests.post(ML_ENDPOINT, json=payload, timeout=60)
    if r.ok:
        count += 1
    else:
        print("failed index", d.get('_id'), r.status_code, r.text)
    time.sleep(0.2)
print("indexed", count)
