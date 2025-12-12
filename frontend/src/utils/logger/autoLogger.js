// src/utils/logger/autoLogger.js
// Automatic event capture - no manual logging needed for common events

import LoggerClient from './loggerClient.js';
import config from './loggerConfig.js';

class AutoLogger {
    constructor() {
        this.client = new LoggerClient();
        this.initialized = false;
        this.lastUrl = window.location.href;
        this.pageLoadTime = Date.now();
        this.scrollDepth = 0;
        this.clickCount = 0;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // Auto-track page views
        this._trackPageViews();

        // Auto-track clicks
        this._trackClicks();

        // Auto-track form submissions
        this._trackForms();

        // Auto-track JS errors
        this._trackErrors();

        // Auto-track performance
        this._trackPerformance();

        // Auto-track scroll depth
        this._trackScrollDepth();

        // Auto-track visibility changes
        this._trackVisibility();

        // Auto-track copy events
        this._trackCopyPaste();

        // Initial page view
        this._logPageView();

        console.log('[AutoLogger] Initialized - automatic logging active');
    }

    setUser(user) {
        this.client.setUser(user);
    }

    // Manual log (for custom events)
    log(event) {
        return this.client.logEvent(event);
    }

    // ===== AUTO PAGE VIEWS =====
    _trackPageViews() {
        // Track SPA navigation
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            this._logPageView();
        };

        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            this._logPageView();
        };

        window.addEventListener('popstate', () => this._logPageView());
    }

    _logPageView() {
        const url = window.location.href;
        if (url === this.lastUrl) return;

        const prevUrl = this.lastUrl;
        this.lastUrl = url;

        this.client.logEvent({
            event_type: 'PAGE_VIEW',
            category: 'interaction',
            action: 'view',
            interaction: {
                page_url: url,
                page_path: window.location.pathname,
                page_title: document.title,
                referrer: prevUrl || document.referrer,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }
        });

        // Reset per-page metrics
        this.scrollDepth = 0;
        this.clickCount = 0;
        this.pageLoadTime = Date.now();
    }

    // ===== AUTO CLICK TRACKING =====
    _trackClicks() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a, button, [data-track], [role="button"]');
            if (!target) return;

            this.clickCount++;

            this.client.logEvent({
                event_type: 'CLICK',
                category: 'interaction',
                action: 'click',
                interaction: {
                    element_type: target.tagName.toLowerCase(),
                    element_id: target.id || null,
                    element_class: target.className || null,
                    element_text: (target.innerText || '').slice(0, 100),
                    href: target.href || null,
                    data_track: target.dataset?.track || null,
                    page_url: window.location.pathname,
                    click_index: this.clickCount,
                    position: { x: e.clientX, y: e.clientY }
                }
            });
        }, { passive: true });
    }

    // ===== AUTO FORM TRACKING =====
    _trackForms() {
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (!form || form.tagName !== 'FORM') return;

            // Get form fields (without values for privacy)
            const fields = Array.from(form.elements)
                .filter(el => el.name)
                .map(el => ({
                    name: el.name,
                    type: el.type,
                    required: el.required
                }));

            this.client.logEvent({
                event_type: 'FORM_SUBMIT',
                category: 'interaction',
                action: 'submit',
                interaction: {
                    form_id: form.id || null,
                    form_name: form.name || null,
                    form_action: form.action || null,
                    form_method: form.method || 'GET',
                    fields_count: fields.length,
                    field_names: fields.map(f => f.name),
                    page_url: window.location.pathname
                }
            });
        }, { passive: true });

        // Track form field focus (for funnel analysis)
        document.addEventListener('focusin', (e) => {
            if (!e.target.form) return;

            this.client.logEvent({
                event_type: 'FORM_FIELD_FOCUS',
                category: 'interaction',
                action: 'focus',
                interaction: {
                    field_name: e.target.name || null,
                    field_type: e.target.type || null,
                    form_id: e.target.form?.id || null,
                    page_url: window.location.pathname
                }
            });
        }, { passive: true });
    }

    // ===== AUTO ERROR TRACKING =====
    _trackErrors() {
        // JavaScript errors
        window.addEventListener('error', (e) => {
            this.client.logEvent({
                event_type: 'JS_ERROR',
                category: 'security',
                action: 'error',
                error: {
                    message: e.message,
                    filename: e.filename,
                    lineno: e.lineno,
                    colno: e.colno,
                    stack: e.error?.stack?.slice(0, 1000) || null,
                    type: 'javascript'
                }
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            this.client.logEvent({
                event_type: 'PROMISE_ERROR',
                category: 'security',
                action: 'error',
                error: {
                    message: String(e.reason),
                    stack: e.reason?.stack?.slice(0, 1000) || null,
                    type: 'promise'
                }
            });
        });

        // Network errors (fetch failures)
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = Date.now();
            try {
                const response = await originalFetch(...args);

                // Log API errors (4xx, 5xx)
                if (!response.ok) {
                    this.client.logEvent({
                        event_type: 'API_ERROR',
                        category: 'infra',
                        action: 'error',
                        request: {
                            url: typeof args[0] === 'string' ? args[0] : args[0].url,
                            method: args[1]?.method || 'GET',
                            status_code: response.status,
                            response_time_ms: Date.now() - startTime
                        }
                    });
                }

                return response;
            } catch (err) {
                this.client.logEvent({
                    event_type: 'NETWORK_ERROR',
                    category: 'infra',
                    action: 'error',
                    error: {
                        message: err.message,
                        type: 'network',
                        url: typeof args[0] === 'string' ? args[0] : args[0].url
                    }
                });
                throw err;
            }
        };
    }

    // ===== AUTO PERFORMANCE TRACKING =====
    _trackPerformance() {
        // Wait for page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perf = window.performance;
                if (!perf) return;

                const timing = perf.timing || {};
                const navigation = perf.getEntriesByType?.('navigation')?.[0] || {};

                // Core Web Vitals
                const metrics = {
                    // Page load time
                    page_load_ms: timing.loadEventEnd ? timing.loadEventEnd - timing.navigationStart : null,

                    // DOM ready
                    dom_ready_ms: timing.domContentLoadedEventEnd ?
                        timing.domContentLoadedEventEnd - timing.navigationStart : null,

                    // Time to first byte
                    ttfb_ms: timing.responseStart ?
                        timing.responseStart - timing.navigationStart : null,

                    // DNS lookup
                    dns_ms: timing.domainLookupEnd ?
                        timing.domainLookupEnd - timing.domainLookupStart : null,

                    // Connection time
                    connect_ms: timing.connectEnd ?
                        timing.connectEnd - timing.connectStart : null,

                    // Transfer size
                    transfer_size_kb: navigation.transferSize ?
                        Math.round(navigation.transferSize / 1024) : null,

                    // Resource count
                    resource_count: perf.getEntriesByType?.('resource')?.length || 0
                };

                this.client.logEvent({
                    event_type: 'PAGE_PERFORMANCE',
                    category: 'infra',
                    action: 'performance',
                    performance: metrics,
                    interaction: {
                        page_url: window.location.pathname
                    }
                });

            }, 1000); // Wait for metrics to stabilize
        });

        // Largest Contentful Paint
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];

                this.client.logEvent({
                    event_type: 'LCP',
                    category: 'infra',
                    action: 'performance',
                    performance: {
                        lcp_ms: Math.round(lastEntry.startTime),
                        element: lastEntry.element?.tagName || null
                    }
                });
            });
            observer.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) { }

        // First Input Delay
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const firstEntry = entries[0];

                this.client.logEvent({
                    event_type: 'FID',
                    category: 'infra',
                    action: 'performance',
                    performance: {
                        fid_ms: Math.round(firstEntry.processingStart - firstEntry.startTime)
                    }
                });
            });
            observer.observe({ type: 'first-input', buffered: true });
        } catch (e) { }
    }

    // ===== AUTO SCROLL DEPTH TRACKING =====
    _trackScrollDepth() {
        let ticking = false;
        let maxDepth = 0;

        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const scrollTop = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const depth = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

                // Log at 25%, 50%, 75%, 100% milestones
                const milestones = [25, 50, 75, 100];
                for (const milestone of milestones) {
                    if (depth >= milestone && maxDepth < milestone) {
                        this.client.logEvent({
                            event_type: 'SCROLL_DEPTH',
                            category: 'interaction',
                            action: 'scroll',
                            interaction: {
                                depth_percent: milestone,
                                page_url: window.location.pathname,
                                time_on_page_ms: Date.now() - this.pageLoadTime
                            }
                        });
                    }
                }

                maxDepth = Math.max(maxDepth, depth);
                ticking = false;
            });
        }, { passive: true });
    }

    // ===== AUTO VISIBILITY TRACKING =====
    _trackVisibility() {
        let hiddenAt = null;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                hiddenAt = Date.now();
            } else if (hiddenAt) {
                const hiddenDuration = Date.now() - hiddenAt;

                this.client.logEvent({
                    event_type: 'TAB_RETURN',
                    category: 'interaction',
                    action: 'visibility',
                    interaction: {
                        hidden_duration_ms: hiddenDuration,
                        page_url: window.location.pathname
                    }
                });

                hiddenAt = null;
            }
        });
    }

    // ===== AUTO COPY/PASTE TRACKING =====
    _trackCopyPaste() {
        document.addEventListener('copy', (e) => {
            const selection = window.getSelection()?.toString()?.slice(0, 100);

            this.client.logEvent({
                event_type: 'COPY',
                category: 'interaction',
                action: 'copy',
                interaction: {
                    text_length: selection?.length || 0,
                    page_url: window.location.pathname
                }
            });
        }, { passive: true });
    }

    // Get stats
    getStats() {
        return {
            ...this.client.getStats(),
            scrollDepth: this.scrollDepth,
            clickCount: this.clickCount,
            timeOnPage: Date.now() - this.pageLoadTime
        };
    }
}

// Singleton instance
const autoLogger = new AutoLogger();

export default autoLogger;
export { AutoLogger };
