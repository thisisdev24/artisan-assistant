// src/utils/logger/trackers/autoNetwork.js
export default function initAutoNetwork(client, opts = {}) {
  const intervalMs = opts.intervalMs || 60_000; // emit every minute while online
  function reportNetwork(reason = "periodic") {
    try {
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c && reason !== "periodic") return;
      const payload = {
        event_type: "NETWORK_INFO",
        category: "system",
        action: "network_snapshot",
        network: {
          type: c?.type || null,
          effectiveType: c?.effectiveType || null,
          downlink: c?.downlink || null,
          rtt: c?.rtt || null,
          saveData: !!c?.saveData
        },
        metadata: { reason }
      };
      client.logEvent(payload);
    } catch (e) {
      // swallow — non-critical
      console.warn("[autoNetwork] error", e && e.message);
    }
  }

  // report on change if supported
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (c && typeof c.addEventListener === "function") {
    c.addEventListener("change", () => reportNetwork("connection_change"));
  } else if (window.addEventListener) {
    // fallback: online/offline events
    window.addEventListener("online", () => reportNetwork("online"));
    window.addEventListener("offline", () => reportNetwork("offline"));
  }

  // periodic snapshot
  const timer = setInterval(() => reportNetwork("periodic"), intervalMs);
  // initial snapshot
  reportNetwork("init");

  return () => {
    try {
      if (c && typeof c.removeEventListener === "function") c.removeEventListener("change", reportNetwork);
      clearInterval(timer);
    } catch (e) { }
  };
}
