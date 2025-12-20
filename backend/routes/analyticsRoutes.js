const router = require("express").Router();
const auth = require("../middleware/analyticsAuth");
const ctrl = require("../controllers/analyticsController");

// Apply analytics auth middleware
router.use(auth);

// ========== CORE ANALYTICS ROUTES ==========

// Daily aggregated stats
router.get("/daily", ctrl.getDaily);

// Traffic timeseries
router.get("/traffic", ctrl.getTraffic);

// ========== POWER BI DASHBOARD ROUTES ==========

// Overview KPIs with growth metrics
router.get("/overview", ctrl.getOverview);

// Sales timeseries for charts
router.get("/sales", ctrl.getSales);

// Top performing products
router.get("/top-products", ctrl.getTopProducts);

// Top sellers/artists
router.get("/top-sellers", ctrl.getTopSellers);

// Device breakdown (desktop/mobile/tablet)
router.get("/devices", ctrl.getDevices);

// Geographic distribution
router.get("/geo", ctrl.getGeo);

// Hourly activity heatmap
router.get("/hourly", ctrl.getHourly);

// Error trends monitoring
router.get("/errors", ctrl.getErrorTrends);

// Performance metrics
router.get("/performance", ctrl.getPerformance);

module.exports = router;
