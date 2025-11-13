// routes/analyticsController.js
const { etlDaily, initAnalyticsService, Models } = require("./analyticsService");

async function triggerDailyETL(req, res) {
  try {
    const date = req.body?.date ? new Date(req.body.date) : undefined;
    const result = date ? await etlDaily(date) : await etlDaily(new Date(Date.now() - 24*3600*1000));
    res.json({ ok: true, result });
  } catch (err) {
    console.error("ETL error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function fetchAnalytics(req, res) {
  try {
    await initAnalyticsService();
    const { type } = req.params; // dailyStats | sales | userActivity ...
    const q = req.query || {};
    const page = parseInt(q.page || 1);
    const limit = Math.min(parseInt(q.limit || 50), 1000);
    const skip = (page - 1) * limit;

    let Model;
    switch (type) {
      case "daily": Model = Models.DailyStats; break;
      case "sales": Model = Models.SalesSummary; break;
      case "users": Model = Models.UserActivity; break;
      case "errors": Model = Models.ErrorTrend; break;
      case "traffic": Model = Models.TrafficOverview; break;
      case "performance": Model = Models.Performance; break;
      default: return res.status(400).json({ error: "unknown analytics type" });
    }

    const filters = {};
    if (q.start_date) filters.start_date = { $gte: new Date(q.start_date) };
    if (q.end_date) filters.end_date = { $lte: new Date(q.end_date) };
    if (q.date) filters.date = new Date(q.date);

    const docs = await Model.find(filters).sort({ timestamp_utc: -1 }).skip(skip).limit(limit).lean();
    res.json({ ok: true, data: docs });
  } catch (err) {
    console.error("fetchAnalytics error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { triggerDailyETL, fetchAnalytics };
