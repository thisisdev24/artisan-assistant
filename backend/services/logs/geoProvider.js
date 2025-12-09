// services/logs/geoProvider.js
// Uses MaxMind GeoLite2 database for fast offline geo lookup
// Fallback to ipapi.co API if database not available

const NodeCache = require("node-cache");
const axios = require("axios");
const maxmind = require("maxmind");
const path = require("path");
const fs = require("fs");

const cache = new NodeCache({ stdTTL: 3600 });

// MaxMind database setup
let cityReader = null;
let asnReader = null;
let maxmindInitialized = false;
let maxmindError = null;

// Path to GeoLite2 databases (download from MaxMind)
const GEOLITE2_CITY_PATH = process.env.GEOLITE2_CITY_PATH ||
  path.join(__dirname, "../../data/GeoLite2-City.mmdb");
const GEOLITE2_ASN_PATH = process.env.GEOLITE2_ASN_PATH ||
  path.join(__dirname, "../../data/GeoLite2-ASN.mmdb");

// Initialize MaxMind database (lazy load)
async function initMaxMind() {
  if (maxmindInitialized) return !!cityReader;
  maxmindInitialized = true;

  try {
    if (fs.existsSync(GEOLITE2_CITY_PATH)) {
      cityReader = await maxmind.open(GEOLITE2_CITY_PATH);
      console.log("✅ MaxMind GeoLite2-City loaded");
    }
    if (fs.existsSync(GEOLITE2_ASN_PATH)) {
      asnReader = await maxmind.open(GEOLITE2_ASN_PATH);
      console.log("✅ MaxMind GeoLite2-ASN loaded");
    }
    return !!cityReader;
  } catch (e) {
    maxmindError = e.message;
    console.warn("⚠️  MaxMind init failed:", e.message);
    console.warn("   Download GeoLite2 databases from: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data");
    return false;
  }
}

// Local lookup using MaxMind
function localLookup(ip) {
  if (!cityReader) return null;

  try {
    const city = cityReader.get(ip);
    if (!city) return null;

    const result = {
      ip,
      country: city.country?.names?.en || null,
      country_code: city.country?.iso_code || null,
      region: city.subdivisions?.[0]?.names?.en || null,
      region_code: city.subdivisions?.[0]?.iso_code || null,
      city: city.city?.names?.en || null,
      postal_code: city.postal?.code || null,
      latitude: city.location?.latitude || null,
      longitude: city.location?.longitude || null,
      timezone: city.location?.time_zone || null,
      accuracy_radius: city.location?.accuracy_radius || null,
    };

    // Add ASN info if available
    if (asnReader) {
      const asn = asnReader.get(ip);
      if (asn) {
        result.asn = asn.autonomous_system_number || null;
        result.org = asn.autonomous_system_organization || null;
      }
    }

    return result;
  } catch (e) {
    return null;
  }
}

// API fallback lookup
async function apiLookup(ip) {
  try {
    const res = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 2000 });
    return {
      ip,
      country: res.data.country_name,
      country_code: res.data.country_code,
      region: res.data.region,
      region_code: res.data.region_code,
      city: res.data.city,
      postal_code: res.data.postal,
      latitude: res.data.latitude,
      longitude: res.data.longitude,
      timezone: res.data.timezone,
      asn: res.data.asn,
      org: res.data.org,
    };
  } catch (e) {
    return {};
  }
}

// Main lookup function
async function lookup(ip) {
  if (!ip || ip === "::1" || ip === "127.0.0.1") return {};

  // Check cache first
  const cacheKey = `geo:${ip}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Try MaxMind first (fast, no rate limits)
  await initMaxMind();
  let result = localLookup(ip);

  // Fallback to API if MaxMind not available or lookup failed
  if (!result) {
    result = await apiLookup(ip);
  }

  // Cache result
  if (result && result.country) {
    cache.set(cacheKey, result);
  }

  return result || {};
}

// Check if MaxMind is ready
function isMaxMindReady() {
  return !!cityReader;
}

module.exports = { lookup, isMaxMindReady, initMaxMind };

