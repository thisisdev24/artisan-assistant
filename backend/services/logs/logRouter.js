// services/logs/logRouter.js
const getLogModels = require("../../models/logs") /* expects exported function */;

async function resolveModelForEvent(event) {
  const models = await getLogModels();
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
  return map[cat] || models.SystemEvent;
}

module.exports = { resolveModelForEvent };
