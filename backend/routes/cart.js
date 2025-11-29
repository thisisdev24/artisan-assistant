const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Listing = require("../models/Listing");
const { authenticate, requireBuyer } = require("../middleware/auth");

// Get user's cart
router.get("/", authenticate, requireBuyer, async (req, res) => {
  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    let cart = await Cart.findOne({ buyer_id: buyerId }).populate("items.listing_id");
    
    if (!cart) {
      cart = new Cart({ buyer_id: buyerId, items: [] });
      await cart.save();
    }

    res.json(cart);
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Add item to cart
router.post("/add", authenticate, requireBuyer, async (req, res) => {
  try {
    const { listing_id, quantity = 1 } = req.body;

    if (!listing_id) {
      return res.status(400).json({ msg: "Listing ID is required" });
    }

    const listing = await Listing.findById(listing_id);
    if (!listing) {
      return res.status(404).json({ msg: "Listing not found" });
    }

    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    let cart = await Cart.findOne({ buyer_id: buyerId });

    if (!cart) {
      cart = new Cart({ buyer_id: buyerId, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.listing_id.toString() === listing_id
    );

    if (existingItemIndex >= 0) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        listing_id: listing._id,
        title: listing.title,
        price: listing.price,
        quantity: quantity,
        image: listing.imageUrl || (listing.images && listing.images.length > 0 ? listing.images[0].large || listing.images[0].thumb : ""),
        seller: listing.artisan,
        stock: listing.stock || null
      });
    }

    await cart.save();
    await cart.populate("items.listing_id");

    res.json(cart);
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Update item quantity in cart
router.put("/update/:itemId", authenticate, requireBuyer, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ msg: "Quantity must be at least 1" });
    }

    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const cart = await Cart.findOne({ buyer_id: buyerId });
    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      item => item.listing_id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ msg: "Item not found in cart" });
    }

    cart.items[itemIndex].quantity = Math.min(99, quantity);
    await cart.save();
    await cart.populate("items.listing_id");

    res.json(cart);
  } catch (err) {
    console.error("Update cart error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Remove item from cart
router.delete("/remove/:itemId", authenticate, requireBuyer, async (req, res) => {
  try {
    const { itemId } = req.params;

    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const cart = await Cart.findOne({ buyer_id: buyerId });
    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" });
    }

    cart.items = cart.items.filter(
      item => item.listing_id.toString() !== itemId
    );

    await cart.save();
    await cart.populate("items.listing_id");

    res.json(cart);
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Clear cart
router.delete("/clear", authenticate, requireBuyer, async (req, res) => {
  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const cart = await Cart.findOne({ buyer_id: buyerId });
    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    res.json(cart);
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;

