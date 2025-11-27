// services/logs/autoLoggingEngine.js

const mongoose = require("mongoose");
const axios = require("axios");

const { logEvent } = require("./loggerService");
const { lookupGeo } = require("./geoProvider");
const { parseUA } = require("./deviceParser");
const { getInfrastructureSnapshot } = require("./systemMonitor");

/**
 * AutoLoggingEngine
 * A fully independent logging system that:
 *  - Hooks into Mongoose to measure DB timing
 *  - Hooks into Axios to measure external API timing
 *  - Hooks into Express requests to capture device, geo, infra
 *  - Detects domain events automatically (register, login, listing views)
 *  - Sends logs using existing loggerService
 */

class AutoLoggingEngine {
  constructor(app) {
    this.app = app;
    // console.log('🤖 [AutoLoggingEngine] Initializing...');

    this.patchMongoose();
    this.patchAxios();
    this.attachRequestHooks();

    // console.log('✅ [AutoLoggingEngine] Initialized successfully');
  }

  // ----------------------------------------------
  // POINT 8: Automatic DB Query Timing
  // ----------------------------------------------
  patchMongoose() {
    const originalExec = mongoose.Query.prototype.exec;

    mongoose.Query.prototype.exec = async function (...args) {
      const start = Date.now();
      const result = await originalExec.apply(this, args);
      const duration = Date.now() - start;

      const req = this.options._req; // Express request (if attached)

      if (req) {
        req._perf = req._perf || {};
        req._perf.db_query_time_ms =
          (req._perf.db_query_time_ms || 0) + duration;
      }

      return result;
    };
  }

  // ----------------------------------------------
  // POINT 8: Automatic External API Timing
  // ----------------------------------------------
  patchAxios() {
    const orig = axios.request;

    axios.request = async (config) => {
      const start = Date.now();

      const res = await orig(config);
      const duration = Date.now() - start;

      if (config._req) {
        config._req._perf = config._perf || {};
        config._req._perf.external_api_time_ms =
          (config._req._perf.external_api_time_ms || 0) + duration;
      }

      return res;
    };
  }

  // ----------------------------------------------
  // Express request hooks (device + geo + infra)
  // ----------------------------------------------
  attachRequestHooks() {
    this.app.use(async (req, res, next) => {
      req._start = Date.now();
      req._perf = req._perf || {};

      // Attach req to mongoose operations
      mongoose.Query.prototype.setOptions.call(
        mongoose.Query.prototype,
        { _req: req }
      );

      res.on("finish", async () => {
        try {
          const duration = Date.now() - req._start;

          const domainEvent = this.detectDomainEvent(req);

          // console.log(`🔍 [AutoLoggingEngine] ${req.method} ${req.originalUrl} → ${domainEvent ? domainEvent.event_type : 'SKIPPED'}`);

          // Skip logging if detectDomainEvent returns null (e.g., /logs/ingest)
          if (!domainEvent) return;

          const ua = req.headers["user-agent"] || "";
          const device = parseUA(ua);

          // Enhance device with client-side headers if available
          if (req.headers['x-device-platform']) {
            device.platform = req.headers['x-device-platform'];
            device.device_memory = req.headers['x-device-memory'];
            device.hardware_concurrency = req.headers['x-device-hardware-concurrency'];
          }

          const ip =
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.ip ||
            null;

          const geo = lookupGeo(ip);

          // Extract network info from headers
          const network = {
            connection_type: req.headers['x-network-type'],
            effective_type: req.headers['x-network-effective-type'],
            downlink: req.headers['x-network-downlink'] ? parseFloat(req.headers['x-network-downlink']) : undefined,
            rtt: req.headers['x-network-rtt'] ? parseInt(req.headers['x-network-rtt']) : undefined,
            saveData: req.headers['x-network-save-data'] === 'true'
          };

          const infra = await getInfrastructureSnapshot();

          const eventBody = {
            event_type: domainEvent.event_type,
            category: domainEvent.category,
            action: domainEvent.action,
            description: domainEvent.description,

            route: req.originalUrl,
            method: req.method,

            device,
            geo,
            network, // Pass extracted network info
            infrastructure: infra,
            performance: req._perf,

            metadata: {
              status_code: res.statusCode,
              request_duration_ms: duration,
            },
          };

          const context = {
            actor: {
              userId: req.user?.id || null,
              role: req.user?.role || null,
            },
            request: {
              ip,
              originalUrl: req.originalUrl,
              userAgent: ua,
              method: req.method,
            },
          };

          // console.log(`📝 [AutoLoggingEngine] Logging event: ${eventBody.event_type}`);
          await logEvent(eventBody, context);
          // console.log(`✅ [AutoLoggingEngine] Event logged successfully`);
        } catch (err) {
          console.error("[AutoLoggingEngine] error:", err);
        }
      });

      next();
    });
  }

