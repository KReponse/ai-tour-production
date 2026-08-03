// backend/src/ai/utils/aiCache.js
// ✅ ENHANCED - Smart caching for AI responses

class AICache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate cache key from request
   */
  getKey(params) {
    const { message, intent, language, userContext } = params;
    const context = userContext?.interests?.join(',') || '';
    return `${language}:${intent}:${context}:${message.trim().toLowerCase()}`;
  }

  /**
   * Get cached response
   */
  get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.defaultTTL) {
      console.log(`📦 Cache hit: ${key.substring(0, 30)}...`);
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached response
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`📦 Cache set: ${key.substring(0, 30)}...`);
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.defaultTTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(prefix = null) {
    if (prefix) {
      const keys = Array.from(this.cache.keys()).filter(k => k.startsWith(prefix));
      keys.forEach(k => this.cache.delete(k));
      return keys.length;
    }
    const count = this.cache.size;
    this.cache.clear();
    return count;
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      defaultTTL: this.defaultTTL,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default new AICache();