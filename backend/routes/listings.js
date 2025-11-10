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
// allow both images and videos
router.post('/upload',
  upload.fields([{ name: 'images', maxCount: 6 }, { name: 'videos', maxCount: 6 }]),
  async (req, res) => {
    try {
      const {
        main_category, title, average_rating, rating_number, features,
        description, price, store, categories, details, parent_asin
      } = req.body;

      if (!title || !price) return res.status(400).json({ error: 'validation', message: 'title and price required' });
      const numericPrice = parseFloat(price);
      if (Number.isNaN(numericPrice)) return res.status(400).json({ error: 'validation', message: 'price must be a number' });

      // req.files is an object when using fields()
      const imageFiles = (req.files && req.files['images']) || [];
      const videoFiles = (req.files && req.files['videos']) || [];

      const imagesMeta = [];
      for (const file of imageFiles) {
        const key = makeKey(file.originalname);
        await uploadBuffer(file.buffer, key, file.mimetype);

        let thumbBuf;
        try {
          thumbBuf = await createThumbnailBuffer(file.buffer, 320);
        } catch (thumbErr) {
          console.warn('Thumbnail generation failed for', file.originalname, thumbErr);
          thumbBuf = file.buffer;
        }
        const thumbKey = key.replace(/(\.[^.]+)$/, '_thumb$1');
        await uploadBuffer(thumbBuf, thumbKey, 'image/jpeg');

        const url = await getSignedReadUrl(key, 24 * 60 * 60 * 1000);
        const thumbnailUrl = await getSignedReadUrl(thumbKey, 24 * 60 * 60 * 1000);

        imagesMeta.push({ key, url, thumbnailUrl });
      }

      const videosMeta = [];
      for (const file of videoFiles) {
        const key = makeKey(file.originalname);
        await uploadBuffer(file.buffer, key, file.mimetype);
        const url = await getSignedReadUrl(key, 24 * 60 * 60 * 1000);
        videosMeta.push({ key, url });
      }

      const listing = await Listing.create({
        main_category, title, average_rating, rating_number, features,
        description, store, categories, details, parent_asin,
        price: numericPrice,
        images: imagesMeta,   // array of {key,url,thumbnailUrl}
        videos: videosMeta    // array of {key,url}
      });

      res.status(201).json(listing);
    } catch (err) {
      console.error('List create err', err);
      if (err.name === 'ValidationError') return res.status(400).json({ error: 'validation', message: err.message });
      res.status(500).json({ error: 'internal', message: err.message });
    }
  }
);


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
