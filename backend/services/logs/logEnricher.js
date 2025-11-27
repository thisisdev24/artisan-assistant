// services/logs/logEnricher.js
const { randomUUID } = require("crypto");
const os = require("os");
const { lookupGeo } = require("./geoProvider");
const { parseUA } = require("./deviceParser");
const { getInfrastructureSnapshot } = require("./systemMonitor");
const { enrichNetwork } = require("./networkEnricher");
const { getDeploymentInfo } = require("../deploymentInfo");
const { healthMonitor } = require("./healthMonitor");

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function enrichBaseEvent(rawEvent = {}, context = {}) {
  const now = new Date();

  const {
    actor = {},
    trace = {},
    request = {},
    serviceName = null,
    appName = null,
    appVersion = null,
  } = context || {};

  const event_id = rawEvent.event_id || randomUUID();

  // parse UA
  const ua = (request && request.userAgent) || rawEvent.device?.user_agent || null;
  const parsed = parseUA(ua || "");

  // geo: lookup by request.ip if available
  const ip = (rawEvent.geo && rawEvent.geo.ip) || request.ip || null;
  const geoLookup = lookupGeo(ip);

  // Always fetch full infrastructure snapshot
  let infrastructure = {
    host_name: rawEvent.infrastructure?.host_name || os.hostname(),
    process_id: rawEvent.infrastructure?.process_id || process.pid,
    node_version: rawEvent.infrastructure?.node_version || process.version,
  };

  try {
    const fullInfra = await getInfrastructureSnapshot();
    infrastructure = { ...infrastructure, ...fullInfra };
  } catch (err) {
    console.warn("[logEnricher] failed to get infrastructure snapshot:", err && err.message);
  }

  // merge perf if present on request (e.g., perfMiddleware)
  const perfFromReq = request._perf || request._perf || (request.rawReq && request.rawReq._perf) || {};

  // Auto-generate request_id if not present
  const request_id = (rawEvent.request && rawEvent.request.request_id) ||
    (request && request.request_id) ||
    event_id;

  // Extract controller from route
  const controller = (rawEvent.request && rawEvent.request.controller) ||
    extractControllerFromRoute(request.routePath || rawEvent.route);

  // Calculate timezone offset from client timezone if available
  const timezone_offset_minutes = rawEvent.timezone_offset_minutes ||
    (rawEvent.device && rawEvent.device.timezone_offset_minutes) ||
    null;

  // Auto-generate description if not present
  const description = rawEvent.description ||
    (rawEvent.action ? `${rawEvent.action} - ${rawEvent.event_type}` : null);

  // Get deployment info
  const deploymentInfo = getDeploymentInfo();

  // Get system health snapshot
  const systemHealth = healthMonitor.getHealthSnapshot();

  // Get CPU and memory from infrastructure
  if (infrastructure.cpu_percent !== null) {
    systemHealth.cpu_load = infrastructure.cpu_percent;
  }
  if (infrastructure.memory_mb !== null) {
    systemHealth.memory_used_mb = infrastructure.memory_mb;
  }

  // Get response metrics from request
  const responseMetrics = request._responseMetrics || {};

  const enriched = {
    ...rawEvent,
    event_id,
    event_version: rawEvent.event_version || 1,
    status: rawEvent.status || (rawEvent.error ? "error" : "success"),
    severity: rawEvent.severity || (rawEvent.error ? "error" : "info"),
    description,

    // actor
    user_id: rawEvent.user_id || actor.userId || null,
    role: rawEvent.role || actor.role || null,
    session_id: rawEvent.session_id || actor.sessionId || null,
    anonymous_id: rawEvent.anonymous_id || actor.anonymousId || null,
    impersonated_user_id: rawEvent.impersonated_user_id || actor.impersonatedUserId || null,

    // trace
    trace: {
      trace_id: (rawEvent.trace && rawEvent.trace.trace_id) || trace.traceId || event_id,
      parent_event_id: (rawEvent.trace && rawEvent.trace.parent_event_id) || trace.parentEventId || null,
      correlation_id: (rawEvent.trace && rawEvent.trace.correlation_id) || trace.correlationId || event_id,
      span_id: (rawEvent.trace && rawEvent.trace.span_id) || trace.spanId || null,
    },

    // timestamps - IST only (no UTC)
    timestamp_received_ist: rawEvent.timestamp_received_ist || now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    timestamp_processed_ist: rawEvent.timestamp_processed_ist || null,
    timestamp_completed_ist: rawEvent.timestamp_completed_ist || null,

    // client timezone info (preserve if present, or map from device)
    client_timezone: rawEvent.client_timezone ||
      request.client_timezone ||
      rawEvent.device?.timezone ||
      (geoLookup && geoLookup.timezone) ||
      null,
    timezone_offset_minutes,

    // geo (from lookup if available, merged with rawEvent.geo)
    geo: {
      ...((rawEvent.geo && typeof rawEvent.geo === "object") ? rawEvent.geo : {}),
      ...(geoLookup || {}),
      ip: (rawEvent.geo && rawEvent.geo.ip) || ip || null,
    },

    // device: merge parsed UA + raw device + frontend data
    device: {
      ...(rawEvent.device || {}),
      ...parsed,
      device_name: (rawEvent.device && rawEvent.device.device_name) || parsed.device_name || null,
      app_name: (rawEvent.device && rawEvent.device.app_name) || appName || null,
      app_version: (rawEvent.device && rawEvent.device.app_version) || appVersion || null,
      screen_resolution: (rawEvent.device && rawEvent.device.screen_resolution) || rawEvent.metadata?.device?.screen_resolution || null,
      language: (rawEvent.device && rawEvent.device.language) || rawEvent.language || null,
      timezone: (rawEvent.device && rawEvent.device.timezone) || rawEvent.client_timezone || null,
      platform: (rawEvent.device && rawEvent.device.platform) || rawEvent.platform || null,
      user_agent: ua,
      timezone_offset_minutes: (rawEvent.device && rawEvent.device.timezone_offset_minutes) || timezone_offset_minutes,
    },

    // network - use enrichNetwork to normalize and validate
    network: enrichNetwork(rawEvent.network || {}, ip),

    // performance
    performance: {
      ...(rawEvent.performance || {}),
      ...perfFromReq,
    },
    error: rawEvent.error || (rawEvent.error ? rawEvent.error : undefined),

    // system/infrastructure
    infrastructure,

    // deployment info
    deployment: {
      ...(rawEvent.deployment || {}),
      ...deploymentInfo,
    },

    // system health
    system_health: {
      ...(rawEvent.system_health || {}),
      ...systemHealth,
    },

    // request info (auto-populate fields including response metrics)
    request: {
      ...(rawEvent.request || {}),
      request_id,
      controller,
      method: (rawEvent.request && rawEvent.request.method) || request.method || null,
      url: (rawEvent.request && rawEvent.request.url) || request.originalUrl || null,
      route: (rawEvent.request && rawEvent.request.route) || request.routePath || null,
      status_code: responseMetrics.status_code || null,
      response_time_ms: responseMetrics.response_time_ms || null,
      bytes_sent: responseMetrics.bytes_sent || null,
      bytes_received: responseMetrics.bytes_received || null,
    },

    // correlation-ish metadata
    service_name: rawEvent.service_name || serviceName || process.env.SERVICE_NAME || null,
    environment: rawEvent.environment || process.env.NODE_ENV || "development",
    route: rawEvent.route || request.routePath || request.originalUrl || null,
    component: rawEvent.component ||
      extractComponentFromPageUrl(rawEvent.page_context?.url) ||
      extractComponentFromRoute(request.routePath || rawEvent.route),

    metadata: {
      ...(rawEvent.metadata || {}),
      request_info: {
        referer: request.referer || null,
        origin: request.origin || null,
      },
    },
  };

  return enriched;
}

