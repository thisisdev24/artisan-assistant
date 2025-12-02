// utils/redactor.js
const SENSITIVE_KEYS = ["authorization", "password", "token", "access_token", "refresh_token", "email"];

function isObject(o) {
    return o && typeof o === "object" && !Array.isArray(o);
}

function redact(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const k of Object.keys(obj)) {
        const val = obj[k];
        if (SENSITIVE_KEYS.includes(String(k).toLowerCase())) {
            out[k] = "[REDACTED]";
        } else if (isObject(val)) {
            out[k] = redact(val);
        } else if (Array.isArray(val)) {
            out[k] = val.map(v => (isObject(v) ? redact(v) : v));
        } else {
            out[k] = val;
        }
    }
    return out;
}

module.exports = { redact };
