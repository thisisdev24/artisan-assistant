const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const Artisan = require('../models/Artisan');
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

function getStore(id) {

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
  });

// GET list
// in backend/src/routes/listings.js

// GET /api/listings/retrieve?store=<storeName>&artisanId=<artisanId>&page=1&limit=30
router.get('/retrieve', async (req, res) => {
  try {
    const { store: storeQuery, artisanId } = req.query;
    // default page=1 and limit=30 (30 per page)
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (pageNum - 1) * lim;

    let storeName = null;
    if (storeQuery) {
      storeName = String(storeQuery).trim();
    } else if (artisanId) {
      const artisan = await Artisan.findById(artisanId).select('store').lean();
      if (!artisan) return res.status(404).json({ error: 'artisan_not_found' });
      storeName = artisan.store;
    }

    const filter = storeName ? { store: storeName } : {};

    // Try to fetch with index-backed sort and pagination
    try {
      // Fetch documents and total count in parallel
      const [docs, total] = await Promise.all([
        Listing.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(lim)
          .select('title description price images average_rating rating_number createdAt')
          .lean(),
        Listing.countDocuments(filter)
      ]);

      const mapped = docs.map(doc => {
        let imageUrl;
        if (Array.isArray(doc.images) && doc.images.length > 0) {
          imageUrl = doc.images[0].thumbnailUrl || doc.images[0].url;
        }
        return {
          _id: doc._id,
          title: doc.title,
          description: doc.description,
          price: doc.price,
          average_rating: doc.average_rating,
          rating_number: doc.rating_number,
          imageUrl,
          createdAt: doc.createdAt
        };
      });

      return res.json({ results: mapped, total, page: pageNum, limit: lim });
    } catch (err) {
      console.warn('Primary find() with sort failed, attempting fallback query:', err.message);

      // Fallback: small unsorted set and approximate total
      const fallbackDocs = await Listing.find(filter)
        .limit(Math.min(lim, 50))
        .select('title description price images average_rating rating_number createdAt')
        .lean();

      const mappedFallback = fallbackDocs.map(doc => {
        let imageUrl;
        if (Array.isArray(doc.images) && doc.images.length > 0) {
          imageUrl = doc.images[0].thumbnailUrl || doc.images[0].url;
        }
        return {
          _id: doc._id,
          title: doc.title,
          description: doc.description,
          price: doc.price,
          average_rating: doc.average_rating,
          rating_number: doc.rating_number,
          imageUrl,
          createdAt: doc.createdAt
        };
      });

      // total fallback: use collection count (may be expensive)
      const total = await Listing.countDocuments(filter).catch(() => mappedFallback.length);

      return res.json({ results: mappedFallback, total, page: pageNum, limit: lim });
    }
  } catch (err) {
    console.error('Error in /retrieve:', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
});

module.exports = router;
