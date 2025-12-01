// middleware/logMiddleware.js
const loggerService = require("../services/logs/loggerService");

module.exports = (req, res, next) => {
  req.logEvent = (event) => {
    const ctx = {
      actor: { userId: req.user?.id || null, role: req.user?.role || null },
      request: {
        ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.ip,
        userAgent: req.headers["user-agent"],
        method: req.method,
        originalUrl: req.originalUrl,
        _perf: req._perf,
        _responseMetrics: { bytes: res._bytesSent, statusCode: res.statusCode }
      },
      trace: { traceId: req.headers["x-trace-id"] || null, correlationId: req.headers["x-correlation-id"] || null }
    };
    return loggerService.logEvent(event, ctx);
  };
  next();
};
