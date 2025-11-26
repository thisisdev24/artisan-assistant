// src/utils/logger/loggerConfig.js

export const LOGGER_CONFIG = {
  endpoint: import.meta.env.VITE_LOG_ENDPOINT || "/api/logs/ingest",

  appName: "artisan-frontend",
  appVersion: "1.0.0",
  environment: import.meta.env.MODE || "development",

  batch: true,
  flushIntervalMs: 3000,
  maxBatchSize: 50,
  maxQueueSize: 500,

  retryBackoffBase: 500, // ms
  retryBackoffMax: 5000, // ms

  clickTracking: true,
  scrollTracking: true,
  performanceTracking: true,
  errorTracking: true,
  networkTracking: true,
  pageTracking: true,

  maxTextLength: 200,
};
