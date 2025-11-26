// routes/logRoutes.js
const express = require("express");
const router = express.Router();
const { ingestLogs } = require("../controllers/logController");

// POST /api/logs/ingest
router.post("/ingest", ingestLogs);

module.exports = router;
