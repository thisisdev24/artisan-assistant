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
          const responseTime = Date.now() - start;

          // Get IP from headers or socket
          const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            req.ip ||
            req.socket?.remoteAddress || null;

          const event = {
            event_type: ok ? "SYSTEM_API_REQUEST" : "SYSTEM_API_ERROR",
            category: "system",
            action: method.toLowerCase(),
            description: `${method} ${url}`,
            status: ok ? "success" : "error",
            severity: ok ? "info" : "error",
            metadata: {
              status: res.statusCode,
              response_time_ms: responseTime,
              content_length: res.get("content-length") || null
            }
          };

          await logEvent(event, {
            request: {
              ip: ip,
              originalUrl: req.originalUrl,
              method: method,
              userAgent: req.headers["user-agent"] || null,
              headers: {
                "x-forwarded-for": req.headers["x-forwarded-for"] || null,
                "user-agent": req.headers["user-agent"] || null,
                "x-network-type": req.headers["x-network-type"] || null,
                "x-network-effective-type": req.headers["x-network-effective-type"] || null,
                "x-network-rtt": req.headers["x-network-rtt"] || null,
                "x-network-downlink": req.headers["x-network-downlink"] || null,
                "x-device-memory": req.headers["x-device-memory"] || null,
              },
              responseMetrics: {
                response_time_ms: responseTime,
                status_code: res.statusCode,
                bytes_sent: parseInt(res.get("content-length") || 0, 10)
              }
            },
            trace: {
              traceId: req.headers["x-trace-id"] || null,
              correlationId: req.headers["x-correlation-id"] || null
            }
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

