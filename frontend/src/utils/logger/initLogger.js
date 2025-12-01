// src/utils/logger/initLogger.js
import LoggerClient from "./loggerClient.js";
import loggerConfig from "./loggerConfig.js";
import * as trackers from "./trackers/index.js"; // we'll provide index

let client = null;
export function initLogger(opts = {}) {
  if (!client) {
    client = new LoggerClient({ endpoint: opts.endpoint || loggerConfig.ENDPOINT, batchSize: opts.batchSize });
    if (opts.autoTrack !== false) {
      trackers.initAll(client);
    }
  }
  return client;
}

export function getLogger() { return client; }
