module.exports = function (req, res, next) {
    const k = req.headers["x-analytics-key"];
    if (!k || k !== process.env.ANALYTICS_SECRET_KEY) {
        return res.status(403).json({ error: "Unauthorized" });
    }
    next();
};
