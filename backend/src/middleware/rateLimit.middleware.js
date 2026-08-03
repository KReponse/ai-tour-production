// backend/src/middleware/rateLimit.middleware.js
// ✅ COMPLETE FIXED - Proper rate limiting with stable keys

import { RateLimiter } from '../utils/rateLimiter.utils.js';

// ─── Rate Limit Configurations ──────────────────────────────────

const AUTH_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests
  message: 'Too many auth requests. Please try again later.'
};

const LOGIN_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests
  message: 'Too many login attempts. Please try again later.'
};

const REFRESH_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests
  message: 'Too many refresh requests. Please try again later.'
};

// ─── Rate Limit Store (In-Memory) ──────────────────────────────

// ✅ Use a stable in-memory store instead of creating new RateLimiter per request
class RateLimitStore {
  constructor() {
    this.store = new Map();
  }

  getKey(key) {
    return this.store.get(key);
  }

  setKey(key, value) {
    this.store.set(key, value);
  }

  removeKey(key) {
    this.store.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.store) {
      if (data.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
}

const store = new RateLimitStore();

// ─── Rate Limit Middleware Factory ─────────────────────────────

const createRateLimiter = (config) => {
  return async (req, res, next) => {
    try {
      // ✅ Use a stable key: IP + route path
      // Using req.route.path or req.path to get the route
      const routePath = req.route?.path || req.path || 'unknown';
      const key = `${req.ip}:${routePath}`;
      
      // Get current data from store
      let data = store.getKey(key);
      const now = Date.now();

      // If no data or window expired, reset
      if (!data || data.resetTime < now) {
        data = {
          count: 0,
          resetTime: now + config.windowMs,
          limit: config.max,
        };
      }

      // Check if limit exceeded
      if (data.count >= config.max) {
        const retryAfter = Math.ceil((data.resetTime - now) / 1000);
        return res.status(429).json({
          success: false,
          message: config.message || 'Too many requests. Please try again later.',
          retryAfter: Math.max(1, retryAfter),
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      // Increment count
      data.count += 1;
      store.setKey(key, data);

      // ✅ Add rate limit headers
      res.setHeader('X-RateLimit-Limit', config.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - data.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000));

      next();
    } catch (error) {
      console.error('❌ Rate limit error:', error.message);
      // ✅ On error, allow the request to proceed
      next();
    }
  };
};

// ─── Export Middleware ──────────────────────────────────────────

export const RateLimitMiddleware = {
  auth: createRateLimiter(AUTH_LIMIT),
  login: createRateLimiter(LOGIN_LIMIT),
  refresh: createRateLimiter(REFRESH_LIMIT),
  create: createRateLimiter
};

export default RateLimitMiddleware;