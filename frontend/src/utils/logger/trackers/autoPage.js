// src/utils/logger/trackers/autoPage.js
export default function initAutoPage(client) {
  let pageStartTime = Date.now();

  function sendPage() {
    const durationSec = Math.round((Date.now() - pageStartTime) / 1000);

    client.logEvent({
      event_type: "PAGE_VIEW",
      category: "interaction",
      action: "view",
      interaction: {
        type: "view",
        view: {
          page: window.location.pathname,
          duration_sec: durationSec > 0 ? durationSec : null,
        },
        client_ts: new Date().toISOString(),
      },
      page_context: {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer || null,
      }
    });

    // Reset timer for next page
    pageStartTime = Date.now();
  }

  window.addEventListener("popstate", sendPage);
  // initial page view
  sendPage();

  return () => window.removeEventListener("popstate", sendPage);
}

