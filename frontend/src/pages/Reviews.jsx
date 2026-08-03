// frontend/src/pages/Reviews.jsx
// ✅ COMPLETE FIXED - Strategy C (Load More) with useLoadMore hook
// ✅ Added: useLoadMore hook for Load More pagination
// ✅ Added: LoadingSkeleton for initial load
// ✅ Added: BackToTop button
// ✅ Added: handleHelpfulToggle for Helpful button
// ✅ FIXED: Infinite loop by stabilizing dependencies with useRef

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Star,
  ThumbsUp,
  Loader2,
  MessageCircle,
  Sparkles,
  Calendar,
  MapPin,
  Search,
  ChevronDown,
  Reply,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  User,
} from 'lucide-react';
import axios from 'axios';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ReviewCard from '../components/ReviewCard';
import { toggleHelpful } from '../services/reviewService';
import useLoadMore from '../hooks/useLoadMore';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import BackToTop from '../components/ui/BackToTop';
import { PAGINATION } from '../utils/constants';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ===============================
// MAIN COMPONENT
// ===============================
const Reviews = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    sort: 'latest',
    rating: 'all',
    search: ''
  });
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });

  // ✅ Use refs to prevent infinite loops with reset
  const resetTimeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Sort options
  const sortOptions = [
    { value: 'latest', label: 'Latest' },
    { value: 'highest', label: 'Highest Rating' },
    { value: 'lowest', label: 'Lowest Rating' },
    { value: 'mostHelpful', label: 'Most Helpful' },
    { value: 'oldest', label: 'Oldest' }
  ];

  const ratingOptions = [
    { value: 'all', label: 'All Ratings' },
    { value: '5', label: '⭐ 5 Stars' },
    { value: '4', label: '⭐ 4 Stars' },
    { value: '3', label: '⭐ 3 Stars' },
    { value: '2', label: '⭐ 2 Stars' },
    { value: '1', label: '⭐ 1 Star' }
  ];

  // ✅ Fetch function for useLoadMore - STABLE using useCallback with filters
  const fetchReviews = useCallback(async (params) => {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || PAGINATION.DEFAULT_LIMIT,
      sort: filters.sort,
    });

    if (filters.rating !== 'all') {
      queryParams.append('rating', filters.rating);
    }

    if (filters.search && filters.search.trim()) {
      queryParams.append('search', filters.search.trim());
    }

    const response = await axios.get(`${API_URL}/public/reviews?${queryParams}`);
    
    if (response.data.success) {
      return response.data;
    }
    
    throw new Error('Failed to fetch reviews');
  }, [filters]);

  // ✅ useLoadMore hook for Load More pagination
  const {
    items: reviews,
    loading,
    loadingMore,
    error,
    hasMore,
    total,
    totalPages,
    currentPage,
    loadMore,
    reset,
    refresh,
  } = useLoadMore({
    fetchFn: fetchReviews,
    initialParams: { page: 1, limit: PAGINATION.DEFAULT_LIMIT },
    dataKey: 'reviews',
    initialLimit: PAGINATION.DEFAULT_LIMIT,
    loadMoreLimit: PAGINATION.DEFAULT_LIMIT,
    autoFetch: true,
  });

  // ✅ Calculate stats from reviews
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (reviews.length === 0) {
      setStats({
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
      return;
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = sum / reviews.length;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
    });

    setStats({
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
      distribution
    });
  }, [reviews]);

  // ✅ FIXED: Reset when filters change - with debounce to prevent rapid calls
  useEffect(() => {
    // Clear any pending timeout
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    // Debounce the reset to prevent multiple rapid calls
    resetTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        reset();
      }
    }, 150);

    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [filters.sort, filters.rating, reset]);

  // ✅ FIXED: Handle search with debounce - stabilized
  useEffect(() => {
    // Clear any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search to prevent rapid API calls
    searchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && filters.search !== undefined) {
        reset();
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.search, reset]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ✅ handleHelpfulToggle - STABLE with useCallback
  const handleHelpfulToggle = useCallback(async (reviewId) => {
    try {
      console.log('📤 [Reviews] Toggling helpful for review:', reviewId);
      
      const result = await toggleHelpful(reviewId);
      
      if (result && result.success) {
        // Refresh the reviews list to update the count
        await refresh();
        return result;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [Reviews] Error toggling helpful:', error);
      toast.error('Failed to toggle helpful');
      return false;
    }
  }, [refresh]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    reset();
  };

  // Render stars
  const renderStars = (rating, size = 'w-4 h-4') => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating
                ? 'text-[#F59E0B] fill-[#F59E0B]'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  // ===============================
  // LOADING STATE
  // ===============================
  if (loading && reviews.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse" />
        </div>
        <LoadingSkeleton count={3} type="card" />
      </div>
    );
  }

  // ===============================
  // ERROR STATE
  // ===============================
  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-[#374151] dark:text-white mb-2">
          Unable to Load Reviews
        </h3>
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={refresh}
          className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white hover:bg-[#0D9488]/90 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#374151] dark:text-white">
            Community Reviews
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          {total > 0 ? `${total} real experiences from travelers around the world` : 'Real experiences from travelers around the world'}
        </p>
      </div>

      {/* Stats Overview */}
      {stats && stats.totalReviews > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-500 dark:text-gray-400">Overall Rating</p>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-1">
                <span className="text-5xl font-bold text-[#374151] dark:text-white">
                  {stats.averageRating.toFixed(1)}
                </span>
                <div>
                  {renderStars(Math.round(stats.averageRating), 'w-6 h-6')}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.totalReviews} reviews
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution[star] || 0;
                  const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-12">
                        {star} ★
                      </span>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by tour, traveler, or keyword..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </form>

        <div className="relative">
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="h-12 px-4 pr-10 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none appearance-none"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filters.rating}
            onChange={(e) => handleFilterChange('rating', e.target.value)}
            className="h-12 px-4 pr-10 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none appearance-none"
          >
            {ratingOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-16 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            {filters.search ? 'No Reviews Found' : 'No Reviews Yet'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {filters.search
              ? 'Try adjusting your search or filters'
              : 'Reviews will appear here once travelers share their experiences'}
          </p>
          {filters.search && (
            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, search: '' }));
                reset();
              }}
              className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              showTourInfo={true}
              showUserInfo={true}
              showProviderResponse={true}
              onHelpfulToggle={handleHelpfulToggle}
            />
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </>
                ) : (
                  `Load More Reviews (${reviews.length} of ${total})`
                )}
              </Button>
            </div>
          )}

          {/* End of results */}
          {!hasMore && reviews.length > 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              You've seen all {total} reviews 🎉
            </div>
          )}
        </div>
      )}

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
};

export default Reviews;