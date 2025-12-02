const { loadAnalyticsModels } = require("../models/analytics");

module.exports = {
    async getDaily(req, res) {
        const { DailyStats } = await loadAnalyticsModels();
        res.json(await DailyStats.find().sort({ date: -1 }).limit(30));
    },

    async getTraffic(req, res) {
        const { TrafficOverview } = await loadAnalyticsModels();
        res.json(await TrafficOverview.find().sort({ date: -1 }).limit(30));
    }
};
