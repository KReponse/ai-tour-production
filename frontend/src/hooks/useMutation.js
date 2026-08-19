// src/hooks/useMutation.js (NEW)
import { useState, useCallback } from 'react';
import { queryClient } from '../services/queryClient';

export function useMutation(mutationFn, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutationFn(...args);
      setData(result);
      
      // Invalidate related queries if specified
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries(queryKey);
        });
      }
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      if (options.onError) {
        options.onError(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, options]);

  return { mutate, loading, error, data };
}