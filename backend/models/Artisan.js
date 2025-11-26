const mongoose = require("mongoose");

const SoftDeleteSchema = new mongoose.Schema({
is_deleted: { type: Boolean, default: false },
deleted_at: Date,
}, { _id: false });


const ActivitySchema = new mongoose.Schema({
first_seen: Date,
last_seen: Date,
loyalty_tier: String,
flags: [String],
}, { _id: false });

const LoginSchema = new mongoose.Schema({
  is_logged_in: { type: Boolean, default: false },
  last_login_at: { type: Date, default: null },
  last_logout_at: { type: Date, default: null },
  login_count: { type: Number, default: 0 },
}, { _id: false });

const userSchema = new mongoose.Schema({
name: { type: String, required: true, trim: true },
email: { type: String, required: true, unique: true, lowercase: true },
password: { type: String, required: true },
role: { type: String, default: "seller" },
store: {type: String,required: true},
status: { type: String, default: "active" },

activity: ActivitySchema,
login: LoginSchema,
soft_delete: SoftDeleteSchema,
}, { timestamps: true });

userSchema.index({ store: 1 });
module.exports = mongoose.model("Artisan", userSchema);
