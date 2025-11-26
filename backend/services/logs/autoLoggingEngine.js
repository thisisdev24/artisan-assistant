// services/logs/autoLoggingEngine.js

const mongoose = require("mongoose");
const axios = require("axios");

const { logEvent } = require("./loggerService");
const { lookupGeo } = require("./geoProvider");
const { parseUA } = require("./deviceParser");
const { getInfrastructureSnapshot } = require("./systemMonitor");

/**
 * AutoLoggingEngine
 * A fully independent logging system that:
 *  - Hooks into Mongoose to measure DB timing
 *  - Hooks into Axios to measure external API timing
 *  - Hooks into Express requests to capture device, geo, infra
 *  - Detects domain events automatically (register, login, listing views)
 *  - Sends logs using existing loggerService
 */

class AutoLoggingEngine {
  constructor(app) {
    this.app = app;

    this.patchMongoose();
    this.patchAxios();
    this.attachRequestHooks();
  }

  // ----------------------------------------------
  // POINT 8: Automatic DB Query Timing
  // ----------------------------------------------
  patchMongoose() {
    const originalExec = mongoose.Query.prototype.exec;

    mongoose.Query.prototype.exec = async function (...args) {
      const start = Date.now();
      const result = await originalExec.apply(this, args);
      const duration = Date.now() - start;

      const req = this.options._req; // Express request (if attached)

      if (req) {
        req._perf = req._perf || {};
        req._perf.db_query_time_ms =
          (req._perf.db_query_time_ms || 0) + duration;
      }

      return result;
    };
  }

  // ----------------------------------------------
  // POINT 8: Automatic External API Timing
  // ----------------------------------------------
  patchAxios() {
    const orig = axios.request;

    axios.request = async (config) => {
      const start = Date.now();

      const res = await orig(config);
      const duration = Date.now() - start;

      if (config._req) {
        config._req._perf = config._perf || {};
        config._req._perf.external_api_time_ms =
          (config._req._perf.external_api_time_ms || 0) + duration;
      }

      return res;
    };
  }

  // ----------------------------------------------
  // Express request hooks (device + geo + infra)
  // ----------------------------------------------
  attachRequestHooks() {
    this.app.use(async (req, res, next) => {
      req._start = Date.now();
      req._perf = req._perf || {};

      // Attach req to mongoose operations
      mongoose.Query.prototype.setOptions.call(
        mongoose.Query.prototype,
        { _req: req }
      );

      res.on("finish", async () => {
        try {
          const duration = Date.now() - req._start;

          const ua = req.headers["user-agent"] || "";
          const device = parseUA(ua);

          const ip =
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.ip ||
            null;

          const geo = lookupGeo(ip);

          const infra = await getInfrastructureSnapshot();

          const domainEvent = this.detectDomainEvent(req);

          const eventBody = {
            event_type: domainEvent.event_type,
            category: domainEvent.category,
            action: domainEvent.action,
            description: domainEvent.description,

            route: req.originalUrl,
            method: req.method,

            device,
            geo,
            infrastructure: infra,
            performance: req._perf,

            metadata: {
              status_code: res.statusCode,
              request_duration_ms: duration,
            },
          };

          const context = {
            actor: {
              userId: req.user?.id || null,
              role: req.user?.role || null,
            },
            request: {
              ip,
              originalUrl: req.originalUrl,
              userAgent: ua,
              method: req.method,
            },
          };

          await logEvent(eventBody, context);
        } catch (err) {
          console.error("[AutoLoggingEngine] error:", err);
        }
      });

      next();
    });
  }

  // ----------------------------------------------
  // POINT 11: Automatic Domain Event Detection
  // ----------------------------------------------
  detectDomainEvent(req) {
    const url = req.originalUrl;

    if (url.includes("/login")) {
      return {
        event_type: "LOGIN",
        category: "security",
        action: "login_attempt",
        description: "User attempted to log in",
      };
    }

    if (url.includes("/register")) {
      return {
        event_type: "USER_REGISTERED",
        category: "security",
        action: "register",
        description: "User registered",
      };
    }

    if (url.includes("/listing")) {
      return {
        event_type: "INTERACTION_VIEW",
        category: "interaction",
        action: "listing_view",
        description: "User viewed a listing",
      };
    }

    return {
      event_type: "SYSTEM_API_REQUEST",
      category: "system",
      action: "api_request",
      description: "API request detected",
    };
  }
}

module.exports = AutoLoggingEngine;
