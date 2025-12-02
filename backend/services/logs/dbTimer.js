// services/logs/dbTimer.js
async function timedQuery(fn) {
  const start = Date.now();
  const res = await fn();
  return { res, duration_ms: Date.now() - start };
}
module.exports = { timedQuery };
