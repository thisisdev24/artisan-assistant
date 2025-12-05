# ml/debug_detect.py
from color_detector import download_image, pil_from_bytes, SAM_AVAILABLE, REMBG_AVAILABLE, TORCH_AVAILABLE
from color_detector import mask_with_sam, mask_with_rembg, naive_mask, process_image_url, extract_colors_from_pixels
import sys, io, os
from PIL import Image
import numpy as np

def debug_url(url, device="cpu", top_k=3):
    print("URL:", url)
    print("Device requested:", device)
    print("SAM available:", SAM_AVAILABLE)
    print("rembg available:", REMBG_AVAILABLE)
    print("torch available:", TORCH_AVAILABLE)
    b = download_image(url)
    if not b:
        print(">>> download_image returned None (could not fetch).")
        return
    print("Downloaded bytes:", len(b))
    try:
        pil = pil_from_bytes(b)
    except Exception as e:
        print("PIL open failed:", repr(e))
        return
    print("PIL image mode/size:", pil.mode, pil.size)

    # Try SAM mask (if available)
    m_sam = None
    if SAM_AVAILABLE and TORCH_AVAILABLE:
        try:
            print("Trying SAM mask (may be slow)...")
            m_sam = mask_with_sam(pil, device=device)
            print("SAM mask type:", type(m_sam), "sum:", None if m_sam is None else int(np.array(m_sam).sum()))
        except Exception as e:
            print("SAM raised:", repr(e))
            m_sam = None

    # Try rembg
    m_rembg = None
    if REMBG_AVAILABLE:
        try:
            print("Trying rembg mask...")
            m_rembg = mask_with_rembg(pil)
            print("rembg mask sum:", None if m_rembg is None else int(m_rembg.sum()))
        except Exception as e:
            print("rembg raised:", repr(e))
            m_rembg = None

    print("Trying naive mask...")
    try:
        m_naive = naive_mask(pil)
        print("naive mask sum:", int(m_naive.sum()))
    except Exception as e:
        print("naive mask raised:", repr(e))
        m_naive = None

    # Run the full high-level processor to see what it returns
    print("Running process_image_url(...)")
    try:
        colors = process_image_url(url, top_k=top_k, device=device)
        print("process_image_url returned:", colors)
    except Exception as e:
        print("process_image_url exception:", repr(e))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_detect.py <image_url> [device(cpu|cuda)]")
        sys.exit(1)
    url = sys.argv[1]
    device = "cpu"
    if len(sys.argv) >= 3:
        device = sys.argv[2]
    debug_url(url, device=device)
