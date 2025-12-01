// src/utils/logger/trackers/autoErrors.js
export default function initAutoErrors(client) {
  window.addEventListener("error", e => {
    client.logEvent({
      event_type: "JS_ERROR",
      category: "interaction",
      action: "error",
      error: { message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error?.stack }
    });
  });
  window.addEventListener("unhandledrejection", ev => {
    client.logEvent({
      event_type: "PROMISE_REJECTION",
      category: "interaction",
      action: "error",
      error: { message: ev.reason?.message || String(ev.reason), stack: ev.reason?.stack }
    });
  });
}
