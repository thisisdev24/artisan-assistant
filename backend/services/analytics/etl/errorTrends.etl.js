const mongoose = require("mongoose");
const saveErrorTrends = require("../errorTrends");

module.exports = async function runErrorTrendsETL() {
    const SystemEvents = mongoose.connection.collection("system_events");

    const errorAgg = await SystemEvents.aggregate([
        { $match: { level: { $in: ["error", "critical"] } } },
        { $group: { _id: "$code", count: { $sum: 1 } } }
    ]).toArray();

    return saveErrorTrends({
        date: new Date(),
        service_name: "api",
        total_errors: errorAgg.reduce((a, b) => a + b.count, 0),
        error_types: errorAgg.map(e => ({
            code: e._id, message: e._id, count: e.count
        })),
        etl_metadata: { job_id: "errorTrends" }
    });
};
