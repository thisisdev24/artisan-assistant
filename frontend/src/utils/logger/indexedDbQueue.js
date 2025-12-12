// src/utils/logger/indexedDbQueue.js
const DB_NAME = "logger_db_v1";
const STORE = "events";

function openDB() {
    return new Promise((res, rej) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE, { keyPath: "event_id" });
        };
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    });
}

export default {
    async push(item) {
        const db = await openDB();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).put(item);
            tx.oncomplete = () => res(true);
            tx.onerror = () => rej(tx.error);
        });
    },

    async peekBatch(limit = 50) {
        const db = await openDB();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, "readonly");
            const store = tx.objectStore(STORE);
            const out = [];
            const req = store.openCursor();
            req.onsuccess = (e) => {
                const cur = e.target.result;
                if (!cur || out.length >= limit) return res(out);
                out.push(cur.value);
                cur.continue();
            };
            req.onerror = () => rej(req.error);
        });
    },

    async removeKeys(keys = []) {
        if (!keys.length) return;
        const db = await openDB();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, "readwrite");
            const st = tx.objectStore(STORE);
            keys.forEach(k => st.delete(k));
            tx.oncomplete = () => res(true);
            tx.onerror = () => rej(tx.error);
        });
    }
};
