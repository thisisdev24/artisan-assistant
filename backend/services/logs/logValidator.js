// services/logs/logValidator.js
function validateBaseEvent(event) {
  const errors = [];

  if (!event.event_type) errors.push("event_type is required");
  if (!event.category) errors.push("category is required");

  if (errors.length) {
    const err = new Error("Invalid log event");
    err.details = errors;
    throw err;
  }
}

module.exports = { validateBaseEvent };
