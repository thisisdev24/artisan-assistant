// controllers/logController.js
const loggerService = require("../services/logs/loggerService");

function buildContextFromReq(req) {
  return {
    actor: { userId: req.user?.id || null, role: req.user?.role || null },
    request: {
      ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.ip,
      userAgent: req.headers["user-agent"],
      method: req.method,
      originalUrl: req.originalUrl,
      headers: req.headers,
      perf: req._perf || {},
      responseMetrics: req._responseMetrics || {}
    },
    trace: {
      traceId: req.headers["x-trace-id"] || null,
      correlationId: req.headers["x-correlation-id"] || null
    }
  };
}

exports.ingestLogs = async (req, res) => {
  try {
    const body = req.body;
    const events = Array.isArray(body) ? body : [body];
    const context = buildContextFromReq(req);

    for (const ev of events) {
      await loggerService.logEvent(ev, context);
    }

    res.json({ ok: true, enqueued: events.length });
  } catch (err) {
    console.error("[logController] ingest error", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
