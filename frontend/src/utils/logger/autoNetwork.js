// src/utils/logger/autoNetwork.js
 

import { LOGGER_CONFIG } from "./loggerConfig";

export function setupNetworkTracking(logger) {
  if (!LOGGER_CONFIG.networkTracking) return;
  if (typeof window === "undefined") return;

  const origFetch = window.fetch.bind(window);

  window.fetch = async function (...args) {
    const start = performance.now();

    // Avoid infinite loop: don't track calls to the logger endpoint
    const url = args[0] instanceof Request ? args[0].url : String(args[0]);
    if (url.includes(LOGGER_CONFIG.endpoint)) {
      return origFetch(...args);
    }

    try {
      const res = await origFetch(...args);

      if (!res.ok) {
        logger.logEvent({
          event_type: "NETWORK_ERROR",
          category: "system",
          subcategory: "http",
          action: "fetch_error",
          metadata: {
            url: res.url,
            status: res.status,
            duration_ms: performance.now() - start,
          },
        });
      }

      return res;
    } catch (err) {
      logger.logEvent({
        event_type: "NETWORK_ERROR",
        category: "system",
        subcategory: "http",
        action: "fetch_exception",
        metadata: {
          request: args[0],
          error: err.message,
          duration_ms: performance.now() - start,
        },
      });
      throw err;
    }
  };

  const OrigXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new OrigXHR();
    const start = performance.now();

    // We can't easily check URL at construction time, but we can check it on open or send.
    // However, XHR is less common for modern apps. 
    // Let's hook into 'open' to capture the URL.
    const origOpen = xhr.open;
    let isLogRequest = false;

    xhr.open = function (method, url, ...rest) {
      if (String(url).includes(LOGGER_CONFIG.endpoint)) {
        isLogRequest = true;
      }
      return origOpen.call(this, method, url, ...rest);
    };

    xhr.addEventListener("loadend", () => {
      if (isLogRequest) return; // Skip logging for log requests

      if (xhr.status >= 400) {
        logger.logEvent({
          event_type: "NETWORK_ERROR",
          category: "system",
          subcategory: "http",
          action: "xhr_error",
          metadata: {
            status: xhr.status,
            responseURL: xhr.responseURL,
            duration_ms: performance.now() - start,
          },
        });
      }
    });

    return xhr;
  };
}
