// cron/hourlyAnalytics.cron.js

const cron = require("node-cron");
const runAllAnalytics = require("../services/analytics/etl/runAllAnalytics");

cron.schedule("0 * * * *", async () => {
    console.log("⏳ [CRON] Running HOURLY analytics ETL...");
    try {
        await runAllAnalytics();
        console.log("✔ [CRON] Hourly analytics ETL completed");
    } catch (err) {
        console.error("❌ [CRON] Hourly analytics ETL error:", err.message);
    }
});
