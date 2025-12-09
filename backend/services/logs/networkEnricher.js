// services/logs/networkEnricher.js

// Calculate connection quality score (1-5, 5 is best)
function getQualityScore(effectiveType, rtt) {
    let score = 3;

    // Base score from effective type
    if (effectiveType === '4g') score = 5;
    else if (effectiveType === '3g') score = 3;
    else if (effectiveType === '2g') score = 2;
    else if (effectiveType === 'slow-2g') score = 1;

    // Adjust based on RTT
    if (rtt > 500) score = Math.max(1, score - 2);
    else if (rtt > 300) score = Math.max(1, score - 1);
    else if (rtt < 50) score = Math.min(5, score + 1);

    return score;
}

// Estimate bandwidth category
function getBandwidthCategory(downlink) {
    if (!downlink) return null;
    if (downlink >= 10) return 'excellent';  // 10+ Mbps
    if (downlink >= 4) return 'good';        // 4-10 Mbps
    if (downlink >= 1) return 'fair';        // 1-4 Mbps
    return 'poor';                           // < 1 Mbps
}

function normalize(headers = {}) {
    const ip = headers["x-forwarded-for"]?.split(",")[0]?.trim() || null;
    const connectionType = headers["x-network-type"] || null;
    const effectiveType = headers["x-network-effective-type"] || null;
    const rtt = Number(headers["x-network-rtt"]) || null;
    const downlink = Number(headers["x-network-downlink"]) || null;
    const saveData = headers["x-network-save-data"] === "true";

    return {
        ip,
        connection_type: connectionType,
        effective_type: effectiveType,
        rtt,
        downlink,
        saveData,
        quality_score: effectiveType ? getQualityScore(effectiveType, rtt) : null,
        bandwidth_category: getBandwidthCategory(downlink),
        // Additional headers if present
        carrier: headers["x-carrier"] || null,
        device_memory: Number(headers["x-device-memory"]) || null,
        hardware_concurrency: Number(headers["x-device-hardware-concurrency"]) || null,
    };
}

module.exports = { normalize, getQualityScore, getBandwidthCategory };

