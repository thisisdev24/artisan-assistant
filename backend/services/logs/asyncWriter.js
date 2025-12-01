// services/logs/asyncWriter.js
const metrics = require("./asyncWriter.metrics");
const { enrichBaseEvent } = require("./logEnricher");
const { resolveModelForEvent } = require("./logRouter");
const { redact } = require("../../utils/redactor") || ((x) => x);
const { sleep } = require("../../utils/time") || ((ms) => new Promise(r => setTimeout(r, ms)));

const BATCH_MAX = Number(process.env.LOG_BATCH_MAX || 400);
const FLUSH_INTERVAL_MS = Number(process.env.LOG_FLUSH_MS || 1000);
const MAX_CONCURRENCY = Number(process.env.LOG_CONCURRENCY || 4);
const MAX_RETRIES = Number(process.env.LOG_MAX_RETRIES || 3);
const RETRY_BASE_MS = Number(process.env.LOG_RETRY_BASE_MS || 200);

let queue = [];
let flushing = false;

function enqueue(rawEvent, context = {}) {
    queue.push({ rawEvent, context, enqueuedAt: Date.now() });
    metrics.markEnqueued(1);
    metrics.updateQueueLength(queue.length);
    if (queue.length >= BATCH_MAX) flush().catch(e => console.error(e));
}

async function flush() {
    if (flushing) return;
    flushing = true;
    metrics.markBatchAttempt();
    try {
        if (!queue.length) return;
        const items = queue.splice(0, Math.min(queue.length, BATCH_MAX * 4));
        metrics.updateQueueLength(queue.length);
        const enrichedItems = [];
        for (const it of items) {
            try {
                const enriched = await enrichBaseEvent(it.rawEvent, it.context);
                enrichedItems.push(redact(enriched));
            } catch (err) {
                console.warn("[asyncWriter] enrich failed:", err.message);
                enrichedItems.push({
                    event_id: it.rawEvent.event_id || `fallback_${Date.now()}`,
                    event_type: it.rawEvent.event_type || "SYSTEM_FALLBACK",
                    category: it.rawEvent.category || "system",
                    timestamp_received_ist: new Date().toISOString(),
                    metadata: { enrich_error: err.message }
                });
            }
        }

        // group by model
        const buckets = new Map();
        for (const doc of enrichedItems) {
            let model;
            try {
                model = await resolveModelForEvent(doc);
            } catch (err) {
                model = { modelName: "SystemEvent", insertMany: async () => { } }; // fallback
            }
            const name = model.modelName || "UnknownModel";
            if (!buckets.has(name)) buckets.set(name, { Model: model, docs: [] });
            buckets.get(name).docs.push(doc);
        }

        // insert per bucket with concurrency
        const entries = Array.from(buckets.values());
        let idx = 0;
        async function worker() {
            while (true) {
                const pair = entries[idx++];
                if (!pair) break;
                const { Model, docs } = pair;
                let attempt = 0;
                while (attempt <= MAX_RETRIES) {
                    try {
                        if (docs.length) await Model.insertMany(docs, { ordered: false });
                        metrics.markInserted(Model.modelName || "Model", docs.length);
                        break;
                    } catch (err) {
                        attempt++;
                        metrics.markRetry();
                        if (attempt > MAX_RETRIES) {
                            metrics.markInsertFailed(Model.modelName || "Model", docs.length);
                            console.error("[asyncWriter] insert failed for", Model.modelName, err.message);
                            break;
                        }
                        await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
                    }
                }
            }
        }

        const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, entries.length) }, worker);
        await Promise.all(workers);
        metrics.markBatchSuccess();
    } catch (err) {
        console.error("[asyncWriter] flush error", err);
        metrics.markBatchFailed();
    } finally {
        flushing = false;
        metrics.updateQueueLength(queue.length);
    }
}

setInterval(() => {
    if (queue.length > 0) flush().catch(e => console.error(e));
}, FLUSH_INTERVAL_MS);

module.exports = { enqueue, flush };
