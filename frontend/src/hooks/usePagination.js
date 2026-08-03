// frontend/src/hooks/usePagination.js
// ✅ FIXED - Server-side pagination hook (Strategy B)
// ✅ Fixed infinite loop by memoizing fetchData properly

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PAGINATION } from '../utils/constants';
import { getPaginationMeta, getDataFromResponse } from '../utils/pagination';
import useDebounce from './useDebounce';

export const usePagination = ({
  fetchFn,          // Async function that fetches data
  initialParams = {}, // Initial query params
  dataKey = 'data',   // Key for data in response
  debounceDelay = PAGINATION.SEARCH_DEBOUNCE_MS,
  autoFetch = true,   // Fetch on mount
}) => {
  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({
    total: 0,
    page: PAGINATION.DEFAULT_PAGE,
    limit: PAGINATION.DEFAULT_LIMIT,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState(initialParams);
  const [searchTerm, setSearchTerm] = useState('');
  const [shouldRefetch, setShouldRefetch] = useState(false);
  
  // ✅ Track previous query params to prevent unnecessary fetches
  const prevQueryParamsRef = useRef(null);
  const isMountedRef = useRef(true);

  // Debounce search
  const { debouncedValue: debouncedSearch } = useDebounce(searchTerm, debounceDelay);

  // Build query params - MEMOIZED to prevent recreation
  const queryParams = useMemo(() => {
    const params = {
      page: meta.page,
      limit: meta.limit,
      ...filters,
    };
    
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    
    // Remove undefined, null, 'all', empty strings
    Object.keys(params).forEach(key => {
      if (
        params[key] === undefined || 
        params[key] === null || 
        params[key] === 'all' || 
        params[key] === ''
      ) {
        delete params[key];
      }
    });
    
    return params;
  }, [meta.page, meta.limit, filters, debouncedSearch]);

  // ✅ STABLE fetchData - uses ref to avoid dependency changes
  const fetchData = useCallback(async (params = null) => {
    const fetchParams = params || queryParams;
    
    // ✅ Prevent duplicate fetches with same params
    const paramsKey = JSON.stringify(fetchParams);
    if (prevQueryParamsRef.current === paramsKey && !params) {
      return { data, meta };
    }
    prevQueryParamsRef.current = paramsKey;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchFn(fetchParams);
      
      const newData = getDataFromResponse(response, dataKey);
      const newMeta = getPaginationMeta(response);
      
      if (isMountedRef.current) {
        setData(newData);
        setMeta(newMeta);
        setShouldRefetch(false);
      }
      
      return { data: newData, meta: newMeta };
    } catch (err) {
      console.error('❌ usePagination fetch error:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to fetch data');
        setShouldRefetch(false);
      }
      return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrev: false } };
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn, dataKey, queryParams, data, meta]);

  // ✅ Stable wrapper to prevent recreation
  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  // Change page
  const goToPage = useCallback((page) => {
    if (page < 1 || page > meta.totalPages) return;
    setMeta(prev => ({ ...prev, page }));
    setShouldRefetch(true);
  }, [meta.totalPages]);

  // Change limit (rows per page)
  const setLimit = useCallback((limit) => {
    setMeta(prev => ({ ...prev, limit, page: 1 }));
    setShouldRefetch(true);
  }, []);

  // Change sort
  const setSort = useCallback((sort) => {
    setMeta(prev => ({ ...prev, page: 1 }));
    setFilters(prev => ({ ...prev, sort }));
    setShouldRefetch(true);
  }, []);

  // Apply filter
  const applyFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setMeta(prev => ({ ...prev, page: 1 }));
    setShouldRefetch(true);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(initialParams);
    setSearchTerm('');
    setMeta(prev => ({ ...prev, page: 1 }));
    setShouldRefetch(true);
  }, [initialParams]);

  // Reset pagination
  const reset = useCallback(() => {
    setMeta({
      total: 0,
      page: PAGINATION.DEFAULT_PAGE,
      limit: PAGINATION.DEFAULT_LIMIT,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
    setFilters(initialParams);
    setSearchTerm('');
    setData([]);
    setError(null);
    setShouldRefetch(true);
  }, [initialParams]);

  // Refresh current page
  const refresh = useCallback(() => {
    setShouldRefetch(true);
  }, []);

  // ✅ FIXED: Auto-fetch with proper dependencies
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ FIXED: Only fetch when shouldRefetch changes or on mount
  useEffect(() => {
    if (autoFetch && shouldRefetch) {
      fetchDataRef.current();
    }
  }, [autoFetch, shouldRefetch]);

  // ✅ FIXED: Initial fetch
  useEffect(() => {
    if (autoFetch) {
      // Only fetch on mount if not already fetched
      const initialFetch = async () => {
        if (!data.length && !loading && !error) {
          await fetchDataRef.current();
        }
      };
      initialFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only runs once on mount

  return {
    // Data
    data,
    loading,
    error,
    meta,
    
    // Pagination controls
    goToPage,
    setLimit,
    setSort,
    
    // Filters
    filters,
    setFilters,
    applyFilter,
    clearFilters,
    
    // Search
    searchTerm,
    setSearchTerm,
    
    // Actions
    refresh,
    reset,
    fetchData,
    
    // Helpers
    hasData: data.length > 0,
    isEmpty: data.length === 0 && !loading,
  };
};

export default usePagination;