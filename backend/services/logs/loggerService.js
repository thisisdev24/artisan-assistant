// services/logs/loggerService.js
const logWriter = require("./logWriter");

async function logEvent(event, context = {}) {
  // minimal defaults
  if (!event) return;
  // ensure base event structure
  await logWriter.writeLog(event, context);
}

module.exports = { logEvent };
