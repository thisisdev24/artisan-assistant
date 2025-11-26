// services/logs/domainLogger.js
const { logEvent } = require("./loggerService");

/**
 * Convert Express request into logger context.
 * Used by all domain logging helpers.
 */
function buildContextFromReq(req) {
  return {
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
      ip:
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.ip ||
        null,
      userAgent: req.headers["user-agent"] || null,
    },
    serviceName: process.env.SERVICE_NAME || "api",
    appName: req.headers["x-app-name"] || null,
    appVersion: req.headers["x-app-version"] || null,
  };
}

/**
 * Example domain helper:
 * Logs a complete BusinessEvent with nested order fields.
 *
 * Usage:
 * await orderPlaced({ order, user }, req)
 */
async function orderPlaced({ order }, req) {
  const event = {
    event_type: "ORDER_PLACED",
    category: "business",
    subcategory: "order",
    action: "placed",

    order: {
      order_id: order.id,
      buyer_id: order.buyer_id,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping_fee: order.shipping_fee,
      total: order.total,
      payment_status: order.payment_status,
      placed_at: order.placed_at || new Date(),
    },
  };

  const context = buildContextFromReq(req);

  return logEvent(event, context);
}

/**
 * Enable full infrastructure snapshot for system events.
 * Example: Cron job / background worker
 */
async function systemJobRun(req) {
  const event = {
    event_type: "SYSTEM_JOB_RUN",
    category: "system",
    action: "job_run",
  };

  const context = buildContextFromReq(req);
  context.attachFullInfra = true; // tells writer to attach CPU/MEM/UPTIME

  await logEvent(event, context);
}

module.exports = {
  buildContextFromReq,
  orderPlaced,
  systemJobRun,
};
