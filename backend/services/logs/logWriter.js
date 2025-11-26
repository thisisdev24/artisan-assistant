// services/logs/logWriter.js (updated writeLog)
const { resolveModelForEvent } = require("./logRouter");
const { validateBaseEvent } = require("./logValidator");
const { enrichBaseEvent } = require("./logEnricher");
const { getInfrastructureSnapshot } = require("./systemMonitor"); // adjust path as needed

async function writeLog(rawEvent, context = {}) {
  const enriched = enrichBaseEvent(rawEvent, context);

  // if enricher indicated full infra required, fetch it now and merge
  if (enriched.__need_full_infra) {
    try {
      const infra = await getInfrastructureSnapshot();
      enriched.infrastructure = { ...(enriched.infrastructure || {}), ...(infra || {}) };
      delete enriched.__need_full_infra;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[logWriter] failed to attach full infra snapshot:", err && err.message);
    }
  }

  validateBaseEvent(enriched);

  const Model = await resolveModelForEvent(enriched.event_type);
  const doc = new Model(enriched);
  await doc.save();
  return doc;
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
