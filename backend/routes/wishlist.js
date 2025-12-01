const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const Wishlist = require("../models/artisan_point/user/Wishlist");
const Listing = require("../models/artisan_point/artisan/Listing");

// Get user's wishlist
router.get("/", authenticate, async (req, res) => {
    try {
        const mongoose = require("mongoose");
        const userId = new mongoose.Types.ObjectId(req.user.id);
        let wishlist = await Wishlist.findOne({ user_id: userId }).populate({
            path: "listing_ids",
            select: "title price images description store average_rating rating_number createdAt"
        });

        if (!wishlist || !wishlist.listing_ids || wishlist.listing_ids.length === 0) {
            return res.json([]);
        }

        // Filter out nulls (in case listings were deleted) and map to clean format
        const items = wishlist.listing_ids
            .filter(item => item !== null)
            .map(item => ({
                _id: item._id,
                title: item.title,
                price: item.price,
                images: item.images,
                description: item.description,
                store: item.store,
                average_rating: item.average_rating || 0,
                rating_number: item.rating_number || 0,
                createdAt: item.createdAt
            }));

        res.json(items);
    } catch (err) {
        console.error("Wishlist get error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Add item to wishlist
router.post("/add", authenticate, async (req, res) => {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ msg: "Listing ID required" });

    try {
        const mongoose = require("mongoose");
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const listingObjectId = new mongoose.Types.ObjectId(listingId);

        // Verify listing exists
        const listing = await Listing.findById(listingObjectId);
        if (!listing) {
            return res.status(404).json({ msg: "Listing not found" });
        }

        let wishlist = await Wishlist.findOne({ user_id: userId });

        if (!wishlist) {
            wishlist = new Wishlist({ user_id: userId, listing_ids: [] });
        }

        // Check if already exists (convert to string for comparison)
        const exists = wishlist.listing_ids.some(id => id.toString() === listingId);
        if (!exists) {
            wishlist.listing_ids.push(listingObjectId);
            await wishlist.save();
        }

        res.json({ msg: "Added to wishlist", count: wishlist.listing_ids.length });
    } catch (err) {
        console.error("Wishlist add error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Remove item from wishlist
router.post("/remove", authenticate, async (req, res) => {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ msg: "Listing ID required" });

    try {
        const mongoose = require("mongoose");
        const userId = new mongoose.Types.ObjectId(req.user.id);
        let wishlist = await Wishlist.findOne({ user_id: userId });

        if (wishlist) {
            wishlist.listing_ids = wishlist.listing_ids.filter(id => id.toString() !== listingId);
            await wishlist.save();
        }

        res.json({ msg: "Removed from wishlist", count: wishlist ? wishlist.listing_ids.length : 0 });
    } catch (err) {
        console.error("Wishlist remove error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
