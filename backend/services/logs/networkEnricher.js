// services/logs/networkEnricher.js
// Enriches network-related data from frontend and backend analysis

/**
 * Normalizes connection type strings
 */
function normalizeConnectionType(type) {
    if (!type) return null;
    const normalized = type.toLowerCase();

    // Map common variations
    const typeMap = {
        'wifi': 'wifi',
        'cellular': 'cellular',
        '4g': 'cellular',
        '5g': 'cellular',
        '3g': 'cellular',
        '2g': 'cellular',
        'ethernet': 'ethernet',
        'bluetooth': 'bluetooth',
        'wimax': 'wimax',
        'other': 'other',
        'unknown': 'unknown',
        'none': 'none',
    };

    return typeMap[normalized] || normalized;
}

/**
 * Simple VPN detection based on IP patterns
 * This is a very basic heuristic and not 100% accurate
 */
function detectVPN(ip) {
    if (!ip) return false;

    // Localhost or private IPs are not VPN
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') ||
        ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('172.31.')) {
        return false;
    }

    // For production, you'd want to check against known VPN IP ranges
    // or use a service like IPQualityScore, IPHub, etc.
    // For now, we'll return false as we can't reliably detect without external service
    return false;
}

/**
 * Enriches network data from the raw event and context
 * @param {Object} rawNetwork - network data from frontend or event
 * @param {string} ip - IP address for VPN detection
 * @returns {Object} enriched network data
 */
function enrichNetwork(rawNetwork = {}, ip = null) {
    // Normalize connection type with better defaults
    const connectionType = normalizeConnectionType(rawNetwork.connection_type) ||
        (rawNetwork.effective_type ? 'cellular' : null) ||
        'unknown';

    // Detect VPN
    const vpn = detectVPN(ip);

    // Provide defaults for missing fields
    const effectiveType = rawNetwork.effective_type ||
        (rawNetwork.downlink && rawNetwork.downlink > 10 ? '4g' :
            rawNetwork.downlink && rawNetwork.downlink > 2 ? '3g' :
                'unknown');

    const latencyMs = rawNetwork.latency_ms || rawNetwork.rtt || null;
    const downlink = rawNetwork.downlink || null;
    const rtt = rawNetwork.rtt || rawNetwork.latency_ms || null;

    return {
        connection_type: connectionType,
        effective_type: effectiveType,
        downlink: downlink,
        rtt: rtt,
        latency_ms: latencyMs,
        vpn: vpn,
        saveData: rawNetwork.saveData || false,
        carrier: rawNetwork.carrier || null,
        asn: rawNetwork.asn || null,
    };
}

module.exports = { enrichNetwork };
