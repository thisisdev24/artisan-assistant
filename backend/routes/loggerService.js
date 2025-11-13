// routes/loggerService.js
const NodeCache = require("node-cache");
const fetch = require("node-fetch");
const os = require("os");
const UAParser = require("ua-parser-js");
const { connectLogDB } = require("../db/connectLogDB");

// Import full schemas
const BaseEventSchema = require("../models/logs/baseEvent");
const AdminSchema = require("../models/logs/adminEvent");
const ArtistSchema = require("../models/logs/artistEvent");
const BuyerEventSchema = require("../models/logs/buyerEvent");
const InteractionSchema = require("../models/logs/interactionEvent");
const BusinessSchema = require("../models/logs/businessEvent");
const SystemSchema = require("../models/logs/systemEvent");
const SecuritySchema = require("../models/logs/securityEvent");
const FinancialSchema = require("../models/logs/financialEvent");

let logDB;
let BaseEventModel;
const Models = {};
const geoCache = new NodeCache({ stdTTL: 3600 });

/* -------------------------------------------
   INIT LOG DB & MODELS
------------------------------------------- */
async function initLoggerService() {
  if (logDB) return Models;

  logDB = await connectLogDB();

  Models.admin = logDB.model("AdminEvent", AdminSchema, "logs_admin");
  Models.artist = logDB.model("ArtistEvent", ArtistSchema, "logs_artist");
  Models.buyer = logDB.model("BuyerEvent", BuyerEventSchema, "logs_buyer");
  Models.interaction = logDB.model("InteractionEvent", InteractionSchema, "logs_interaction");
  Models.business = logDB.model("BusinessEvent", BusinessSchema, "logs_business");
  Models.security = logDB.model("SecurityEvent", SecuritySchema, "logs_security");
  Models.financial = logDB.model("FinancialEvent", FinancialSchema, "logs_financial");
  Models.system = logDB.model("SystemEvent", SystemSchema, "logs_system");

  BaseEventModel = logDB.model("BaseEvent", BaseEventSchema, "logs_base");

  console.log("🟦 Logging models initialized");
  return Models;
}

/* -------------------------------------------
   Extract real client IP (handles all proxies)
------------------------------------------- */
function extractIP(req) {
  return (
    req?.headers["cf-connecting-ip"] ||
    req?.headers["x-real-ip"] ||
    req?.headers["x-forwarded-for"]?.split(",")[0] ||
    req?.socket?.remoteAddress ||
    null
  )?.replace("::ffff:", "");
}

/* -------------------------------------------
   GEO info + AUTO timezone 
------------------------------------------- */
async function resolveGeo(ip) {
  if (!ip) return null;

  if (geoCache.has(ip)) return geoCache.get(ip);

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const json = await response.json();

    if (json.error) return null;

    const geo = {
      ip,
      city: json.city,
      region: json.region,
      country: json.country_name,
      postal_code: json.postal,
      latitude: json.latitude,
      longitude: json.longitude,
      timezone: json.timezone,    // REAL timezone, not hardcoded
      isp: json.org,
      organization: json.org,
      source: "ipapi.co"
    };

    geoCache.set(ip, geo);
    return geo;
  } catch {
    return null;
  }
}

/* -------------------------------------------
   Compute LOCAL TIME automatically 
------------------------------------------- */
function getLocalTimestamp(timezone) {
  try {
    return new Date(
      new Date().toLocaleString("en-US", { timeZone: timezone })
    );
  } catch {
    return null; // fallback handled elsewhere
  }
}

/* -------------------------------------------
   CREATE EVENT (FULLY AUTOMATED)
------------------------------------------- */
async function createLog(type, data, req = null) {
  await initLoggerService();

  if (!Models[type]) throw new Error(`Invalid log type: ${type}`);

  // IP extraction
  const ip = extractIP(req);

  // GEO + timezone
  const geo = await resolveGeo(ip);

  // UTC timestamp
  const utc = new Date();

  // Auto IST timestamp (never hardcoded)
  const ist = new Date(utc.getTime() + 5.5 * 3600 * 1000);

  // Auto Local timestamp using user's timezone
  const localTimestamp = geo?.timezone
    ? getLocalTimestamp(geo.timezone)
    : null;

  // Device parsing
  const uaString = req?.headers["user-agent"] || "";
  const ua = new UAParser(uaString);
  const device = {
    user_agent: uaString,
    os: ua.getOS().name,
    os_version: ua.getOS().version,
    browser: ua.getBrowser().name,
    browser_version: ua.getBrowser().version,
    device_type: ua.getDevice().type || "desktop",
    brand: ua.getDevice().vendor || null,
    model: ua.getDevice().model || null,
  };

  // Server info for system logs
  const systemContext =
    type === "system"
      ? {
          host_name: os.hostname(),
          platform: os.platform(),
          release: os.release(),
          cpu_cores: os.cpus().length,
          total_mem_mb: Math.round(os.totalmem() / 1024 / 1024),
          free_mem_mb: Math.round(os.freemem() / 1024 / 1024),
          uptime_seconds: os.uptime(),
          node_version: process.version,
        }
      : {};

  // Build final payload
  const payload = {
    ...data,
    geo: geo || { ip, timezone: null, source: "unavailable" },
    device,
    timestamp_received_utc: utc,
    timestamp_received_ist: ist,
    timestamp_local: localTimestamp,
    system_context: { ...systemContext, ...(data.system_context || {}) },
  };

  // Save specific event
  const event = new Models[type](payload);
  const saved = await event.save();

  // Mirror to BaseEvent
  await new BaseEventModel({
    ...payload,
    event_type: type,
  }).save();

  return saved;
}

module.exports = { createLog, initLoggerService };
