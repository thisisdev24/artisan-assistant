// models/logs/interactionEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

/* ---------------------- CLICK ---------------------- */
const ClickSchema = new Schema(
  {
    element_id: { type: String, default: null },
    element_type: { type: String, default: null },
    x: { type: Number, default: null },
    y: { type: Number, default: null },
    text: { type: String, default: null },
    dataset: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

/* ---------------------- VIEW ---------------------- */
const ViewSchema = new Schema(
  {
    page: { type: String, default: null },
    duration_sec: { type: Number, default: null },
    scroll_depth_pct: { type: Number, default: null },
    components_seen: { type: [String], default: [] },
  },
  { _id: false }
);

/* ---------------------- INTERACTION DETAIL ---------------------- */
const InteractionDetailSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["click", "view", "scroll", "input", "submit", "hover", "zoom"],
      default: null,
    },

    click: { type: ClickSchema, default: {} },
    view: { type: ViewSchema, default: {} },

    input_name: { type: String, default: null },
    input_value_hash: { type: String, default: null },

    element_path: { type: String, default: null },
    sequence_in_session: { type: Number, default: null },
    client_ts: { type: Date, default: null },
  },
  { _id: false }
);

/* ---------------------- SESSION AGGREGATE ---------------------- */
const SessionAggregateSchema = new Schema(
  {
    session_id: { type: String, default: null },
    session_start: { type: Date, default: null },
    session_end: { type: Date, default: null },
    pages_visited: { type: Number, default: null },
    events_count: { type: Number, default: null },
    session_duration_sec: { type: Number, default: null },
  },
  { _id: false }
);

/* ---------------------- MAIN INTERACTION EVENT ---------------------- */
const InteractionEventSchema = new Schema(
  {
    interaction: { type: InteractionDetailSchema, default: {} },

    page_context: {
      url: { type: String, default: null },
      title: { type: String, default: null },
      referrer: { type: String, default: null },
      canonical: { type: String, default: null },
    },

    session: { type: SessionAggregateSchema, default: {} },

    sampling: {
      sampling_rate: {
        type: Number,
        default: 1,
      },
      batched: {
        type: Boolean,
        default: false,
      },
      batch_id: { type: String, default: null },
    },
  },
  { timestamps: true }
);

/* ---------------------- MERGE BASE EVENT ---------------------- */
InteractionEventSchema.add(BaseEvent);

module.exports = InteractionEventSchema;
