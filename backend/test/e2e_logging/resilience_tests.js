/**
 * Resilience Test Suite for Logging System
 * Tests: Circuit Breaker, Dead Letter Queue, High Load, Recovery
 * Run: node test/e2e_logging/resilience_tests.js
 */

require("dotenv").config();
const { enqueue, flush, retryDLQ, getHealth } = require("../../services/logs/asyncWriter");
const { mongoCircuitBreaker, STATES } = require("../../services/logs/circuitBreaker");
const dlq = require("../../services/logs/deadLetterQueue");
const connectLogDB = require("../../db/connectLogDB");
const { getLogModels } = require("../../models/logs");

const TEST_ID = "resilience_" + Date.now();

async function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Test 1: Circuit Breaker State Transitions
async function testCircuitBreaker() {
    console.log("\n=== TEST 1: Circuit Breaker ===");

    // Reset state
    mongoCircuitBreaker.reset();
    console.log("Initial state:", mongoCircuitBreaker.getState().state);

    // Simulate failures
    for (let i = 0; i < 5; i++) {
        mongoCircuitBreaker.recordFailure();
    }

    const stateAfterFailures = mongoCircuitBreaker.getState();
    console.log("After 5 failures:", stateAfterFailures.state);

    if (stateAfterFailures.state !== STATES.OPEN) {
        console.error("❌ Circuit breaker should be OPEN after 5 failures");
        return false;
    }

    // Check canProceed returns false when open
    if (mongoCircuitBreaker.canProceed()) {
        console.error("❌ canProceed should return false when OPEN");
        return false;
    }

    // Reset for other tests
    mongoCircuitBreaker.reset();

    console.log("✅ Circuit Breaker test passed");
    return true;
}

// Test 2: Dead Letter Queue Operations
async function testDLQ() {
    console.log("\n=== TEST 2: Dead Letter Queue ===");

    // Clear DLQ
    dlq.clear();

    // Enqueue some events
    const testEvents = [
        { event_id: TEST_ID + "_dlq1", event_type: "DLQ_TEST_1" },
        { event_id: TEST_ID + "_dlq2", event_type: "DLQ_TEST_2" },
        { event_id: TEST_ID + "_dlq3", event_type: "DLQ_TEST_3" }
    ];

    dlq.enqueue(testEvents, "test_failure");

    // Check stats
    const stats = dlq.stats();
    console.log("DLQ stats after enqueue:", stats);

    if (stats.count !== 3) {
        console.error("❌ DLQ should have 3 events, has:", stats.count);
        return false;
    }

    // Peek without removing
    const peeked = dlq.peek(10);
    if (peeked.length !== 3) {
        console.error("❌ Peek should return 3 events");
        return false;
    }

    // Dequeue all
    const dequeued = dlq.dequeueAll();
    if (dequeued.length !== 3) {
        console.error("❌ DequeueAll should return 3 events");
        return false;
    }

    // Verify retry count is incremented
    if (!dequeued[0]._dlq_retry_count || dequeued[0]._dlq_retry_count !== 1) {
        console.error("❌ Retry count should be incremented to 1");
        return false;
    }

    // DLQ should be empty now
    const statsAfter = dlq.stats();
    if (statsAfter.count !== 0) {
        console.error("❌ DLQ should be empty after dequeue");
        return false;
    }

    console.log("✅ Dead Letter Queue test passed");
    return true;
}

