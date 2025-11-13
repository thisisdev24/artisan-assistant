// routes/analyticsService.js
const { connectAnalyticsDB } = require("../db/connectAnalyticsDB");
const { connectLogDB } = require("../db/connectLogDB"); // read logs_base
const DailyStatsSchema = require("../models/analytics/dailyStats");
const UserActivitySchema = require("../models/analytics/userActivity");
const SalesSummarySchema = require("../models/analytics/salesSummary");
const ErrorTrendSchema = require("../models/analytics/errorTrends");
const TrafficOverviewSchema = require("../models/analytics/trafficOverview");
const PerformanceMetricsSchema = require("../models/analytics/performanceMetrics");

let analyticsDB;
let logDB;
const Models = {};

async function initAnalyticsService() {
  if (analyticsDB && logDB) return Models;

  analyticsDB = await connectAnalyticsDB();
  logDB = await connectLogDB();

  Models.DailyStats = analyticsDB.model("DailyStats", DailyStatsSchema, "analytics_daily_stats");
  Models.UserActivity = analyticsDB.model("UserActivity", UserActivitySchema, "analytics_user_activity");
  Models.SalesSummary = analyticsDB.model("SalesSummary", SalesSummarySchema, "analytics_sales_summary");
  Models.ErrorTrend = analyticsDB.model("ErrorTrend", ErrorTrendSchema, "analytics_error_trends");
  Models.TrafficOverview = analyticsDB.model("TrafficOverview", TrafficOverviewSchema, "analytics_traffic");
  Models.Performance = analyticsDB.model("PerformanceMetrics", PerformanceMetricsSchema, "analytics_performance");

  // logs_base from log DB
  Models.LogsBase = logDB.collection("logs_base");

  console.log("🟩 Analytics models initialized");
  return Models;
}

/**
 * Basic helpers to build windows
 */
function startOfDayUTC(d) {
  const x = new Date(d);
  x.setUTCHours(0,0,0,0);
  return x;
}
function endOfDayUTC(d) {
  const x = new Date(d);
  x.setUTCHours(23,59,59,999);
  return x;
}

/**
 * ETL: Aggregate daily stats for a given date (UTC date)
 */
