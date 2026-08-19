// frontend/src/services/queryClient.js
// ✅ FRONTEND CACHE MANAGEMENT - Lightweight replacement for React Query

class QueryClient {
  constructor() {
    this.cache = new Map();
    this.subscribers = new Map();
    this.queryCache = new Map(); // Stores actual data
    this.pendingQueries = new Map(); // Prevents duplicate in-flight requests
  }

  /**
   * Get cached data or undefined if not found
   */
  getQueryData(queryKey) {
    const key = JSON.stringify(queryKey);
    return this.queryCache.get(key);
  }

  /**
   * Set query data in cache
   */
  setQueryData(queryKey, data) {
    const key = JSON.stringify(queryKey);
    this.queryCache.set(key, data);
    this.notifySubscribers(queryKey);
  }

  /**
   * Subscribe to query changes
   * Returns unsubscribe function
   */
  subscribe(queryKey, callback) {
    const key = JSON.stringify(queryKey);
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Notify all subscribers of a query key
   */
  notifySubscribers(queryKey) {
    const key = JSON.stringify(queryKey);
    const subs = this.subscribers.get(key);
    if (subs) {
      const data = this.queryCache.get(key);
      subs.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in query subscriber:', error);
        }
      });
    }
  }

  /**
   * Invalidate queries matching a key pattern
   * Triggers refetch for all matching subscribers
   */
  invalidateQueries(queryKey) {
    // If queryKey is an array (e.g., ['listings', id]), invalidate all matching
    const keyToInvalidate = JSON.stringify(queryKey);
    
    // If we have exact match subscribers, notify them
    if (this.subscribers.has(keyToInvalidate)) {
      this.notifySubscribers(queryKey);
    }
    
    // Also invalidate any queries that start with this key
    // e.g., invalidating ['listings'] should also invalidate ['listings', '123']
    for (const [key, subs] of this.subscribers) {
      if (key.startsWith(keyToInvalidate.slice(0, -1))) { // Remove trailing "
        try {
          const parsedKey = JSON.parse(key);
          this.notifySubscribers(parsedKey);
        } catch (e) {
          // Skip invalid keys
        }
      }
    }
  }

  /**
   * Get or start a pending query to prevent duplicates
   */
  getPendingQuery(queryKey) {
    const key = JSON.stringify(queryKey);
    return this.pendingQueries.get(key);
  }

  /**
   * Set a pending query
   */
  setPendingQuery(queryKey, promise) {
    const key = JSON.stringify(queryKey);
    this.pendingQueries.set(key, promise);
    return promise;
  }

  /**
   * Clear a pending query
   */
  clearPendingQuery(queryKey) {
    const key = JSON.stringify(queryKey);
    this.pendingQueries.delete(key);
  }

  /**
   * Reset all cache (e.g., on logout)
   */
  resetCache() {
    this.queryCache.clear();
    this.pendingQueries.clear();
    // Don't clear subscribers, they will refetch
    // But notify them to refetch
    for (const [key, subs] of this.subscribers) {
      if (subs.size > 0) {
        try {
          const parsedKey = JSON.parse(key);
          this.notifySubscribers(parsedKey);
        } catch (e) {
          // Skip invalid keys
        }
      }
    }
  }

  /**
   * Clear specific query from cache
   */
  removeQueries(queryKey) {
    const key = JSON.stringify(queryKey);
    this.queryCache.delete(key);
    this.pendingQueries.delete(key);
    this.notifySubscribers(queryKey);
  }
}

// Create singleton instance
export const queryClient = new QueryClient();

// Export for use in components
export default queryClient;