const mongoose = require("mongoose");
const saveSalesSummary = require("../salesSummary");

module.exports = async function runSalesSummaryETL() {
    const Orders = mongoose.connection.collection("orders");

    const agg = await Orders.aggregate([
        {
            $group: {
                _id: null,
                revenue: { $sum: "$total" },
                orders: { $sum: 1 },
            }
        }
    ]).toArray();

    return saveSalesSummary({
        period: "daily",
        start_date: new Date(),
        totals: {
            revenue: agg[0]?.revenue || 0,
            orders: agg[0]?.orders || 0
        },
        etl_metadata: { job_id: "salesSummary" }
    });
};
