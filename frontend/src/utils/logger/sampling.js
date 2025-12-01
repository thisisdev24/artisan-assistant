// src/utils/logger/sampling.js
export function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0) / 4294967295;
}

export function shouldSample(key = "", rate = 0.02) {
    if (rate >= 1) return true;
    const h = hashStr(String(key || Math.random()));
    return h < rate;
}
