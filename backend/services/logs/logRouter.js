// services/logs/logRouter.js
const { getLogModels } = require("../../models/logs");

async function resolveModelForEvent(event) {
  const models = await getLogModels();

  // If models are null (connection failed), return a no-op model
  if (!models || !models.InfraEvent) {
    return {
      modelName: "NoOpModel",
      insertMany: async () => {
        // Silently skip logging if DB is not available
        return [];
      }
    };
  }

  const cat = (event.category || "infra").toLowerCase();
  const map = {
    admin: models.AdminEvent,
    artist: models.ArtistEvent,
    buyer: models.BuyerEvent,
    business: models.BusinessEvent,
    deployment: models.DeploymentEvent,
    financial: models.FinancialEvent,
    infra: models.InfraEvent,
    interaction: models.InteractionEvent,
    security: models.SecurityEvent,
    system: models.InfraEvent,  // backwards compat: system -> InfraEvent
    embedding: models.EmbeddingEvent,
    search: models.SearchEvent,
    vector: models.VectorIndexEvent,
    job: models.BackgroundJobEvent,
    ai: models.AIEvent
  };
  const model = map[cat] || models.InfraEvent;

  // If the specific model is null, use InfraEvent or no-op
  if (!model) {
    return models.InfraEvent || {
      modelName: "NoOpModel",
      insertMany: async () => []
    };
  }

  return model;
}

module.exports = { resolveModelForEvent };
