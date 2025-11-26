// src/utils/logger/autoPage.js
import { LOGGER_CONFIG } from "./loggerConfig";

let currentPath = "";
let startTime = 0;

function pageContext() {
  return {
    url: window.location.href,
    referrer: document.referrer,
    title: document.title,
  };
}

function sendView(logger, reason) {
  const now = performance.now();
  const duration = (now - startTime) / 1000;

  const ctx = pageContext();

  logger.logEvent({
    event_type: "INTERACTION_VIEW",
    category: "interaction",
    subcategory: "page",
    action: "view",

    description: `Page view (${reason})`,

    interaction: {
      type: "view",
      view: {
        page: ctx.url,
        duration_sec: duration,
        scroll_depth_pct: null,
        components_seen: [],
      },
      client_ts: new Date().toISOString(),
    },

    page_context: ctx,
  });

  startTime = now;
}

function patchHistory(logger) {
  const origPush = history.pushState;
  const origReplace = history.replaceState;

  history.pushState = function () {
    const prev = currentPath;
    const ret = origPush.apply(this, arguments);
    const now = location.pathname + location.search;
    if (now !== prev) {
      currentPath = now;
      sendView(logger, "navigation");
    }
    return ret;
  };

  history.replaceState = function () {
    const prev = currentPath;
    const ret = origReplace.apply(this, arguments);
    const now = location.pathname + location.search;
    if (now !== prev) {
      currentPath = now;
      sendView(logger, "navigation");
    }
    return ret;
  };

  window.addEventListener("popstate", () => {
    const prev = currentPath;
    const now = location.pathname + location.search;
    if (now !== prev) {
      currentPath = now;
      sendView(logger, "navigation");
    }
  });
}

export function setupPageTracking(logger) {
  if (!LOGGER_CONFIG.pageTracking) return;
  if (typeof window === "undefined") return;

  currentPath = location.pathname + location.search;
  startTime = performance.now();

  sendView(logger, "load");
  patchHistory(logger);
}
