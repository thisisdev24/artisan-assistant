// src/utils/logger/trackers/autoScroll.js
export default function initAutoScroll(client, opts = {}) {
  const milestones = opts.milestones || [25, 50, 75, 100]; // percentages
  const reported = new Set();
  const throttleMs = opts.throttleMs || 500;
  let last = 0;

  function onScroll() {
    const now = Date.now();
    if (now - last < throttleMs) return;
    last = now;
    const doc = document.documentElement;
    const win = window;
    const scrollTop = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
    const height = Math.max(doc.scrollHeight, doc.offsetHeight, doc.clientHeight) - win.innerHeight;
    if (height <= 0) return;
    const percent = Math.min(100, Math.round((scrollTop / height) * 100));
    for (const m of milestones) {
      if (percent >= m && !reported.has(m)) {
        reported.add(m);
        client.logEvent({
          event_type: "SCROLL_DEPTH",
          category: "interaction",
          action: "scroll",
          interaction: {
            type: "scroll",
            depth_percent: percent,
            milestone: m
          }
        });
      }
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  // initial check
  onScroll();

  return () => window.removeEventListener("scroll", onScroll);
}
