// services/logs/logEnricher.js
const geoProvider = require("./geoProvider");
const deviceParser = require("./deviceParser");
const networkEnricher = require("./networkEnricher");
const systemMonitor = require("./systemMonitor");
const deploymentInfo = require("./deploymentInfo");
const healthMonitor = require("./healthMonitor");
const serverInfoProvider = require("./serverInfoProvider");

// Initialize server info on startup
serverInfoProvider.init();
// Format date as IST (Indian Standard Time) - YYYY-MM-DD HH:mm:ss IST
function formatIST(date = new Date()) {
  // Get IST time (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in ms
  const istDate = new Date(date.getTime() + istOffset);

  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const hours = String(istDate.getUTCHours()).padStart(2, '0');
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} IST`;
}

async function enrichBaseEvent(raw, context) {
  const nowIST = formatIST();
  const base = {
    ...raw,
    timestamp_received_ist: nowIST,
    timestamp_processed_ist: nowIST,
    service_name: process.env.SERVICE_NAME || "api",
    environment: process.env.NODE_ENV || "development",
    trace: context.trace || {},
  };

  // Get IP from various sources
  const ip = context.request?.ip ||
    context.request?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    raw.geo?.ip || null;

  // Get user-agent from various sources  
  const userAgent = raw.device?.user_agent ||
    context.request?.userAgent ||
    context.request?.headers?.["user-agent"] || null;

  // Parse device info from user-agent
  try {
    if (userAgent) {
      const parsed = deviceParser.parseUA(userAgent);
      base.device = {
        ...(raw.device || {}),
        user_agent: userAgent,
        device_type: parsed.device_type || raw.device?.device_type || null,
        os: parsed.os || null,
        os_version: parsed.os_version || null,
        browser: parsed.browser || null,
        browser_version: parsed.browser_version || null,
        model: parsed.device_model || null,
        screen_resolution: raw.device?.screen || raw.device?.screen_resolution || null,
      };
    }
  } catch (e) { }

  // Check if this is a backend-generated event (no client IP/user-agent)
  const isBackendEvent = !ip && !userAgent &&
    ["deployment", "infra", "system", "background", "ai", "embedding", "vector_index"].includes(raw.category);

  // Geo lookup
  try {
    if (ip && ip !== "::1" && ip !== "127.0.0.1") {
      // Client event - use client IP for geo
      const geoData = await geoProvider.lookup(ip);
      if (geoData && geoData.country) {
        base.geo = {
          ip: ip,
          country: geoData.country || null,
          region: geoData.region || null,
          city: geoData.city || null,
          postal_code: geoData.postal_code || null,
          latitude: geoData.latitude || null,
          longitude: geoData.longitude || null,
          timezone: geoData.timezone || null,
          isp: geoData.org || null,
          organization: geoData.org || null,
          source: geoData.country ? "maxmind" : "ipapi",
        };
      }
    } else if (isBackendEvent) {
      // Backend event - use server geo info
      const serverInfo = serverInfoProvider.getCachedInfo();
      if (serverInfo?.geo) {
        base.geo = { ...serverInfo.geo };
      }
    }
  } catch (e) { }

  // Network info
  try {
    if (context.request?.headers) {
      // Client event - use request headers
      const netData = networkEnricher.normalize(context.request.headers);
      base.network = {
        connection_type: netData.connection_type || raw.network?.type || null,
        carrier: netData.carrier || null,
        asn: netData.asn || null,
        latency_ms: netData.rtt || raw.network?.rtt || null,
        vpn: false,
      };
    } else if (isBackendEvent) {
      // Backend event - use server network info
      const serverInfo = serverInfoProvider.getCachedInfo();
      if (serverInfo?.network) {
        base.network = {
          connection_type: "server",
          carrier: null,
          asn: null,
          latency_ms: null,
          vpn: false,
          public_ip: serverInfo.network.public_ip,
          primary_ip: serverInfo.network.primary_ip,
        };
      }
    }
  } catch (e) { }

  // Device info for backend events
  if (isBackendEvent && !base.device?.user_agent) {
    const serverInfo = serverInfoProvider.getCachedInfo();
    if (serverInfo?.device) {
      base.device = { ...serverInfo.device };
    }
  }


  // Infrastructure (map systemMonitor to schema fields)
  try {
    const sysData = systemMonitor.getSnapshot();
    base.infrastructure = {
      host_name: sysData.host_name || null,
      region: null,
      data_center: null,
      container_id: null,
      pod_name: null,
      instance_type: null,
      cpu_percent: sysData.cpu_percent || 0,
      memory_mb: sysData.memory_rss_mb || null,
      disk_usage_gb: null,
      uptime_seconds: sysData.uptime_seconds || null,
      node_health: null,
    };
  } catch (e) { }

  // Deployment info
  try {
    base.deployment = deploymentInfo.getInfo();
  } catch (e) { }

  // System health (map to schema fields)
  try {
    const sysData = systemMonitor.getSnapshot();
    const healthData = healthMonitor.getSnapshot();
    base.system_health = {
      cpu_load: sysData.load_avg_1m || null,
      memory_used_mb: sysData.memory_heap_used_mb || null,
      network_throughput_mb: null,
      request_rate_rps: healthData.request_rate_1m || null,
      error_rate: healthData.error_rate_1m || null,
      uptime_percent: null,
    };
  } catch (e) { }

  // Performance metrics from request context
  try {
    if (context.request?.perf || context.request?.responseMetrics) {
      base.performance = {
        response_time_ms: context.request?.responseMetrics?.response_time_ms ||
          context.request?.perf?.request_time_ms || null,
        db_query_time_ms: null,
        external_api_time_ms: null,
        cpu_percent: null,
        memory_mb: null,
        io_wait_ms: null,
        cache_hit_ratio: null,
      };
    }
  } catch (e) { }

  // Populate session sub-object from root session_id
  if (base.session_id || raw.session_id) {
    base.session = {
      ...(base.session || {}),
      session_id: base.session_id || raw.session_id || null,
    };
  }

  return base;
}

module.exports = { enrichBaseEvent };

