// src/utils/logger/trackers/autoClick.js
export default function initAutoClick(client) {
  function onClick(e) {
    const el = e.target;
    client.logEvent({
      event_type: "INTERACTION_CLICK",
      category: "interaction",
      action: "click",
      interaction: {
        type: "click",
        tag: el.tagName,
        id: el.id || null,
        classes: el.className || null,
        text: (el.innerText || "").slice(0, 200),
        path: window.location.pathname
      }
    });
  }
  window.addEventListener("click", onClick, true);
  return () => window.removeEventListener("click", onClick, true);
}
