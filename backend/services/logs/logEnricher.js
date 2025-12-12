// services/logs/logEnricher.js
const geoProvider = require("./geoProvider");
const deviceParser = require("./deviceParser");
const networkEnricher = require("./networkEnricher");
const systemMonitor = require("./systemMonitor");
const deploymentInfo = require("./deploymentInfo");
const healthMonitor = require("./healthMonitor");

async function enrichBaseEvent(raw, context) {
  const now = new Date().toISOString();
  const base = {
    ...raw,
    timestamp_received_ist: now,
    service_name: process.env.SERVICE_NAME || "api",
    environment: process.env.NODE_ENV || "development",
    trace: context.trace || {},
    request: context.request || {},
  };

  // parse user-agent (if present)
  try {
    const ua = base.device?.user_agent || context.request?.userAgent;
    base.device = { ...(base.device || {}), ...(ua ? deviceParser.parseUA(ua) : {}) };
  } catch (e) { }

  // geo
  try {
    const ip = context.request?.ip || base.geo?.ip;
    if (ip) base.geo = { ...(base.geo || {}), ...(await geoProvider.lookup(ip)) };
  } catch (e) { }

  // network
  try { base.network = { ...(base.network || {}), ...(networkEnricher.normalize(context.request?.headers || {})) }; } catch (e) { }

  // infra + deployment + health
  base.infrastructure = systemMonitor.getSnapshot();
  base.deployment = deploymentInfo.getInfo();
  base.system_health = healthMonitor.getSnapshot();

  return base;
}

module.exports = { enrichBaseEvent };
