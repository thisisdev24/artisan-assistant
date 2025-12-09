/**
 * Comprehensive Logging System Test Suite
 * Tests all 14 schemas, frontend & backend events, full field validation
 * Run: node test/e2e_logging/comprehensive_test.js
 */

require("dotenv").config();
const connectLogDB = require("../../db/connectLogDB");
const { getLogModels } = require("../../models/logs");
const { enqueue, flush, getHealth } = require("../../services/logs/asyncWriter");
const serverInfoProvider = require("../../services/logs/serverInfoProvider");

const TEST_ID = "comprehensive_" + Date.now();
const delay = ms => new Promise(r => setTimeout(r, ms));

// All 14 event schemas with complete test data
const ALL_EVENTS = [
    // 1. AdminEvent
    {
        name: "AdminEvent",
        collection: "AdminEvent",
        data: {
            event_id: `${TEST_ID}_admin`,
            event_type: "ADMIN_ACTION",
            category: "admin",
            admin_context: {
                admin_id: "admin_123",
                role: "super_admin",
                action: "user_ban",
                target_user_id: "user_456",
                reason: "ToS violation",
                ip_address: "10.0.0.1",
                permissions_used: ["ban_user", "view_logs"]
            }
        }
    },
    // 2. AIEvent
    {
        name: "AIEvent",
        collection: "AIEvent",
        data: {
            event_id: `${TEST_ID}_ai`,
            event_type: "AI_INFERENCE",
            category: "ai",
            ai: {
                model_name: "gpt-4",
                model_version: "1.0",
                prompt_tokens: 150,
                completion_tokens: 200,
                total_tokens: 350,
                latency_ms: 1200,
                status: "success"
            }
        }
    },
    // 3. ArtistEvent
    {
        name: "ArtistEvent",
        collection: "ArtistEvent",
        data: {
            event_id: `${TEST_ID}_artist`,
            event_type: "ARTWORK_UPLOAD",
            category: "artist",
            artist_profile: {
                artist_id: "artist_789",
                display_name: "Test Artist",
                verification_status: "verified",
                follower_count: 1500,
                artwork_count: 45
            }
        }
    },
    // 4. BackgroundJobEvent
    {
        name: "BackgroundJobEvent",
        collection: "BackgroundJobEvent",
        data: {
            event_id: `${TEST_ID}_job`,
            event_type: "JOB_COMPLETE",
            category: "background",
            job: {
                job_id: "job_abc123",
                job_type: "email_batch",
                status: "completed",
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                duration_ms: 5000,
                records_processed: 1000,
                errors_count: 0
            }
        }
    },
    // 5. BusinessEvent
    {
        name: "BusinessEvent",
        collection: "BusinessEvent",
        data: {
            event_id: `${TEST_ID}_business`,
            event_type: "KPI_UPDATE",
            category: "business",
            business_metrics: {
                revenue: 50000,
                orders: 120,
                avg_order_value: 416.67,
                conversion_rate: 0.035,
                period: "daily"
            }
        }
    },
    // 6. BuyerEvent
    {
        name: "BuyerEvent",
        collection: "BuyerEvent",
        data: {
            event_id: `${TEST_ID}_buyer`,
            event_type: "CHECKOUT_START",
            category: "buyer",
            buyer_profile: {
                buyer_id: "buyer_xyz",
                account_age_days: 365,
                total_orders: 15,
                lifetime_value: 25000,
                tier: "gold"
            },
            order: {
                order_id: "ord_test123",
                total_amount: 1500,
                currency: "INR",
                items_count: 3
            }
        }
    },
    // 7. DeploymentEvent
    {
        name: "DeploymentEvent",
        collection: "DeploymentEvent",
        data: {
            event_id: `${TEST_ID}_deployment`,
            event_type: "DEPLOYMENT_SUCCESS",
            category: "deployment",
            deployment: {
                deployment_id: "deploy_v1.2.3",
                version: "1.2.3",
                environment: "production",
                status: "success",
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                duration_seconds: 120
            }
        }
    },
    // 8. EmbeddingEvent
    {
        name: "EmbeddingEvent",
        collection: "EmbeddingEvent",
        data: {
            event_id: `${TEST_ID}_embedding`,
            event_type: "EMBEDDING_CREATE",
            category: "embedding",
            embedding: {
                model: "text-embedding-ada-002",
                dimensions: 1536,
                tokens: 256,
                latency_ms: 150,
                batch_size: 10,
                status: "success"
            }
        }
    },
    // 9. FinancialEvent
    {
        name: "FinancialEvent",
        collection: "FinancialEvent",
        data: {
            event_id: `${TEST_ID}_financial`,
            event_type: "PAYMENT_RECEIVED",
            category: "financial",
            transaction: {
                transaction_id: "txn_pay123",
                type: "payment",
                amount: 2500,
                currency: "INR",
                status: "captured",
                gateway: "razorpay"
            }
        }
    },
    // 10. InfraEvent
    {
        name: "InfraEvent",
        collection: "InfraEvent",
        data: {
            event_id: `${TEST_ID}_infra`,
            event_type: "REQUEST_COMPLETE",
            category: "infra",
            request: {
                request_id: "req_xyz789",
                method: "POST",
                url: "/api/orders",
                status_code: 200,
                response_time_ms: 150
            },
            infrastructure: {
                host_name: "server-01",
                cpu_percent: 45,
                memory_mb: 512
            },
            system_health: {
                cpu_load: 2.5,
                memory_used_mb: 1024,
                error_rate: 0.001
            }
        }
    },
    // 11. InteractionEvent
    {
        name: "InteractionEvent",
        collection: "InteractionEvent",
        data: {
            event_id: `${TEST_ID}_interaction`,
            event_type: "BUTTON_CLICK",
            category: "interaction",
            interaction: {
                element_type: "button",
                element_id: "checkout-btn",
                page_url: "/cart",
                action: "click",
                viewport: { width: 1920, height: 1080 }
            },
            device: {
                user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                screen: "1920x1080",
                touch_support: false
            },
            network: {
                type: "wifi",
                effectiveType: "4g",
                rtt: 50
            }
        }
    },
    // 12. SearchEvent
    {
        name: "SearchEvent",
        collection: "SearchEvent",
        data: {
            event_id: `${TEST_ID}_search`,
            event_type: "SEARCH_QUERY",
            category: "search",
            search: {
                query: "handmade pottery",
                results_count: 45,
                latency_ms: 80,
                filters: { category: "home", price_max: 5000 },
                page: 1,
                clicked_results: []
            }
        }
    },
    // 13. SecurityEvent
    {
        name: "SecurityEvent",
        collection: "SecurityEvent",
        data: {
            event_id: `${TEST_ID}_security`,
            event_type: "LOGIN_SUCCESS",
            category: "security",
            auth: {
                user_id: "user_auth123",
                method: "password",
                mfa_used: true,
                session_id: "sess_xyz",
                ip_address: "192.168.1.100",
                risk_score: 0.1
            }
        }
    },
    // 14. VectorIndexEvent
    {
        name: "VectorIndexEvent",
        collection: "VectorIndexEvent",
        data: {
            event_id: `${TEST_ID}_vector`,
            event_type: "INDEX_UPDATE",
            category: "vector_index",
            faiss: {
                index_name: "product_embeddings",
                operation: "add",
                vectors_count: 500,
                dimension: 1536,
                latency_ms: 250,
                index_size_mb: 128
            }
        }
    }
];

