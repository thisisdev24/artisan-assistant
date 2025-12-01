// services/logs/httpTimer.js
const axios = require("axios");
async function timedRequest(opts) {
  const start = Date.now();
  const res = await axios(opts);
  return { res, duration_ms: Date.now() - start };
}
module.exports = { timedRequest };
