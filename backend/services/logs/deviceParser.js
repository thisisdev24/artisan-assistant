// services/logs/deviceParser.js
const UAParser = require("ua-parser-js");

function parseUA(uaString) {
  if (!uaString) {
    return {
      device_name: 'Unknown Device',
      device_type: 'unknown',
      brand: null,
      model: null,
      os: 'Unknown',
      os_version: null,
      browser: 'Unknown',
      browser_version: null,
    };
  }

  const parsed = new UAParser(uaString);

  const browser = parsed.getBrowser() || {};
  const device = parsed.getDevice() || {};
  const os = parsed.getOS() || {};

  const osName = os.name || 'Unknown';
  const osVersion = os.version || null;
  const browserName = browser.name || 'Unknown';
  const browserVersion = browser.version || null;

  // Build a human-friendly device name
  let deviceName = `${browserName}`;
  if (osName && osName !== 'Unknown') {
    deviceName += ` on ${osName}`;
  }

  // Determine device type with better defaults
  let deviceType = device.type || 'web';
  if (deviceType === 'undefined' || !deviceType) {
    if (osName.includes('Android') || osName.includes('iOS')) {
      deviceType = 'mobile';
    } else {
      deviceType = 'web';
    }
  }

  return {
    device_name: deviceName,
    device_type: deviceType,
    brand: device.vendor || null,
    model: device.model || null,
    os: osName,
    os_version: osVersion,
    browser: browserName,
    browser_version: browserVersion,
  };
}

module.exports = { parseUA };
