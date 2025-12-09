// services/logs/serverInfoProvider.js
// Automatically detects server's geo location and network info
// Used for backend-generated events (deployment, infra, background jobs)

const axios = require("axios");
const os = require("os");
const geoProvider = require("./geoProvider");

let cachedServerInfo = null;
let lastFetchTime = null;
const CACHE_TTL_MS = 3600000; // 1 hour

// Get server's public IP automatically
async function getPublicIP() {
    const services = [
        'https://ipapi.co/json/',
        "https://icanhazip.com",
        "https://ifconfig.me/ip",
        "https://checkip.amazonaws.com",
    ];

    for (const url of services) {
        try {
            const resp = await axios.get(url, { timeout: 3000 });

            const ip = typeof resp.data === "object"
                ? resp.data.ip
                : resp.data.trim();
            if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
                return ip;
            }
        } catch (e) {
            continue;
        }
    }
    return null;
}

// Get local network interface info
function getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = [];

    for (const [name, nets] of Object.entries(interfaces)) {
        for (const net of nets) {
            if (!net.internal) {
                result.push({
                    interface: name,
                    address: net.address,
                    family: net.family,
                    mac: net.mac,
                    netmask: net.netmask,
                });
            }
        }
    }
    return result;
}

// Get server system info
function getSystemInfo() {
    return {
        host_name: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        os_type: os.type(),
        os_release: os.release(),
        cpus: os.cpus().length,
        total_memory_gb: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
        uptime_seconds: Math.round(os.uptime()),
    };
}

// Detect cloud provider from metadata endpoints
async function detectCloudProvider() {
    const providers = [
        {
            name: "AWS",
            url: "http://169.254.169.254/latest/meta-data/placement/region",
            timeout: 500,
            parse: (data) => ({ provider: "AWS", region: data.trim() })
        },
        {
            name: "GCP",
            url: "http://metadata.google.internal/computeMetadata/v1/instance/zone",
            headers: { "Metadata-Flavor": "Google" },
            timeout: 500,
            parse: (data) => {
                const zone = data.split("/").pop();
                return { provider: "GCP", region: zone.replace(/-[a-z]$/, "") };
            }
        },
        {
            name: "Azure",
            url: "http://169.254.169.254/metadata/instance/compute/location?api-version=2021-02-01",
            headers: { "Metadata": "true" },
            timeout: 500,
            parse: (data) => ({ provider: "Azure", region: data.trim() })
        }
    ];

    for (const p of providers) {
        try {
            const resp = await axios.get(p.url, {
                timeout: p.timeout,
                headers: p.headers || {}
            });
            return p.parse(resp.data);
        } catch {
            continue;
        }
    }

    return { provider: "local", region: null };
}

// Main function to get all server info
async function getServerInfo(forceRefresh = false) {
    // Return cached if still valid
    if (!forceRefresh && cachedServerInfo && lastFetchTime) {
        const age = Date.now() - lastFetchTime;
        if (age < CACHE_TTL_MS) {
            return cachedServerInfo;
        }
    }

    console.log("[ServerInfo] Fetching server geo and network info...");

    const [publicIP, cloudInfo] = await Promise.all([
        getPublicIP(),
        detectCloudProvider()
    ]);

    // Get geo from public IP
    let geo = {};
    if (publicIP) {
        try {
            geo = await geoProvider.lookup(publicIP);
        } catch (e) {
            console.warn("[ServerInfo] Geo lookup failed:", e.message);
        }
    }

    const systemInfo = getSystemInfo();
    const networkInterfaces = getNetworkInterfaces();

    cachedServerInfo = {
        geo: {
            ip: publicIP,
            country: geo.country || null,
            country_code: geo.country_code || null,
            region: geo.region || null,
            city: geo.city || null,
            latitude: geo.latitude || null,
            longitude: geo.longitude || null,
            timezone: geo.timezone || null,
            isp: geo.org || null,
            source: "server_auto_detect"
        },
        infrastructure: {
            host_name: systemInfo.host_name,
            platform: systemInfo.platform,
            os_type: systemInfo.os_type,
            os_release: systemInfo.os_release,
            arch: systemInfo.arch,
            cpus: systemInfo.cpus,
            total_memory_gb: systemInfo.total_memory_gb,
            region: cloudInfo.region || geo.region || null,
            data_center: cloudInfo.provider !== "local" ? cloudInfo.provider : null,
            cloud_provider: cloudInfo.provider,
        },
        network: {
            interfaces: networkInterfaces,
            primary_ip: networkInterfaces[0]?.address || null,
            public_ip: publicIP,
        },
        device: {
            device_type: "server",
            os: systemInfo.os_type,
            os_version: systemInfo.os_release,
            platform: systemInfo.platform,
            arch: systemInfo.arch,
        },
        fetched_at: new Date().toISOString()
    };

    lastFetchTime = Date.now();
    console.log(`[ServerInfo] Server located in: ${geo.city || "Unknown"}, ${geo.country || "Unknown"} (${publicIP || "no IP"})`);

    return cachedServerInfo;
}

// Initialize on module load
let initPromise = null;
function init() {
    if (!initPromise) {
        initPromise = getServerInfo().catch(e => {
            console.warn("[ServerInfo] Init failed:", e.message);
            return null;
        });
    }
    return initPromise;
}

// Get cached info synchronously (returns null if not yet fetched)
function getCachedInfo() {
    return cachedServerInfo;
}

module.exports = {
    getServerInfo,
    getPublicIP,
    getSystemInfo,
    getNetworkInterfaces,
    detectCloudProvider,
    getCachedInfo,
    init
};
