// utils/httpTimer.js
const axios = require("axios");

/**
 * Wrap any axios HTTP request and measure execution time.
 *
 * Usage:
 * const { timedRequest } = require("../utils/httpTimer");
 * const { res, duration_ms } = await timedRequest({ url: "...", method: "GET" });
 * req._perf.external_api_time_ms = duration_ms;
 */

async function timedRequest(options) {
  const start = Date.now();

  const result = await axios(options);

  const duration_ms = Date.now() - start;

  return { res: result, duration_ms };
}

module.exports = { timedRequest };
