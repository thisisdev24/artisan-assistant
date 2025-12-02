// scripts/create_log_indexes.js
const { getLogModels } = require("../models/logs");

async function run() {
    const models = await getLogModels();
    const domainModels = Object.keys(models);

    for (const name of domainModels) {
        const Model = models[name];
        if (!Model || !Model.collection) continue;
        console.log("Creating base indexes for", name);
        try {
            await Model.collection.createIndex({ event_id: 1 }, { background: true });
            await Model.collection.createIndex({ event_type: 1, timestamp_received_ist: -1 }, { background: true });
            await Model.collection.createIndex({ user_id: 1, timestamp_received_ist: -1 }, { background: true });
        } catch (err) {
            console.warn("Index creation failed for", name, err && err.message);
        }
    }

    console.log("Index migration complete");
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
