module.exports = async function runAllAnalytics() {
    const daily = require("./dailyStats.etl");
    const errorT = require("./errorTrends.etl");
    const perf = require("./performanceMetrics.etl");
    const sales = require("./salesSummary.etl");
    const traffic = require("./trafficOverview.etl");
    const userAct = require("./userActivity.etl");

    console.log("Running analytics ETL...");

    await daily();
    await errorT();
    await perf();
    await sales();
    await traffic();
    await userAct();

    console.log("✔ All analytics ETL completed");
};
