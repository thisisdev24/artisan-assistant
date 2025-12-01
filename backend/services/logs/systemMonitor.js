// services/logs/systemMonitor.js
const os = require("os");
let last = null;
function getSnapshot() {
  return {
    host_name: os.hostname(),
    process_id: process.pid,
    node_version: process.version,
    memory_mb: Math.round((process.memoryUsage().rss || 0) / 1024 / 1024),
    uptime_seconds: Math.round(process.uptime())
  };
}
module.exports = { getSnapshot };
