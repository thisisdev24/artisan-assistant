// src/utils/logger/trackers/autoPerf.js
export default function initAutoPerf(client, opts = {}) {
  let reported = false;
  function collectAndSend() {
    if (reported) return;
    try {
      const perf = window.performance;
      const nav = perf && perf.getEntriesByType ? perf.getEntriesByType("navigation")[0] : null;
      const paintEntries = perf.getEntriesByType ? perf.getEntriesByType("paint") : [];
      const fcp = paintEntries.find(p => p.name === "first-contentful-paint")?.startTime || null;
      const lcpEntry = (window.__lcpValue) ? window.__lcpValue : null; // optional LCP capture by user hook
      const payload = {
        event_type: "PAGE_PERF",
        category: "system",
        action: "page_perf",
        performance: {
          navigationTiming: nav ? {
            domContentLoaded: nav.domContentLoadedEventEnd,
            loadEvent: nav.loadEventEnd,
            connectStart: nav.connectStart,
            responseEnd: nav.responseEnd,
            requestStart: nav.requestStart,
            domInteractive: nav.domInteractive,
            duration: nav.duration
          } : null,
          fcp: fcp || null,
          lcp: lcpEntry || null,
          memory: performance.memory ? {
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            usedJSHeapSize: performance.memory.usedJSHeapSize
          } : null
        }
      };
      client.logEvent(payload);
      reported = true;
    } catch (e) {
      console.warn("[autoPerf] error", e && e.message);
    }
  }

  // try to send after load
  if (document.readyState === "complete") {
    collectAndSend();
  } else {
    window.addEventListener("load", collectAndSend, { once: true });
  }

  // also send on visibilitychange (tab becomes visible)
  function onVisible() {
    if (document.visibilityState === "visible") collectAndSend();
  }
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("load", collectAndSend);
  };
}
