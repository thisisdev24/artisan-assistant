// models/logs/index.js
const connectLogDB = require("../../db/connectLogDB");

// All event schemas
const BaseEventSchema = require("./baseEvent");
const AdminEventSchema = require("./adminEvent");
const AIEventSchema = require("./aiEvent");
const ArtistEventSchema = require("./artistEvent");
const BackgroundJobEventSchema = require("./backgroundJobEvent");
const BusinessEventSchema = require("./businessEvent");
const BuyerEventSchema = require("./buyerEvent");
const EmbeddingEventSchema = require("./embeddingEvent");
const FinancialEventSchema = require("./financialEvent");
const InfraEventSchema = require("./infraEvent");
const InteractionEventSchema = require("./interactionEvent");
const SearchEventSchema = require("./searchEvent");
const SecurityEventSchema = require("./securityEvent");
const DeploymentEventSchema = require("./deploymentEvent");
const VectorIndexEventSchema = require("./vectorIndexEvent");

let modelsPromise = null;

async function getLogModels() {
  if (modelsPromise) return modelsPromise;

  modelsPromise = (async () => {
    const conn = await connectLogDB();

    // If connection failed, return null models (graceful degradation)
    if (!conn) {
      console.warn("⚠️  Log models not available - connection failed");
      return {
        BaseEvent: null,
        AdminEvent: null,
        AIEvent: null,
        ArtistEvent: null,
        BackgroundJobEvent: null,
        BusinessEvent: null,
        BuyerEvent: null,
        EmbeddingEvent: null,
        FinancialEvent: null,
        InfraEvent: null,
        InteractionEvent: null,
        SearchEvent: null,
        SecurityEvent: null,
        DeploymentEvent: null,
        VectorIndexEvent: null,
      };
    }

    const BaseEvent = conn.model("BaseEvent", BaseEventSchema, "base_events");
    const AdminEvent = conn.model("AdminEvent", AdminEventSchema, "admin_events");
    const AIEvent = conn.model("AIEvent", AIEventSchema, "ai_events");
    const ArtistEvent = conn.model("ArtistEvent", ArtistEventSchema, "artist_events");
    const BackgroundJobEvent = conn.model("BackgroundJobEvent", BackgroundJobEventSchema, "background_job_events");
    const BusinessEvent = conn.model("BusinessEvent", BusinessEventSchema, "business_events");
    const BuyerEvent = conn.model("BuyerEvent", BuyerEventSchema, "buyer_events");
    const EmbeddingEvent = conn.model("EmbeddingEvent", EmbeddingEventSchema, "embedding_events");
    const FinancialEvent = conn.model("FinancialEvent", FinancialEventSchema, "financial_events");
    const InfraEvent = conn.model("InfraEvent", InfraEventSchema, "infra_events");
    const InteractionEvent = conn.model("InteractionEvent", InteractionEventSchema, "interaction_events");
    const SearchEvent = conn.model("SearchEvent", SearchEventSchema, "search_events");
    const SecurityEvent = conn.model("SecurityEvent", SecurityEventSchema, "security_events");
    const DeploymentEvent = conn.model("DeploymentEvent", DeploymentEventSchema, "deployment_events");
    const VectorIndexEvent = conn.model("VectorIndexEvent", VectorIndexEventSchema, "vector_index_events");

    return {
      BaseEvent,
      AdminEvent,
      AIEvent,
      ArtistEvent,
      BackgroundJobEvent,
      BusinessEvent,
      BuyerEvent,
      EmbeddingEvent,
      FinancialEvent,
      InfraEvent,
      InteractionEvent,
      SearchEvent,
      SecurityEvent,
      DeploymentEvent,
      VectorIndexEvent,
    };
  })();

  return modelsPromise;
}

module.exports = { getLogModels };

