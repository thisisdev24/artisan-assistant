const express = require("express");
const router = express.Router();
const User = require("../models/artisan_point/user/User");
const Artisan = require("../models/artisan_point/artisan/Artisan");
const Admin = require("../models/artisan_point/admin/Admin");
const Listing = require("../models/artisan_point/artisan/Listing");
const { authenticate, requireAdmin } = require("../middleware/auth");

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Get all users
router.get("/users", async (req, res) => {
    try {
        const users = await User.find({
            $or: [
                { "soft_delete.is_deleted": false },
                { "soft_delete.is_deleted": { $exists: false } }
            ]
        })
            .select("-password")
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error("Get users error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Get all sellers
router.get("/sellers", async (req, res) => {
    try {
        const sellers = await Artisan.find({
            $or: [
                { "soft_delete.is_deleted": false },
                { "soft_delete.is_deleted": { $exists: false } }
            ]
        })
            .select("-password")
            .sort({ createdAt: -1 });
        res.json(sellers);
    } catch (err) {
        console.error("Get sellers error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Get all admins
router.get("/admins", async (req, res) => {
    try {
        const admins = await Admin.find({ "soft_delete.is_deleted": false })
            .select("-password")
            .sort({ createdAt: -1 });
        res.json(admins);
    } catch (err) {
        console.error("Get admins error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Get user by ID
router.get("/users/:id", async (req, res) => {
    try {
        let user = await User.findById(req.params.id).select("-password");
        if (!user) {
            user = await Artisan.findById(req.params.id).select("-password");
        }
        if (!user) {
            user = await Admin.findById(req.params.id).select("-password");
        }

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        res.json(user);
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Update user status (activate/deactivate/block)
router.put("/users/:id/status", async (req, res) => {
    try {
        const { status } = req.body;

        if (!["active", "inactive", "suspended", "blocked"].includes(status)) {
            return res.status(400).json({ msg: "Invalid status" });
        }

        let user = await User.findById(req.params.id);
        if (!user) {
            user = await Artisan.findById(req.params.id);
        }
        if (!user) {
            user = await Admin.findById(req.params.id);
        }

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        user.status = status;
        await user.save();

        res.json({ msg: "User status updated", user: { id: user._id, status: user.status } });
    } catch (err) {
        console.error("Update user status error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Block/Unblock user (temporary block)
router.put("/users/:id/block", async (req, res) => {
    try {
        const { blocked } = req.body;

        if (typeof blocked !== "boolean") {
            return res.status(400).json({ msg: "blocked must be a boolean" });
        }

        let user = await User.findById(req.params.id);
        if (!user) {
            user = await Artisan.findById(req.params.id);
        }
        if (!user) {
            user = await Admin.findById(req.params.id);
        }

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        user.status = blocked ? "blocked" : "active";
        await user.save();

        res.json({ msg: blocked ? "User blocked" : "User unblocked", user: { id: user._id, status: user.status } });
    } catch (err) {
        console.error("Block user error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Delete user (soft delete)
router.delete("/users/:id", async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        if (!user) {
            user = await Artisan.findById(req.params.id);
        }
        if (!user) {
            user = await Admin.findById(req.params.id);
        }

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        // Initialize soft_delete if it doesn't exist
        if (!user.soft_delete) {
            user.soft_delete = {
                is_deleted: false,
                deleted_at: null
            };
        }

        user.soft_delete.is_deleted = true;
        user.soft_delete.deleted_at = new Date();
        await user.save();

        res.json({ msg: "User deleted successfully" });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Get all listings
router.get("/listings", async (req, res) => {
    try {
        const listings = await Listing.find({
            $or: [
                { "soft_delete.is_deleted": false },
                { "soft_delete.is_deleted": { $exists: false } }
            ]
        })
            .sort({ createdAt: -1 });
        res.json(listings);
    } catch (err) {
        console.error("Get listings error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Delete listing (soft delete)
router.delete("/listings/:id", async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ msg: "Listing not found" });
        }

        // Soft delete
        if (!listing.soft_delete) {
            listing.soft_delete = {
                is_deleted: true,
                deleted_at: new Date()
            };
        } else {
            listing.soft_delete.is_deleted = true;
            listing.soft_delete.deleted_at = new Date();
        }
        await listing.save();

        res.json({ msg: "Listing deleted successfully" });
    } catch (err) {
        console.error("Delete listing error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// Get dashboard statistics
router.get("/stats", async (req, res) => {
    try {
        const [usersCount, sellersCount, listingsCount, adminsCount] = await Promise.all([
            User.countDocuments({
                $or: [
                    { "soft_delete.is_deleted": false },
                    { "soft_delete.is_deleted": { $exists: false } }
                ]
            }),
            Artisan.countDocuments({
                $or: [
                    { "soft_delete.is_deleted": false },
                    { "soft_delete.is_deleted": { $exists: false } }
                ]
            }),
            Listing.countDocuments({
                $or: [
                    { "soft_delete.is_deleted": false },
                    { "soft_delete.is_deleted": { $exists: false } }
                ]
            }),
            Admin.countDocuments({
                $or: [
                    { "soft_delete.is_deleted": false },
                    { "soft_delete.is_deleted": { $exists: false } }
                ]
            })
        ]);

        res.json({
            users: usersCount,
            sellers: sellersCount,
            listings: listingsCount,
            admins: adminsCount
        });
    } catch (err) {
        console.error("Get stats error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;

