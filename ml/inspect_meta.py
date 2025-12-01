import json
import os

meta_path = "data/meta.json"
if os.path.exists(meta_path):
    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        keys = list(data.keys())
        if keys:
            first_item = data[keys[0]]
            print("First item images:", json.dumps(first_item.get("images"), indent=2))
            print("First item keys:", first_item.keys())
        else:
            print("Meta is empty")
else:
    print("meta.json not found")
