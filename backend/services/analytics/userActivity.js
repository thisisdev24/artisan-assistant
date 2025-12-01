const { loadAnalyticsModels } = require("../../models/analytics");

module.exports = async function saveUserActivity(doc) {
    const { UserActivity } = await loadAnalyticsModels();
    return UserActivity.findOneAndUpdate(
        { user_id: doc.user_id, date: doc.date },
        doc,
        { upsert: true, new: true }
    );
};
