// services/logs/circuitBreaker.js
// Circuit Breaker pattern to prevent hammering DB when it's down

const STATES = {
    CLOSED: "CLOSED",       // Normal operation
    OPEN: "OPEN",           // Failing, reject all requests
    HALF_OPEN: "HALF_OPEN"  // Testing if service recovered
};

const FAILURE_THRESHOLD = 5;        // Open after this many consecutive failures
const RECOVERY_TIMEOUT_MS = 30000;  // Wait this long before trying again
const SUCCESS_THRESHOLD = 2;        // Close after this many successes in half-open

class CircuitBreaker {
    constructor(name = "default") {
        this.name = name;
        this.state = STATES.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.lastStateChange = Date.now();
    }

    // Check if request should proceed
    canProceed() {
        if (this.state === STATES.CLOSED) {
            return true;
        }

        if (this.state === STATES.OPEN) {
            // Check if we should transition to half-open
            const timeSinceFailure = Date.now() - this.lastFailureTime;
            if (timeSinceFailure >= RECOVERY_TIMEOUT_MS) {
                this._transition(STATES.HALF_OPEN);
                return true;
            }
            return false;
        }

        if (this.state === STATES.HALF_OPEN) {
            return true; // Allow limited requests to test
        }

        return false;
    }

    // Record a successful operation
    recordSuccess() {
        if (this.state === STATES.HALF_OPEN) {
            this.successCount++;
            if (this.successCount >= SUCCESS_THRESHOLD) {
                this._transition(STATES.CLOSED);
            }
        } else if (this.state === STATES.CLOSED) {
            // Reset failure count on success
            this.failureCount = 0;
        }
    }

    // Record a failed operation
    recordFailure() {
        this.lastFailureTime = Date.now();
        this.failureCount++;

        if (this.state === STATES.HALF_OPEN) {
            // Immediate transition back to open on any failure in half-open
            this._transition(STATES.OPEN);
        } else if (this.state === STATES.CLOSED) {
            if (this.failureCount >= FAILURE_THRESHOLD) {
                this._transition(STATES.OPEN);
            }
        }
    }

    // Force reset to closed state (for testing/admin)
    reset() {
        this._transition(STATES.CLOSED);
        this.failureCount = 0;
        this.successCount = 0;
    }

    // Get current state info
    getState() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            lastStateChange: this.lastStateChange,
            timeSinceStateChange: Date.now() - this.lastStateChange
        };
    }

    _transition(newState) {
        if (this.state !== newState) {
            console.log(`[CircuitBreaker:${this.name}] ${this.state} -> ${newState}`);
            this.state = newState;
            this.lastStateChange = Date.now();

            if (newState === STATES.HALF_OPEN) {
                this.successCount = 0;
            }
            if (newState === STATES.CLOSED) {
                this.failureCount = 0;
                this.successCount = 0;
            }
        }
    }
}

// Singleton instance for MongoDB logging
const mongoCircuitBreaker = new CircuitBreaker("mongodb-logs");

module.exports = {
    CircuitBreaker,
    mongoCircuitBreaker,
    STATES,
    FAILURE_THRESHOLD,
    RECOVERY_TIMEOUT_MS,
    SUCCESS_THRESHOLD
};
