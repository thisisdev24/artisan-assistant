// services/logs/deploymentInfo.js
module.exports.getInfo = function () {
    return {
        version: process.env.RELEASE_VERSION || process.env.npm_package_version || "dev",
        commit_hash: process.env.GIT_COMMIT || null,
        release_id: process.env.RELEASE_ID || null,
        deployed_at: process.env.DEPLOY_TIME || new Date().toISOString()
    };
};
