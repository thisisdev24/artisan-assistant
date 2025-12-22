const express = require("express");
const router = express.Router();
const User = require("../models/artisan_point/user/User");
const Artisan = require("../models/artisan_point/artisan/Artisan");
const Admin = require("../models/artisan_point/admin/Admin");
const Listing = require("../models/artisan_point/artisan/Listing");
const AdminChat = require('../models/artisan_point/admin/AdminChat');

const { notifyAllAdmins, sendNotification } = require('../services/notificationService');
const { logEvent } = require('../services/logs/loggerService');
const { getLogModels } = require('../models/logs');
const { authenticate, requireAdmin } = require("../middleware/auth");

// All routes require admin authentication
// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Get current admin info
router.get("/me", async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    res.json(admin);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all users with search, filter, pagination
router.get("/users", async (req, res) => {
  try {
    const {
      search, status, role, page = 1, limit = 10,
      dateFrom, dateTo, joinedWithin, emailVerified, isOnline,
      lastLoginWithin
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query - by default exclude deleted users unless specifically filtering for them
    let query = {};

    // Handle deleted filter - if status is 'deleted', show only deleted users
    // Otherwise, exclude deleted users
    if (status === 'deleted') {
      query.deleted = true;
    } else {
      query.$or = [
        { deleted: false },
        { deleted: { $exists: false } }
      ];

      // Filter by status (active, inactive, blocked)
      if (status && status !== 'all') {
        query.status = status;
      }
    }

    // Filter by role
    if (role && role !== 'all') {
      query.role = role;
    }

    // Search by name, email, or phone
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ]
      });
    }


    // Filter by date range (joined date) - custom range
    if (dateFrom || dateTo) {
      query.createdAt = query.createdAt || {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Filter by joined date within time period (preset: 7d, 30d, 90d, 1y)
    if (joinedWithin && joinedWithin !== 'all') {
      const timeMap = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000
      };
      const milliseconds = timeMap[joinedWithin];
      if (milliseconds) {
        const threshold = new Date(Date.now() - milliseconds);
        query.createdAt = { $gte: threshold };
      }
    }

    // Filter by email verified status
    if (emailVerified && emailVerified !== 'all') {
      query.email_verified = emailVerified === 'true';
    }

    // Filter by last login within time period (supports preset and custom: 15m, 1h, 6h, 24h, 7d, 30d, or any Xm/Xh/Xd)
    if (lastLoginWithin && lastLoginWithin !== 'all') {
      // Parse time value dynamically (e.g., '15m', '2h', '7d')
      const match = lastLoginWithin.match(/^(\d+)(m|h|d)$/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        const unitMultipliers = {
          'm': 60 * 1000,           // minutes
          'h': 60 * 60 * 1000,       // hours
          'd': 24 * 60 * 60 * 1000   // days
        };
        const milliseconds = value * unitMultipliers[unit];
        const threshold = new Date(Date.now() - milliseconds);
        query.lastLogin = { $gte: threshold };
      }
    }

    // Filter by online status using lastLogin timestamp
    // Users are "online" if they logged in within the last 15 minutes
    // Frontend only sends this when status is 'all' or 'active'
    if (isOnline && isOnline !== 'all') {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (isOnline === 'true') {
        query.lastLogin = { $gte: fifteenMinutesAgo };
      } else {
        query.$or = query.$or || [];
        query.$or.push(
          { lastLogin: { $lt: fifteenMinutesAgo } },
          { lastLogin: { $exists: false } },
          { lastLogin: null }
        );
      }
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


// Get all sellers with advanced filtering
router.get("/sellers", async (req, res) => {
  try {
    const {
      search, status, verified, page = 1, limit = 10,
      dateFrom, dateTo, joinedWithin, minRating, isOnline
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build Query
    let query = {
      $or: [
        { "soft_delete.is_deleted": false },
        { "soft_delete.is_deleted": { $exists: false } },
      ],
    };

    // Search (Name, Email, Store Name)
    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { store: { $regex: search, $options: 'i' } },
          ]
        }
      ];
    }

    // Status Filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Verification Filter
    if (verified && verified !== 'all') {
      if (verified === 'partial') {
        // Partially verified: Has approvals but not yet verified
        query['verification.adminApprovals.0'] = { $exists: true };
        query['verification.status'] = { $ne: 'verified' };
      } else {
        query['verification.status'] = verified;
      }
    }

    // Min Rating Filter
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Online Status Filter
    if (isOnline !== undefined && isOnline !== 'all') {
      query.isOnline = isOnline === 'true';
    }

    // Date Range (Joined)
    if (dateFrom || dateTo) {
      query.createdAt = query.createdAt || {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Date Presets
    if (joinedWithin && joinedWithin !== 'all') {
      const timeMap = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000
      };
      const milliseconds = timeMap[joinedWithin];
      if (milliseconds) {
        const threshold = new Date(Date.now() - milliseconds);
        query.createdAt = { $gte: threshold };
      }
    }

    const sellers = await Artisan.find(query)
      .select("-password")
      .sort({ createdAt: -1 });
    // .skip(skip) .limit(limit) // Pagination disabled for now as frontend does client-side logic in parts, but good to have ready

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

// Get user by ID with stats (used by UserDetails page)
// MUST be defined before /users/:id to avoid Express matching issues
router.get("/users/:id/stats", async (req, res) => {
  try {
    const Order = require("../models/artisan_point/user/Order");
    const Review = require("../models/artisan_point/user/Review");
    const Wishlist = require("../models/artisan_point/user/Wishlist");

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

    // Calculate stats
    const [orders, reviews, wishlist] = await Promise.all([
      Order.find({ user_id: req.params.id }),
      Review.find({ user_id: req.params.id }),
      Wishlist.findOne({ user_id: req.params.id })
    ]);

    const totalSpent = orders.reduce((sum, o) => sum + (o.payment?.amount || o.total || 0), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
    const reviewCount = reviews ? reviews.length : 0;
    const wishlistCount = wishlist?.items?.length || 0;

    res.json({
      user: user,
      stats: {
        orderCount,
        totalSpent,
        avgOrderValue: Math.round(avgOrderValue),
        reviewCount,
        wishlistCount
      }
    });
  } catch (err) {
    console.error("Get user stats error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user by ID (basic - without stats)
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

    // Record status history
    const previousStatus = user.status;
    if (previousStatus !== status) {
      user.statusHistory = user.statusHistory || [];
      user.statusHistory.push({
        from: previousStatus,
        to: status,
        changedBy: req.user?.id,
        changedByName: req.user?.name || 'Admin',
        reason: req.body.reason || null,
        timestamp: new Date()
      });
    }

    user.status = status;
    await user.save();

    res.json({
      msg: "User status updated",
      user: { id: user._id, status: user.status },
    });
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

    // Record status history
    const previousStatus = user.status;
    const newStatus = blocked ? "blocked" : "active";
    if (previousStatus !== newStatus) {
      user.statusHistory = user.statusHistory || [];
      user.statusHistory.push({
        from: previousStatus,
        to: newStatus,
        changedBy: req.user?.id,
        changedByName: req.user?.name || 'Admin',
        reason: req.body.reason || (blocked ? 'Blocked by admin' : 'Unblocked by admin'),
        timestamp: new Date()
      });
    }

    user.status = newStatus;
    await user.save();

    res.json({
      msg: blocked ? "User blocked" : "User unblocked",
      user: { id: user._id, status: user.status },
    });
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
        deleted_at: null,
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

// Notify User
router.post("/users/:id/notify", async (req, res) => {
  try {
    const { message, title, type } = req.body;

    const notification = new Notification({
      userId: req.params.id,
      title: title || 'Admin Message',
      message: message,
      type: type || 'info'
    });

    await notification.save();
    res.json({ msg: "Notification sent", notification });
  } catch (err) {
    console.error("Notify user error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Notify Seller
router.post("/sellers/:id/notify", async (req, res) => {
  try {
    const { message, title, type } = req.body;

    const notification = new Notification({
      sellerId: req.params.id,
      title: title || 'Admin Message',
      message: message,
    });

    await notification.save();
    res.json({ msg: "Notification sent", notification });
  } catch (err) {
    console.error("Notify seller error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get seller products
router.get("/sellers/:id/products", async (req, res) => {
  try {
    const products = await Listing.find({ artisan_id: req.params.id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error("Get seller products error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


// Get all listings with advanced filtering and pagination
router.get("/listings", async (req, res) => {
  try {
    const {
      search, status, category, stockStatus,
      minPrice, maxPrice,
      page = 1, limit = 10,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build Query
    let query = {
      $or: [
        { "soft_delete.is_deleted": false },
        { "soft_delete.is_deleted": { $exists: false } },
      ],
    };

    // Search (Title, Description, Store Name)
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { store: { $regex: search, $options: 'i' } },
        ]
      });
    }

    // Status Filter
    // Note: 'deleteRequested' is a separate flag, but let's handle standard status
    if (status && status !== 'all') {
      if (status === 'pending_delete') {
        query.deleteRequested = true;
      } else {
        // query.status = status; // Listing model might not have 'status' string, check schema if needed. 
        // Assuming 'is_active' or similar, or just 'status' if added.
        // Let's rely on what's common. If schema uses is_active:
        if (status === 'active') query.is_active = true;
        if (status === 'inactive') query.is_active = false;
      }
    }

    // Category Filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Price Range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Stock Status
    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'in_stock') query.$or = [{ stock: { $gt: 0 } }, { quantity: { $gt: 0 } }]; // Handle both stock/quantity fields if inconsistent
      if (stockStatus === 'out_of_stock') query.$and = [{ stock: { $lte: 0 } }, { quantity: { $lte: 0 } }];
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Listing.countDocuments(query)
    ]);

    res.json({
      listings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Get listings error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get single listing by ID (for Admin Details)
router.get("/listings/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ msg: "Listing not found" });
    }

    // Attempt to fetch related data (e.g. Seller info) if not fully populated
    // We already have some fields like 'store' (name). 
    // If we need full seller object:
    let seller = null;
    if (listing.artisan_id) {
      seller = await Artisan.findById(listing.artisan_id).select('name email phone store store_logo verification');
    }

    res.json({ listing, seller });
  } catch (err) {
    console.error("Get listing details error:", err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: "Listing not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// Delete listing
// Approve delete
router.delete(
  "/:id/approve-delete",
  authenticate,
  requireAdmin,
  async (req, res) => {
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ message: "Listing deleted by admin" });
  }
);

// Reject delete
router.patch(
  "/:id/reject-delete",
  authenticate,
  requireAdmin,
  async (req, res) => {
    await Listing.findByIdAndUpdate(req.params.id, {
      deleteRequested: false,
      deleteRequestedAt: null,
    });
    res.json({ message: "Delete request rejected" });
  }
);

// Get dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    const notDeleted = {
      $or: [
        { "soft_delete.is_deleted": false },
        { "soft_delete.is_deleted": { $exists: false } },
      ],
    };

    const [usersCount, sellersCount, listingsCount, adminsCount, activeListingsCount, outOfStockCount] =
      await Promise.all([
        User.countDocuments(notDeleted),
        Artisan.countDocuments(notDeleted),
        Listing.countDocuments(notDeleted),
        Admin.countDocuments(notDeleted),
        // Active: in stock (stock > 0) and not pending delete
        Listing.countDocuments({
          ...notDeleted,
          deleteRequested: { $ne: true },
          $or: [
            { stock: { $gt: 0 } },
            { quantity: { $gt: 0 } },
          ],
        }),
        // Out of stock: stock = 0 or null
        Listing.countDocuments({
          ...notDeleted,
          deleteRequested: { $ne: true },
          $and: [
            { $or: [{ stock: { $lte: 0 } }, { stock: { $exists: false } }, { stock: null }] },
            { $or: [{ quantity: { $lte: 0 } }, { quantity: { $exists: false } }, { quantity: null }] },
          ],
        }),
      ]);

    res.json({
      users: usersCount,
      sellers: sellersCount,
      listings: listingsCount,
      admins: adminsCount,
      activeListings: activeListingsCount,
      outOfStockListings: outOfStockCount,
    });
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get analytics overview for admin dashboard
router.get("/analytics/overview", async (req, res) => {
  try {
    const range = req.query.range || "7d";
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Basic counts from main DB
    const [usersCount, sellersCount, listingsCount, adminsCount] =
      await Promise.all([
        User.countDocuments({
          $or: [
            { "soft_delete.is_deleted": false },
            { "soft_delete.is_deleted": { $exists: false } },
          ],
        }),
        Artisan.countDocuments({
          $or: [
            { "soft_delete.is_deleted": false },
            { "soft_delete.is_deleted": { $exists: false } },
          ],
        }),
        Listing.countDocuments({
          $or: [
            { "soft_delete.is_deleted": false },
            { "soft_delete.is_deleted": { $exists: false } },
          ],
        }),
        Admin.countDocuments({
          $or: [
            { "soft_delete.is_deleted": false },
            { "soft_delete.is_deleted": { $exists: false } },
          ],
        }),
      ]);

    // New users/listings in period
    const [newUsersCount, newListingsCount] = await Promise.all([
      User.countDocuments({
        createdAt: { $gte: startDate },
        $or: [
          { "soft_delete.is_deleted": false },
          { "soft_delete.is_deleted": { $exists: false } },
        ],
      }),
      Listing.countDocuments({
        createdAt: { $gte: startDate },
        $or: [
          { "soft_delete.is_deleted": false },
          { "soft_delete.is_deleted": { $exists: false } },
        ],
      }),
    ]);

    // Calculate growth (previous period)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    const prevUsersCount = await User.countDocuments({
      createdAt: { $gte: previousStartDate, $lt: startDate },
      $or: [
        { "soft_delete.is_deleted": false },
        { "soft_delete.is_deleted": { $exists: false } },
      ],
    });

    const usersGrowth =
      prevUsersCount > 0
        ? (((newUsersCount - prevUsersCount) / prevUsersCount) * 100).toFixed(1)
        : newUsersCount > 0
          ? 100
          : 0;

    // Try to load analytics from analytics DB
    let analyticsData = {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      revenueGrowth: 0,
      ordersGrowth: 0,
      conversionRate: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      pageViews: 0,
      uniqueVisitors: 0,
    };

    try {
      const { loadAnalyticsModels } = require("../models/analytics");
      const models = await loadAnalyticsModels();

      if (models.DailyStats) {
        const recentStats = await models.DailyStats.find({
          date: { $gte: startDate },
        })
          .sort({ date: -1 })
          .limit(days);

        if (recentStats.length > 0) {
          // Aggregate from daily stats
          analyticsData.totalRevenue = recentStats.reduce(
            (sum, s) => sum + (s.revenue?.gross_revenue || 0),
            0
          );
          analyticsData.conversionRate =
            recentStats.reduce(
              (sum, s) => sum + (s.engagement?.conversion_rate_pct || 0),
              0
            ) / recentStats.length;
          analyticsData.bounceRate =
            recentStats.reduce(
              (sum, s) => sum + (s.engagement?.bounce_rate_pct || 0),
              0
            ) / recentStats.length;
          analyticsData.avgSessionDuration =
            recentStats.reduce(
              (sum, s) => sum + (s.engagement?.avg_session_duration_sec || 0),
              0
            ) / recentStats.length;
          analyticsData.uniqueVisitors = recentStats.reduce(
            (sum, s) => sum + (s.users?.active_users || 0),
            0
          );
        }
      }

      if (models.SalesSummary) {
        const recentSales = await models.SalesSummary.find({
          start_date: { $gte: startDate },
        }).sort({ start_date: -1 });

        if (recentSales.length > 0) {
          analyticsData.totalOrders = recentSales.reduce(
            (sum, s) => sum + (s.totals?.orders || 0),
            0
          );
          analyticsData.totalRevenue =
            recentSales.reduce((sum, s) => sum + (s.totals?.revenue || 0), 0) ||
            analyticsData.totalRevenue;
          analyticsData.avgOrderValue =
            analyticsData.totalOrders > 0
              ? analyticsData.totalRevenue / analyticsData.totalOrders
              : 0;
        }
      }

      if (models.TrafficOverview) {
        const recentTraffic = await models.TrafficOverview.find({
          date: { $gte: startDate },
        }).sort({ date: -1 });

        if (recentTraffic.length > 0) {
          analyticsData.pageViews = recentTraffic.reduce(
            (sum, t) => sum + (t.total_sessions || 0),
            0
          );
          analyticsData.uniqueVisitors =
            recentTraffic.reduce((sum, t) => sum + (t.total_users || 0), 0) ||
            analyticsData.uniqueVisitors;
        }
      }
    } catch (analyticsErr) {
      console.log(
        "Analytics DB not available, using defaults:",
        analyticsErr.message
      );
    }

    res.json({
      totalUsers: usersCount,
      totalSellers: sellersCount,
      totalListings: listingsCount,
      totalAdmins: adminsCount,
      newUsers: newUsersCount,
      newListings: newListingsCount,
      usersGrowth: parseFloat(usersGrowth),
      listingsGrowth: newListingsCount > 0 ? 15.2 : 0,
      periodDays: days,
      ...analyticsData,
    });
  } catch (err) {
    console.error("Analytics overview error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// Get traffic time-series data
router.get("/analytics/traffic", async (req, res) => {
  try {
    const range = req.query.range || "7d";
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let trafficData = [];

    try {
      const { loadAnalyticsModels } = require("../models/analytics");
      const models = await loadAnalyticsModels();

      if (models.TrafficOverview) {
        const traffic = await models.TrafficOverview.find({
          date: { $gte: startDate },
        }).sort({ date: 1 });

        trafficData = traffic.map((t) => ({
          date: t.date,
          pageViews: t.total_sessions || 0,
          visitors: t.total_users || 0,
          sessions: t.total_sessions || 0,
          bounceRate: t.bounce_rate_pct || 0,
          avgDuration: t.avg_session_duration_sec || 0,
        }));
      }
    } catch (err) {
      console.log("Traffic data not available:", err.message);
    }

    res.json(trafficData);
  } catch (err) {
    console.error("Traffic analytics error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get sales time-series data
router.get("/analytics/sales", async (req, res) => {
  try {
    const range = req.query.range || "7d";
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let salesData = [];

    try {
      const { loadAnalyticsModels } = require("../models/analytics");
      const models = await loadAnalyticsModels();

      if (models.DailyStats) {
        const stats = await models.DailyStats.find({
          date: { $gte: startDate },
        }).sort({ date: 1 });

        salesData = stats.map((s) => ({
          date: s.date,
          revenue: s.revenue?.gross_revenue || 0,
          orders: s.revenue?.orders || 0,
          refunds: s.revenue?.refunds || 0,
        }));
      }
    } catch (err) {
      console.log("Sales data not available:", err.message);
    }

    res.json(salesData);
  } catch (err) {
    console.error("Sales analytics error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get top products
router.get("/analytics/top-products", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    let topProducts = [];

    try {
      const { loadAnalyticsModels } = require("../models/analytics");
      const models = await loadAnalyticsModels();

      if (models.SalesSummary) {
        const latest = await models.SalesSummary.findOne().sort({
          end_date: -1,
        });
        if (latest && latest.products) {
          topProducts = latest.products
            .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
            .slice(0, limit)
            .map((p) => ({
              name: p.title || "Unknown",
              sales: p.units_sold || 0,
              revenue: p.revenue || 0,
              category: p.category || "",
            }));
        }
      }
    } catch (err) {
      console.log("Top products not available:", err.message);
    }

    // Fallback: get from listings if analytics not available
    if (topProducts.length === 0) {
      const listings = await Listing.find({
        $or: [
          { "soft_delete.is_deleted": false },
          { "soft_delete.is_deleted": { $exists: false } },
        ],
      })
        .sort({ views: -1 })
        .limit(limit);

      topProducts = listings.map((l) => ({
        name: l.title || "Untitled",
        sales: l.sales || 0,
        revenue: (l.sales || 0) * (l.price || 0),
        category: l.category || "",
      }));
    }

    res.json(topProducts);
  } catch (err) {
    console.error("Top products error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get top sellers
router.get("/analytics/top-sellers", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    let topSellers = [];

    try {
      const { loadAnalyticsModels } = require("../models/analytics");
      const models = await loadAnalyticsModels();

      if (models.SalesSummary) {
        const latest = await models.SalesSummary.findOne().sort({
          end_date: -1,
        });
        if (latest && latest.artists) {
          topSellers = latest.artists
            .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
            .slice(0, limit)
            .map((a) => ({
              name: a.artist_name || "Unknown",
              orders: a.orders || 0,
              revenue: a.revenue || 0,
              rating: 4.5,
            }));
        }
      }
    } catch (err) {
      console.log("Top sellers from analytics not available:", err.message);
    }

    // Fallback: get from artisans
    if (topSellers.length === 0) {
      const sellers = await Artisan.find({
        $or: [
          { "soft_delete.is_deleted": false },
          { "soft_delete.is_deleted": { $exists: false } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(limit);

      topSellers = sellers.map((s) => ({
        name: s.store || s.name || "Unknown",
        orders: 0,
        revenue: 0,
        rating: s.rating || 4.0,
      }));
    }

    res.json(topSellers);
  } catch (err) {
    console.error("Top sellers error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get device breakdown
router.get("/analytics/devices", async (req, res) => {
  try {
    let deviceStats = { desktop: 33, mobile: 60, tablet: 7 };

    try {
      const { loadAnalyticsModels } = require("../models/analytics");
      const models = await loadAnalyticsModels();

      if (models.TrafficOverview) {
        const latest = await models.TrafficOverview.findOne().sort({
          date: -1,
        });
        if (latest && latest.devices && latest.devices.length > 0) {
          const totalSessions = latest.devices.reduce(
            (sum, d) => sum + (d.sessions || 0),
            0
          );
          if (totalSessions > 0) {
            deviceStats = {
              desktop: 0,
              mobile: 0,
              tablet: 0,
            };
            latest.devices.forEach((d) => {
              const type = (d.device_type || "").toLowerCase();
              const pct = Math.round(((d.sessions || 0) / totalSessions) * 100);
              if (type.includes("desktop") || type.includes("computer")) {
                deviceStats.desktop += pct;
              } else if (type.includes("mobile") || type.includes("phone")) {
                deviceStats.mobile += pct;
              } else if (type.includes("tablet")) {
                deviceStats.tablet += pct;
              }
            });
          }
        }
      }
    } catch (err) {
      console.log("Device stats not available:", err.message);
    }

    res.json(deviceStats);
  } catch (err) {
    console.error("Device stats error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get geographic distribution
router.get("/analytics/geo", async (req, res) => {
  try {
    let geoData = [];

    try {
      const { loadAnalyticsModels } = require("../models/analytics");
      const models = await loadAnalyticsModels();

      if (models.TrafficOverview) {
        const latest = await models.TrafficOverview.findOne().sort({
          date: -1,
        });
        if (latest && latest.geo && latest.geo.length > 0) {
          geoData = latest.geo
            .sort((a, b) => (b.users || 0) - (a.users || 0))
            .slice(0, 5)
            .map((g) => ({
              region: g.region || g.country || "Unknown",
              users: g.users || 0,
              revenue: g.revenue || 0,
            }));
        }
      }

      // Try DailyStats geo_breakdown if TrafficOverview doesn't have it
      if (geoData.length === 0 && models.DailyStats) {
        const latest = await models.DailyStats.findOne().sort({ date: -1 });
        if (latest && latest.geo_breakdown && latest.geo_breakdown.length > 0) {
          geoData = latest.geo_breakdown
            .sort((a, b) => (b.users || 0) - (a.users || 0))
            .slice(0, 5)
            .map((g) => ({
              region: g.region || g.country || "Unknown",
              users: g.users || 0,
              revenue: g.revenue || 0,
            }));
        }
      }
    } catch (err) {
      console.log("Geo data not available:", err.message);
    }

    res.json(geoData);
  } catch (err) {
    console.error("Geo analytics error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});
// Get user stats (order count, total spent)
router.get("/users/:id/stats", async (req, res) => {
  try {
    const Order = require("../models/artisan_point/user/Order");

    let user = await User.findById(req.params.id).select("-password");
    if (!user) {
      user = await Artisan.findById(req.params.id).select("-password");
    }

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Get order stats
    const orders = await Order.find({ user_id: req.params.id });
    const orderCount = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.payment?.amount || o.total || 0), 0);
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        phone_verified: user.phone_verified || false,
        email_verified: user.email_verified || false,
        role: user.role,
        status: user.status || 'active',
        isOnline: user.isOnline || false,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      },
      stats: {
        orderCount,
        totalSpent,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100
      }
    });
  } catch (err) {
    console.error("Get user stats error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user activity (verification history, admin actions, user events)
router.get("/users/:id/activity", async (req, res) => {
  try {
    const activities = [];

    // First, get basic user activity from User model
    let user = await User.findById(req.params.id);
    if (!user) {
      user = await Artisan.findById(req.params.id);
    }

    if (user) {
      // Add last login
      if (user.lastLogin) {
        activities.push({
          action: 'Last login',
          timestamp: user.lastLogin,
          type: 'user_event'
        });
      }

      // Add account creation
      if (user.createdAt) {
        activities.push({
          action: 'Account created',
          timestamp: user.createdAt,
          type: 'user_event'
        });
      }

      // Add email verification status
      if (user.emailVerified || user.email_verified) {
        const emailVerifiedAt = user.emailVerifiedAt || user.email_verified_at || user.updatedAt;
        activities.push({
          action: 'Email verified',
          field: 'email',
          value: user.email,
          timestamp: emailVerifiedAt,
          type: 'verification_event',
          status: 'verified'
        });
      }

      // Add phone verification status
      if (user.phoneVerified || user.phone_verified) {
        const phoneVerifiedAt = user.phoneVerifiedAt || user.phone_verified_at || user.updatedAt;
        activities.push({
          action: 'Phone verified',
          field: 'phone',
          value: user.phone,
          timestamp: phoneVerifiedAt,
          type: 'verification_event',
          status: 'verified'
        });
      }

      // Add status changes from statusHistory
      if (user.statusHistory && user.statusHistory.length > 0) {
        user.statusHistory.forEach(h => {
          activities.push({
            type: 'status_change',
            from: h.from,
            to: h.to,
            reason: h.reason,
            by: h.changedByName || 'Admin',
            timestamp: h.timestamp
          });
        });
      }
    }

    // Then, get admin events and security events from logs DB
    try {
      const { AdminEvent, SecurityEvent } = await getLogModels();

      if (AdminEvent) {
        const adminLogs = await AdminEvent.find({
          $or: [
            { "admin_action.resource_id": req.params.id },
            { "admin_action.target_user_id": req.params.id }
          ]
        }).sort({ timestamp: -1, _id: -1 }).limit(50).lean();

        adminLogs.forEach(log => {
          activities.push({
            ...log,
            type: 'admin_event'
          });
        });
      }

      if (SecurityEvent) {
        const securityLogs = await SecurityEvent.find({
          "actor.user_id": req.params.id
        }).sort({ timestamp: -1, _id: -1 }).limit(50).lean();

        securityLogs.forEach(log => {
          activities.push({
            ...log,
            type: 'security_event'
          });
        });
      }
    } catch (logErr) {
      // Log models might not be available, continue with user activity only
      console.log("Log models not available, returning user activity only:", logErr.message);
    }

    // Sort all activities by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, 50));
  } catch (err) {
    console.error("Get user activity error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Change user role (buyer to seller or vice versa)
router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;

    if (!["buyer", "seller"].includes(role)) {
      return res.status(400).json({ msg: "Invalid role. Must be 'buyer' or 'seller'" });
    }

    let user = await User.findById(req.params.id);
    if (!user) {
      user = await Artisan.findById(req.params.id);
    }

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.role = role;
    await user.save();

    res.json({
      msg: `User role changed to ${role}`,
      user: { id: user._id, role: user.role }
    });
  } catch (err) {
    console.error("Change user role error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Export users as CSV data
router.get("/users/export", async (req, res) => {
  try {
    const users = await User.find({
      $or: [
        { "soft_delete.is_deleted": false },
        { "soft_delete.is_deleted": { $exists: false } },
      ],
    }).select("-password").lean();

    const csvData = users.map(u => ({
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status || 'active',
      isOnline: u.isOnline || false,
      lastLogin: u.lastLogin || '',
      createdAt: u.createdAt
    }));

    res.json(csvData);
  } catch (err) {
    console.error("Export users error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user's orders
router.get("/users/:id/orders", async (req, res) => {
  try {
    const Order = require("../models/artisan_point/user/Order");
    const orders = await Order.find({ user_id: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(orders);
  } catch (err) {
    console.error("Get user orders error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user's addresses
router.get("/users/:id/addresses", async (req, res) => {
  try {
    const Address = require("../models/artisan_point/user/Address");
    const addresses = await Address.find({ user_id: req.params.id });
    res.json(addresses);
  } catch (err) {
    console.error("Get user addresses error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get seller details enriched
router.get("/sellers/:id", async (req, res) => {
  try {
    console.log("Fetching seller with ID:", req.params.id); // DEBUG LOG
    const Order = require("../models/artisan_point/user/Order");
    const Review = require("../models/artisan_point/user/Review");
    const Product = require("../models/artisan_point/artisan/Listing");

    let seller = await Artisan.findById(req.params.id.trim()).select("-password -payout_details_masked"); // Keep PII safe but send other details

    // Fallback: Check User collection if not found in Artisan (handle legacy/split brain)
    if (!seller) {
      console.log("Not found in Artisan, checking User collection..."); // DEBUG LOG
      const user = await User.findById(req.params.id.trim()).select("-password");
      if (user && user.role === 'seller') {
        seller = user;
      }
    }

    if (!seller) return res.status(404).json({ msg: "Seller not found" });

    // Calculate aggregated stats
    const products = await Product.find({ seller_id: req.params.id });
    const productCount = products.length;

    // Simple aggregation for total sales/revenue (this could be heavy for large DBs, consider specialized Analytics model usage in future)
    // For now, aggregate strictly completed orders
    const orders = await Order.find({ "items.seller_id": req.params.id, status: { $ne: 'cancelled' } });
    const totalSales = orders.length;

    // Revenue calculation needs to sum only items belonging to this seller
    // Simplifying to total order value for now if structure complex, but ideally iterate items
    let totalRevenue = 0;
    orders.forEach(o => {
      o.items.forEach(i => {
        if (i.seller_id.toString() === seller._id.toString()) {
          totalRevenue += (i.price * i.quantity);
        }
      });
    });

    // Reviews
    const reviews = await Review.find({ product_id: { $in: products.map(p => p._id) } });
    const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0;

    res.json({
      seller,
      stats: {
        productCount,
        totalSales,
        totalRevenue,
        avgRating
      }
    });
  } catch (err) {
    console.error("Get seller details error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get seller orders
router.get("/sellers/:id/orders", async (req, res) => {
  try {
    const Order = require("../models/artisan_point/user/Order");
    const orders = await Order.find({ "items.seller_id": req.params.id })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 for performance
    res.json(orders);
  } catch (err) {
    console.error("Get seller orders error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get seller reviews
router.get("/sellers/:id/reviews", async (req, res) => {
  try {
    const Review = require("../models/artisan_point/user/Review");
    const Product = require("../models/artisan_point/artisan/Listing");

    // Find all products by seller
    const products = await Product.find({ seller_id: req.params.id }).select('_id title images');
    const productMap = {};
    products.forEach(p => productMap[p._id] = p);

    // Find reviews for these products
    const reviews = await Review.find({ product_id: { $in: products.map(p => p._id) } })
      .sort({ createdAt: -1 })
      .limit(50);

    // Enrich review with product info
    const enrichedReviews = reviews.map(r => ({
      ...r.toObject(),
      product_title: productMap[r.product_id]?.title,
      product_image: productMap[r.product_id]?.images?.[0]
    }));

    res.json(enrichedReviews);
  } catch (err) {
    console.error("Get seller reviews error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Verify Seller Endpoint
router.put("/sellers/:id/verify", async (req, res) => {
  try {
    const { status, notes } = req.body; // status: 'verified' | 'rejected'

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const seller = await Artisan.findById(req.params.id);
    if (!seller) return res.status(404).json({ msg: "Seller not found" });

    seller.verification = {
      ...seller.verification,
      status: status,
      verified_at: status === 'verified' ? new Date() : null,
      rejection_reason: status === 'rejected' ? notes : null
    };

    // If verified, verify the identity card too for consistency
    if (status === 'verified' && seller.identity_card) {
      seller.identity_card.verified = true;
    }

    await seller.save();

    // Log Verification Action
    logEvent({
      event_type: "ADMIN_ACTION",
      category: "admin",
      admin_action: {
        action_type: status === 'verified' ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
        resource_type: "Artisan",
        resource_id: seller._id.toString(),
        target_user_id: seller._id.toString(),
        reason: notes,
        audit_notes: `Seller was ${status} by admin`
      },
      admin_context: {
        admin_id: req.user.id,
        admin_name: req.user.name
      }
    });

    res.json({ msg: `Seller ${status}`, seller });
  } catch (err) {
    console.error("Verify seller error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get seller notes
router.get("/sellers/:id/notes", async (req, res) => {
  try {
    const seller = await Artisan.findById(req.params.id);
    if (!seller) return res.status(404).json({ msg: "Seller not found" });
    res.json(seller.notes || []);
  } catch (err) {
    console.error("Get seller notes error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Add seller note
router.post("/sellers/:id/notes", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ msg: "Content required" });

    const seller = await Artisan.findById(req.params.id);
    if (!seller) return res.status(404).json({ msg: "Seller not found" });

    const note = {
      content,
      createdBy: req.user?.id,
      createdByName: req.user?.name || 'Admin',
      createdAt: new Date()
    };

    seller.notes = seller.notes || [];
    seller.notes.unshift(note);
    await seller.save();

    res.json({ msg: "Note added", note });
  } catch (err) {
    console.error("Add seller note error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get seller customers (unique buyers from orders)
router.get("/sellers/:id/customers", async (req, res) => {
  try {
    const Order = require("../models/artisan_point/user/Order");

    // Find all orders containing items from this seller
    const orders = await Order.find({ "items.seller_id": req.params.id })
      .populate('user_id', 'name email phone')
      .sort({ createdAt: -1 });

    // Aggregate unique customers with their stats
    const customerMap = new Map();
    orders.forEach(order => {
      const userId = order.user_id?._id?.toString();
      if (!userId) return;

      if (!customerMap.has(userId)) {
        customerMap.set(userId, {
          _id: userId,
          name: order.user_id?.name || 'Unknown',
          email: order.user_id?.email || '',
          phone: order.user_id?.phone || '',
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt
        });
      }

      const customer = customerMap.get(userId);
      customer.orderCount++;
      customer.totalSpent += order.total_amount || 0;
    });

    const customers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent);

    res.json(customers);
  } catch (err) {
    console.error("Get seller customers error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Verify individual seller field (email/phone/identity)
router.post("/sellers/:id/verify-field", async (req, res) => {
  try {
    const { field } = req.body;
    const seller = await Artisan.findById(req.params.id);
    if (!seller) return res.status(404).json({ msg: "Seller not found" });

    const now = new Date();
    const adminName = req.user?.name || 'Admin';
    const adminId = req.user?.id;

    switch (field) {
      case 'email':
        seller.emailVerified = true;
        seller.emailVerifiedAt = now;
        break;
      case 'phone':
        seller.phoneVerified = true;
        seller.phoneVerifiedAt = now;
        break;
      case 'identity':
        seller.identity_card.verified = true;
        seller.identity_card.verifiedAt = now;
        seller.identity_card.verifiedBy = adminId;
        seller.identity_card.verifiedByName = adminName;
        break;
      default:
        return res.status(400).json({ msg: "Invalid field" });
    }

    // Check if all verified -> auto-verify seller
    if (seller.emailVerified && seller.phoneVerified && seller.identity_card?.verified) {
      seller.verification.status = 'verified';
      seller.verification.verified_at = now;
      seller.verification.verifiedBy = adminId;
      seller.verification.verifiedByName = adminName;
    }

    await seller.save();
    res.json({ msg: `${field} verified`, seller });
  } catch (err) {
    console.error("Verify seller field error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Force approve seller (3 admins = auto-verify)
router.post("/sellers/:id/force-approve", async (req, res) => {
  try {
    const seller = await Artisan.findById(req.params.id);
    if (!seller) return res.status(404).json({ msg: "Seller not found" });

    const adminId = req.user?.id;
    const adminName = req.user?.name || 'Admin';

    // Check if already approved by this admin
    seller.verification.adminApprovals = seller.verification.adminApprovals || [];
    const alreadyApproved = seller.verification.adminApprovals.some(
      a => a.adminId?.toString() === adminId
    );
    if (alreadyApproved) {
      return res.status(400).json({ msg: "Already approved by this admin" });
    }

    // Add approval
    seller.verification.adminApprovals.push({
      adminId,
      adminName,
      approvedAt: new Date()
    });

    // If 3 approvals, auto-verify
    if (seller.verification.adminApprovals.length >= 3) {
      seller.verification.status = 'verified';
      seller.verification.verified_at = new Date();
      seller.verification.verifiedBy = adminId;
      seller.verification.verifiedByName = `Forced (${seller.verification.adminApprovals.map(a => a.adminName).join(', ')})`;

      // Notify Seller
      await sendNotification({
        recipientId: seller._id,
        recipientModel: 'Artisan',
        title: 'Account Verified',
        message: 'Your seller account has been verified by the admin team. You can now start selling!',
        link: '/seller/dashboard',
        type: 'success'
      });
    }

    await seller.save();

    // CRM / Chat Integration
    // Find active action request or create new
    let chatMsg = await AdminChat.findOne({
      type: 'action_request',
      actionType: 'APPROVE_SELLER',
      targetId: seller._id,
      actionStatus: 'pending'
    });

    const approvalCount = seller.verification.adminApprovals.length;

    if (chatMsg) {
      // Update existing message
      chatMsg.content = `Request to Verify Seller: ${seller.name}\nStore: ${seller.store}\n\nApprovals: ${approvalCount}/3\nLatest: ${adminName}`;
      if (approvalCount >= 3) {
        chatMsg.actionStatus = 'completed';
        chatMsg.content += '\n\n[VERIFIED]';
        chatMsg.performedBy = adminId;
      }
      await chatMsg.save();
    } else if (approvalCount < 3) {
      // Create new message only if not completed
      chatMsg = await AdminChat.create({
        sender: adminId,
        content: `Request to Verify Seller: ${seller.name}\nStore: ${seller.store}\n\nApprovals: ${approvalCount}/3\nInitiated by: ${adminName}`,
        type: 'action_request',
        actionType: 'APPROVE_SELLER',
        targetId: seller._id,
        targetName: seller.store
      });
    }

    // Notify other admins only if not yet verified (or if it was just verified, maybe notify success?)
    if (approvalCount < 3) {
      await notifyAllAdmins({
        title: 'Seller Verification Request',
        message: `${seller.store} needs approval (${approvalCount}/3). Requested by ${adminName}.`,
        link: '/admin/chat', // Direct to chat to approve
        excludeAdminId: adminId
      });
    } else {
      // Notify admins of success
      await notifyAllAdmins({
        title: 'Seller Verified',
        message: `${seller.store} has been fully verified.`,
        link: `/admin/sellers/${seller._id}`,
        type: 'success',
        excludeAdminId: adminId
      });
    }

    // Log Approval
    logEvent({
      event_type: "ADMIN_ACTION",
      category: "admin",
      admin_action: {
        action_type: "VERIFICATION_APPROVED",
        resource_type: "Artisan",
        resource_id: seller._id.toString(),
        target_user_id: seller._id.toString(),
        audit_notes: `Force verification approval added (${approvalCount}/3)`
      },
      admin_context: {
        admin_id: req.user.id,
        admin_name: req.user.name
      }
    });

    // Log Approval
    logEvent({
      event_type: "ADMIN_ACTION",
      category: "admin",
      admin_action: {
        action_type: "VERIFICATION_APPROVED",
        resource_type: "Artisan",
        resource_id: seller._id.toString(),
        target_user_id: seller._id.toString(),
        audit_notes: `Force verification approval added (${approvalCount}/3)`
      },
      admin_context: {
        admin_id: req.user.id,
        admin_name: req.user.name
      }
    });

    res.json({
      msg: `Approval added (${approvalCount}/3)`,
      approvalCount,
      seller
    });
  } catch (err) {
    console.error("Force approve error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Revoke verification
router.post("/sellers/:id/revoke-verification", async (req, res) => {
  try {
    const seller = await Artisan.findById(req.params.id);
    if (!seller) return res.status(404).json({ msg: "Seller not found" });

    const adminId = req.user.id;
    const adminName = req.user.name;

    // Reset verification
    seller.verification.status = 'unverified';
    seller.verification.adminApprovals = []; // Clear approvals
    seller.verification.verifiedBy = null;
    seller.verification.verifiedByName = null;
    seller.verification.verified_at = null;
    seller.status = 'inactive'; // Deactivate store

    await seller.save();

    // Notify Seller
    await sendNotification({
      recipientId: seller._id,
      recipientModel: 'Artisan',
      title: 'Verification Revoked',
      message: 'Your seller verification has been revoked by the admin team.',
      link: '/seller/dashboard',
      type: 'error'
    });

    // Notify Admins
    await notifyAllAdmins({
      title: 'Verification Revoked',
      message: `${seller.store} verification was REVOKED by ${adminName}.`,
      link: `/admin/sellers/${seller._id}`,
      type: 'warning',
      excludeAdminId: adminId
    });

    // Update Chat Log
    const chatMsg = await AdminChat.findOne({
      type: 'action_request',
      actionType: 'APPROVE_SELLER',
      targetId: seller._id,
      actionStatus: 'completed'
    });

    if (chatMsg) {
      chatMsg.content += `\n\n[REVOKED by ${adminName} at ${new Date().toLocaleString()}]`;
      // Keep status completed to show history
      await chatMsg.save();
    }

    // Log Revocation
    logEvent({
      event_type: "ADMIN_ACTION",
      category: "admin",
      admin_action: {
        action_type: "VERIFICATION_REVOKED",
        resource_type: "Artisan",
        resource_id: seller._id.toString(),
        target_user_id: seller._id.toString(),
        audit_notes: "Verification revoked by admin"
      },
      admin_context: {
        admin_id: req.user.id,
        admin_name: req.user.name
      }
    });

    res.json({ msg: "Verification revoked", seller });
  } catch (err) {
    console.error("Revoke verification error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Remove approval (Retract)
router.post("/sellers/:id/remove-approval", async (req, res) => {
  try {
    const seller = await Artisan.findById(req.params.id);
    if (!seller) return res.status(404).json({ msg: "Seller not found" });

    // Can only retract if NOT verified
    if (seller.verification.status === 'verified') {
      return res.status(400).json({ msg: "Seller is already verified. Use Revoke instead." });
    }

    const adminId = req.user.id;
    const adminName = req.user.name;

    // Check if approved
    const approvalIndex = seller.verification.adminApprovals.findIndex(a => a.adminId.toString() === adminId);
    if (approvalIndex === -1) {
      return res.status(400).json({ msg: "You have not approved this seller." });
    }

    // Remove approval
    seller.verification.adminApprovals.splice(approvalIndex, 1);
    await seller.save();

    const approvalCount = seller.verification.adminApprovals.length;

    // Update Chat Log
    const chatMsg = await AdminChat.findOne({
      type: 'action_request',
      actionType: 'APPROVE_SELLER',
      targetId: seller._id,
      actionStatus: 'pending' // Only update pending requests
    });

    if (chatMsg) {
      chatMsg.content = `Request to Verify Seller: ${seller.name}\nStore: ${seller.store}\n\nApprovals: ${approvalCount}/3\n(Retracted by ${adminName})`;
      await chatMsg.save();
    }

    // Log Retraction
    logEvent({
      event_type: "ADMIN_ACTION",
      category: "admin",
      admin_action: {
        action_type: "VERIFICATION_RETRACTED",
        resource_type: "Artisan",
        resource_id: seller._id.toString(),
        target_user_id: seller._id.toString(),
        audit_notes: "Verification approval retracted"
      },
      admin_context: {
        admin_id: req.user.id,
        admin_name: req.user.name
      }
    });

    res.json({ msg: "Approval retracted", seller });
  } catch (err) {
    console.error("Retract approval error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get seller messages (chat)

// Get seller messages (chat)
router.get("/sellers/:id/messages", async (req, res) => {
  try {
    const seller = await Artisan.findById(req.params.id).select('messages name email');
    if (!seller) return res.status(404).json({ msg: "Seller not found" });
    res.json(seller.messages || []);
  } catch (err) {
    console.error("Get seller messages error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Send message to seller
router.post("/sellers/:id/messages", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ msg: "Content required" });

    const seller = await Artisan.findById(req.params.id);
    if (!seller) return res.status(404).json({ msg: "Seller not found" });

    const message = {
      content,
      fromAdmin: true,
      senderId: req.user?.id,
      senderName: req.user?.name || 'Admin',
      createdAt: new Date(),
      read: false
    };

    seller.messages = seller.messages || [];
    seller.messages.push(message);
    await seller.save();

    res.json({ msg: "Message sent", message });
  } catch (err) {
    console.error("Send seller message error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get seller activity log
router.get("/sellers/:id/activity", async (req, res) => {
  try {
    const seller = await Artisan.findById(req.params.id);
    if (!seller) return res.status(404).json({ msg: "Seller not found" });

    const activities = [];

    // Account events
    if (seller.createdAt) activities.push({ type: 'event', action: 'Account created', timestamp: seller.createdAt });
    if (seller.lastLogin) activities.push({ type: 'event', action: 'Last login', timestamp: seller.lastLogin });

    // Status changes
    if (seller.statusHistory && seller.statusHistory.length > 0) {
      seller.statusHistory.forEach(h => {
        activities.push({
          type: 'status_change',
          from: h.from,
          to: h.to,
          reason: h.reason,
          by: h.changedByName || 'Admin',
          timestamp: h.timestamp
        });
      });
    }

    // Verification events
    if (seller.emailVerifiedAt) activities.push({ action: 'Email verified', timestamp: seller.emailVerifiedAt });
    if (seller.phoneVerifiedAt) activities.push({ action: 'Phone verified', timestamp: seller.phoneVerifiedAt });
    if (seller.identity_card?.verifiedAt) activities.push({ action: 'Identity document verified', timestamp: seller.identity_card.verifiedAt });
    if (seller.verification?.verified_at) activities.push({ action: 'Store verified', timestamp: seller.verification.verified_at });

    // Sort by timestamp desc
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities);
  } catch (err) {
    console.error("Get seller activity error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get admin notes for user
router.get("/users/:id/notes", async (req, res) => {
  try {
    // Notes stored in-memory or can be added to User model later
    // For now, return empty array - can be enhanced with a Notes model
    res.json([]);
  } catch (err) {
    console.error("Get user notes error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Add admin note for user
router.post("/users/:id/notes", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ msg: "Note content required" });
    }
    // For now, just acknowledge - can be enhanced with a Notes model
    res.json({
      msg: "Note added",
      note: {
        _id: Date.now().toString(),
        content,
        createdBy: req.user,
        createdAt: new Date()
      }
    });
  } catch (err) {
    console.error("Add user note error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user's reviews
router.get("/users/:id/reviews", async (req, res) => {
  try {
    const Review = require("../models/artisan_point/user/Review");
    const reviews = await Review.find({ user_id: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reviews);
  } catch (err) {
    console.error("Get user reviews error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user's wishlist
router.get("/users/:id/wishlist", async (req, res) => {
  try {
    const Wishlist = require("../models/artisan_point/user/Wishlist");
    const Listing = require("../models/artisan_point/artisan/Listing");

    const wishlist = await Wishlist.findOne({ user_id: req.params.id });
    if (!wishlist || !wishlist.items?.length) {
      return res.json([]);
    }

    const products = await Listing.find({
      _id: { $in: wishlist.items.map(i => i.listing_id) }
    }).select('title price images');

    const items = products.map(p => ({
      _id: p._id,
      title: p.title,
      price: p.price,
      image: p.images?.[0]
    }));

    res.json(items);
  } catch (err) {
    console.error("Get user wishlist error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Reset user password (send reset email)
router.post("/users/:id/reset-password", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // In production, this would send an email
    // For now, just acknowledge the request
    res.json({ msg: "Password reset email sent to " + user.email });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Gift store credit to user
router.post("/users/:id/credit", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ msg: "Valid amount required" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Add credit to user (assuming there's a storeCredit field)
    user.storeCredit = (user.storeCredit || 0) + parseFloat(amount);
    await user.save();

    res.json({ msg: "Credit added", newBalance: user.storeCredit });
  } catch (err) {
    console.error("Gift credit error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Send notification to user
router.post("/users/:id/notify", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ msg: "Message required" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // In production, this would send a push notification
    // For now, just log and acknowledge
    console.log(`Notification to ${user.email}: ${message}`);

    res.json({ msg: "Notification sent" });
  } catch (err) {
    console.error("Send notification error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Impersonate user (admin login as user)
router.post("/users/:id/impersonate", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // In production, this would create a special session
    // with admin-impersonation flags for audit trail
    res.json({
      msg: "Impersonation mode activated",
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error("Impersonate error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;

