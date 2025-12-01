const { loadAnalyticsModels } = require("../../models/analytics");

module.exports = async function savePerformanceMetrics(doc) {
  const { PerformanceMetrics } = await loadAnalyticsModels();
  return PerformanceMetrics.findOneAndUpdate(
    {
      service_name: doc.service_name,
      period_start: doc.period_start,
    },
    doc,
    { upsert: true, new: true }
  );
};
