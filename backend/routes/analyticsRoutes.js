// routes/analyticsRoutes.js
const express = require("express");
const { triggerDailyETL, fetchAnalytics } = require("./analyticsController");

const router = express.Router();

// POST /api/analytics/etl/daily  { date?: ISO }
router.post("/etl/daily", triggerDailyETL);

// GET /api/analytics/:type?page=1&limit=50&date=2025-11-13
router.get("/:type", fetchAnalytics);

module.exports = router;