async function etlDaily(date = new Date()) {
  await initAnalyticsService();
  const ModelsLocal = Models;

  const dayStart = startOfDayUTC(date);
  const dayEnd = endOfDayUTC(date);

  // 1) DailyStats: revenue, users, engagement, system metrics
  // revenue comes from business events.order.total and financial.transaction.amount
  const [businessAgg, financialAgg, userAgg, interactionAgg, systemAgg] = await Promise.all([
    ModelsLocal.LogsBase.aggregate([
      { $match: { category: "business", "order.placed_at": { $gte: dayStart, $lte: dayEnd } } },
      { $unwind: { path: "$order.items", preserveNullAndEmptyArrays: true } },
      { $group: {
          _id: null,
          gross_revenue: { $sum: { $ifNull: ["$order.total", 0] } },
          orders: { $addToSet: "$order.order_id" },
        }
      }
    ]).toArray(),

    ModelsLocal.LogsBase.aggregate([
      { $match: { category: "financial", "transaction.occurred_at": { $gte: dayStart, $lte: dayEnd } } },
      { $group: {
          _id: null,
          total_amount: { $sum: { $ifNull: ["$transaction.amount", 0] } }
        }
      }
    ]).toArray(),

    ModelsLocal.LogsBase.aggregate([
      { $match: { "user_id": { $exists: true }, "timestamp_received_utc": { $gte: dayStart, $lte: dayEnd } } },
      { $group: {
          _id: "$user_id",
          first_seen: { $min: "$timestamp_received_utc" },
          last_seen: { $max: "$timestamp_received_utc" }
        }
      },
      { $group: {
          _id: null,
          total_users: { $sum: 1 },
          new_users: { $sum: { $cond: [{ $eq: ["$first_seen", "$last_seen"] }, 1, 0] } }
        }
      }
    ]).toArray(),

    ModelsLocal.LogsBase.aggregate([
      { $match: { category: "interaction", timestamp_received_utc: { $gte: dayStart, $lte: dayEnd } } },
      { $group: {
          _id: null,
          events: { $sum: 1 },
          unique_sessions: { $addToSet: "$session.session_id" }
        }
      }
    ]).toArray(),

    ModelsLocal.LogsBase.aggregate([
      { $match: { category: "system", timestamp_received_utc: { $gte: dayStart, $lte: dayEnd } } },
      { $group: {
          _id: null,
          avg_response_time_ms: { $avg: "$performance.response_time_ms" },
          error_count: { $sum: { $cond: [{ $gte: ["$severity", "error"] }, 1, 0] } }
        }
      }
    ]).toArray()
  ]);

  const revenue = {
    gross_revenue: (businessAgg[0]?.gross_revenue || 0) + (financialAgg[0]?.total_amount || 0),
    net_revenue: (financialAgg[0]?.total_amount || 0),
    refunds: 0,
    commission_collected: 0,
    taxes_collected: 0,
    currency: "INR"
  };

  const users = {
    total_users: userAgg[0]?.total_users || 0,
    new_users: userAgg[0]?.new_users || 0,
    active_users: userAgg[0]?.total_users || 0
  };

  const engagement = {
    avg_session_duration_sec: 0,
    bounce_rate_pct: 0,
    conversion_rate_pct: 0
  };

  const system = {
    avg_response_time_ms: systemAgg[0]?.avg_response_time_ms || 0,
    error_rate_pct: 0,
    uptime_percent: 100
  };

  const dailyDoc = {
    date: startOfDayUTC(date),
    revenue,
    users,
    engagement,
    system,
    geo_breakdown: [],
    top_categories: [],
    top_artists: [],
    data_quality_score: 100,
    timestamp_utc: new Date(),
    timestamp_ist: new Date(Date.now() + 19800000),
    etl_metadata: {
      etl_job_id: `daily_${startOfDayUTC(date).toISOString()}`,
      source_collections: ["logs_base"],
      processed_events: (businessAgg[0]?.orders?.length || 0),
      generated_at: new Date(),
      generator_service: "etlDaily"
    }
  };

  // Upsert daily stats
  await ModelsLocal.DailyStats.updateOne(
    { date: startOfDayUTC(date) },
    { $set: dailyDoc },
    { upsert: true }
  );

  // 2) SalesSummary: basic totals (period = daily)
  const salesDoc = {
    period: "daily",
    start_date: dayStart,
    end_date: dayEnd,
    totals: {
      orders: businessAgg[0]?.orders?.length || 0,
      revenue: revenue.gross_revenue || 0,
      refunds: 0,
      profit_margin_pct: 0
    },
    products: [],
    categories: [],
    artists: [],
    channels: [],
    currency: "INR",
    etl_metadata: { generator: "etlDaily", job_id: `sales_${dayStart.toISOString()}` },
    timestamp_utc: new Date(),
    timestamp_ist: new Date(Date.now() + 19800000),
  };

  await ModelsLocal.SalesSummary.updateOne(
    { period: "daily", start_date: dayStart },
    { $set: salesDoc },
    { upsert: true }
  );

  // 3) UserActivity: basic per-user summary (sample)
  // We'll produce aggregated per-user stats for users active that day
  const userActivityCursor = ModelsLocal.LogsBase.aggregate([
    { $match: { "timestamp_received_utc": { $gte: dayStart, $lte: dayEnd }, user_id: { $exists: true } } },
    { $group: {
        _id: "$user_id",
        events: { $sum: 1 },
        first_seen: { $min: "$timestamp_received_utc" },
        last_seen: { $max: "$timestamp_received_utc" }
    } },
    { $limit: 1000 } // limit for ETL runtime safety
  ]);

  const bulkUserOps = [];
  while (await userActivityCursor.hasNext()) {
    const u = await userActivityCursor.next();
    const doc = {
      user_id: u._id,
      role: null,
      date: startOfDayUTC(date),
      session_stats: { sessions: 0, total_time_spent_sec: 0 },
      purchase_stats: {},
      interaction_stats: { clicks: u.events || 0 },
      timestamp_utc: new Date(),
      timestamp_ist: new Date(Date.now() + 19800000),
      etl_metadata: { job_id: `ua_${dayStart.toISOString()}`, generated_at: new Date() }
    };
    bulkUserOps.push({
      updateOne: {
        filter: { user_id: u._id, date: startOfDayUTC(date) },
        update: { $set: doc },
        upsert: true
      }
    });
  }

  if (bulkUserOps.length) {
    await ModelsLocal.UserActivity.bulkWrite(bulkUserOps);
  }

  // 4) ErrorTrends basic (count by code)
  const errorsAgg = await ModelsLocal.LogsBase.aggregate([
    { $match: { "error": { $exists: true }, timestamp_received_utc: { $gte: dayStart, $lte: dayEnd } } },
    { $group: { _id: "$error.code", count: { $sum: 1 }, sample: { $push: "$_id" } } },
    { $limit: 50 }
  ]).toArray();

  const errorDoc = {
    date: startOfDayUTC(date),
    service_name: null,
    environment: "production",
    total_requests: 0,
    total_errors: errorsAgg.reduce((s,e) => s + e.count, 0),
    error_rate_pct: 0,
    error_types: errorsAgg.map(e => ({ code: e._id, message: "", count: e.count, sample_events: e.sample.slice(0,5) })),
    timestamp_utc: new Date(),
    timestamp_ist: new Date(Date.now() + 19800000),
    etl_metadata: { job_id: `errors_${dayStart.toISOString()}` }
  };
  await ModelsLocal.ErrorTrend.updateOne({ date: startOfDayUTC(date) }, { $set: errorDoc }, { upsert: true });

  // 5) TrafficOverview basic
  const sessionsCount = await ModelsLocal.LogsBase.countDocuments({ category: "interaction", timestamp_received_utc: { $gte: dayStart, $lte: dayEnd } });
  const trafficDoc = {
    date: startOfDayUTC(date),
    total_sessions: sessionsCount,
    total_users: users.total_users || 0,
    avg_session_duration_sec: 0,
    timestamp_utc: new Date(),
    timestamp_ist: new Date(Date.now() + 19800000)
  };
  await ModelsLocal.TrafficOverview.updateOne({ date: startOfDayUTC(date) }, { $set: trafficDoc }, { upsert: true });

  // 6) PerformanceMetrics: snapshot from system events
  const perfAgg = await ModelsLocal.LogsBase.aggregate([
    { $match: { category: "system", "performance.response_time_ms": { $exists: true }, timestamp_received_utc: { $gte: dayStart, $lte: dayEnd } } },
    { $group: { _id: null, avg_response_time_ms: { $avg: "$performance.response_time_ms" }, p95: { $avg: "$performance.response_time_ms" } } }
  ]).toArray();

  const perfDoc = {
    service_name: "backend",
    environment: "production",
    period_start: dayStart,
    period_end: dayEnd,
    endpoints: [],
    databases: [],
    infra: { cpu_percent: 0, memory_mb: 0 },
    avg_response_time_ms: perfAgg[0]?.avg_response_time_ms || 0,
    timestamp_utc: new Date(),
    timestamp_ist: new Date(Date.now() + 19800000)
  };
  await ModelsLocal.Performance.updateOne({ period_start: dayStart, service_name: "backend" }, { $set: perfDoc }, { upsert: true });

  return { status: "ok", date: startOfDayUTC(date).toISOString() };
}

/**
 * ETL entry: run daily for yesterday by default
 */
async function runDailyETLForYesterday() {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24*3600*1000);
  return etlDaily(yesterday);
}

module.exports = { initAnalyticsService, etlDaily, runDailyETLForYesterday, Models };
