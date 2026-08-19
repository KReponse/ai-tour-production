// frontend/src/hooks/useDataFetch.js
// ✅ DATA FETCHING HOOK with caching and auto-refetch

import { useState, useEffect, useCallback, useRef } from 'react';
import { queryClient } from '../services/queryClient';

/**
 * useDataFetch - Fetch data with caching and invalidation
 * 
 * @param {Array} queryKey - Unique key for this query (e.g., ['listings', id])
 * @param {Function} fetchFn - Async function that returns data
 * @param {Object} options - Configuration options
 * @param {Array} options.deps - Dependencies for refetch (default: [])
 * @param {boolean} options.enabled - Whether to fetch automatically (default: true)
 * @param {any} options.initialData - Initial data to use
 * @param {number} options.staleTime - Time in ms before data is considered stale (default: 0)
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onError - Callback on error
 * 
 * @returns {Object} { data, loading, error, refetch, isStale }
 */
export function useDataFetch(queryKey, fetchFn, options = {}) {
  const {
    deps = [],
    enabled = true,
    initialData = null,
    staleTime = 0,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(() => {
    // Check cache first
    const cached = queryClient.getQueryData(queryKey);
    return cached !== undefined ? cached : initialData;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const mountedRef = useRef(true);
  const fetchTimeoutRef = useRef(null);
  const initialLoadRef = useRef(true);

  // Track when data becomes stale
  useEffect(() => {
    if (staleTime > 0 && data !== null && data !== undefined) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setIsStale(true);
        }
      }, staleTime);
      return () => clearTimeout(timer);
    }
  }, [data, staleTime]);

  const refetch = useCallback(async (force = false) => {
    if (!mountedRef.current) return;

    // Check if there's already a pending query
    const pending = queryClient.getPendingQuery(queryKey);
    if (pending && !force) {
      try {
        const result = await pending;
        if (mountedRef.current) {
          setData(result);
          setError(null);
          setIsStale(false);
          if (onSuccess) onSuccess(result);
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err);
          if (onError) onError(err);
        }
        throw err;
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create the fetch promise
      const fetchPromise = fetchFn();
      
      // Store as pending to prevent duplicates
      queryClient.setPendingQuery(queryKey, fetchPromise);
      
      const result = await fetchPromise;
      
      if (!mountedRef.current) return;

      // Cache the result
      queryClient.setQueryData(queryKey, result);
      
      setData(result);
      setError(null);
      setIsStale(false);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      if (!mountedRef.current) return;
      
      setError(err);
      if (onError) {
        onError(err);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        queryClient.clearPendingQuery(queryKey);
      }
    }
  }, [queryKey, fetchFn, onSuccess, onError]);

  // Auto-refetch on cache invalidation
  useEffect(() => {
    const unsubscribe = queryClient.subscribe(queryKey, (newData) => {
      if (mountedRef.current) {
        // Update data from cache
        const cached = queryClient.getQueryData(queryKey);
        if (cached !== undefined) {
          setData(cached);
          setIsStale(false);
        }
        // Refetch if data is undefined or forced
        if (newData === undefined) {
          refetch(true);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryKey, refetch]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;

    // Check cache for existing data
    const cached = queryClient.getQueryData(queryKey);
    if (cached !== undefined && initialLoadRef.current) {
      setData(cached);
      initialLoadRef.current = false;
      
      // If staleTime is 0, refetch immediately
      if (staleTime === 0) {
        refetch(false);
      } else {
        setIsStale(false);
      }
      return;
    }

    // Fetch if no cache or initial load
    if (initialLoadRef.current || cached === undefined) {
      initialLoadRef.current = false;
      
      // Debounce refetch for rapid dependency changes
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchTimeoutRef.current = setTimeout(() => {
        refetch(false);
      }, 10);
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [enabled, queryKey, refetch, staleTime, ...deps]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  return { 
    data, 
    loading, 
    error, 
    refetch: useCallback(() => refetch(true), [refetch]),
    isStale,
    // Helper to manually update data (optimistic updates)
    setData: useCallback((newData) => {
      queryClient.setQueryData(queryKey, newData);
      setData(newData);
      setIsStale(false);
    }, [queryKey])
  };
}

export default useDataFetch;