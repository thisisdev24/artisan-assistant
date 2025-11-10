const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const upload = require('../middleware/upload');
const { createThumbnailBuffer } = require('../utils/image');
const { uploadBuffer, getSignedReadUrl } = require('../utils/gcs');
const path = require('path');
const crypto = require('crypto');

function makeKey(filename) {
  const ext = path.extname(filename) || '.jpg';
  const id = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
  return `images/${id}${ext}`;
}

// Create listing (multipart/form-data)
router.post('/upload', upload.array('images', 6), async (req, res) => {
  try {
    const { title, description, price } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'validation', message: 'title and price required' });
    const numericPrice = parseFloat(price);
    if (Number.isNaN(numericPrice)) return res.status(400).json({ error: 'validation', message: 'price must be a number' });

    const imagesMeta = [];
    for (const file of req.files || []) {
      const key = makeKey(file.originalname);
      await uploadBuffer(file.buffer, key, file.mimetype);

      let thumbBuf;
      try {
        thumbBuf = await createThumbnailBuffer(file.buffer, 320);
      } catch (thumbErr) {
        console.warn('Thumbnail generation failed for', file.originalname, thumbErr);
        // fallback: use original image buffer (or create a tiny placeholder)
        thumbBuf = file.buffer;
      }
      const thumbKey = key.replace(/(\.[^.]+)$/, '_thumb$1');
      await uploadBuffer(thumbBuf, thumbKey, 'image/jpeg');

      const url = await getSignedReadUrl(key, 24 * 60 * 60 * 1000);
      const thumbnailUrl = await getSignedReadUrl(thumbKey, 24 * 60 * 60 * 1000);

      imagesMeta.push({ key, url, thumbnailUrl });
    }

    const listing = await Listing.create({
      title, description, price: numericPrice,
      images: imagesMeta
    });

    // Optionally trigger ML embedding job here (async)

    res.status(201).json(listing);
  } catch (err) {
    console.error('List create err', err);
    if (err.name === 'ValidationError') return res.status(400).json({ error: 'validation', message: err.message });
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// GET list
// inside backend/src/routes/listings.js (add if missing)
router.get('/:id', async (req, res) => {
  try {
    const doc = await Listing.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});


module.exports = router;
