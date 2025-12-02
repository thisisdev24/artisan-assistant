const { connectAnalyticsDB } = require("../../db/connectAnalyticsDB");

const DailyStatsSchema = require("./dailyStats");
const ErrorTrendsSchema = require("./errorTrends");
const PerformanceMetricsSchema = require("./performanceMetrics");
const SalesSummarySchema = require("./salesSummary");
const TrafficOverviewSchema = require("./trafficOverview");
const UserActivitySchema = require("./userActivity");

let models = {};

async function loadAnalyticsModels() {
    if (Object.keys(models).length > 0) return models;

    const conn = await connectAnalyticsDB();

    // If connection failed, return empty models (graceful degradation)
    if (!conn) {
        console.warn("⚠️  Analytics models not available - connection failed");
        return {
            DailyStats: null,
            ErrorTrends: null,
            PerformanceMetrics: null,
            SalesSummary: null,
            TrafficOverview: null,
            UserActivity: null,
        };
    }

    models.DailyStats = conn.model("DailyStats", DailyStatsSchema, "daily_stats");
    models.ErrorTrends = conn.model("ErrorTrends", ErrorTrendsSchema, "error_trends");
    models.PerformanceMetrics = conn.model(
        "PerformanceMetrics",
        PerformanceMetricsSchema,
        "performance_metrics"
    );
    models.SalesSummary = conn.model(
        "SalesSummary",
        SalesSummarySchema,
        "sales_summary"
    );
    models.TrafficOverview = conn.model(
        "TrafficOverview",
        TrafficOverviewSchema,
        "traffic_overview"
    );
    models.UserActivity = conn.model(
        "UserActivity",
        UserActivitySchema,
        "user_activity"
    );

    return models;
}

module.exports = { loadAnalyticsModels };
