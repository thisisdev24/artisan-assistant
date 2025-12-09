// services/logs/asyncWriter.js
const metrics = require("./asyncWriter.metrics");
const { enrichBaseEvent } = require("./logEnricher");
const { resolveModelForEvent } = require("./logRouter");
const { redact } = require("../../utils/redactor") || ((x) => x);
const { sleep } = require("../../utils/time") || ((ms) => new Promise(r => setTimeout(r, ms)));
const dlq = require("./deadLetterQueue");
const { mongoCircuitBreaker } = require("./circuitBreaker");

const BATCH_MAX = Number(process.env.LOG_BATCH_MAX || 400);
const FLUSH_INTERVAL_MS = Number(process.env.LOG_FLUSH_MS || 1000);
const MAX_CONCURRENCY = Number(process.env.LOG_CONCURRENCY || 4);
const MAX_RETRIES = Number(process.env.LOG_MAX_RETRIES || 3);
const RETRY_BASE_MS = Number(process.env.LOG_RETRY_BASE_MS || 200);
const DLQ_RETRY_INTERVAL_MS = Number(process.env.LOG_DLQ_RETRY_MS || 60000);

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
        // Check Circuit Breaker before attempting flush
        if (!mongoCircuitBreaker.canProceed()) {
            console.warn("[asyncWriter] Circuit breaker OPEN - sending to DLQ");
            const items = queue.splice(0, Math.min(queue.length, BATCH_MAX * 4));
            if (items.length > 0) {
                const events = items.map(it => it.rawEvent);
                dlq.enqueue(events, "circuit_breaker_open");
            }
            return;
        }

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

        // Group by model
        const buckets = new Map();
        for (const doc of enrichedItems) {
            let model;
            try {
                model = await resolveModelForEvent(doc);
            } catch (err) {
                model = { modelName: "NoOpModel", insertMany: async () => { } };
            }
            if (!model || model.modelName === "NoOpModel") {
                continue;
            }
            const name = model.modelName || "UnknownModel";
            if (!buckets.has(name)) buckets.set(name, { Model: model, docs: [] });
            buckets.get(name).docs.push(doc);
        }

        // Insert per bucket with concurrency
        const entries = Array.from(buckets.values());
        let idx = 0;
        let totalSuccess = 0;
        let totalFailed = 0;

        async function worker() {
            while (true) {
                const pair = entries[idx++];
                if (!pair) break;
                const { Model, docs } = pair;

                if (!Model || Model.modelName === "NoOpModel" || !docs.length) {
                    continue;
                }

                let attempt = 0;
                let success = false;

                while (attempt <= MAX_RETRIES) {
                    try {
                        await Model.insertMany(docs, { ordered: false });
                        metrics.markInserted(Model.modelName || "Model", docs.length);
                        mongoCircuitBreaker.recordSuccess();
                        totalSuccess += docs.length;
                        success = true;
                        break;
                    } catch (err) {
                        attempt++;
                        metrics.markRetry();
                        mongoCircuitBreaker.recordFailure();

                        if (attempt > MAX_RETRIES) {
                            // Send to DLQ instead of dropping
                            metrics.markInsertFailed(Model.modelName || "Model", docs.length);
                            console.error("[asyncWriter] insert failed, sending to DLQ:", Model.modelName, err.message);
                            dlq.enqueue(docs, `insert_failed:${err.message.slice(0, 50)}`);
                            totalFailed += docs.length;
                            break;
                        }
                        await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
                    }
                }
            }
        }

        const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, entries.length) }, worker);
        await Promise.all(workers);

        if (totalFailed === 0) {
            metrics.markBatchSuccess();
        }

    } catch (err) {
        console.error("[asyncWriter] flush error:", err);
        metrics.markBatchFailed();
        mongoCircuitBreaker.recordFailure();
    } finally {
        flushing = false;
        metrics.updateQueueLength(queue.length);
    }
}

// Retry events from DLQ periodically
async function retryDLQ() {
    if (!mongoCircuitBreaker.canProceed()) {
        return; // Don't retry if circuit is open
    }

    const events = dlq.dequeueAll();
    if (events.length === 0) return;

    console.log(`[asyncWriter] Retrying ${events.length} events from DLQ`);

    for (const event of events) {
        // Skip events that have been retried too many times
        if (event._dlq_retry_count && event._dlq_retry_count > 5) {
            console.warn("[asyncWriter] Event exceeded max DLQ retries, dropping:", event.event_id);
            continue;
        }
        enqueue(event, { fromDLQ: true });
    }
}

// Health check function for monitoring
function getHealth() {
    const cbState = mongoCircuitBreaker.getState();
    const dlqStats = dlq.stats();
    return {
        queueLength: queue.length,
        isFlushing: flushing,
        circuitBreaker: cbState,
        dlq: dlqStats,
        healthy: cbState.state === "CLOSED" && dlqStats.count < 1000
    };
}

// Periodic flush
setInterval(() => {
    if (queue.length > 0) flush().catch(e => console.error(e));
}, FLUSH_INTERVAL_MS);

// Periodic DLQ retry
setInterval(() => {
    retryDLQ().catch(e => console.error("[asyncWriter] DLQ retry error:", e));
}, DLQ_RETRY_INTERVAL_MS);

module.exports = { enqueue, flush, retryDLQ, getHealth };
