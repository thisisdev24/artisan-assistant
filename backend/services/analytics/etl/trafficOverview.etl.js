const mongoose = require("mongoose");
const saveTrafficOverview = require("../trafficOverview");

module.exports = async function runTrafficOverviewETL() {
    const Traffic = mongoose.connection.collection("traffic_logs");

    const sessions = await Traffic.countDocuments();

    return saveTrafficOverview({
        date: new Date(),
        total_sessions: sessions,
        etl_metadata: { job_id: "trafficOverview" }
    });
};
