const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const Wishlist = require("../models/artisan_point/user/Wishlist");
const Listing = require("../models/artisan_point/artisan/Listing");

// Get user's wishlist
router.get("/", authenticate, async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ user_id: req.user.id }).populate({
            path: "listing_ids",
            select: "title price images category store_id" // Select fields needed for display
        });

        if (!wishlist) {
            return res.json([]);
        }

        // Filter out nulls (in case listings were deleted)
        const items = wishlist.listing_ids.filter(item => item !== null);
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
        let wishlist = await Wishlist.findOne({ user_id: req.user.id });

        if (!wishlist) {
            wishlist = new Wishlist({ user_id: req.user.id, listing_ids: [] });
        }

        // Check if already exists
        if (!wishlist.listing_ids.includes(listingId)) {
            wishlist.listing_ids.push(listingId);
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
        let wishlist = await Wishlist.findOne({ user_id: req.user.id });

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
