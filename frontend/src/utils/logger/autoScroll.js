// src/utils/logger/autoScroll.js
import { LOGGER_CONFIG } from "./loggerConfig";

export function setupScrollTracking(logger) {
  if (!LOGGER_CONFIG.scrollTracking) return;
  if (typeof window === "undefined") return;

  let maxDepth = 0;
  let frame = false;

  function handle() {
    if (!frame) {
      frame = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const total = doc.scrollHeight - doc.clientHeight;
        if (total > 0) {
          const pct = (window.scrollY / total) * 100;
          if (pct > maxDepth) maxDepth = pct;
        }
        frame = false;
      });
    }
  }

  window.addEventListener("scroll", handle);

  window.addEventListener("beforeunload", () => {
    if (maxDepth <= 0) return;

    logger.logEvent({
      event_type: "INTERACTION_SCROLL",
      category: "interaction",
      subcategory: "page",
      action: "scroll_depth",
      interaction: {
        type: "scroll",
        client_ts: new Date().toISOString(),
      },
      metadata: {
        scroll_depth_pct: Math.round(maxDepth),
      },
    });
  });
}
