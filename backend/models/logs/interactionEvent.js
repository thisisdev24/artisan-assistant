// interactionEvent.js
const mongoose = require("mongoose");
const BaseEvent = require("./baseEvent");
const { Schema } = mongoose;

const ClickSchema = new Schema({
  element_id: String,
  element_type: String,
  x: Number,
  y: Number,
  text: String,
  dataset: Schema.Types.Mixed,
}, { _id: false });

const ViewSchema = new Schema({
  page: String,
  duration_sec: Number,
  scroll_depth_pct: Number,
  components_seen: [String],
}, { _id: false });

const InteractionDetailSchema = new Schema({
  type: { type: String, enum: ["click","view","scroll","input","submit","hover","zoom"] },
  click: ClickSchema,
  view: ViewSchema,
  input_name: String,
  input_value_hash: String, // store hash, not raw input
  element_path: String,
  sequence_in_session: Number,
  client_ts: Date,
}, { _id: false });

const SessionAggregateSchema = new Schema({
  session_id: String,
  session_start: Date,
  session_end: Date,
  pages_visited: Number,
  events_count: Number,
  session_duration_sec: Number,
}, { _id: false });

const InteractionEventSchema = new Schema({
  interaction: InteractionDetailSchema,
  page_context: {
    url: String,
    title: String,
    referrer: String,
    canonical: String,
  },
  session: SessionAggregateSchema,
  sampling: {
    sampling_rate: { type: Number, default: 1 },
    batched: { type: Boolean, default: false },
    batch_id: String,
  },
}, { timestamps: true });

InteractionEventSchema.add(BaseEvent);

InteractionEventSchema.index({ "session.session_id": 1 });
InteractionEventSchema.index({ "interaction.type": 1 });

module.exports = InteractionEventSchema;
