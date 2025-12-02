const router = require("express").Router();
const auth = require("../middleware/analyticsAuth");
const ctrl = require("../controllers/analyticsController");

router.use(auth);

router.get("/daily", ctrl.getDaily);
router.get("/traffic", ctrl.getTraffic);

module.exports = router;
