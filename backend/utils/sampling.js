// utils/sampling.js
const crypto = require("crypto");

function hashToFloat(str) {
    const hash = crypto.createHash("sha256").update(String(str)).digest();
    return hash.readUInt32BE(0) / 0xffffffff;
}

function shouldSample(key, rate = 0.05) {
    if (rate >= 1) return true;
    if (rate <= 0) return false;
    const value = hashToFloat(key || Math.random());
    return value < rate;
}

module.exports = { shouldSample };
