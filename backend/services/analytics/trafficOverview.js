const { loadAnalyticsModels } = require("../../models/analytics");

module.exports = async function saveTrafficOverview(doc) {
    const { TrafficOverview } = await loadAnalyticsModels();
    return TrafficOverview.findOneAndUpdate(
        { date: doc.date },
        doc,
        { upsert: true, new: true }
    );
};
