// services/logs/systemMonitor.js
const os = require("os");

// Track CPU usage
let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();
let cpuPercent = 0;

// Track event loop lag
let eventLoopLag = 0;
let lagCheckInterval = null;

function measureEventLoopLag() {
  const start = Date.now();
  setImmediate(() => {
    eventLoopLag = Date.now() - start;
  });
}

// Start measuring event loop lag periodically
function startMonitoring() {
  if (lagCheckInterval) return;
  lagCheckInterval = setInterval(measureEventLoopLag, 1000);
  measureEventLoopLag();
}

// Calculate CPU percentage
function updateCpuUsage() {
  const now = Date.now();
  const elapsed = now - lastCpuTime;
  if (elapsed < 100) return; // Don't update too frequently

  const usage = process.cpuUsage(lastCpuUsage);
  const userPercent = (usage.user / 1000) / elapsed * 100;
  const systemPercent = (usage.system / 1000) / elapsed * 100;
  cpuPercent = Math.min(100, Math.round(userPercent + systemPercent));

  lastCpuUsage = process.cpuUsage();
  lastCpuTime = now;
}

function getSnapshot() {
  updateCpuUsage();
  const mem = process.memoryUsage();
  const loadAvg = os.loadavg();

  return {
    // Host info
    host_name: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),

    // Process info
    process_id: process.pid,
    node_version: process.version,
    uptime_seconds: Math.round(process.uptime()),

    // Memory (MB)
    memory_rss_mb: Math.round(mem.rss / 1024 / 1024),
    memory_heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
    memory_heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
    memory_external_mb: Math.round((mem.external || 0) / 1024 / 1024),

    // System memory
    system_memory_total_gb: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 10) / 10,
    system_memory_free_gb: Math.round(os.freemem() / 1024 / 1024 / 1024 * 10) / 10,

    // CPU
    cpu_percent: cpuPercent,
    cpu_cores: os.cpus().length,
    load_avg_1m: Math.round(loadAvg[0] * 100) / 100,
    load_avg_5m: Math.round(loadAvg[1] * 100) / 100,
    load_avg_15m: Math.round(loadAvg[2] * 100) / 100,

    // Event loop health
    event_loop_lag_ms: eventLoopLag
  };
}

// Auto-start monitoring
startMonitoring();

module.exports = { getSnapshot, startMonitoring };

