// financialEvent.js
const mongoose = require("mongoose");
const BaseEvent = require("./baseEvent");
const { Schema } = mongoose;

const TransactionSchema = new Schema({
  transaction_id: String,
  order_id: String,
  type: { type: String, enum: ["payment","refund","payout","fee"] },
  amount: Number,
  currency: String,
  method: String,
  provider: String,
  provider_txn_id: String,
  fee: Number,
  exchange_rate: Number,
  status: String,
  occurred_at: Date,
}, { _id: false });

const LedgerEntrySchema = new Schema({
  account_id: String,
  account_type: String, // merchant, platform, tax
  debit: Number,
  credit: Number,
  balance_after: Number,
  reference_txn_id: String,
}, { _id: false });

const ReconciliationSchema = new Schema({
  reconciliation_id: String,
  matched: Boolean,
  variance_amount: Number,
  variance_reason: String,
  reconciled_by: String,
  reconciled_at: Date,
}, { _id: false });

const FinancialEventSchema = new Schema({
  transaction: TransactionSchema,
  ledger_entries: [LedgerEntrySchema],
  reconciliation: ReconciliationSchema,
  audit_status: {
    internal_audit: Boolean,
    external_audit: Boolean,
    last_audited_at: Date,
  }
}, { timestamps: true });

FinancialEventSchema.add(BaseEvent);

FinancialEventSchema.index({ "transaction.transaction_id": 1 });
FinancialEventSchema.index({ "transaction.order_id": 1 });

module.exports = FinancialEventSchema;
