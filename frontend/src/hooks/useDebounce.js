// frontend/src/hooks/useMutation.js
// ✅ MUTATION HOOK with automatic cache invalidation

import { useState, useCallback, useRef } from 'react';
import { queryClient } from '../services/queryClient';

/**
 * useMutation - Perform mutations with automatic cache updates
 * 
 * @param {Function} mutationFn - Async function that performs the mutation
 * @param {Object} options - Configuration options
 * @param {Array} options.invalidateQueries - Query keys to invalidate on success
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onError - Callback on error
 * @param {Function} options.onSettled - Callback when mutation settles
 * @param {Object} options.optimisticUpdate - Optimistic update configuration
 * @param {Array} options.optimisticUpdate.queryKey - Query key to update optimistically
 * @param {Function} options.optimisticUpdate.updateFn - Function to update data
 * 
 * @returns {Object} { mutate, loading, error, data, reset }
 */
export function useMutation(mutationFn, options = {}) {
  const {
    invalidateQueries = [],
    onSuccess,
    onError,
    onSettled,
    optimisticUpdate = null,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  const reset = useCallback(() => {
    if (mountedRef.current) {
      setError(null);
      setData(null);
      setLoading(false);
    }
  }, []);

  const mutate = useCallback(async (...args) => {
    // Cancel any ongoing mutation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    // Clear previous error
    if (mountedRef.current) {
      setError(null);
      setLoading(true);
    }

    // Optimistic update
    let previousData = null;
    if (optimisticUpdate) {
      const { queryKey, updateFn } = optimisticUpdate;
      const key = JSON.stringify(queryKey);
      
      // Store previous data for rollback
      previousData = queryClient.getQueryData(queryKey);
      
      // Apply optimistic update
      const currentData = queryClient.getQueryData(queryKey);
      const optimisticData = updateFn(currentData, ...args);
      queryClient.setQueryData(queryKey, optimisticData);
    }

    try {
      const result = await mutationFn(...args);
      
      if (!mountedRef.current) return;

      setData(result);
      setError(null);
      
      // Invalidate related queries
      if (invalidateQueries.length > 0) {
        // Use setTimeout to avoid blocking the UI
        setTimeout(() => {
          invalidateQueries.forEach(queryKey => {
            queryClient.invalidateQueries(queryKey);
          });
        }, 0);
      }

      if (onSuccess) {
        await onSuccess(result, ...args);
      }

      return result;
    } catch (err) {
      if (!mountedRef.current) return;

      // Rollback optimistic update
      if (optimisticUpdate && previousData !== null) {
        const { queryKey } = optimisticUpdate;
        queryClient.setQueryData(queryKey, previousData);
      }

      setError(err);
      
      if (onError) {
        await onError(err, ...args);
      }
      
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        abortControllerRef.current = null;
      }
      
      if (onSettled) {
        await onSettled(...args);
      }
    }
  }, [mutationFn, invalidateQueries, onSuccess, onError, onSettled, optimisticUpdate]);

  // Cleanup
  useState(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { 
    mutate, 
    loading, 
    error, 
    data, 
    reset,
    isIdle: !loading && !error && data === null,
    isError: !!error,
    isSuccess: !!data && !error,
  };
}

export default useMutation;