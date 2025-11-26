// utils/dbTimer.js

/**
 * Wrap any async DB call and measure its execution time.
 *
 * Usage:
 * const { timedQuery } = require("../utils/dbTimer");
 * const { res, duration_ms } = await timedQuery(() => User.findById(id));
 * req._perf.db_query_time_ms = duration_ms;
 */

async function timedQuery(fn) {
  const start = Date.now();

  const result = await fn();  // fn must return a Promise

  const duration_ms = Date.now() - start;

  return { res: result, duration_ms };
}

module.exports = { timedQuery };
