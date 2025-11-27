// services/logs/logWriter.js
const { resolveModelForEvent } = require("./logRouter");
const { validateBaseEvent } = require("./logValidator");
const { enrichBaseEvent } = require("./logEnricher");

async function writeLog(rawEvent, context = {}) {
  try {
    console.log(`📝 [logWriter] Processing event: ${rawEvent.event_type}`);

    // enrichBaseEvent is now async and fetches infrastructure internally
    const enriched = await enrichBaseEvent(rawEvent, context);
    console.log(`✨ [logWriter] Enriched event: ${enriched.event_id}`);

    validateBaseEvent(enriched);
    console.log(`✅ [logWriter] Validation passed`);

    const Model = await resolveModelForEvent(enriched.event_type);
    if (!Model) {
      console.error(`❌ [logWriter] No model found for event type: ${enriched.event_type}`);
      throw new Error(`No model found for event type: ${enriched.event_type}`);
    }
    console.log(`📚 [logWriter] Resolved model: ${Model.modelName}`);

    const doc = new Model(enriched);
    await doc.save();
    console.log(`💾 [logWriter] Saved to DB: ${doc._id}`);
    return doc;
  } catch (err) {
    console.error(`❌ [logWriter] Error saving log: ${err.message}`);
    console.error(err.stack);
    throw err;
  }
}

async function writeLogs(events, context = {}) {
  const results = [];
  for (const event of events) {
    try {
      const result = await writeLog(event, context);
      results.push({ ok: true, event_id: result.event_id });
    } catch (err) {
      console.warn("[writeLogs] partial failure:", err.message);
      results.push({ ok: false, error: err.message });
    }
  }
  return results;
}

module.exports = { writeLog, writeLogs };
