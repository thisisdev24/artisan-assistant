// src/utils/logger/indexedDbQueue.js
// Enhanced IndexedDB queue with error recovery and fallbacks

const DB_NAME = "logger_db_v2";
const STORE = "events";
const MAX_QUEUE_SIZE = 5000;

let dbInstance = null;
let dbError = false;

async function openDB() {
    // Return cached instance if available
    if (dbInstance && !dbError) {
        return dbInstance;
    }

    return new Promise((res, rej) => {
        try {
            const req = indexedDB.open(DB_NAME, 1);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: "event_id" });
                }
            };

            req.onsuccess = () => {
                dbInstance = req.result;
                dbError = false;
                res(req.result);
            };

            req.onerror = () => {
                dbError = true;
                console.warn("[IndexedDB] Failed to open database:", req.error);
                rej(req.error);
            };
        } catch (err) {
            dbError = true;
            rej(err);
        }
    });
}

// LocalStorage fallback when IndexedDB fails
const localStorageFallback = {
    KEY: "logger_fallback_queue",

    push(item) {
        try {
            const existing = JSON.parse(localStorage.getItem(this.KEY) || "[]");
            existing.push(item);
            // Keep only last 100 items in localStorage (size limit)
            if (existing.length > 100) {
                existing.splice(0, existing.length - 100);
            }
            localStorage.setItem(this.KEY, JSON.stringify(existing));
            return true;
        } catch (err) {
            console.warn("[LocalStorage] Fallback failed:", err);
            return false;
        }
    },

    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || "[]");
        } catch {
            return [];
        }
    },

    clear() {
        try {
            localStorage.removeItem(this.KEY);
        } catch { }
    }
};

export default {
    async push(item) {
        try {
            const db = await openDB();
            return new Promise((res, rej) => {
                const tx = db.transaction(STORE, "readwrite");
                const store = tx.objectStore(STORE);

                // Check size limit
                const countReq = store.count();
                countReq.onsuccess = () => {
                    if (countReq.result >= MAX_QUEUE_SIZE) {
                        // Delete oldest entries to make room
                        const cursor = store.openCursor();
                        let deleted = 0;
                        cursor.onsuccess = (e) => {
                            const cur = e.target.result;
                            if (cur && deleted < 100) {
                                store.delete(cur.key);
                                deleted++;
                                cur.continue();
                            }
                        };
                    }
                };

                store.put(item);
                tx.oncomplete = () => res(true);
                tx.onerror = () => rej(tx.error);
            });
        } catch (err) {
            // Fallback to localStorage
            console.warn("[IndexedDB] Push failed, using localStorage fallback");
            return localStorageFallback.push(item);
        }
    },

    async peekBatch(limit = 50) {
        try {
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
        } catch (err) {
            // Return localStorage fallback items
            return localStorageFallback.getAll().slice(0, limit);
        }
    },

    async removeKeys(keys = []) {
        if (!keys.length) return;
        try {
            const db = await openDB();
            return new Promise((res, rej) => {
                const tx = db.transaction(STORE, "readwrite");
                const st = tx.objectStore(STORE);
                keys.forEach(k => st.delete(k));
                tx.oncomplete = () => res(true);
                tx.onerror = () => rej(tx.error);
            });
        } catch (err) {
            // Clear localStorage fallback too
            localStorageFallback.clear();
        }
    },

    // Get count of queued items
    async count() {
        try {
            const db = await openDB();
            return new Promise((res, rej) => {
                const tx = db.transaction(STORE, "readonly");
                const store = tx.objectStore(STORE);
                const req = store.count();
                req.onsuccess = () => res(req.result);
                req.onerror = () => rej(req.error);
            });
        } catch {
            return localStorageFallback.getAll().length;
        }
    },

    // Clear all items (emergency reset)
    async clear() {
        try {
            const db = await openDB();
            return new Promise((res, rej) => {
                const tx = db.transaction(STORE, "readwrite");
                const store = tx.objectStore(STORE);
                store.clear();
                tx.oncomplete = () => res(true);
                tx.onerror = () => rej(tx.error);
            });
        } catch {
            localStorageFallback.clear();
        }
    },

    // Check if storage is available
    isAvailable() {
        return !dbError || typeof localStorage !== "undefined";
    }
};
