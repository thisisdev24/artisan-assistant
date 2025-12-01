// src/utils/logger/loggerConfig.js
export default {
  ENDPOINT: (import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/logs/ingest` : "/api/logs/ingest"),
  BATCH_SIZE: 25,
  FLUSH_INTERVAL_MS: 2000,
  ENABLE_OFFLINE_PERSIST: true,
  INTERACTION_SAMPLE_RATE: 0.02,
};
