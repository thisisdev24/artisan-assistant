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
        { "soft_delete.is_deleted": { $exists: false } },
      ],
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
        { "soft_delete.is_deleted": { $exists: false } },
      ],
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

    user.status = blocked ? "blocked" : "active";
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

// Get all listings
router.get("/listings", async (req, res) => {
  try {
    const listings = await Listing.find({
      $or: [
        { "soft_delete.is_deleted": false },
        { "soft_delete.is_deleted": { $exists: false } },
      ],
    }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    console.error("Get listings error:", err);
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

    res.json({
      users: usersCount,
      sellers: sellersCount,
      listings: listingsCount,
      admins: adminsCount,
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

module.exports = router;
