// src/utils/logger/eventId.js
export function randId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
