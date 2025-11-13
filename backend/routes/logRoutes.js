// routes/logRoutes.js
const express = require("express");
const { postLog } = require("./logController");

const router = express.Router();

// POST /api/logs
router.post("/", postLog);

module.exports = router;
