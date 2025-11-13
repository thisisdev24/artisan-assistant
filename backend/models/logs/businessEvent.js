// businessEvent.js
const mongoose = require("mongoose");
const BaseEvent = require("./baseEvent");
const { Schema } = mongoose;

const OrderItemSchema = new Schema({
  listing_id: String,
  title: String,
  artist_id: String,
  category: String,
  price: Number,
  quantity: Number,
  currency: String,
  discount: Number,
  commission_pct: Number,
}, { _id: false });

const OrderSchema = new Schema({
  order_id: String,
  buyer_id: String,
  items: [OrderItemSchema],
  subtotal: Number,
  tax: Number,
  shipping_fee: Number,
  total: Number,
  payment_status: String,
  fulfillment_status: String,
  placed_at: Date,
  completed_at: Date,
  cancelled_at: Date,
}, { _id: false });

const PayoutSchema = new Schema({
  payout_id: String,
  order_id: String,
  artist_id: String,
  amount: Number,
  currency: String,
  initiated_at: Date,
  settled_at: Date,
  status: String,
  transaction_reference: String,
}, { _id: false });

const RefundSchema = new Schema({
  refund_id: String,
  order_id: String,
  buyer_id: String,
  amount: Number,
  reason: String,
  approved_by: String,
  initiated_at: Date,
  completed_at: Date,
}, { _id: false });

const AttributionSchema = new Schema({
  campaign_id: String,
  source: String,
  medium: String,
  referrer_url: String,
  click_id: String,
  conversion_window_hours: Number,
}, { _id: false });

const BusinessEventSchema = new Schema({
  order: OrderSchema,
  payout: PayoutSchema,
  refund: RefundSchema,
  attribution: AttributionSchema,
  kpis: {
    gross_sales: Number,
    net_sales: Number,
    platform_fee: Number,
    taxes: Number,
    avg_order_value: Number,
  },
  compliance: {
    tax_jurisdiction: String,
    gst_applied: Boolean,
    tax_code: String,
  },
}, { timestamps: true });

BusinessEventSchema.add(BaseEvent);

BusinessEventSchema.index({ "order.order_id": 1 });
BusinessEventSchema.index({ "order.buyer_id": 1 });

module.exports = BusinessEventSchema;
