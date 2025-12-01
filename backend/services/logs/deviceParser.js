// services/logs/deviceParser.js
const UAParser = require("ua-parser-js");
function parseUA(uaString) {
  const p = new UAParser(uaString);
  const b = p.getBrowser(), o = p.getOS(), d = p.getDevice();
  return {
    user_agent: uaString,
    browser: b.name,
    browser_version: b.version,
    os: o.name,
    os_version: o.version,
    device_type: d.type || "desktop",
    device_model: d.model || null
  };
}
module.exports = { parseUA };