  // ----------------------------------------------
  // POINT 11: Comprehensive Domain Event Detection
  // ----------------------------------------------
  detectDomainEvent(req) {
    const url = req.originalUrl.toLowerCase();
    const method = req.method.toUpperCase();
    const body = req.body || {};
    const statusCode = req.res?.statusCode || 200;

    // ========== SECURITY EVENTS ==========
    if (url.includes('/login') || url.includes('/auth/login')) {
      return {
        event_type: statusCode < 400 ? 'LOGIN' : 'LOGIN_FAILED',
        category: 'security',
        action: statusCode < 400 ? 'login_success' : 'login_failed',
        description: statusCode < 400 ? 'User successfully logged in' : 'Login attempt failed',
      };
    }

    if (url.includes('/logout') || url.includes('/auth/logout')) {
      return {
        event_type: 'LOGOUT',
        category: 'security',
        action: 'logout',
        description: 'User logged out',
      };
    }

    if (url.includes('/register') || url.includes('/auth/register')) {
      return {
        event_type: 'USER_REGISTERED',
        category: 'security',
        action: 'register',
        description: 'New user registered',
      };
    }

    if (url.includes('/password') && (url.includes('/reset') || url.includes('/forgot'))) {
      return {
        event_type: 'PASSWORD_RESET_REQUEST',
        category: 'security',
        action: 'password_reset_request',
        description: 'User requested password reset',
      };
    }

    // ========== BUYER EVENTS ==========
    if (url.includes('/cart')) {
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        return {
          event_type: 'BUYER_CART_UPDATED',
          category: 'buyer',
          action: 'cart_updated',
          description: 'Shopping cart updated',
        };
      }
      if (method === 'GET') {
        return {
          event_type: 'BUYER_CART_VIEWED',
          category: 'buyer',
          action: 'cart_view',
          description: 'User viewed shopping cart',
        };
      }
    }

    if (url.includes('/checkout')) {
      if (url.includes('/complete') || url.includes('/success')) {
        return {
          event_type: 'BUYER_CHECKOUT_COMPLETED',
          category: 'buyer',
          action: 'checkout_completed',
          description: 'Checkout process completed',
        };
      }
      return {
        event_type: 'BUYER_CHECKOUT_STARTED',
        category: 'buyer',
        action: 'checkout_started',
        description: 'Checkout process started',
      };
    }

    if (url.includes('/product/') || url.includes('/listing/')) {
      if (method === 'GET') {
        return {
          event_type: 'BUYER_PAGE_VIEW',
          category: 'buyer',
          action: 'product_view',
          description: 'User viewed product/listing page',
        };
      }
    }

    // ========== ARTIST EVENTS ==========
    if (url.includes('/artist') || url.includes('/seller')) {
      if (url.includes('/listing')) {
        if (method === 'POST') {
          return {
            event_type: 'ARTIST_LISTING_CREATED',
            category: 'artist',
            action: 'create_listing',
            description: 'Artist created new listing',
          };
        }
        if (method === 'PUT' || method === 'PATCH') {
          return {
            event_type: 'ARTIST_LISTING_UPDATED',
            category: 'artist',
            action: 'update_listing',
            description: 'Artist updated listing',
          };
        }
        if (method === 'DELETE') {
          return {
            event_type: 'ARTIST_LISTING_DELETED',
            category: 'artist',
            action: 'delete_listing',
            description: 'Artist deleted listing',
          };
        }
      }

      if (url.includes('/profile')) {
        if (method === 'PUT' || method === 'PATCH') {
          return {
            event_type: 'ARTIST_PROFILE_UPDATED',
            category: 'artist',
            action: 'update_profile',
            description: 'Artist updated profile',
          };
        }
      }
    }

