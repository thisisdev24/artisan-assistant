const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  listing_id: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  image: { type: String, default: "" },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "Artisan" },
  stock: { type: Number, default: null }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  items: { type: [CartItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

// Calculate subtotal before saving
cartSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.updated_at = Date.now();
  next();
});

cartSchema.index({ buyer_id: 1 });

module.exports = mongoose.model("Cart", cartSchema);

