// src/utils/logger/index.js
// Main export file for the logging system

import autoLogger from './autoLogger.js';
import LoggerClient from './loggerClient.js';
import indexedDbQueue from './indexedDbQueue.js';
import config from './loggerConfig.js';

// Initialize auto-logging when this module is imported
if (typeof window !== 'undefined') {
    // Only initialize in browser environment
    autoLogger.init();
}

// Export everything
export { autoLogger, LoggerClient, indexedDbQueue, config };

// Default export is the auto-logger
export default autoLogger;

// Convenience function for manual logging
export function log(event) {
    return autoLogger.log(event);
}

// Set user for logging
export function setUser(user) {
    autoLogger.setUser(user);
}

// Get logging stats
export function getStats() {
    return autoLogger.getStats();
}
