// middleware/logMiddleware.js
const { logEvent } = require("../services/logs/loggerService");

function attachLogger(req, res, next) {
  req.logEvent = async (event) => {
    const context = {
      actor: {
        userId: req.user ? req.user.id : null,
        role: req.user ? req.user.role : null,
        sessionId: req.headers["x-session-id"] || null,
      },
      trace: {
        traceId: req.headers["x-trace-id"] || null,
        correlationId: req.headers["x-correlation-id"] || null,
      },
      request: {
        method: req.method,
        routePath: req.route ? req.route.path : req.path,
        originalUrl: req.originalUrl,
        ip: extractIp(req),
        userAgent: req.headers["user-agent"] || null,
        hostName: req.headers.host || null,
        referer: req.headers.referer || null,
        origin: req.headers.origin || null,
      },
      serviceName: process.env.SERVICE_NAME || "api",
      appName: req.headers["x-app-name"] || null,
      appVersion: req.headers["x-app-version"] || null,
    };

    return logEvent(event, context);
  };

  next();
}

function extractIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return xff.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
}

module.exports = { attachLogger };
