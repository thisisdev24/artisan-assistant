// src/utils/logger/initLogger.js

import { setupClickTracking } from "./autoClick";
import { setupErrorTracking } from "./autoErrors";
import { setupNetworkTracking } from "./autoNetwork";
import { setupPageTracking } from "./autoPage";
import { setupPerfTracking } from "./autoPerf";
import { setupScrollTracking } from "./autoScroll";

export function initFrontendLogging(loggerClient) {
  if (!loggerClient) return;

  setupClickTracking(loggerClient);
  setupErrorTracking(loggerClient);
  setupNetworkTracking(loggerClient);
  setupPageTracking(loggerClient);
  setupPerfTracking(loggerClient);
  setupScrollTracking(loggerClient);
}