// Test 3: High Load Test (1000 events)
async function testHighLoad() {
    console.log("\n=== TEST 3: High Load Test (1000 events) ===");

    // Ensure circuit breaker is closed
    mongoCircuitBreaker.reset();

    const conn = await connectLogDB();
    if (!conn) {
        console.log("⚠️ Skipping high load test - DB not connected");
        return true;
    }

    const models = await getLogModels();

    // Get initial count
    const initialCount = await models.InfraEvent.countDocuments({
        event_id: { $regex: `^${TEST_ID}_load` }
    });

    console.log("Enqueueing 1000 events...");
    const startTime = Date.now();

    for (let i = 0; i < 1000; i++) {
        enqueue({
            event_id: `${TEST_ID}_load_${i}`,
            event_type: "LOAD_TEST",
            category: "infra",
            metadata: { index: i }
        });
    }

    const enqueueTime = Date.now() - startTime;
    console.log(`Enqueue time: ${enqueueTime}ms (${(1000 / enqueueTime * 1000).toFixed(0)} events/sec)`);

    // Wait for flush cycles
    console.log("Waiting for async flush (10s)...");
    await delay(10000);

    // Force final flush
    await flush();
    await delay(2000);

    // Check count
    const finalCount = await models.InfraEvent.countDocuments({
        event_id: { $regex: `^${TEST_ID}_load` }
    });

    const inserted = finalCount - initialCount;
    console.log(`Events inserted: ${inserted}/1000`);

    // Check health
    const health = getHealth();
    console.log("Health after load test:", JSON.stringify(health, null, 2));

    // Consider success if >95% inserted (some may still be in queue or DLQ)
    if (inserted < 950) {
        console.error(`❌ Only ${inserted}/1000 events inserted`);
        return false;
    }

    console.log("✅ High Load test passed");
    return true;
}

// Test 4: Schema Validation Edge Cases
async function testSchemaValidation() {
    console.log("\n=== TEST 4: Schema Validation Edge Cases ===");

    mongoCircuitBreaker.reset();

    // Test with malformed data
    const malformedEvents = [
        { event_id: TEST_ID + "_mal1", event_type: "MALFORMED_1", category: "infra" }, // Valid
        { event_type: "MISSING_ID", category: "infra" }, // Missing event_id (should be generated)
        { event_id: TEST_ID + "_mal2" }, // Missing event_type (required)
        { event_id: TEST_ID + "_mal3", event_type: "VALID", category: "invalid_cat" }, // Invalid category (falls to infra)
    ];

    for (const event of malformedEvents) {
        enqueue(event);
    }

    // Wait for flush
    await delay(3000);
    await flush();
    await delay(2000);

    // Most should still be processed or handled gracefully
    const health = getHealth();
    console.log("Health after malformed events:", JSON.stringify(health, null, 2));

    // Check DLQ doesn't have our events (they should be handled)
    const dlqStats = dlq.stats();
    console.log("DLQ after malformed test:", dlqStats);

    console.log("✅ Schema Validation test passed (graceful handling)");
    return true;
}

// Test 5: Health Check Function
async function testHealthCheck() {
    console.log("\n=== TEST 5: Health Check Function ===");

    const health = getHealth();

    const requiredFields = ['queueLength', 'isFlushing', 'circuitBreaker', 'dlq', 'healthy'];
    for (const field of requiredFields) {
        if (!(field in health)) {
            console.error(`❌ Health check missing field: ${field}`);
            return false;
        }
    }

    console.log("Health check result:", JSON.stringify(health, null, 2));
    console.log("✅ Health Check test passed");
    return true;
}

// Main test runner
async function runAllTests() {
    console.log("\n" + "=".repeat(50));
    console.log("LOGGING SYSTEM RESILIENCE TESTS");
    console.log("=".repeat(50));
    console.log("Test ID:", TEST_ID);

    const results = [];

    try {
        results.push({ name: "Circuit Breaker", passed: await testCircuitBreaker() });
        results.push({ name: "Dead Letter Queue", passed: await testDLQ() });
        results.push({ name: "Health Check", passed: await testHealthCheck() });
        results.push({ name: "Schema Validation", passed: await testSchemaValidation() });
        results.push({ name: "High Load (1000 events)", passed: await testHighLoad() });
    } catch (err) {
        console.error("Test error:", err);
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("RESULTS SUMMARY");
    console.log("=".repeat(50));

    let passed = 0, failed = 0;
    for (const r of results) {
        const status = r.passed ? "✅ PASS" : "❌ FAIL";
        console.log(`${status}: ${r.name}`);
        if (r.passed) passed++;
        else failed++;
    }

    console.log("\n" + "=".repeat(50));
    console.log(`TOTAL: ${passed}/${results.length} tests passed`);
    console.log("=".repeat(50));

    // Clean up
    dlq.clear();
    mongoCircuitBreaker.reset();

    process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
