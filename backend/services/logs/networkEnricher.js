// services/logs/networkEnricher.js
function normalize(headers = {}) {
    return {
        ip: headers["x-forwarded-for"]?.split(",")[0] || null,
        connection_type: headers["x-network-type"] || null,
        effective_type: headers["x-network-effective-type"] || null,
        rtt: Number(headers["x-network-rtt"]) || null,
        downlink: Number(headers["x-network-downlink"]) || null,
        saveData: headers["x-network-save-data"] === "true"
    };
}
module.exports = { normalize };
