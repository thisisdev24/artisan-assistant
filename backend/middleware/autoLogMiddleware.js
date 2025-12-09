// middleware/autoLogMiddleware.js
// Automatic logging middleware for all API requests
// Logs request/response, errors, and performance without manual code

const { enqueue } = require("../services/logs/asyncWriter");

// Request counter for rate limiting logs
let requestCounter = 0;
const LOG_SAMPLE_RATE = parseFloat(process.env.LOG_SAMPLE_RATE || "1"); // 1 = 100%, 0.1 = 10%

// Paths to exclude from logging
const EXCLUDED_PATHS = [
    "/api/health",
    "/api/logs/ingest",
    "/favicon.ico",
    "/static",
    "/_next"
];

function shouldLog(path) {
    if (Math.random() > LOG_SAMPLE_RATE) return false;
    return !EXCLUDED_PATHS.some(p => path.startsWith(p));
}

function autoLogMiddleware(req, res, next) {
    if (!shouldLog(req.path)) {
        return next();
    }

    requestCounter++;
    const startTime = process.hrtime.bigint();
    const requestId = `req_${Date.now()}_${requestCounter}`;

    // Attach request ID
    req.requestId = requestId;

    // Capture response data
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody = null;
    let responseSent = false;

    res.send = function (body) {
        responseBody = body;
        return originalSend.call(this, body);
    };

    res.json = function (body) {
        responseBody = body;
        return originalJson.call(this, body);
    };

    // Log when response finishes
    res.on("finish", () => {
        if (responseSent) return;
        responseSent = true;

        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1e6;

        const logEvent = {
            event_id: requestId,
            event_type: res.statusCode >= 400 ? "API_ERROR" : "API_REQUEST",
            category: "infra",
            action: res.statusCode >= 400 ? "error" : "request",

            request: {
                request_id: requestId,
                method: req.method,
                url: req.originalUrl,
                route: req.route?.path || req.path,
                query_params: Object.keys(req.query).length > 0 ? req.query : null,
                status_code: res.statusCode,
                response_time_ms: Math.round(durationMs * 100) / 100,
                bytes_sent: res.get("Content-Length") ? parseInt(res.get("Content-Length")) : null,
                bytes_received: req.get("Content-Length") ? parseInt(req.get("Content-Length")) : null,
            },

            // User info if authenticated
            user_id: req.user?.id || req.user?._id || null,
            session_id: req.cookies?.sessionId || req.headers["x-session-id"] || null,

            // Error info for failed requests
            error: res.statusCode >= 400 ? {
                status_code: res.statusCode,
                message: typeof responseBody === 'string' ? responseBody.slice(0, 200) :
                    responseBody?.message || responseBody?.error || null,
                type: "http"
            } : null,

            // Performance
            performance: {
                response_time_ms: Math.round(durationMs * 100) / 100,
                db_query_time_ms: req.dbQueryTime || null,
                external_api_time_ms: req.externalApiTime || null
            }
        };

        // Enqueue without blocking
        enqueue(logEvent, {
            request: {
                ip: req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim(),
                headers: req.headers,
                userAgent: req.headers["user-agent"]
            }
        });
    });

    next();
}

// Error logging middleware (place after routes)
function errorLogMiddleware(err, req, res, next) {
    const requestId = req.requestId || `err_${Date.now()}`;

    enqueue({
        event_id: requestId,
        event_type: "SERVER_ERROR",
        category: "security",
        action: "error",
        error: {
            message: err.message,
            stack: err.stack?.slice(0, 2000),
            type: err.name || "Error",
            code: err.code || null
        },
        request: {
            request_id: requestId,
            method: req.method,
            url: req.originalUrl,
            route: req.route?.path || req.path
        },
        user_id: req.user?.id || null
    }, {
        request: {
            ip: req.ip,
            headers: req.headers
        }
    });

    next(err);
}

// Slow query logging helper
function logSlowQuery(query, durationMs, collection) {
    if (durationMs > 100) { // Log queries slower than 100ms
        enqueue({
            event_id: `slow_query_${Date.now()}`,
            event_type: "SLOW_QUERY",
            category: "infra",
            action: "performance",
            performance: {
                db_query_time_ms: durationMs
            },
            metadata: {
                collection,
                query: JSON.stringify(query).slice(0, 500)
            }
        }, {});
    }
}

// External API call logging helper
function logExternalApi(url, method, durationMs, statusCode) {
    enqueue({
        event_id: `ext_api_${Date.now()}`,
        event_type: statusCode >= 400 ? "EXTERNAL_API_ERROR" : "EXTERNAL_API_CALL",
        category: "infra",
        action: statusCode >= 400 ? "error" : "request",
        request: {
            url,
            method,
            status_code: statusCode,
            response_time_ms: durationMs
        }
    }, {});
}

module.exports = {
    autoLogMiddleware,
    errorLogMiddleware,
    logSlowQuery,
    logExternalApi
};
