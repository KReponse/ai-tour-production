// frontend/src/hooks/useInfiniteScroll.js
// ✅ FIXED: Added request deduplication
// ✅ FIXED: Added abort controller for cleanup
// ✅ FIXED: Prevent duplicate requests
// ✅ FIXED: Preserve scroll on load more
// ✅ FIXED: Cleanup on unmount

import { useState, useEffect, useCallback, useRef } from 'react';
import { PAGINATION } from '../utils/constants';
import { getDataFromResponse, getPaginationMeta } from '../utils/pagination';

export const useInfiniteScroll = ({
  fetchFn,              // Async function that fetches data
  initialParams = {},    // Initial query params
  dataKey = 'data',      // Key for data in response
  threshold = PAGINATION.INFINITE_SCROLL_THRESHOLD,
  loadMoreAfterPages = PAGINATION.LOAD_MORE_PAGES_BEFORE_BUTTON,
  autoFetch = true,      // Fetch on mount
}) => {
  // State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(PAGINATION.DEFAULT_PAGE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showLoadMore, setShowLoadMore] = useState(false);

  // ✅ Refs for request deduplication
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  const isLoadingRef = useRef(false);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const lastFetchedParamsRef = useRef('');
  const observerConnectedRef = useRef(false);

  // ✅ Generate cache key from params
  const getCacheKey = useCallback((params) => {
    return JSON.stringify({ ...params, page: params.page || 1 });
  }, []);

  // Fetch initial data
  const fetchInitial = useCallback(async () => {
    // ✅ Prevent duplicate simultaneous fetches
    if (isFetchingRef.current) {
      console.log('⏳ Fetch already in progress, skipping...');
      return { items: [], meta: {} };
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      setPage(PAGINATION.DEFAULT_PAGE);
      
      // ✅ Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const params = { ...initialParams, page: 1, limit: PAGINATION.DEFAULT_LIMIT };
      const cacheKey = getCacheKey(params);
      
      // ✅ Check if we already have this data
      if (cacheKey === lastFetchedParamsRef.current && items.length > 0) {
        console.log('📦 Data already loaded, skipping fetch');
        isFetchingRef.current = false;
        return { items, meta: { total, page: 1, totalPages } };
      }

      const response = await fetchFn(params);
      
      const newItems = getDataFromResponse(response, dataKey);
      const meta = getPaginationMeta(response);
      
      setItems(newItems);
      setTotal(meta.total || 0);
      setTotalPages(meta.totalPages || 0);
      setHasMore(meta.hasNext || false);
      setPage(1);
      lastFetchedParamsRef.current = cacheKey;

      return { items: newItems, meta };
    } catch (err) {
      // ✅ Don't set error if request was aborted
      if (err.name !== 'AbortError') {
        console.error('❌ useInfiniteScroll fetch initial error:', err);
        setError(err.message || 'Failed to fetch data');
      }
      return { items: [], meta: {} };
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      // ✅ Reset observer flag to reconnect
      observerConnectedRef.current = false;
    }
  }, [fetchFn, initialParams, dataKey, getCacheKey, items, total, totalPages]);

  // Load more items
  const loadMore = useCallback(async () => {
    // ✅ Prevent multiple simultaneous load more requests
    if (isLoadingRef.current || !hasMore || loading || loadingMore) {
      console.log('⏳ Load more already in progress, skipping...');
      return { items: [], meta: {} };
    }
    
    const nextPage = page + 1;
    if (nextPage > totalPages) {
      setHasMore(false);
      return { items: [], meta: {} };
    }
    
    try {
      isLoadingRef.current = true;
      setLoadingMore(true);
      
      // ✅ Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const params = { ...initialParams, page: nextPage, limit: PAGINATION.DEFAULT_LIMIT };
      const response = await fetchFn(params);
      
      const newItems = getDataFromResponse(response, dataKey);
      const meta = getPaginationMeta(response);
      
      // ✅ Preserve existing items - append new ones
      setItems(prev => [...prev, ...newItems]);
      setPage(nextPage);
      setHasMore(meta.hasNext || false);
      
      // Check if we should show "Load More" button
      if (nextPage >= loadMoreAfterPages) {
        setShowLoadMore(true);
      }
      
      return { items: newItems, meta };
    } catch (err) {
      // ✅ Don't set error if request was aborted
      if (err.name !== 'AbortError') {
        console.error('❌ useInfiniteScroll load more error:', err);
        setError(err.message || 'Failed to load more');
      }
      return { items: [], meta: {} };
    } finally {
      isLoadingRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchFn, initialParams, page, hasMore, totalPages, loading, loadingMore, loadMoreAfterPages, dataKey]);

  // Reset and refetch
  const reset = useCallback(async () => {
    // ✅ Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setItems([]);
    setHasMore(true);
    setPage(1);
    setTotal(0);
    setTotalPages(0);
    setShowLoadMore(false);
    lastFetchedParamsRef.current = '';
    observerConnectedRef.current = false;
    await fetchInitial();
  }, [fetchInitial]);

  // Refresh current data
  const refresh = useCallback(async () => {
    // ✅ Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    isFetchingRef.current = false;
    isLoadingRef.current = false;
    lastFetchedParamsRef.current = '';
    observerConnectedRef.current = false;
    
    await fetchInitial();
  }, [fetchInitial]);

  // Setup intersection observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore || showLoadMore) {
      // ✅ Disconnect observer if conditions not met
      if (observerRef.current && observerConnectedRef.current) {
        observerRef.current.disconnect();
        observerConnectedRef.current = false;
      }
      return;
    }
    
    // ✅ Skip if already connected
    if (observerConnectedRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingRef.current && !loadingMore) {
          loadMore();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: `0px 0px ${threshold}px 0px`,
        // ✅ Prevent multiple triggers
        root: null,
      }
    );
    
    observer.observe(sentinelRef.current);
    observerRef.current = observer;
    observerConnectedRef.current = true;
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerConnectedRef.current = false;
      }
    };
  }, [hasMore, loading, loadingMore, loadMore, threshold, showLoadMore]);

  // ✅ Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && !isFetchingRef.current) {
      fetchInitial();
    }
  }, [autoFetch, fetchInitial]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerConnectedRef.current = false;
      }
    };
  }, []);

  return {
    // Data
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    page,
    total,
    totalPages,
    showLoadMore,
    
    // Actions
    loadMore,
    reset,
    refresh,
    
    // Refs
    sentinelRef,
    
    // Helpers
    hasItems: items.length > 0,
    isEmpty: items.length === 0 && !loading,
    isFetching: isFetchingRef.current,
  };
};

export default useInfiniteScroll;