// services/logs/autoLoggingEngine.js
const { logEvent } = require("./loggerService");

class AutoLoggingEngine {
  constructor(app) {
    this.app = app;
    this.attach();
  }

  attach() {
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", async () => {
        try {
          const url = req.originalUrl || req.url;
          const method = req.method;
          const ok = res.statusCode < 400;
          const event = {
            event_type: ok ? "SYSTEM_API_REQUEST" : "SYSTEM_API_ERROR",
            category: "system",
            action: method.toLowerCase(),
            description: `${method} ${url}`,
            metadata: { status: res.statusCode }
          };
          await logEvent(event, {
            request: { ip: req.ip, originalUrl: req.originalUrl, method },
            trace: { traceId: req.headers["x-trace-id"] }
          });
        } catch (e) {
          console.error("[AutoLoggingEngine] error", e);
        }
      });
      next();
    });
  }
}

module.exports = AutoLoggingEngine;
