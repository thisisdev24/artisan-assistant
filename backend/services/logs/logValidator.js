// services/logs/logValidator.js
//
// Safe, minimal validator used by logWriter and loggerService.
// It never throws — always returns a valid event object.

const VALID_CATEGORIES = new Set([
  "admin",
  "artist",
  "buyer",
  "business",
  "financial",
  "interaction",
  "security",
  "system",
  "embedding",
  "search",
  "vector",
  "job",
  "ai"
]);

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function normalizeString(v, fallback = null) {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return fallback;
}

function ensureEventId(event) {
  if (!event.event_id) {
    event.event_id = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

function ensureEventType(event) {
  event.event_type = normalizeString(event.event_type, "UNKNOWN_EVENT");
}

function ensureCategory(event) {
  const normalized = normalizeString(event.category, "system").toLowerCase();
  event.category = VALID_CATEGORIES.has(normalized) ? normalized : "system";
}

function validateDomainBlocks(event) {
  // We intentionally do NOT enforce strict schemas — we ensure clean object structure.
  const domBlocks = [
    "admin_context",
    "artist_profile",
    "buyer_profile",
    "order",
    "transaction",
    "interaction",
    "auth",
    "embedding",
    "search",
    "faiss",
    "job",
    "ai"
  ];

  domBlocks.forEach((b) => {
    if (event[b] && !isObject(event[b])) {
      event[b] = {}; // fallback
    }
  });
}

function ensureTimestamps(event) {
  if (!event.timestamp_client_utc) {
    event.timestamp_client_utc = new Date().toISOString();
  }
}

function ensureContext(event) {
  if (!isObject(event.device)) event.device = {};
  if (!isObject(event.network)) event.network = {};
  if (!isObject(event.geo)) event.geo = {};
  if (!isObject(event.request)) event.request = {};
  if (!isObject(event.metadata)) event.metadata = {};
  if (!isObject(event.tags)) event.tags = [];
}

function validate(event = {}) {
  const out = isObject(event) ? { ...event } : {};

  ensureEventId(out);
  ensureEventType(out);
  ensureCategory(out);
  ensureTimestamps(out);
  ensureContext(out);
  validateDomainBlocks(out);

  return out;
}

module.exports = { validate };
