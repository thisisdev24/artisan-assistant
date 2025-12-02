const mongoose = require("mongoose");
const savePerformanceMetrics = require("../performanceMetrics");

module.exports = async function runPerformanceMetricsETL() {
    const ApiMetrics = mongoose.connection.collection("api_metrics");

    const agg = await ApiMetrics.aggregate([
        {
            $group: {
                _id: "$route",
                avg_latency_ms: { $avg: "$avg_latency_ms" },
                request_count: { $sum: "$request_count" }
            }
        }
    ]).toArray();

    return savePerformanceMetrics({
        service_name: "api",
        period_start: new Date(),
        endpoints: agg.map(a => ({
            route: a._id,
            avg_latency_ms: a.avg_latency_ms,
            request_count: a.request_count
        })),
        etl_metadata: { job_id: "performanceMetrics" }
    });
};
