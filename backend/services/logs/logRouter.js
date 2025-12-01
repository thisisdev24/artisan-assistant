// services/logs/logRouter.js
const getLogModels = require("../../models/logs") /* expects exported function */;

async function resolveModelForEvent(event) {
  const models = await getLogModels();
  
  // If models are null (connection failed), return a no-op model
  if (!models || !models.SystemEvent) {
    return {
      modelName: "NoOpModel",
      insertMany: async () => {
        // Silently skip logging if DB is not available
        return [];
      }
    };
  }
  
  const cat = (event.category || "system").toLowerCase();
  const map = {
    admin: models.AdminEvent,
    artist: models.ArtistEvent,
    buyer: models.BuyerEvent,
    business: models.BusinessEvent,
    financial: models.FinancialEvent,
    interaction: models.InteractionEvent,
    security: models.SecurityEvent,
    system: models.SystemEvent,
    embedding: models.EmbeddingEvent,
    search: models.SearchEvent,
    vector: models.VectorIndexEvent,
    job: models.BackgroundJobEvent,
    ai: models.AIEvent
  };
  const model = map[cat] || models.SystemEvent;
  
  // If the specific model is null, use SystemEvent or no-op
  if (!model) {
    return models.SystemEvent || {
      modelName: "NoOpModel",
      insertMany: async () => []
    };
  }
  
  return model;
}

module.exports = { resolveModelForEvent };
