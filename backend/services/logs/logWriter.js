// services/logs/logWriter.js
// (Updated safely, without breaking previous logic)

const asyncWriter = require("./asyncWriter");
const { validate } = require("./logValidator");   // <-- new addition

function ensureEventId(evt) {
  if (!evt.event_id) {
    evt.event_id = `srv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function ensureCategory(evt) {
  if (!evt.category) {
    evt.category = (evt.event_type || "")
      .toLowerCase()
      .includes("auth")
      ? "security"
      : "interaction";
  }
}

async function writeLog(event, context = {}) {
  try {
    // Old logic (kept)
    ensureEventId(event);
    ensureCategory(event);
    if (!event.event_type) event.event_type = "UNKNOWN";

    // New required logic: validate → returns a safe copy
    const safeEvent = validate(event);

    // final enqueue (unchanged)
    await asyncWriter.enqueue(safeEvent, context);

  } catch (err) {
    console.error("[logWriter] writeLog error", err);
  }
}

module.exports = { writeLog };
