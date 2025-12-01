// src/utils/logger/loggerClient.js
import { randId } from "./eventId.js";
import { getSessionId, getAnonymousId } from "./sessionManager.js";
import indexedDbQueue from "./indexedDbQueue.js";
import config from "./loggerConfig.js";
import { shouldSample } from "./sampling.js";

const DEFAULT_BATCH = config.BATCH_SIZE || 25;
const FLUSH_INTERVAL = config.FLUSH_INTERVAL_MS || 2000;

export default class LoggerClient {
  constructor({ endpoint = config.ENDPOINT, batchSize = DEFAULT_BATCH } = {}) {
    this.endpoint = endpoint;
    this.batchSize = batchSize;
    this.queue = [];
    this.user = null;
    this.timer = null;
    this.isFlushing = false;
    this.initInterval();
  }

  initInterval() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL);
    window.addEventListener("online", () => this.flush());
    window.addEventListener("beforeunload", () => this.flush(true));
  }

  setUser(user) {
    this.user = user;
  }

  _prepareEvent(raw) {
    const event = {
      event_id: raw.event_id || randId(),
      event_version: raw.event_version || 1,
      event_type: raw.event_type || raw.type || "UNKNOWN",
      category: raw.category || raw.cat || "interaction",
      action: raw.action || null,
      description: raw.description || null,
      user_id: (this.user && this.user.id) || raw.user_id || null,
      session_id: getSessionId(),
      anonymous_id: getAnonymousId(),
      timestamp_client_utc: new Date().toISOString(),
      client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      device: {
        user_agent: navigator.userAgent,
        language: navigator.language,
        hw_concurrency: navigator.hardwareConcurrency || null,
        device_memory: navigator.deviceMemory || null,
        platform: navigator.platform || null,
        screen: `${window.screen.width}x${window.screen.height}`,
      },
      network: (navigator.connection ? {
        type: navigator.connection.type,
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData,
      } : {}),
      ...raw,
    };

    return event;
  }

  logEvent(rawEvent = {}) {
    // sampling for interactions
    if (rawEvent.category === "interaction" && !shouldSample(rawEvent.session_id || getSessionId(), config.INTERACTION_SAMPLE_RATE || 0.02)) {
      return false;
    }

    const e = this._prepareEvent(rawEvent);
    this.queue.push(e);

    if (config.ENABLE_OFFLINE_PERSIST) {
      indexedDbQueue.push(e).catch(() => { });
    }

    if (this.queue.length >= this.batchSize) this.flush();
    return true;
  }

  async flush(isUnload = false) {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      // Prefer persisted items first
      let batch = [];
      if (config.ENABLE_OFFLINE_PERSIST) {
        const persisted = await indexedDbQueue.peekBatch(this.batchSize);
        if (persisted && persisted.length) {
          batch = persisted.map(p => p.value);
        }
      }

      if (!batch.length) {
        batch = this.queue.splice(0, this.batchSize);
      } else {
        // also take from in-memory to fill
        const extra = this.queue.splice(0, this.batchSize - batch.length);
        batch.push(...extra);
      }

      if (!batch.length) return;

      const payload = JSON.stringify(batch);

      // sendBeacon on unload
      if (isUnload && navigator.sendBeacon) {
        const ok = navigator.sendBeacon(this.endpoint, payload);
        if (ok && config.ENABLE_OFFLINE_PERSIST) {
          await indexedDbQueue.removeKeys(batch.map(b => b.event_id));
        }
        return;
      }

      const headers = { "Content-Type": "application/json" };
      const token = window.__apiClientAuthToken;
      if (token) headers.Authorization = `Bearer ${token}`;

      const resp = await fetch(this.endpoint, {
        method: "POST",
        headers,
        body: payload,
        keepalive: true,
      });

      if (!resp.ok) throw new Error("Failed to send logs");

      if (config.ENABLE_OFFLINE_PERSIST) {
        await indexedDbQueue.removeKeys(batch.map(b => b.event_id));
      }
    } catch (err) {
      // keep items in memory; will retry later
      console.warn("[LoggerClient] flush failed", err.message);
    } finally {
      this.isFlushing = false;
    }
  }
}
