// models/logs/index.js
const connectLogDB = require("../../db/connectLogDB");

// schemas (exactly as you shared, updated with safe defaults)
const BaseEventSchema = require("./baseEvent");
const AdminEventSchema = require("./adminEvent");
const ArtistEventSchema = require("./artistEvent");
const BuyerEventSchema = require("./buyerEvent");
const BusinessEventSchema = require("./businessEvent");
const FinancialEventSchema = require("./financialEvent");
const InteractionEventSchema = require("./interactionEvent");
const SecurityEventSchema = require("./securityEvent");
const SystemEventSchema = require("./systemEvent");

let modelsPromise = null;

async function getLogModels() {
  if (modelsPromise) return modelsPromise;

  modelsPromise = (async () => {
    const conn = await connectLogDB();

    const BaseEvent = conn.model("BaseEvent", BaseEventSchema, "base_events");
    const AdminEvent = conn.model("AdminEvent", AdminEventSchema, "admin_events");
    const ArtistEvent = conn.model("ArtistEvent", ArtistEventSchema, "artist_events");
    const BuyerEvent = conn.model("BuyerEvent", BuyerEventSchema, "buyer_events");
    const BusinessEvent = conn.model("BusinessEvent", BusinessEventSchema, "business_events");
    const FinancialEvent = conn.model("FinancialEvent", FinancialEventSchema, "financial_events");
    const InteractionEvent = conn.model("InteractionEvent", InteractionEventSchema, "interaction_events");
    const SecurityEvent = conn.model("SecurityEvent", SecurityEventSchema, "security_events");
    const SystemEvent = conn.model("SystemEvent", SystemEventSchema, "system_events");

    return {
      BaseEvent,
      AdminEvent,
      ArtistEvent,
      BuyerEvent,
      BusinessEvent,
      FinancialEvent,
      InteractionEvent,
      SecurityEvent,
      SystemEvent,
    };
  })();

  return modelsPromise;
}

module.exports = { getLogModels };
