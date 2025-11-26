// services/logs/loggerService.js
const { writeLog, writeLogs } = require("./logWriter");

async function logEvent(event, context) {
  return writeLog(event, context);
}

async function logEvents(events, context) {
  return writeLogs(events, context);
}

module.exports = {
  logEvent,
  logEvents,
};
