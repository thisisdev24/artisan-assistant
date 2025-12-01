// src/utils/logger/sessionManager.js
const SESSION_KEY = "logger_session_id";
const ANON_KEY = "logger_anonymous_id";

function readOrCreate(key) {
  try {
    let v = localStorage.getItem(key);
    if (!v) {
      v = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(key, v);
    }
    return v;
  } catch (e) {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function getSessionId() { return readOrCreate(SESSION_KEY); }
export function getAnonymousId() { return readOrCreate(ANON_KEY); }
export function clearSession() { localStorage.removeItem(SESSION_KEY); }
