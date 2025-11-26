// middleware/perfMiddleware.js
/**
 * Express middleware to capture request timing and attach to req._perf
 * Usage: app.use(perfMiddleware);
 */
function perfMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    try {
      const end = process.hrtime.bigint();
      const durationNs = end - start;
      const durationMs = Number(durationNs / BigInt(1e6));
      // attach for enricher or controllers to use
      req._perf = req._perf || {};
      req._perf.request_time_ms = durationMs;
      req._perf.status_code = res.statusCode;
    } catch (e) {
      // noop
    }
  });
  next();
}

module.exports = perfMiddleware;
