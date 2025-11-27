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

  function getDeviceInfo() {
    if (typeof window === "undefined") return {};

    const info = {
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language || navigator.userLanguage,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      user_agent: navigator.userAgent,
      platform: navigator.platform,
    };

    // Calculate timezone offset in minutes
    const offset = -new Date().getTimezoneOffset();
    info.timezone_offset_minutes = offset;

    return info;
  }

  function getNetworkInfo() {
    if (typeof window === "undefined" || !navigator.connection) return {};

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return {};

    return {
      connection_type: conn.type || null,
      effective_type: conn.effectiveType || null,
      downlink: conn.downlink || null, // Mbps
      rtt: conn.rtt || null, // milliseconds
      saveData: conn.saveData || false,
    };
  }

  async function logEvent(event) {
    const deviceInfo = getDeviceInfo();
    const networkInfo = getNetworkInfo();

    const enrichedEvent = {
      ...event,
      session_id: getOrCreateSessionId(),
      anonymous_id: getOrCreateAnonymousId(),
      timestamp_client_utc: new Date().toISOString(),
      device: {
        ...(event.device || {}),
        ...deviceInfo,
      },
      network: {
        ...(event.network || {}),
        ...networkInfo,
        latency_ms: networkInfo.rtt || null,
      },
      client_timezone: deviceInfo.timezone,
      timezone_offset_minutes: deviceInfo.timezone_offset_minutes,
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
