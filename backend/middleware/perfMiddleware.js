// middleware/perfMiddleware.js
module.exports = (req, res, next) => {
  const start = Date.now();
  req._perf = {};
  res.on("finish", () => {
    req._perf.request_time_ms = Date.now() - start;
  });
  next();
};
