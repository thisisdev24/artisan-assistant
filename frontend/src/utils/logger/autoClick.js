// src/utils/logger/autoClick.js
import { LOGGER_CONFIG } from "./loggerConfig";

function getPath(el) {
  if (!el) return "";
  const path = [];
  let node = el;
  while (node && path.length < 6) {
    let selector = node.tagName?.toLowerCase() || "";
    if (node.id) selector += `#${node.id}`;
    else if (node.className) {
      const cls = node.className
        .toString()
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .join(".");
      if (cls) selector += `.${cls}`;
    }
    path.unshift(selector);
    node = node.parentElement;
  }
  return path.join(" > ");
}

export function setupClickTracking(logger) {
  if (!LOGGER_CONFIG.clickTracking) return;
  if (typeof window === "undefined") return;

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const rect = target.getBoundingClientRect();
      const raw = (target.innerText || "").trim().replace(/\s+/g, " ");
      const text =
        raw.length > LOGGER_CONFIG.maxTextLength
          ? raw.slice(0, LOGGER_CONFIG.maxTextLength) + "..."
          : raw;

      logger.logEvent({
        event_type: "INTERACTION_CLICK",
        category: "interaction",
        subcategory: "ui",
        action: "click",

        interaction: {
          type: "click",
          click: {
            element_id: target.id || null,
            element_type: target.tagName.toLowerCase(),
            x: e.clientX,
            y: e.clientY,
            text: text || null,
            dataset: { ...target.dataset },
          },
          element_path: getPath(target),
          client_ts: new Date().toISOString(),
        },

        metadata: {
          bounding_box: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        },
      });
    },
    true
  );
}
