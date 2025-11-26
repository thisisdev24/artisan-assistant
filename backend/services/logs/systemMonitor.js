// services/logs/systemMonitor.js
const os = require("os");
const pidusage = require("pidusage");

/**
 * getInfrastructureSnapshot() -> returns object compatible with InfraSchema
 * Does not mutate or require external access. Uses pidusage for CPU/mem.
 */
async function getInfrastructureSnapshot() {
  const hostname = os.hostname();
  const uptime_seconds = Math.floor(os.uptime());
  const totalMemMB = Math.round(os.totalmem() / (1024 * 1024));
  const freeMemMB = Math.round(os.freemem() / (1024 * 1024));
  const memory_mb = totalMemMB - freeMemMB;

  const infra = {
    host_name: hostname,
    region: process.env.INSTANCE_REGION || null,
    data_center: process.env.DATA_CENTER || null,
    container_id: process.env.CONTAINER_ID || null,
    pod_name: process.env.POD_NAME || null,
    instance_type: process.env.INSTANCE_TYPE || null,
    cpu_percent: null,
    memory_mb,
    disk_usage_gb: null,
    uptime_seconds,
    node_health: "unknown",
  };

  try {
    const stats = await pidusage(process.pid);
    // pidusage.cpu is percent (e.g. 12.3)
    infra.cpu_percent = typeof stats.cpu === "number" ? Math.round(stats.cpu * 100) / 100 : null;
    infra.memory_mb = typeof stats.memory === "number" ? Math.round(stats.memory / (1024 * 1024)) : infra.memory_mb;
    infra.node_version = process.version;
    infra.process_id = process.pid;
    infra.node_health = "ok";
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[systemMonitor] pidusage failed:", err && err.message);
  }

  return infra;
}

module.exports = { getInfrastructureSnapshot };
