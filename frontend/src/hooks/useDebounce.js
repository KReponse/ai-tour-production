// frontend/src/hooks/useDebounce.js
// ✅ Debounce hook for search inputs

import { useState, useEffect, useRef, useCallback } from 'react';
import { PAGINATION } from '../utils/constants';

export const useDebounce = (value, delay = PAGINATION.SEARCH_DEBOUNCE_MS) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // Cancel debounce manually
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Flush immediately
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setDebouncedValue(value);
    }
  }, [value]);

  return { debouncedValue, cancel, flush };
};

export default useDebounce;