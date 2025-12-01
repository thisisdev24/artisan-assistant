// src/utils/logger/trackers/index.js
import initAutoClick from "./autoClick.js";
import initAutoPage from "./autoPage.js";
import initAutoScroll from "./autoScroll.js";
import initAutoPerf from "./autoPerf.js";
import initAutoErrors from "./autoErrors.js";
import initAutoNetwork from "./autoNetwork.js";

export function initAll(client, opts = {}) {
    const handlers = [];
    try { handlers.push(initAutoClick(client, opts)); } catch (e) { }
    try { handlers.push(initAutoPage(client, opts)); } catch (e) { }
    try { handlers.push(initAutoScroll(client, opts)); } catch (e) { }
    try { handlers.push(initAutoPerf(client, opts)); } catch (e) { }
    try { handlers.push(initAutoErrors(client, opts)); } catch (e) { }
    try { handlers.push(initAutoNetwork(client, opts)); } catch (e) { }
    // return teardown
    return () => handlers.forEach(h => { try { if (typeof h === "function") h(); } catch (e) { } });
}
