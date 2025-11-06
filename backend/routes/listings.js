// backend/src/routes/listings.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const Listing = require('../models/Listing'); // adjust path if your model is elsewhere

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /api/listings/  -> list (paginated simple)
router.get('/', async (req, res) => {
  try {
    const items = await Listing.find().limit(100).lean();
    res.json(items);
  } catch (err) {
    console.error('GET /api/listings error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// GET /api/listings/:id  -> single
router.get('/:id', async (req, res) => {
  try {
    const item = await Listing.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  } catch (err) {
    console.error('GET /api/listings/:id error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// POST /api/listings  -> create (minimal, no auth)
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const created = await Listing.create(data);
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/listings error', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
