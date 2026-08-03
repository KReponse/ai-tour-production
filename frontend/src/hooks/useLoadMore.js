// frontend/src/hooks/useLoadMore.js
// ✅ FIXED - Load More hook (Strategy C)
// ✅ Fixed infinite loop by using refs and proper dependency management

import { useState, useEffect, useCallback, useRef } from 'react';
import { PAGINATION } from '../utils/constants';
import { getDataFromResponse, getPaginationMeta } from '../utils/pagination';

export const useLoadMore = ({
  fetchFn,              // Async function that fetches data
  initialParams = {},    // Initial query params
  dataKey = 'data',      // Key for data in response
  initialLimit = PAGINATION.DEFAULT_LIMIT,
  loadMoreLimit = PAGINATION.DEFAULT_LIMIT,
  autoFetch = true,      // Fetch on mount
}) => {
  // State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  
  // ✅ Use refs to prevent infinite loops
  const isMountedRef = useRef(true);
  const initialParamsRef = useRef(initialParams);
  const fetchFnRef = useRef(fetchFn);
  const dataKeyRef = useRef(dataKey);
  const isFetchingRef = useRef(false);

  // ✅ Update refs when values change
  useEffect(() => {
    initialParamsRef.current = initialParams;
  }, [initialParams]);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    dataKeyRef.current = dataKey;
  }, [dataKey]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ Fetch initial data - uses refs to avoid dependency changes
  const fetchInitial = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      
      const params = { 
        ...initialParamsRef.current, 
        page: 1, 
        limit: limit 
      };
      
      const response = await fetchFnRef.current(params);
      
      if (!isMountedRef.current) return;
      
      const newItems = getDataFromResponse(response, dataKeyRef.current);
      const meta = getPaginationMeta(response);
      
      setItems(newItems);
      setTotal(meta.total || 0);
      setTotalPages(meta.totalPages || 0);
      setHasMore(meta.hasNext || false);
      
      return { items: newItems, meta };
    } catch (err) {
      console.error('❌ useLoadMore fetch initial error:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to fetch data');
      }
      return { items: [], meta: {} };
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [limit]); // ✅ Only depends on limit

  // ✅ Load more items - uses refs to avoid dependency changes
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isFetchingRef.current) return;
    
    const nextPage = currentPage + 1;
    if (nextPage > totalPages) {
      setHasMore(false);
      return;
    }
    
    isFetchingRef.current = true;
    
    try {
      setLoadingMore(true);
      
      const params = { 
        ...initialParamsRef.current, 
        page: nextPage, 
        limit: loadMoreLimit 
      };
      
      const response = await fetchFnRef.current(params);
      
      if (!isMountedRef.current) return;
      
      const newItems = getDataFromResponse(response, dataKeyRef.current);
      const meta = getPaginationMeta(response);
      
      setItems(prev => [...prev, ...newItems]);
      setCurrentPage(nextPage);
      setHasMore(meta.hasNext || false);
      
      return { items: newItems, meta };
    } catch (err) {
      console.error('❌ useLoadMore load more error:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load more');
      }
      return { items: [], meta: {} };
    } finally {
      if (isMountedRef.current) {
        setLoadingMore(false);
      }
      isFetchingRef.current = false;
    }
  }, [currentPage, hasMore, totalPages, loadingMore, loadMoreLimit]);

  // ✅ Reset and refetch
  const reset = useCallback(async () => {
    setItems([]);
    setHasMore(true);
    setCurrentPage(1);
    setTotal(0);
    setTotalPages(0);
    // ✅ Reset fetch flag and fetch
    isFetchingRef.current = false;
    await fetchInitial();
  }, [fetchInitial]);

  // ✅ Refresh current data
  const refresh = useCallback(async () => {
    // ✅ Reset fetch flag and fetch fresh
    isFetchingRef.current = false;
    await fetchInitial();
  }, [fetchInitial]);

  // ✅ Change limit
  const changeLimit = useCallback(async (newLimit) => {
    setLimit(newLimit);
    // ✅ Reset fetch flag and fetch
    isFetchingRef.current = false;
    await fetchInitial();
  }, [fetchInitial]);

  // ✅ Auto-fetch on mount - ONLY runs once
  useEffect(() => {
    if (autoFetch && !isFetchingRef.current) {
      fetchInitial();
    }
    // ✅ Empty dependency array - only runs on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Reset when initialParams changes (from parent)
  // This allows the parent to trigger a refetch when filters change
  const prevParamsRef = useRef(initialParams);
  useEffect(() => {
    // Check if params actually changed
    const paramsChanged = JSON.stringify(prevParamsRef.current) !== JSON.stringify(initialParams);
    if (paramsChanged) {
      prevParamsRef.current = initialParams;
      // ✅ Reset fetch flag and fetch
      isFetchingRef.current = false;
      fetchInitial();
    }
    // ✅ Only depend on initialParams
  }, [initialParams, fetchInitial]);

  return {
    // Data
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    total,
    totalPages,
    currentPage,
    limit,
    
    // Actions
    loadMore,
    reset,
    refresh,
    changeLimit,
    
    // Helpers
    hasItems: items.length > 0,
    isEmpty: items.length === 0 && !loading,
  };
};

export default useLoadMore;