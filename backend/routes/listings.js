const express = require('express');
const router = express.Router();
const Listing = require('../models/artisan_point/artisan/Listing');
const Artisan = require('../models/artisan_point/artisan/Artisan');
const upload = require('../middleware/upload');
const { createThumbnailBuffer, createLargeThumbnailBuffer, createHighResThumbnailBuffer } = require('../utils/image');
const { uploadBuffer, getSignedReadUrl } = require('../utils/gcs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');

function makeKey(filename) {
  const ext = path.extname(filename) || '.jpg';
  const id = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
  return `images/${id}${ext}`;
}

// upload route (unchanged)
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

      const imageFiles = (req.files && req.files['images']) || [];
      if (imageFiles.length === 0) return res.status(400).json({ error: 'validation', message: 'Upload minimum one image of the product' });
      const videoFiles = (req.files && req.files['videos']) || [];

      const imagesMeta = [];
      for (const file of imageFiles) {
        const key = makeKey(file.originalname);
        await uploadBuffer(file.buffer, key, file.mimetype);

        let thumbBuf, largeThumbnailBuf, highResThumbnailBuf;
        try {
          thumbBuf = await createThumbnailBuffer(file.buffer, 320);
          largeThumbnailBuf = await createLargeThumbnailBuffer(file.buffer, 640);
          highResThumbnailBuf = await createHighResThumbnailBuffer(file.buffer, 1024);

        } catch (thumbErr) {
          console.warn('Thumbnail generation failed for', file.originalname, thumbErr);
          thumbBuf = file.buffer;
          largeThumbnailBuf = file.buffer;
          highResThumbnailBuf = file.buffer;
        }

        const thumbKey = key.replace(/(\.[^.]+)$/, '_thumb$1');
        await uploadBuffer(thumbBuf, thumbKey, 'image/jpeg');
        const largeThumbKey = key.replace(/(\.[^.]+)$/, '_thumb$2');
        await uploadBuffer(largeThumbnailBuf, largeThumbKey, 'image/jpeg');
        const highResThumbKey = key.replace(/(\.[^.]+)$/, '_thumb$3')
        await uploadBuffer(highResThumbnailBuf, highResThumbKey, 'image/jpeg');

        const thumbnailUrl = await getSignedReadUrl(thumbKey, 24 * 60 * 60 * 1000);
        const largeThumbnailUrl = await getSignedReadUrl(largeThumbKey, 24 * 60 * 60 * 1000);
        const highResThumbnailUrl = await getSignedReadUrl(highResThumbKey, 24 * 60 * 60 * 1000);

        imagesMeta.push({ thumb: thumbnailUrl, large: largeThumbnailUrl, hi_res: highResThumbnailUrl });
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
        images: imagesMeta,
        videos: videosMeta
      });

      res.status(201).json(listing);
    } catch (err) {
      console.error('List create err', err);
      if (err.name === 'ValidationError') return res.status(400).json({ error: 'validation', message: err.message });
      res.status(500).json({ error: 'internal', message: err.message });
    }
  });

// retrieve with pagination (keeps existing behaviour)
router.get('/retrieve', async (req, res) => {
  try {
    const { store: storeQuery, artisanId } = req.query;
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

    try {
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
        let imageUrl = null;
        if (Array.isArray(doc.images) && doc.images.length > 0) {
          imageUrl = doc.images[0].large || doc.images[0].hi_res;
        }

        let desc = doc.description || '';
        if (desc.length > 200) {
          desc = desc.replaceAll(desc.substring(200), '...');
        }

        return {
          _id: doc._id,
          title: doc.title,
          description: desc,
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

      const fallbackDocs = await Listing.find(filter)
        .limit(Math.min(lim, 50))
        .select('title description price images average_rating rating_number createdAt')
        .lean();

      const mappedFallback = fallbackDocs.map(doc => {
        let imageUrl = null;
        if (Array.isArray(doc.images) && doc.images.length > 0) {
          imageUrl = doc.images[0].large || doc.images[0].hi_res;
        }

        let desc = doc.description || '';
        if (desc.length > 200) {
          desc = desc.replaceAll(desc.substring(200), '...');
        }

        return {
          _id: doc._id,
          title: doc.title,
          description: desc,
          price: doc.price,
          average_rating: doc.average_rating,
          rating_number: doc.rating_number,
          imageUrl,
          createdAt: doc.createdAt
        };
      });

      const total = await Listing.countDocuments(filter).catch(() => mappedFallback.length);

      return res.json({ results: mappedFallback, total, page: pageNum, limit: lim });
    }
  } catch (err) {
    console.error('Error in /retrieve:', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
});

/**
 * SEARCH route
 * Flow:
 *  - frontend calls GET /api/listings/search?query=...
 *  - backend forwards the query to ML service POST /generate_search_results
 *  - ML returns list of FAISS meta objects (each includes "listing_id")
 *  - backend fetches the Listing documents for those IDs and returns enriched results
 */
router.get('/search', async (req, res) => {
  try {
    const searchQuery = (req.query.query || req.query.q || '').trim();
    if (!searchQuery) return res.status(400).json({ error: 'missing_query' });

    const ML = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    // call ML service
    const mlResp = await axios.post(`${ML}/generate_search_results`, { query: searchQuery, k: 50 }, { timeout: 20000 });
    const mlResults = (mlResp.data && mlResp.data.results) || [];

    if (!Array.isArray(mlResults) || mlResults.length === 0) {
      return res.json({ results: [], total: 0, page: 1, limit: 0 });
    }

    // collect listing ids (these should be the original Mongo _id strings)
    const listingIds = mlResults.map(r => r.listing_id).filter(Boolean);
    // convert to ObjectId safely
    const objectIds = listingIds.map(id => {
      try { return mongoose.Types.ObjectId(id); } catch (e) { return null; }
    }).filter(Boolean);

    // fetch listings
    const docs = await Listing.find({ _id: { $in: objectIds } })
      .select('title description price images average_rating rating_number createdAt')
      .lean();

    const docsById = {};
    for (const d of docs) docsById[String(d._id)] = d;

    // preserve order given by mlResults
    const enriched = mlResults.map(r => {
      const lid = String(r.listing_id);
      const doc = docsById[lid] || {};
      let imageUrl = null;
      if (Array.isArray(doc.images) && doc.images.length > 0) {
        imageUrl = doc.images[0].large || doc.images[0].hi_res || doc.images[0].thumb;
      }

      let desc = doc.description || r.description || '';
      if (desc.length > 200) {
        desc = desc.replaceAll(desc.substring(200), '...');
      }

      return {
        _id: lid,
        title: r.title || doc.title,
        description: desc,
        price: doc.price || r.price || 0,
        imageUrl,
        images: doc.images, // Return full images array
        average_rating: doc.average_rating || 0,
        rating_number: doc.rating_number || 0,
        score: r.score || null
      };
    });

    return res.json({ results: enriched, total: enriched.length, page: 1, limit: enriched.length });
  } catch (err) {
    console.error('Error in /search:', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'internal', message: err.message || 'search_failed' });
  }
});

// Get a single listing by ID (must be after /retrieve and /search to avoid conflicts)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'invalid_id', message: 'Invalid listing ID' });
    }

    const listing = await Listing.findById(id).lean();
    if (!listing) {
      return res.status(404).json({ error: 'not_found', message: 'Listing not found' });
    }

    return res.json(listing);
  } catch (err) {
    console.error('Error fetching listing:', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
});

module.exports = router;
