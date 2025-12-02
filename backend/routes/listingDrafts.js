// routes/listingDrafts.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Listing = require('../models/artisan_point/artisan/Listing');
const upload = require('../middleware/upload'); // reuse your multer-like middleware
const { createThumbnailBuffer, createLargeThumbnailBuffer, createHighResThumbnailBuffer } = require('../utils/image');
const { uploadBuffer, getSignedReadUrl } = require('../utils/gcs');
const path = require('path');
const crypto = require('crypto');

function makeKey(filename) {
  const ext = path.extname(filename) || '.jpg';
  const id = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
  return `images/${id}${ext}`;
}

// 1) Create a draft listing (basic data only)
router.post('/draft', async (req, res) => {
  try {
    // Accept JSON body with textual fields. Images are optional and handled separately.
    const {
      main_category, title, average_rating, rating_number, features,
      description, price, store, categories, details, parent_asin, subtitle, seller
    } = req.body;

    if (!title || price === undefined || price === null || price === '') {
      return res.status(400).json({ error: 'validation', message: 'title and price required' });
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice)) {
      return res.status(400).json({ error: 'validation', message: 'price must be a number' });
    }

    const list = await Listing.create({
      main_category: main_category || 'Handmade',
      title,
      subtitle: subtitle || '',
      description: description || '',
      features: Array.isArray(features) ? features : (features ? JSON.parse(features) : []),
      price: numericPrice,
      store: store || null,
      categories: Array.isArray(categories) ? categories : (categories ? JSON.parse(categories) : []),
      details: details || null,
      parent_asin: parent_asin || null,
      seller: seller || null,
      status: 'draft'
    });

    return res.status(201).json({ id: list._id, listing: list });
  } catch (err) {
    console.error('Error creating draft:', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
});

// 2) Upload images for an existing listing (multipart/form-data)
router.post('/:id/images',
  upload.array('images', 6),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'invalid_id', message: 'Invalid id' });
      }

      const listing = await Listing.findById(id);
      if (!listing) return res.status(404).json({ error: 'not_found', message: 'Listing not found' });

      const imageFiles = req.files || [];
      if (imageFiles.length === 0) return res.status(400).json({ error: 'no_images', message: 'No images uploaded' });

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
        const highResThumbKey = key.replace(/(\.[^.]+)$/, '_thumb$3');
        await uploadBuffer(highResThumbnailBuf, highResThumbKey, 'image/jpeg');

        const thumbnailUrl = await getSignedReadUrl(thumbKey, 24 * 60 * 60 * 1000);
        const largeThumbnailUrl = await getSignedReadUrl(largeThumbKey, 24 * 60 * 60 * 1000);
        const highResThumbnailUrl = await getSignedReadUrl(highResThumbKey, 24 * 60 * 60 * 1000);

        imagesMeta.push({ thumb: thumbnailUrl, large: largeThumbnailUrl, hi_res: highResThumbnailUrl, key });
      }

      // push images into listing.images, set imageUrl if not set
      listing.images = listing.images || [];
      listing.images.push(...imagesMeta);
      if (!listing.imageUrl && imagesMeta.length > 0) {
        listing.imageUrl = imagesMeta[0].large || imagesMeta[0].hi_res || imagesMeta[0].thumb;
      }

      await listing.save();

      return res.json({ message: 'Images uploaded', images: imagesMeta, listing });
    } catch (err) {
      console.error('Error uploading images for listing', err);
      return res.status(500).json({ error: 'internal', message: err.message });
    }
  }
);

// 3) Final publish: update stock/dimensions and mark published
router.patch('/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid_id' });

    const { stock, stock_available, dimensions } = req.body;
    const update = {};

    if (stock !== undefined) update.stock = Number(stock);
    if (stock_available !== undefined) update.stock_available = Boolean(stock_available);
    if (dimensions) {
      // expect dimensions object { height, length, width, weight }
      update.dimensions = {
        height: dimensions.height !== undefined ? Number(dimensions.height) : undefined,
        length: dimensions.length !== undefined ? Number(dimensions.length) : undefined,
        width: dimensions.width !== undefined ? Number(dimensions.width) : undefined,
        weight: dimensions.weight !== undefined ? Number(dimensions.weight) : undefined,
      };
    }

    update.status = 'published';

    const updated = await Listing.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'not_found' });

    return res.json({ message: 'Published', listing: updated });
  } catch (err) {
    console.error('Error publishing listing', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
});

module.exports = router;
