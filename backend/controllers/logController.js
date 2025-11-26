// controllers/logController.js
const { logEvent, logEvents } = require("../services/logs/loggerService");

async function ingestLogs(req, res) {
  try {
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ ok: false, error: "Empty payload" });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || null;
    const hostname = req.headers.host || null;

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
        originalUrl: req.originalUrl,
        routePath: req.route ? req.route.path : req.path,
        ip,
        userAgent,
        hostName: hostname,
      },
      serviceName: process.env.SERVICE_NAME || "api",
      appName: req.headers["x-app-name"] || null,
      appVersion: req.headers["x-app-version"] || null,
    };

    if (Array.isArray(payload)) {
      const result = await logEvents(payload, context);
      return res.json({ ok: true, results: result });
    }

    const saved = await logEvent(payload, context);
    return res.json({ ok: true, event_id: saved.event_id });
  } catch (err) {
    console.error("[ingestLogs]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
      details: err.details || null,
    });
  }
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return xff.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
}

module.exports = { ingestLogs };
