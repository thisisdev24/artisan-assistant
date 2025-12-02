const mongoose = require("mongoose");
const saveUserActivity = require("../userActivity");

module.exports = async function runUserActivityETL() {
    const Events = mongoose.connection.collection("buyer_events");

    const userAgg = await Events.aggregate([
        { $group: { _id: "$user_id", actions: { $sum: 1 } } }
    ]).toArray();

    return Promise.all(
        userAgg.map(u =>
            saveUserActivity({
                user_id: u._id,
                date: new Date(),
                interaction_stats: { clicks: u.actions },
                etl_metadata: { job_id: "userActivity" }
            })
        )
    );
};
