// src/utils/logger/autoErrors.js
import { LOGGER_CONFIG } from "./loggerConfig";

export function setupErrorTracking(logger) {
  if (!LOGGER_CONFIG.errorTracking) return;
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    logger.logEvent({
      event_type: "FRONTEND_ERROR",
      category: "system",
      subcategory: "js",
      action: "error",
      error: {
        message: event.message,
        stack: event.error?.stack || null,
        component: "window.onerror",
      },
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logger.logEvent({
      event_type: "FRONTEND_ERROR",
      category: "system",
      subcategory: "promise",
      action: "unhandled_rejection",
      error: {
        message: String(event.reason),
        stack:
          typeof event.reason === "object" && event.reason?.stack
            ? event.reason.stack
            : null,
        component: "window.unhandledrejection",
      },
    });
  });
}