    // ========== ADMIN EVENTS ==========
    if (url.includes('/admin')) {
      if (url.includes('/approve') || (url.includes('/listing') && method === 'PATCH')) {
        return {
          event_type: 'ADMIN_LISTING_APPROVED',
          category: 'admin',
          action: 'approve_listing',
          description: 'Admin approved listing',
        };
      }

      if (url.includes('/ban') || (url.includes('/user') && url.includes('/suspend'))) {
        return {
          event_type: 'ADMIN_USER_BANNED',
          category: 'admin',
          action: 'ban_user',
          description: 'Admin banned/suspended user',
        };
      }

      if (url.includes('/delete') && method === 'DELETE') {
        return {
          event_type: 'ADMIN_CONTENT_DELETED',
          category: 'admin',
          action: 'delete_content',
          description: 'Admin deleted content',
        };
      }

      // Generic admin action
      return {
        event_type: 'ADMIN_ACTION',
        category: 'admin',
        action: `admin_${method.toLowerCase()}`,
        description: `Admin performed ${method} action`,
      };
    }

    // ========== BUSINESS EVENTS (Orders) ==========
    if (url.includes('/order')) {
      if (method === 'POST') {
        return {
          event_type: 'ORDER_PLACED',
          category: 'business',
          action: 'place_order',
          description: 'New order placed',
        };
      }

      if (url.includes('/cancel')) {
        return {
          event_type: 'ORDER_CANCELLED',
          category: 'business',
          action: 'cancel_order',
          description: 'Order cancelled',
        };
      }

      if (url.includes('/paid') || url.includes('/payment/success')) {
        return {
          event_type: 'ORDER_PAID',
          category: 'business',
          action: 'order_paid',
          description: 'Order payment confirmed',
        };
      }

      if (url.includes('/ship') || url.includes('/fulfill')) {
        return {
          event_type: 'ORDER_SHIPPED',
          category: 'business',
          action: 'ship_order',
          description: 'Order shipped',
        };
      }
    }

    // ========== FINANCIAL EVENTS (Payments) ==========
    if (url.includes('/payment')) {
      if (url.includes('/success') || statusCode === 200) {
        return {
          event_type: 'PAYMENT_SUCCESS',
          category: 'financial',
          action: 'payment_success',
          description: 'Payment processed successfully',
        };
      }

      if (url.includes('/failed') || url.includes('/error') || statusCode >= 400) {
        return {
          event_type: 'PAYMENT_FAILED',
          category: 'financial',
          action: 'payment_failed',
          description: 'Payment processing failed',
        };
      }
    }

    if (url.includes('/refund')) {
      return {
        event_type: 'REFUND_ISSUED',
        category: 'financial',
        action: 'issue_refund',
        description: 'Refund issued to customer',
      };
    }

    // ========== INTERACTION EVENTS ==========
    if (url.includes('/click') || url.includes('/track/click')) {
      return {
        event_type: 'INTERACTION_CLICK',
        category: 'interaction',
        action: 'click',
        description: 'User clicked element',
      };
    }

    if (url.includes('/view') || url.includes('/track/view')) {
      return {
        event_type: 'INTERACTION_VIEW',
        category: 'interaction',
        action: 'view',
        description: 'User viewed element',
      };
    }

    if (url.includes('/scroll') || url.includes('/track/scroll')) {
      return {
        event_type: 'INTERACTION_SCROLL',
        category: 'interaction',
        action: 'scroll',
        description: 'User scrolled page',
      };
    }

    // ========== SYSTEM EVENTS (Default) ==========
    // Log ingest endpoint should not self-log
    if (url.includes('/logs/ingest')) {
      return null; // Skip logging
    }

    // Default system event for all other requests
    return {
      event_type: 'SYSTEM_API_REQUEST',
      category: 'system',
      action: `api_${method.toLowerCase()}`,
      description: `${method} request to ${req.originalUrl}`,
    };
  }
}

module.exports = AutoLoggingEngine;
