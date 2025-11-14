// backend/src/routes/generateSearchResults.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const ML = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// POST /  <- mounted at /api/generate_description in app.js
router.post('/generate_search_results', async (req, res) => {
  try {
    // forward client's JSON body to ML service
    const resp = await axios.post(`${ML}/generate_search_results`, req.body, { timeout: 15000 });
    return res.json(resp.data);
  } catch (err) {
    console.error('generate_search_results proxy error', err?.response?.data || err.message);
  }
});

module.exports = router;
