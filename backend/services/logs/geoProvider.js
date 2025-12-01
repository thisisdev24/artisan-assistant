// services/logs/geoProvider.js
const NodeCache = require("node-cache");
const axios = require("axios");
const cache = new NodeCache({ stdTTL: 3600 });

async function lookup(ip) {
  if (!ip) return {};
  const k = `geo:${ip}`;
  const cached = cache.get(k);
  if (cached) return cached;
  try {
    // use ipapi.co as example (or replace with maxmind)
    const res = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 1000 });
    const data = {
      ip,
      country: res.data.country_name,
      region: res.data.region,
      city: res.data.city,
      latitude: res.data.latitude,
      longitude: res.data.longitude,
      org: res.data.org,
      timezone: res.data.timezone,
    };
    cache.set(k, data);
    return data;
  } catch (e) {
    return {};
  }
}

module.exports = { lookup };
