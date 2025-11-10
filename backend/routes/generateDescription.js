// backend/src/routes/generateDescription.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const ML = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// POST /  <- mounted at /api/generate_description in app.js
router.post('/', async (req, res) => {
  try {
    // forward client's JSON body to ML service
    const resp = await axios.post(`${ML}/generate_description`, req.body, { timeout: 15000 });
    return res.json(resp.data);
  } catch (err) {
    console.error('generate_description proxy error', err?.response?.data || err.message);

    // Fallback: simple template description if ML unreachable
    const title = (req.body && req.body.title) ? String(req.body.title).trim() : 'Handcrafted product';
    let features = req.body && req.body.features ? req.body.features : [];
    if (typeof features === 'string') {
      try { features = JSON.parse(features); } catch (e) { features = features.split(',').map(s => s.trim()).filter(Boolean); }
    }
    const featStr = Array.isArray(features) && features.length ? ' Features: ' + features.slice(0,5).join(', ') + '.' : '';
    const category = req.body && req.body.category ? ` Category: ${req.body.category}.` : '';
    const fallback = `${title}.${featStr}${category}`;
    return res.json({ description: fallback });
  }
});

module.exports = router;
