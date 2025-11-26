// src/utils/logger/sessionManager.js

const SESSION_KEY = "logger_session_id";
const ANON_KEY = "logger_anon_id";

function randomId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateSessionId() {
  if (typeof window === "undefined") return "";

  let val = localStorage.getItem(SESSION_KEY);
  if (!val) {
    val = randomId("sess");
    localStorage.setItem(SESSION_KEY, val);
  }
  return val;
}

export function getOrCreateAnonymousId() {
  if (typeof window === "undefined") return "";

  let val = localStorage.getItem(ANON_KEY);
  if (!val) {
    val = randomId("anon");
    localStorage.setItem(ANON_KEY, val);
  }
  return val;
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
