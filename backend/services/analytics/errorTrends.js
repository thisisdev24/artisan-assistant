const { loadAnalyticsModels } = require("../../models/analytics");

module.exports = async function saveErrorTrends(doc) {
    const { ErrorTrends } = await loadAnalyticsModels();
    return ErrorTrends.findOneAndUpdate(
        { date: doc.date, service_name: doc.service_name },
        doc,
        { upsert: true, new: true }
    );
};
