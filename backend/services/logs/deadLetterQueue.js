// services/logs/deadLetterQueue.js
// Dead Letter Queue for failed log events - stores to filesystem when DB is unavailable
const fs = require("fs");
const path = require("path");

const DLQ_DIR = path.join(__dirname, "../../data/dlq");
const DLQ_FILE = path.join(DLQ_DIR, "failed_events.json");
const MAX_DLQ_SIZE = 10000;

// Ensure DLQ directory exists
function ensureDir() {
    if (!fs.existsSync(DLQ_DIR)) {
        fs.mkdirSync(DLQ_DIR, { recursive: true });
    }
}

// Load DLQ from disk
function loadDLQ() {
    ensureDir();
    try {
        if (fs.existsSync(DLQ_FILE)) {
            const data = fs.readFileSync(DLQ_FILE, "utf-8");
            return JSON.parse(data);
        }
    } catch (err) {
        console.warn("[DLQ] Failed to load DLQ:", err.message);
    }
    return [];
}

// Save DLQ to disk
function saveDLQ(events) {
    ensureDir();
    try {
        fs.writeFileSync(DLQ_FILE, JSON.stringify(events, null, 2));
    } catch (err) {
        console.error("[DLQ] Failed to save DLQ:", err.message);
    }
}

// Add events to Dead Letter Queue
function enqueue(events, reason = "unknown") {
    const dlq = loadDLQ();
    const timestamp = new Date().toISOString();

    for (const event of events) {
        if (dlq.length >= MAX_DLQ_SIZE) {
            // Remove oldest entries to make room
            dlq.shift();
        }
        dlq.push({
            event,
            reason,
            timestamp,
            retryCount: 0
        });
    }

    saveDLQ(dlq);
    console.log(`[DLQ] Enqueued ${events.length} events (reason: ${reason}). Total: ${dlq.length}`);
    return dlq.length;
}

// Get all events from DLQ for retry
function dequeueAll() {
    const dlq = loadDLQ();
    if (dlq.length === 0) return [];

    // Clear the DLQ file
    saveDLQ([]);
    console.log(`[DLQ] Dequeued ${dlq.length} events for retry`);

    return dlq.map(item => ({
        ...item.event,
        _dlq_retry_count: (item.retryCount || 0) + 1,
        _dlq_original_timestamp: item.timestamp
    }));
}

// Peek at DLQ without removing
function peek(limit = 100) {
    const dlq = loadDLQ();
    return dlq.slice(0, limit);
}

// Get DLQ stats
function stats() {
    const dlq = loadDLQ();
    return {
        count: dlq.length,
        oldestTimestamp: dlq.length > 0 ? dlq[0].timestamp : null,
        newestTimestamp: dlq.length > 0 ? dlq[dlq.length - 1].timestamp : null
    };
}

// Clear DLQ (emergency reset)
function clear() {
    saveDLQ([]);
    console.log("[DLQ] Cleared all events");
}

module.exports = {
    enqueue,
    dequeueAll,
    peek,
    stats,
    clear,
    MAX_DLQ_SIZE
};
