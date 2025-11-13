// routes/logMiddleware.js
const { createLog } = require("./loggerService");

async function logRequest(req, res, next) {
  const start = Date.now();

  res.on("finish", async () => {
    const rt = Date.now() - start;

    try {
      await createLog("system", {
        event_type: "HTTP_REQUEST",
        category: "api",
        action: `${req.method} ${req.originalUrl}`,
        status: res.statusCode < 400 ? "success" : "failed",
        severity: res.statusCode >= 500 ? "error" : "info",
        request: {
          method: req.method,
          url: req.originalUrl,
          status_code: res.statusCode,
          response_time_ms: rt,
        },
        performance: { response_time_ms: rt }
      }, req);
    } catch (err) {
      console.error("logMiddleware error:", err.message);
    }
  });

  next();
}

module.exports = logRequest;
