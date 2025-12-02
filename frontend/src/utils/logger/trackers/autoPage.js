// src/utils/logger/trackers/autoPage.js
export default function initAutoPage(client) {
  function sendPage() {
    client.logEvent({
      event_type: "PAGE_VIEW",
      category: "interaction",
      action: "view",
      page: { pathname: window.location.pathname, title: document.title }
    });
  }
  window.addEventListener("popstate", sendPage);
  // initial
  sendPage();
  return () => window.removeEventListener("popstate", sendPage);
}
