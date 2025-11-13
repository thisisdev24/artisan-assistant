// backend/src/routes/generateDescription.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const ML = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// POST /  <- mounted at /api/generate_description in app.js
router.post('/generate_description', async (req, res) => {
  try {
    // forward client's JSON body to ML service
    const resp = await axios.post(`${ML}/generate_description`, req.body, { timeout: 15000 });
    return res.json(resp.data);
  } catch (err) {
    console.error('generate_description proxy error', err?.response?.data || err.message);
  }
});

module.exports = router;
