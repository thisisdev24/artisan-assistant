// src/utils/logger/autoPerf.js
import { LOGGER_CONFIG } from "./loggerConfig";

export function setupPerfTracking(logger) {
  if (!LOGGER_CONFIG.performanceTracking) return;
  if (typeof window === "undefined") return;
  if (!("performance" in window)) return;

  window.addEventListener("load", () => {
    setTimeout(() => {
      const nav = performance.getEntriesByType("navigation")[0] || null;

      const data = nav
        ? {
            ttfb_ms: nav.responseStart - nav.startTime,
            dom_content_loaded_ms:
              nav.domContentLoadedEventEnd - nav.startTime,
            load_event_ms: nav.loadEventEnd - nav.startTime,
          }
        : {};

      logger.logEvent({
        event_type: "SYSTEM_PERF",
        category: "system",
        subcategory: "frontend",
        action: "page_performance",

        metadata: data,
      });
    }, 0);
  });
}
