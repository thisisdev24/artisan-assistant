// src/utils/logger/trackers/autoClick.js
export default function initAutoClick(client) {
  let clickSequence = 0;

  function onClick(e) {
    clickSequence++;
    const el = e.target;

    client.logEvent({
      event_type: "INTERACTION_CLICK",
      category: "interaction",
      action: "click",
      interaction: {
        type: "click",
        click: {
          element_id: el.id || null,
          element_type: el.tagName?.toLowerCase() || null,
          x: typeof e.clientX === 'number' ? e.clientX : null,
          y: typeof e.clientY === 'number' ? e.clientY : null,
          text: (el.innerText || el.value || "").slice(0, 200) || null,
        },
        element_path: getElementPath(el),
        sequence_in_session: clickSequence,
        client_ts: new Date().toISOString(),
      },
      page_context: {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer || null,
      }
    });
  }

  // Get element's DOM path
  function getElementPath(el) {
    const path = [];
    while (el && el !== document.body) {
      let selector = el.tagName?.toLowerCase() || '';
      if (el.id) selector += `#${el.id}`;
      else if (el.className) selector += `.${el.className.split(' ')[0]}`;
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ').slice(0, 500);
  }

  window.addEventListener("click", onClick, true);
  return () => window.removeEventListener("click", onClick, true);
}

