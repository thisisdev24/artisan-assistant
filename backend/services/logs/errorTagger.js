// services/logs/errorTagger.js
function tagError(err) {
  const tags = [];
  if (!err) return { code: null, tags: [], severity: "error" };

  if (err.name) tags.push(err.name);
  if (err.code) tags.push(String(err.code));
  if (err.isOperational) tags.push("operational");
  if (err.message && /timeout|ETIMEDOUT|ENOTFOUND/i.test(err.message)) tags.push("network");
  if (err.status && err.status >= 500) tags.push("server");

  const code = err.code || err.status || null;
  return { code, tags, severity: err.severity || (err.status >= 500 ? "critical" : "error") || "error" };
}

module.exports = { tagError };
