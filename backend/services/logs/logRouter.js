// services/logs/logRouter.js
const { getLogModels } = require("../../models/logs");

const EXPLICIT_MAP = {
  LOGIN: "SecurityEvent",
  LOGOUT: "SecurityEvent",
  PASSWORD_RESET_REQUEST: "SecurityEvent",

  BUYER_PAGE_VIEW: "BuyerEvent",
  BUYER_CART_UPDATED: "BuyerEvent",
  BUYER_CHECKOUT_STARTED: "BuyerEvent",
  BUYER_CHECKOUT_COMPLETED: "BuyerEvent",

  ORDER_PLACED: "BusinessEvent",
  ORDER_PAID: "BusinessEvent",
  ORDER_CANCELLED: "BusinessEvent",

  PAYMENT_SUCCESS: "FinancialEvent",
  PAYMENT_FAILED: "FinancialEvent",
  REFUND_ISSUED: "FinancialEvent",

  ARTIST_LISTING_CREATED: "ArtistEvent",
  ARTIST_LISTING_UPDATED: "ArtistEvent",
  ARTIST_LISTING_DELETED: "ArtistEvent",

  ADMIN_LISTING_APPROVED: "AdminEvent",
  ADMIN_USER_BANNED: "AdminEvent",

  INTERACTION_CLICK: "InteractionEvent",
  INTERACTION_VIEW: "InteractionEvent",
  INTERACTION_SCROLL: "InteractionEvent",

  SYSTEM_API_REQUEST: "SystemEvent",
  SYSTEM_JOB_RUN: "SystemEvent",

  FRONTEND_ERROR: "SystemEvent",
  NETWORK_ERROR: "SystemEvent",
  SYSTEM_PERF: "SystemEvent",
};

function inferByPrefix(type) {
  const p = type.split("_")[0];
  switch (p) {
    case "ADMIN":
      return "AdminEvent";
    case "ARTIST":
      return "ArtistEvent";
    case "BUYER":
      return "BuyerEvent";
    case "ORDER":
    case "BUSINESS":
      return "BusinessEvent";
    case "PAYMENT":
    case "FINANCIAL":
      return "FinancialEvent";
    case "INTERACTION":
      return "InteractionEvent";
    case "SECURITY":
    case "AUTH":
    case "LOGIN":
      return "SecurityEvent";
    case "SYSTEM":
    default:
      return "SystemEvent";
  }
}

async function resolveModelForEvent(eventType) {
  const models = await getLogModels();

  const normalized = eventType.toUpperCase();
  const modelName = EXPLICIT_MAP[normalized] || inferByPrefix(normalized);

  return models[modelName];
}

module.exports = { resolveModelForEvent };
