// models/logs/businessEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

/* ---------------------- ORDER ITEM ---------------------- */
const OrderItemSchema = new Schema(
  {
    listing_id: { type: String, default: null },
    title: { type: String, default: null },
    artist_id: { type: String, default: null },
    category: { type: String, default: null },
    price: { type: Number, default: null },
    quantity: { type: Number, default: null },
    currency: { type: String, default: null },
    discount: { type: Number, default: null },
    commission_pct: { type: Number, default: null },
  },
  { _id: false }
);

/* ---------------------- ORDER ---------------------- */
const OrderSchema = new Schema(
  {
    order_id: { type: String, default: null },
    buyer_id: { type: String, default: null },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, default: null },
    tax: { type: Number, default: null },
    shipping_fee: { type: Number, default: null },
    total: { type: Number, default: null },
    payment_status: { type: String, default: null },
    fulfillment_status: { type: String, default: null },
    placed_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
  },
  { _id: false }
);

/* ---------------------- PAYOUT ---------------------- */
const PayoutSchema = new Schema(
  {
    payout_id: { type: String, default: null },
    order_id: { type: String, default: null },
    artist_id: { type: String, default: null },
    amount: { type: Number, default: null },
    currency: { type: String, default: null },
    initiated_at: { type: Date, default: null },
    settled_at: { type: Date, default: null },
    status: { type: String, default: null },
    transaction_reference: { type: String, default: null },
  },
  { _id: false }
);

/* ---------------------- REFUND ---------------------- */
const RefundSchema = new Schema(
  {
    refund_id: { type: String, default: null },
    order_id: { type: String, default: null },
    buyer_id: { type: String, default: null },
    amount: { type: Number, default: null },
    reason: { type: String, default: null },
    approved_by: { type: String, default: null },
    initiated_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
  },
  { _id: false }
);

/* ---------------------- ATTRIBUTION ---------------------- */
const AttributionSchema = new Schema(
  {
    campaign_id: { type: String, default: null },
    source: { type: String, default: null },
    medium: { type: String, default: null },
    referrer_url: { type: String, default: null },
    click_id: { type: String, default: null },
    conversion_window_hours: { type: Number, default: null },
  },
  { _id: false }
);

/* ---------------------- MAIN BUSINESS EVENT ---------------------- */
const BusinessEventSchema = new Schema(
  {
    order: { type: OrderSchema, default: {} },

    payout: { type: PayoutSchema, default: {} },

    refund: { type: RefundSchema, default: {} },

    attribution: { type: AttributionSchema, default: {} },

    kpis: {
      gross_sales: { type: Number, default: null },
      net_sales: { type: Number, default: null },
      platform_fee: { type: Number, default: null },
      taxes: { type: Number, default: null },
      avg_order_value: { type: Number, default: null },
    },

    compliance: {
      tax_jurisdiction: { type: String, default: null },
      gst_applied: { type: Boolean, default: false },
      tax_code: { type: String, default: null },
    },
  },
  { timestamps: false }
);

/* ---------------------- MERGE BASE EVENT ---------------------- */
BusinessEventSchema.add(BaseEvent);

module.exports = BusinessEventSchema;
