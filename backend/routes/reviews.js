const express = require("express");
const router = express.Router();
const { authenticate, requireBuyer } = require("../middleware/auth");
const Review = require("../models/artisan_point/user/Review");
const Listing = require("../models/artisan_point/artisan/Listing");
const mongoose = require("mongoose");

// Get all reviews for a listing
router.get("/listing/:listingId", async (req, res) => {
  try {
    const { listingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ msg: "Invalid listing ID" });
    }

    const reviews = await Review.find({ listing_id: listingId })
      .populate("user_id", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json(reviews);
  } catch (err) {
    console.error("Get reviews error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user's review for a listing
router.get("/listing/:listingId/my-review", authenticate, requireBuyer, async (req, res) => {
  try {
    const { listingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ msg: "Invalid listing ID" });
    }

    const review = await Review.findOne({
      listing_id: listingId,
      user_id: req.user.id
    }).lean();

    res.json(review || null);
  } catch (err) {
    console.error("Get my review error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Create or update review
router.post("/", authenticate, requireBuyer, async (req, res) => {
  try {
    const { listing_id, rating, text, images, verified_purchase } = req.body;

    if (!listing_id || !rating) {
      return res.status(400).json({ msg: "Listing ID and rating are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(listing_id)) {
      return res.status(400).json({ msg: "Invalid listing ID" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ msg: "Rating must be between 1 and 5" });
    }

    // Check if listing exists
    const listing = await Listing.findById(listing_id);
    if (!listing) {
      return res.status(404).json({ msg: "Listing not found" });
    }

    // Find existing review or create new one
    let review = await Review.findOne({
      listing_id: listing_id,
      user_id: req.user.id
    });

    if (review) {
      // Update existing review
      review.rating = rating;
      review.text = text || review.text;
      review.images = images || review.images || [];
      review.verified_purchase = verified_purchase !== undefined ? verified_purchase : review.verified_purchase;
      await review.save();
    } else {
      // Create new review
      review = new Review({
        listing_id: listing_id,
        user_id: req.user.id,
        rating,
        text: text || "",
        images: images || [],
        verified_purchase: verified_purchase || false
      });
      await review.save();
    }

    // Update listing's average rating and rating count
    await updateListingRatings(listing_id);

    res.json(review);
  } catch (err) {
    console.error("Create/update review error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ msg: "You have already reviewed this product" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// Update review
router.put("/:reviewId", authenticate, requireBuyer, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, text, images, verified_purchase } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ msg: "Invalid review ID" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ msg: "Review not found" });
    }

    // Check if user owns this review
    if (review.user_id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ msg: "You can only edit your own reviews" });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ msg: "Rating must be between 1 and 5" });
      }
      review.rating = rating;
    }

    if (text !== undefined) review.text = text;
    if (images !== undefined) review.images = images;
    if (verified_purchase !== undefined) review.verified_purchase = verified_purchase;

    await review.save();

    // Update listing's average rating
    await updateListingRatings(review.listing_id);

    res.json(review);
  } catch (err) {
    console.error("Update review error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Delete review
router.delete("/:reviewId", authenticate, requireBuyer, async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ msg: "Invalid review ID" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ msg: "Review not found" });
    }

    // Check if user owns this review
    if (review.user_id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ msg: "You can only delete your own reviews" });
    }

    const listingId = review.listing_id;
    await review.deleteOne();

    // Update listing's average rating
    await updateListingRatings(listingId);

    res.json({ msg: "Review deleted successfully" });
  } catch (err) {
    console.error("Delete review error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Helper function to update listing ratings
async function updateListingRatings(listingId) {
  try {
    const reviews = await Review.find({ listing_id: listingId });
    
    if (reviews.length === 0) {
      await Listing.findByIdAndUpdate(listingId, {
        average_rating: 0,
        rating_number: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Listing.findByIdAndUpdate(listingId, {
      average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      rating_number: reviews.length
    });
  } catch (err) {
    console.error("Error updating listing ratings:", err);
  }
}

module.exports = router;

