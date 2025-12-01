const mongoose = require("mongoose");
const saveDailyStats = require("../dailyStats");

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function getCollection(name) {
    try { return mongoose.model(name); }
    catch { return mongoose.connection.collection(name); }
}

module.exports = async function runDailyStatsETL(targetDate = null) {
    const date = targetDate ? new Date(targetDate) : new Date();
    const start = startOfDay(date);
    const end = endOfDay(date);

    const Users = getCollection("User");
    const Orders = getCollection("Order");
    const Events = getCollection("BuyerEvent");

    const totalUsers = await Users.countDocuments();
    const newUsers = await Users.countDocuments({ createdAt: { $gte: start, $lte: end } });

    const orderAgg = await Orders.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, revenue: { $sum: "$total" }, count: { $sum: 1 } } }
    ]);

    const events = await Events.countDocuments({ createdAt: { $gte: start, $lte: end } });

    const payload = {
        date: start,
        revenue: { gross_revenue: orderAgg[0]?.revenue || 0 },
        users: { total_users: totalUsers, new_users: newUsers },
        engagement: { avg_session_duration_sec: null },
        system: {},
        etl_metadata: { job_id: "dailyStats", generated_at: new Date() }
    };

    return saveDailyStats(payload);
};