/**
 * Extract component from page URL (for frontend events)
 * e.g., http://localhost:5173/product/123 -> product
 * e.g., /listings -> listings
 */
function extractComponentFromPageUrl(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    // Parse URL to get pathname
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    const parts = pathname.split('/').filter(p => p && p.length > 0);
    if (parts.length === 0) return null;

    // Return the first part of the path (e.g., /product/123 -> product)
    return parts[0];
  } catch (err) {
    // If URL parsing fails, try direct path parsing
    const parts = url.split('/').filter(p => p && p.length > 0);
    if (parts.length === 0) return null;

    // Skip http/https parts
    if (parts[0] === 'http:' || parts[0] === 'https:') {
      return parts.length >= 3 ? parts[2] : null;
    }

    return parts[0];
  }
}

/**
 * Extract controller name from route path
 * e.g., /api/logs/ingest -> logsController
 * e.g., /ingest -> ingestController
 */
function extractControllerFromRoute(route) {
  if (!route || typeof route !== 'string') return null;

  const parts = route.split('/').filter(p => p && p.length > 0);
  if (parts.length === 0) return null;

  // If route starts with 'api', use the next part
  // Otherwise use the first part
  const controllerPart = parts[0] === 'api' && parts.length >= 2 ? parts[1] : parts[0];

  if (controllerPart) {
    return `${controllerPart}Controller`;
  }

  return null;
}

/**
 * Extract component name from route path
 * e.g., /api/logs/ingest -> logs
 * e.g., /ingest -> ingest
 */
function extractComponentFromRoute(route) {
  if (!route || typeof route !== 'string') return null;

  const parts = route.split('/').filter(p => p && p.length > 0);
  if (parts.length === 0) return null;

  // If route starts with 'api', use the next part
  // Otherwise use the first part
  return parts[0] === 'api' && parts.length >= 2 ? parts[1] : parts[0];
}

module.exports = { enrichBaseEvent, toDateOrNull };
