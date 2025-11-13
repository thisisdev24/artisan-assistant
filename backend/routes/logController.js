// routes/logController.js
const { createLog } = require("./loggerService");

async function postLog(req, res) {
  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: "type and data are required" });
    }

    const entry = await createLog(type, data, req);
    res.json(entry);

  } catch (err) {
    console.error("postLog error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { postLog };
