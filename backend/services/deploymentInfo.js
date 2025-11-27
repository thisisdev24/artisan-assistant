// services/deploymentInfo.js
// Reads deployment information from package.json and environment variables

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let cachedDeploymentInfo = null;

/**
 * Get deployment information
 * Reads from package.json, git, and environment variables
 */
function getDeploymentInfo() {
    // Return cached if available
    if (cachedDeploymentInfo) {
        return cachedDeploymentInfo;
    }

    const deploymentInfo = {
        release_id: process.env.RELEASE_ID || null,
        version: null,
        commit_hash: null,
        deployed_by: process.env.DEPLOYED_BY || null,
        environment: process.env.NODE_ENV || 'development',
        deployed_at: process.env.DEPLOYED_AT || null,
    };

    // Try to read version from package.json
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            deploymentInfo.version = packageJson.version || null;
        }
    } catch (err) {
        console.warn('[deploymentInfo] Failed to read package.json:', err.message);
    }

    // Try to get git commit hash
    try {
        const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
        deploymentInfo.commit_hash = commitHash || null;
    } catch (err) {
        // Git not available or not a git repository
        deploymentInfo.commit_hash = null;
    }

    // If deployed_at not set, use current time for development
    if (!deploymentInfo.deployed_at && deploymentInfo.environment === 'development') {
        deploymentInfo.deployed_at = new Date().toISOString();
    }

    // Cache the result
    cachedDeploymentInfo = deploymentInfo;

    return deploymentInfo;
}

/**
 * Refresh deployment info (call this after deployment)
 */
function refreshDeploymentInfo() {
    cachedDeploymentInfo = null;
    return getDeploymentInfo();
}

module.exports = { getDeploymentInfo, refreshDeploymentInfo };
