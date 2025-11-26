// services/logs/deviceParser.js
const UAParser = require("ua-parser-js");

/**
 * parseUA(userAgentString) -> returns object with device fields matching schema
 */
function parseUA(uaString) {
  if (!uaString || typeof uaString !== "string") return {};

  try {
    const parser = new UAParser(uaString);
    const os = parser.getOS(); // { name, version }
    const browser = parser.getBrowser(); // { name, version }
    const device = parser.getDevice(); // { vendor, model, type }
    const cpu = parser.getCPU(); // { architecture }

    return {
      user_agent: uaString,
      device_type: (device.type || "web"),
      brand: device.vendor || null,
      model: device.model || null,
      os: os.name || null,
      os_version: os.version || null,
      browser: browser.name || null,
      browser_version: browser.version || null,
      cpu_arch: cpu.architecture || null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[deviceParser] ua parse failed:", err && err.message);
    return { user_agent: uaString };
  }
}

module.exports = { parseUA };
