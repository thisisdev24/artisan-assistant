// models/logs/financialEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

/* ---------------------- TRANSACTION ---------------------- */
const TransactionSchema = new Schema(
  {
    transaction_id: { type: String, default: null },
    order_id: { type: String, default: null },
    type: {
      type: String,
      enum: ["payment", "refund", "payout", "fee"],
      default: null,
    },
    amount: { type: Number, default: null },
    currency: { type: String, default: null },
    method: { type: String, default: null },
    provider: { type: String, default: null },
    provider_txn_id: { type: String, default: null },
    fee: { type: Number, default: null },
    exchange_rate: { type: Number, default: null },
    status: { type: String, default: null },
    occurred_at: { type: Date, default: null },
  },
  { _id: false }
);

/* ---------------------- LEDGER ENTRY ---------------------- */
const LedgerEntrySchema = new Schema(
  {
    account_id: { type: String, default: null },
    account_type: { type: String, default: null }, // merchant, platform, tax
    debit: { type: Number, default: null },
    credit: { type: Number, default: null },
    balance_after: { type: Number, default: null },
    reference_txn_id: { type: String, default: null },
  },
  { _id: false }
);

/* ---------------------- RECONCILIATION ---------------------- */
const ReconciliationSchema = new Schema(
  {
    reconciliation_id: { type: String, default: null },
    matched: { type: Boolean, default: false },
    variance_amount: { type: Number, default: null },
    variance_reason: { type: String, default: null },
    reconciled_by: { type: String, default: null },
    reconciled_at: { type: Date, default: null },
  },
  { _id: false }
);

/* ---------------------- MAIN FINANCIAL EVENT ---------------------- */
const FinancialEventSchema = new Schema(
  {
    transaction: { type: TransactionSchema, default: {} },

    ledger_entries: { type: [LedgerEntrySchema], default: [] },

    reconciliation: { type: ReconciliationSchema, default: {} },

    audit_status: {
      internal_audit: { type: Boolean, default: false },
      external_audit: { type: Boolean, default: false },
      last_audited_at: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

/* ---------------------- MERGE BASE EVENT ---------------------- */
FinancialEventSchema.add(BaseEvent);

module.exports = FinancialEventSchema;
