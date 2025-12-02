// services/logs/healthMonitor.js
const circular = { requests: 0, errors: 0, lastReset: Date.now() };
function recordRequest(isError = false) {
    circular.requests++;
    if (isError) circular.errors++;
}
function getSnapshot() {
    return { request_rate_1m: circular.requests, error_rate_1m: circular.errors, lastReset: circular.lastReset };
}
module.exports = { recordRequest, getSnapshot: () => getSnapshot() };
