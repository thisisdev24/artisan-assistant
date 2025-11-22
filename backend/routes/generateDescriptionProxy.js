// routes/generateDescriptionProxy.js
const express = require("express");
const axios = require("axios");

const router = express.Router();

// Config via env
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_ENDPOINT = `${ML_SERVICE_URL.replace(/\/$/, "")}/generate_description`;
const ML_REQUEST_TIMEOUT_MS = parseInt(process.env.ML_REQUEST_TIMEOUT_MS || "8000", 10); // per-attempt timeout
const ML_RETRIES = parseInt(process.env.ML_RETRIES || "2", 10); // number of retries on failure
const ML_RETRY_DELAY_MS = parseInt(process.env.ML_RETRY_DELAY_MS || "500", 10); // base delay
const ENABLE_FALLBACK = process.env.ML_FALLBACK_ENABLED !== "0"; // fallback enabled by default

function simpleFallbackDescription(title, features = [], category) {
  const safeTitle = (title || "").trim();
  const featList = Array.isArray(features) ? features.filter(Boolean).slice(0, 6) : [];
  const catPart = category ? `${category.trim()}. ` : "";
  if (!safeTitle) {
    return "A well-crafted handmade product with attention to detail.";
  }
  if (featList.length === 0) {
    return `${safeTitle}. ${catPart}An attractively made product designed with quality and usability in mind.`;
  }
  // turn features into 1-3 short benefit sentences
  const fragments = featList.map((f, idx) => {
    const clean = String(f).trim();
    // simple paraphrase heuristics
    if (/made of|made from/i.test(clean)) {
      return `Crafted from ${clean.replace(/made of|made from/i, "").trim()}.`;
    }
    if (/hand|handmade|handcrafted/i.test(clean)) {
      return `Hand-finished by skilled artisans.`;
    }
    if (/eco|recycl|sustain/i.test(clean)) {
      return `Designed with eco-friendly materials.`;
    }
    return `${clean.replace(/^\.*\s*/, "").replace(/\.*$/, "")}.`;
  });
  return `${safeTitle}. ${catPart}${fragments.slice(0, 3).join(" ")}`;
}

async function callMlService(payload) {
  // try up to ML_RETRIES+1 attempts
  let attempt = 0;
  let lastErr = null;
  while (attempt <= ML_RETRIES) {
    try {
      const resp = await axios.post(ML_ENDPOINT, payload, {
        timeout: ML_REQUEST_TIMEOUT_MS,
        headers: { "Content-Type": "application/json" },
      });
      // Return only if we got a 2xx response
      if (resp && resp.status >= 200 && resp.status < 300 && resp.data) {
        return resp.data;
      }
      lastErr = new Error(`Non-2xx response: ${resp.status}`);
    } catch (err) {
      lastErr = err;
    }
    attempt += 1;
    // exponential backoff
    const delay = ML_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
    await new Promise((res) => setTimeout(res, delay));
  }
  throw lastErr;
}

router.post("/generate_description", async (req, res) => {
  const body = req.body || {};
  // Normalise expected fields (title, features, category, tone)
  const title = (body.title || "").toString();
  const features = Array.isArray(body.features) ? body.features : body.features ? [body.features] : [];
  const category = body.category || undefined;
  const tone = body.tone || undefined;

  // simple validation
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title_required", description: "" });
  }

  const mlPayload = {
    title: title,
    features,
    category,
    tone,
  };

  try {
    const mlResp = await callMlService(mlPayload);
    // Expecting mlResp = { description: "..." } per your Python service
    if (mlResp && typeof mlResp.description === "string" && mlResp.description.trim()) {
      return res.json({ description: mlResp.description });
    }
    // If ML responded but no useful description, fallback
    if (ENABLE_FALLBACK) {
      const fallback = simpleFallbackDescription(title, features, category);
      return res.json({ description: fallback, warning: "ml_no_description_fallback_used" });
    }
    // otherwise return empty
    return res.status(502).json({ error: "no_description_from_ml" });
  } catch (err) {
    // On complete failure, return fallback or error
    if (ENABLE_FALLBACK) {
      const fallback = simpleFallbackDescription(title, features, category);
      return res.status(200).json({ description: fallback, warning: "ml_service_unavailable", detail: String(err.message || err) });
    }
    return res.status(502).json({ error: "ml_service_unavailable", detail: String(err.message || err) });
  }
});

module.exports = router;
