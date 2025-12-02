const { loadAnalyticsModels } = require("../../models/analytics");

module.exports = async function saveSalesSummary(doc) {
    const { SalesSummary } = await loadAnalyticsModels();
    return SalesSummary.findOneAndUpdate(
        {
            period: doc.period,
            start_date: doc.start_date,
        },
        doc,
        { upsert: true, new: true }
    );
};
