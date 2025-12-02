// routes/logRoutes.js
const express = require("express");
const router = express.Router();
const { ingestLogs } = require("../controllers/logController");

router.post("/ingest", ingestLogs);

module.exports = router;
