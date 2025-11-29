// models/artisan/admin/TaxRule.js
/**
 * TaxRule
 * Regional and category-based tax configuration used at checkout/tax calc.
 */
const mongoose = require('mongoose');

const TaxRuleSchema = new mongoose.Schema({
    country: String,
    state: String,
    category: String,
    tax_rate: Number
}, { timestamps: true });

TaxRuleSchema.index({ country: 1, state: 1, category: 1 });

module.exports = mongoose.model("TaxRule", TaxRuleSchema, "taxrule");
