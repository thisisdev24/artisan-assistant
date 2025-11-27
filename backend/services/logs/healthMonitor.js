// services/logs/healthMonitor.js
// Monitors system health metrics like request rate, error rate, uptime

class HealthMonitor {
    constructor() {
        this.metrics = {
            totalRequests: 0,
            errorRequests: 0,
            startTime: Date.now(),
            requestTimestamps: [], // Last 60 seconds of requests
            errorTimestamps: [], // Last 60 seconds of errors
        };

        // Clean up old timestamps every 10 seconds
        setInterval(() => this.cleanupOldMetrics(), 10000);
    }

    /**
     * Record a request
     */
    recordRequest(isError = false) {
        const now = Date.now();
        this.metrics.totalRequests++;
        this.metrics.requestTimestamps.push(now);

        if (isError) {
            this.metrics.errorRequests++;
            this.metrics.errorTimestamps.push(now);
        }
    }

    /**
     * Remove timestamps older than 60 seconds
     */
    cleanupOldMetrics() {
        const sixtySecondsAgo = Date.now() - 60000;
        this.metrics.requestTimestamps = this.metrics.requestTimestamps.filter(t => t > sixtySecondsAgo);
        this.metrics.errorTimestamps = this.metrics.errorTimestamps.filter(t => t > sixtySecondsAgo);
    }

    /**
     * Get current health snapshot
     */
    getHealthSnapshot() {
        this.cleanupOldMetrics();

        const uptimeSeconds = Math.floor((Date.now() - this.metrics.startTime) / 1000);
        const requestsLastMinute = this.metrics.requestTimestamps.length;
        const errorsLastMinute = this.metrics.errorTimestamps.length;

        // Calculate rates
        const requestRate = requestsLastMinute / 60; // requests per second
        const errorRate = requestsLastMinute > 0 ? errorsLastMinute / requestsLastMinute : 0;
        const uptimePercent = 100; // Could be calculated based on downtime tracking

        return {
            cpu_load: null, // Set by systemMonitor
            memory_used_mb: null, // Set by systemMonitor
            network_throughput_mb: null, // Would need network monitoring
            request_rate_rps: Math.round(requestRate * 100) / 100,
            error_rate: Math.round(errorRate * 10000) / 10000,
            uptime_percent: uptimePercent,
            uptime_seconds: uptimeSeconds,
            total_requests: this.metrics.totalRequests,
            total_errors: this.metrics.errorRequests,
        };
    }

    /**
     * Reset metrics (useful for testing)
     */
    reset() {
        this.metrics = {
            totalRequests: 0,
            errorRequests: 0,
            startTime: Date.now(),
            requestTimestamps: [],
            errorTimestamps: [],
        };
    }
}

// Singleton instance
const healthMonitor = new HealthMonitor();

module.exports = { healthMonitor };
