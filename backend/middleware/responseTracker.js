// middleware/responseTracker.js
// Middleware to capture response metrics (status code, timing, bytes)

function responseTrackerMiddleware(req, res, next) {
    const startTime = Date.now();
    const startBytes = process.memoryUsage().heapUsed;

    // Capture original end and write methods
    const originalEnd = res.end;
    const originalWrite = res.write;

    let responseSize = 0;
    const chunks = [];

    // Override write to capture response size
    res.write = function (chunk, ...args) {
        if (chunk) {
            chunks.push(Buffer.from(chunk));
            responseSize += chunk.length || 0;
        }
        return originalWrite.apply(res, [chunk, ...args]);
    };

    // Override end to capture final metrics
    res.end = function (chunk, ...args) {
        if (chunk) {
            chunks.push(Buffer.from(chunk));
            responseSize += chunk.length || 0;
        }

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Attach metrics to request for logging
        if (!req._responseMetrics) {
            req._responseMetrics = {};
        }

        req._responseMetrics.status_code = res.statusCode;
        req._responseMetrics.response_time_ms = responseTime;
        req._responseMetrics.bytes_sent = responseSize;
        req._responseMetrics.bytes_received = req.headers['content-length']
            ? parseInt(req.headers['content-length'], 10)
            : (req.body ? JSON.stringify(req.body).length : 0);

        return originalEnd.apply(res, [chunk, ...args]);
    };

    next();
}

module.exports = { responseTrackerMiddleware };