// Test 1: Direct Schema Insertion (14 schemas)
async function testDirectInsertion() {
    console.log("\n=== TEST 1: Direct Schema Insertion (14 schemas) ===");

    const conn = await connectLogDB();
    if (!conn) {
        console.log("❌ Database not connected");
        return { passed: 0, failed: 14 };
    }

    const models = await getLogModels();
    let passed = 0, failed = 0;

    for (const event of ALL_EVENTS) {
        try {
            const Model = models[event.collection];
            if (!Model) {
                console.log(`❌ ${event.name}: Model not found`);
                failed++;
                continue;
            }

            // Insert directly
            const doc = new Model(event.data);
            await doc.save();

            // Verify retrieval
            const found = await Model.findOne({ event_id: event.data.event_id });
            if (found) {
                console.log(`✅ ${event.name}: Inserted and verified`);
                passed++;
            } else {
                console.log(`❌ ${event.name}: Insert failed - not found`);
                failed++;
            }
        } catch (err) {
            console.log(`❌ ${event.name}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\nDirect Insertion: ${passed}/14 passed`);
    return { passed, failed };
}

// Test 2: HTTP API Simulation (frontend events)
async function testHTTPSimulation() {
    console.log("\n=== TEST 2: HTTP API Simulation (Frontend Events) ===");

    const FRONTEND_EVENTS = [
        { category: "interaction", event_type: "PAGE_VIEW" },
        { category: "buyer", event_type: "ADD_TO_CART" },
        { category: "search", event_type: "SEARCH_QUERY" },
        { category: "artist", event_type: "PROFILE_VIEW" },
        { category: "security", event_type: "LOGIN_ATTEMPT" }
    ];

    let passed = 0, failed = 0;

    for (const evt of FRONTEND_EVENTS) {
        try {
            const testData = {
                event_id: `${TEST_ID}_http_${evt.category}`,
                event_type: evt.event_type,
                category: evt.category,
                timestamp_client_utc: new Date().toISOString(),
                device: {
                    user_agent: "Mozilla/5.0 Test Browser",
                    screen: "1920x1080"
                },
                network: {
                    type: "wifi",
                    effectiveType: "4g"
                }
            };

            const resp = await fetch("http://localhost:5000/api/logs/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([testData])
            });

            if (resp.ok) {
                console.log(`✅ HTTP ${evt.category}: Sent successfully`);
                passed++;
            } else {
                console.log(`❌ HTTP ${evt.category}: ${resp.status}`);
                failed++;
            }
        } catch (err) {
            console.log(`❌ HTTP ${evt.category}: ${err.message}`);
            failed++;
        }
    }

    // Wait for async processing
    await delay(3000);

    console.log(`\nHTTP API: ${passed}/5 sent successfully`);
    return { passed, failed };
}

// Test 3: Backend Events with Server Info
async function testBackendEvents() {
    console.log("\n=== TEST 3: Backend Events with Server Info ===");

    // Initialize server info
    await serverInfoProvider.init();
    const serverInfo = serverInfoProvider.getCachedInfo();

    console.log("Server Info detected:", {
        ip: serverInfo?.geo?.ip || "unknown",
        country: serverInfo?.geo?.country || "unknown",
        platform: serverInfo?.device?.platform || "unknown"
    });

    const BACKEND_CATEGORIES = ["deployment", "infra", "background", "embedding", "vector_index"];
    let passed = 0, failed = 0;

    for (const cat of BACKEND_CATEGORIES) {
        const testEvent = {
            event_id: `${TEST_ID}_backend_${cat}`,
            event_type: "BACKEND_TEST",
            category: cat
        };

        enqueue(testEvent, {}); // No request context
        passed++;
        console.log(`✅ Backend ${cat}: Enqueued`);
    }

    // Force flush
    await flush();
    await delay(2000);

    // Verify they were processed with server info
    const models = await getLogModels();
    let verified = 0;

    for (const cat of BACKEND_CATEGORIES) {
        const modelName = {
            deployment: "DeploymentEvent",
            infra: "InfraEvent",
            background: "BackgroundJobEvent",
            embedding: "EmbeddingEvent",
            vector_index: "VectorIndexEvent"
        }[cat];

        const Model = models[modelName];
        if (Model) {
            const found = await Model.findOne({ event_id: `${TEST_ID}_backend_${cat}` });
            if (found) {
                verified++;
            }
        }
    }

    console.log(`\nBackend Events: ${passed}/5 enqueued, ${verified}/5 verified in DB`);
    return { passed, failed: 5 - verified };
}

// Test 4: Field Completeness Validation
async function testFieldCompleteness() {
    console.log("\n=== TEST 4: Field Completeness Validation ===");

    const models = await getLogModels();
    let passed = 0, failed = 0;

    // Check a sample event from each category for required fields
    const REQUIRED_BASE_FIELDS = ["event_id", "event_type", "category"];

    for (const event of ALL_EVENTS) {
        try {
            const Model = models[event.collection];
            const found = await Model.findOne({ event_id: event.data.event_id });

            if (!found) continue;

            let complete = true;
            for (const field of REQUIRED_BASE_FIELDS) {
                if (!found[field]) {
                    console.log(`❌ ${event.name}: Missing ${field}`);
                    complete = false;
                }
            }

            if (complete) {
                passed++;
            } else {
                failed++;
            }
        } catch (err) {
            failed++;
        }
    }

    console.log(`\nField Completeness: ${passed}/${ALL_EVENTS.length} complete`);
    return { passed, failed };
}

// Test 5: Resilience System Health
async function testResilienceHealth() {
    console.log("\n=== TEST 5: Resilience System Health ===");

    const health = getHealth();

    console.log("Health Status:", JSON.stringify(health, null, 2));

    const checks = [
        { name: "Queue accessible", pass: typeof health.queueLength === "number" },
        { name: "Circuit Breaker state", pass: health.circuitBreaker?.state === "CLOSED" },
        { name: "DLQ accessible", pass: typeof health.dlq?.count === "number" },
        { name: "System healthy", pass: health.healthy === true }
    ];

    let passed = 0, failed = 0;
    for (const check of checks) {
        if (check.pass) {
            console.log(`✅ ${check.name}`);
            passed++;
        } else {
            console.log(`❌ ${check.name}`);
            failed++;
        }
    }

    return { passed, failed };
}

// Main test runner
async function runAllTests() {
    console.log("\n" + "=".repeat(60));
    console.log("COMPREHENSIVE LOGGING SYSTEM TEST SUITE");
    console.log("=".repeat(60));
    console.log("Test ID:", TEST_ID);
    console.log("Time:", new Date().toISOString());

    const results = [];

    try {
        results.push({ name: "Direct Schema Insertion (14)", ...await testDirectInsertion() });
        results.push({ name: "HTTP API Simulation (5)", ...await testHTTPSimulation() });
        results.push({ name: "Backend Events with Server Info (5)", ...await testBackendEvents() });
        results.push({ name: "Field Completeness Validation", ...await testFieldCompleteness() });
        results.push({ name: "Resilience System Health (4)", ...await testResilienceHealth() });
    } catch (err) {
        console.error("Test suite error:", err);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("FINAL RESULTS");
    console.log("=".repeat(60));

    let totalPassed = 0, totalFailed = 0;
    for (const r of results) {
        const status = r.failed === 0 ? "✅ PASS" : "❌ FAIL";
        console.log(`${status}: ${r.name} - ${r.passed} passed, ${r.failed} failed`);
        totalPassed += r.passed;
        totalFailed += r.failed;
    }

    console.log("\n" + "=".repeat(60));
    const overallStatus = totalFailed === 0 ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED";
    console.log(`${overallStatus}: ${totalPassed} passed, ${totalFailed} failed`);
    console.log("=".repeat(60));

    process.exit(totalFailed > 0 ? 1 : 0);
}

runAllTests();
