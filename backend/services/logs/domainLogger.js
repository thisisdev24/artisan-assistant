// services/logs/domainLogger.js
const { logEvent } = require("./loggerService");

async function orderPlaced(order, req) {
  return logEvent({
    event_type: "ORDER_PLACED",
    category: "business",
    action: "placed",
    order
  }, { request: { ip: req.ip, originalUrl: req.originalUrl }, actor: { userId: req.user?.id } });
}

async function aiInference(aiPayload, req) {
  return logEvent({
    event_type: "AI_INFERENCE",
    category: "ai",
    action: "inference",
    ai: aiPayload
  }, { request: { ip: req.ip }, actor: { userId: req.user?.id } });
}

module.exports = { orderPlaced, aiInference };
