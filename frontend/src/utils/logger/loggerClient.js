// src/utils/logger/loggerClient.js
import { randId } from "./eventId.js";
import { getSessionId, getAnonymousId } from "./sessionManager.js";
import indexedDbQueue from "./indexedDbQueue.js";
import config from "./loggerConfig.js";
import { shouldSample } from "./sampling.js";

const DEFAULT_BATCH = config.BATCH_SIZE || 25;
const FLUSH_INTERVAL = config.FLUSH_INTERVAL_MS || 2000;
const MAX_RETRY_PER_EVENT = 5;
const RETRY_BACKOFF_MS = 1000;

export default class LoggerClient {
  constructor({ endpoint = config.ENDPOINT, batchSize = DEFAULT_BATCH } = {}) {
    this.endpoint = endpoint;
    this.batchSize = batchSize;
    this.queue = [];
    this.user = null;
    this.timer = null;
    this.isFlushing = false;
    this.failedCount = 0;
    this.successCount = 0;
    this.retryQueue = []; // Events that failed and need retry
    this.initInterval();
  }

  initInterval() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL);

    // Retry on network reconnect
    window.addEventListener("online", () => {
      console.log("[Logger] Online - flushing queued events");
      this.flush();
    });

    // Flush on page unload
    window.addEventListener("beforeunload", () => this.flush(true));

    // Visibility change - flush when tab becomes visible
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.flush();
      }
    });
  }

  setUser(user) {
    this.user = user;
  }

  // Connection quality scoring (1-5, 5 is best)
  _getConnectionQuality(conn) {
    if (!conn) return null;
    const etype = conn.effectiveType;
    const rtt = conn.rtt || 0;

    let score = 3;
    if (etype === '4g') score = 5;
    else if (etype === '3g') score = 3;
    else if (etype === '2g') score = 2;
    else if (etype === 'slow-2g') score = 1;

    if (rtt > 500) score = Math.max(1, score - 2);
    else if (rtt > 300) score = Math.max(1, score - 1);
    else if (rtt < 50) score = Math.min(5, score + 1);

    return score;
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
        screen_color_depth: window.screen.colorDepth || null,
        screen_orientation: window.screen.orientation?.type || null,
        touch_support: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        online: navigator.onLine,
      },
      network: (navigator.connection ? {
        type: navigator.connection.type,
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData,
        quality_score: this._getConnectionQuality(navigator.connection),
      } : {}),
      _retry_count: raw._retry_count || 0,
      ...raw,
    };

    return event;
  }

  logEvent(rawEvent = {}) {
    // Sampling for interactions
    if (rawEvent.category === "interaction" && !shouldSample(rawEvent.session_id || getSessionId(), config.INTERACTION_SAMPLE_RATE || 0.02)) {
      return false;
    }

    const e = this._prepareEvent(rawEvent);
    this.queue.push(e);

    // Always persist to IndexedDB for offline support
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
      // Prioritize persisted items first
      let batch = [];
      if (config.ENABLE_OFFLINE_PERSIST) {
        try {
          const persisted = await indexedDbQueue.peekBatch(this.batchSize);
          if (persisted && persisted.length) {
            batch = persisted.map(p => p.value || p);
          }
        } catch { }
      }

      // Fill from retry queue
      while (this.retryQueue.length > 0 && batch.length < this.batchSize) {
        const item = this.retryQueue.shift();
        if (item._retry_count < MAX_RETRY_PER_EVENT) {
          batch.push(item);
        }
      }

      // Fill from in-memory queue
      if (batch.length < this.batchSize) {
        const extra = this.queue.splice(0, this.batchSize - batch.length);
        batch.push(...extra);
      }

      // Filter out invalid items
      batch = batch.filter(b => b && typeof b === 'object' && b.event_id);

      if (!batch.length) return;

      const payload = JSON.stringify(batch);

      // sendBeacon on unload (fire and forget)
      if (isUnload && navigator.sendBeacon) {
        const ok = navigator.sendBeacon(this.endpoint, payload);
        if (ok && config.ENABLE_OFFLINE_PERSIST) {
          await indexedDbQueue.removeKeys(batch.map(b => b.event_id));
        }
        return;
      }

      // Normal fetch with timeout and retry
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const headers = { "Content-Type": "application/json" };
        const token = window.__apiClientAuthToken;
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(this.endpoint, {
          method: "POST",
          headers,
          body: payload,
          keepalive: true,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        // Success - remove from IndexedDB
        this.successCount += batch.length;
        if (config.ENABLE_OFFLINE_PERSIST) {
          await indexedDbQueue.removeKeys(batch.map(b => b.event_id));
        }

      } catch (fetchErr) {
        clearTimeout(timeoutId);
        this.failedCount += batch.length;

        // Add failed events to retry queue with incremented retry count
        for (const event of batch) {
          event._retry_count = (event._retry_count || 0) + 1;
          if (event._retry_count < MAX_RETRY_PER_EVENT) {
            this.retryQueue.push(event);
          }
        }

        // Silently handle network errors
        if (fetchErr.name !== 'AbortError' &&
          !fetchErr.message.includes('Failed to fetch') &&
          !fetchErr.message.includes('NetworkError')) {
          console.warn("[Logger] Flush error:", fetchErr.message);
        }
      }
    } catch (err) {
      // Catastrophic error - keep items in queue for later
      console.warn("[Logger] Unexpected flush error:", err.message);
    } finally {
      this.isFlushing = false;
    }
  }

  // Get client-side logging stats
  getStats() {
    return {
      queueLength: this.queue.length,
      retryQueueLength: this.retryQueue.length,
      successCount: this.successCount,
      failedCount: this.failedCount,
      isFlushing: this.isFlushing,
      indexedDbAvailable: indexedDbQueue.isAvailable()
    };
  }

  // Force clear all queues (emergency reset)
  async clearAll() {
    this.queue = [];
    this.retryQueue = [];
    await indexedDbQueue.clear();
  }
}
