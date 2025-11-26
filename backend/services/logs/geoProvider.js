// services/logs/geoProvider.js
const geoip = require("geoip-lite");

/**
 * lookupGeo(ip) -> returns object with fields matching your schema
 * - safe: returns null-filled object if lookup fails
 */
function lookupGeo(ip) {
  if (!ip) return null;

  try {
    const res = geoip.lookup(ip);
    if (!res) return null;

    // geoip-lite returns { range, country, region, city, ll, metro, zip }
    const [lat, lon] = res.ll || [null, null];
    return {
      ip,
      country: res.country || null,
      region: res.region || null,
      city: res.city || null,
      postal_code: res.zip || null,
      latitude: lat,
      longitude: lon,
      continent: null, // geoip-lite doesn't give continent
      timezone: null, // not provided by geoip-lite
      isp: null, // not provided by geoip-lite
      organization: null,
      source: "geoip-lite",
    };
  } catch (err) {
    // don't throw; return null so enricher can continue
    // eslint-disable-next-line no-console
    console.warn("[geoProvider] lookup failed:", err && err.message);
    return null;
  }
}

module.exports = { lookupGeo };
