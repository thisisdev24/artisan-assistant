// cron/weeklyAnalytics.cron.js

const cron = require("node-cron");
const runAllAnalytics = require("../services/analytics/etl/runAllAnalytics");

cron.schedule("0 0 * * 0", async () => {
    console.log("⏳ [CRON] Running WEEKLY analytics ETL (Sunday 00:00)...");
    try {
        await runAllAnalytics();
        console.log("✔ [CRON] Weekly analytics ETL completed");
    } catch (err) {
        console.error("❌ [CRON] Weekly analytics ETL error:", err.message);
    }
});
