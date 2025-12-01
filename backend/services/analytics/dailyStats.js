const { loadAnalyticsModels } = require("../../models/analytics");

module.exports = async function saveDailyStats(doc) {
    const { DailyStats } = await loadAnalyticsModels();
    return DailyStats.findOneAndUpdate(
        { date: doc.date },
        doc,
        { upsert: true, new: true }
    );
};
