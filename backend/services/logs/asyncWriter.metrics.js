// services/logs/asyncWriter.metrics.js
const metrics = {
    queue_length: 0,
    total_enqueued: 0,
    total_flushed: 0,
    total_failed: 0,
    batch_attempts: 0,
    batch_success: 0,
    batch_failed: 0,
    retry_count: 0,
    last_flush_time: null,
    per_model_inserted: {},
    per_model_failed: {},
    updateQueueLength(len) { metrics.queue_length = len; },
    markEnqueued(count = 1) { metrics.total_enqueued += count; },
    markBatchAttempt() { metrics.batch_attempts += 1; },
    markBatchSuccess() { metrics.batch_success += 1; metrics.last_flush_time = Date.now(); },
    markBatchFailed() { metrics.batch_failed += 1; },
    markRetry() { metrics.retry_count += 1; },
    markInserted(modelName, count = 1) {
        metrics.total_flushed += count;
        metrics.per_model_inserted[modelName] = (metrics.per_model_inserted[modelName] || 0) + count;
    },
    markInsertFailed(modelName, count = 1) {
        metrics.total_failed += count;
        metrics.per_model_failed[modelName] = (metrics.per_model_failed[modelName] || 0) + count;
    },
    getSnapshot() { return { ...metrics }; },
    expressResponse() { return metrics.getSnapshot(); },
};
module.exports = metrics;
