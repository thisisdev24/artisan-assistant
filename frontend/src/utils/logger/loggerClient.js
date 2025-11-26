// src/utils/logger/loggerClient.js
 


import { LOGGER_CONFIG } from "./loggerConfig";
import {
  getOrCreateSessionId,
  getOrCreateAnonymousId,
} from "./sessionManager";

export function createLoggerClient() {
  const queue = [];
  let flushTimer = null;

  const flush = async () => {
    if (queue.length === 0) return;

    const batch = [...queue];
    queue.length = 0; // clear queue

    try {
      // If batching is disabled in config, we might want to send one by one, 
      // but the plan implies we use batching to fix performance. 
      // We'll send the array. The backend supports array payload.

      await fetch(LOGGER_CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-name": LOGGER_CONFIG.appName,
          "x-app-version": LOGGER_CONFIG.appVersion,
          "x-logger-client": "frontend",
        },
        body: JSON.stringify(batch),
        keepalive: true,
      });
    } catch (err) {
      console.warn("loggerClient batch flush failed:", err);
      // Optionally re-queue critical events, but for now we drop to avoid infinite growth
    }
  };

  const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, LOGGER_CONFIG.flushIntervalMs);
  };

  async function logEvent(event) {
    const enrichedEvent = {
      ...event,
      session_id: getOrCreateSessionId(),
      anonymous_id: getOrCreateAnonymousId(),
      timestamp_client_utc: new Date().toISOString(),
    };

    if (!LOGGER_CONFIG.batch) {
      // Fallback to immediate send if batching is explicitly disabled
      try {
        await fetch(LOGGER_CONFIG.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-app-name": LOGGER_CONFIG.appName,
            "x-app-version": LOGGER_CONFIG.appVersion,
            "x-logger-client": "frontend",
          },
          body: JSON.stringify(enrichedEvent),
          keepalive: true,
        });
      } catch (err) {
        console.warn("loggerClient failed:", err);
      }
      return;
    }

    queue.push(enrichedEvent);

    if (queue.length >= LOGGER_CONFIG.maxBatchSize) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flush();
    } else {
      scheduleFlush();
    }
  }

  // Flush on page hide/unload
  if (typeof window !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    });
  }

  return { logEvent };
}
