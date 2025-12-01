// services/logs/errorTagger.js
function tagError(err = {}) {
  const tags = [];
  if (err.name) tags.push(err.name);
  if (err.code) tags.push(String(err.code));
  if (/timeout|ETIMEDOUT|ENOTFOUND/i.test(err.message || "")) tags.push("network");
  if (err.status >= 500) tags.push("server");
  return { code: err.code || err.status || null, tags, severity: err.severity || (err.status >= 500 ? "critical" : "error") };
}
module.exports = { tagError };
