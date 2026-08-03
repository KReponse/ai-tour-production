// backend/src/utils/rateLimiter.utils.js
// ✅ NEW - Rate Limiter Utility

export class RateLimiter {
  constructor(key, maxRequests, windowMs) {
    this.key = key;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.store = new Map();
  }

  /**
   * Check if request is allowed
   * @returns {Promise<{allowed: boolean, remaining: number, resetTime: Date}>}
   */
  async check() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this key
    let requests = this.store.get(this.key) || [];

    // Remove expired requests
    requests = requests.filter(timestamp => timestamp > windowStart);

    // Check if limit is exceeded
    if (requests.length >= this.maxRequests) {
      const oldestRequest = requests[0] || now;
      const resetTime = new Date(oldestRequest + this.windowMs);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        limit: this.maxRequests
      };
    }

    // Add current request
    requests.push(now);
    this.store.set(this.key, requests);

    // Clean up old entries periodically
    if (this.store.size > 1000) {
      this._cleanup();
    }

    return {
      allowed: true,
      remaining: this.maxRequests - requests.length,
      resetTime: new Date(now + this.windowMs),
      limit: this.maxRequests
    };
  }

  /**
   * Get remaining requests
   */
  getRemaining() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.store.get(this.key) || [];
    const active = requests.filter(timestamp => timestamp > windowStart);
    return Math.max(0, this.maxRequests - active.length);
  }

  /**
   * Reset the rate limiter for this key
   */
  reset() {
    this.store.delete(this.key);
  }

  /**
   * Clean up expired entries
   */
  _cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [key, timestamps] of this.store) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, filtered);
      }
    }
  }

  /**
   * Get all active keys
   */
  getKeys() {
    return Array.from(this.store.keys());
  }
}

export default RateLimiter;