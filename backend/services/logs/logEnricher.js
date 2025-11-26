// services/logs/logEnricher.js
const { randomUUID } = require("crypto");
const os = require("os");
const { lookupGeo } = require("./geoProvider");
const { parseUA } = require("./deviceParser");
const { getInfrastructureSnapshot } = require("./systemMonitor"); // note path

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function enrichBaseEvent(rawEvent = {}, context = {}) {
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

  // infrastructure snapshot (async not used here to prevent blocking)
  // we'll attach lightweight host info synchronously, and optionally full snapshot on-demand
  const infrastructure = {
    host_name: rawEvent.infrastructure?.host_name || os.hostname(),
    process_id: rawEvent.infrastructure?.process_id || process.pid,
    node_version: rawEvent.infrastructure?.node_version || process.version,
    // other infra metrics (cpu/mem) will be filled asynchronously if caller requests
  };

  // merge perf if present on request (e.g., perfMiddleware)
  const perfFromReq = request._perf || request._perf || (request.rawReq && request.rawReq._perf) || {};

  const enriched = {
    ...rawEvent,
    event_id,
    event_version: rawEvent.event_version || 1,
    status: rawEvent.status || (rawEvent.error ? "error" : "success"),
    severity: rawEvent.severity || (rawEvent.error ? "error" : "info"),

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

    // timestamps - canonical UTC ingestion time
    timestamp_received_utc: toDateOrNull(rawEvent.timestamp_received_utc) || now,
    timestamp_processed_utc: toDateOrNull(rawEvent.timestamp_processed_utc) || null,
    timestamp_completed_utc: toDateOrNull(rawEvent.timestamp_completed_utc) || null,

    // client timezone info (preserve if present)
    client_timezone: rawEvent.client_timezone || request.client_timezone || null,
    timezone_offset_minutes: rawEvent.timezone_offset_minutes || request.timezone_offset_minutes || null,

    // geo (from lookup if available, merged with rawEvent.geo)
    geo: {
      ...((rawEvent.geo && typeof rawEvent.geo === "object") ? rawEvent.geo : {}),
      ...(geoLookup || {}),
      ip: (rawEvent.geo && rawEvent.geo.ip) || ip || null,
    },

    // device: merge parsed UA + raw device
    device: {
      ...(rawEvent.device || {}),
      ...parsed,
      app_name: (rawEvent.device && rawEvent.device.app_name) || appName || null,
      app_version: (rawEvent.device && rawEvent.device.app_version) || appVersion || null,
      screen_resolution: (rawEvent.device && rawEvent.device.screen_resolution) || rawEvent.metadata?.device?.screen_resolution || null,
      language: (rawEvent.device && rawEvent.device.language) || (typeof navigator !== "undefined" ? navigator.language : null),
    },

    // network/perf/error/system
    network: rawEvent.network || {},
    performance: {
      ...(rawEvent.performance || {}),
      ...perfFromReq,
    },
    error: rawEvent.error || (rawEvent.error ? rawEvent.error : undefined),

    // system/infrastructure
    infrastructure: {
      ...(rawEvent.infrastructure || {}),
      ...infrastructure,
    },

    // correlation-ish metadata
    service_name: rawEvent.service_name || serviceName || process.env.SERVICE_NAME || null,
    environment: rawEvent.environment || process.env.NODE_ENV || "development",
    route: rawEvent.route || request.routePath || request.originalUrl || null,
    component: rawEvent.component || null,

    metadata: rawEvent.metadata || {},
  };

  // Optional: attach async infra snapshot if explicitly requested by context
  // e.g., context.attachFullInfra = true
  if (context && context.attachFullInfra) {
    // caller asked for full snapshot; fetch (async) and attach under enriched.infrastructure_full
    // Note: this is synchronous function - return value should be handled by caller if they await
    // We will set a flag for writer to call a helper if needed.
    enriched.__need_full_infra = true;
  }

  return enriched;
}

module.exports = { enrichBaseEvent, toDateOrNull };
