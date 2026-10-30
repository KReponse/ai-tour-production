// frontend/src/pages/provider/Reviews.jsx
// ============================================================
// AI TOUR — PROVIDER REVIEWS (FINAL)
// ============================================================
// ✅ Auto-refreshes when a new review is submitted elsewhere
//    (traveler Review.jsx) or an admin moderates a review.
// ✅ After replying, broadcasts 'reviews:provider' + 'reviews'
//    so provider/Dashboard and any other consumer refreshes.
// ✅ Preserves ALL UI: stats, rating distribution, listing
//    breakdown, search, filter, empty states, ReviewCards.
// ✅ Removed console logs from fetch/reply/helpful flows.
// ============================================================

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  MessageCircle,
  Sparkles,
  Search,
  ClipboardList,
  AlertCircle,
  Award,
} from 'lucide-react';

import ReviewCard from '../../components/ReviewCard';
import reviewService from '../../services/reviewService';
import { useAuth } from '../../contexts/AuthContext';
import useRefreshOn from '../../hooks/useRefreshOn';
import { refreshMany } from '../../utils/dataRefresh';
import toast from 'react-hot-toast';

// ============================================================
// AI TOUR COLORS
// ============================================================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ============================================================

const EMPTY_STATS = {
  average: 0,
  total: 0,
  byListing: {},
  ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  pendingCount: 0,
  publishedCount: 0,
  hiddenCount: 0,
  listingCount: 0,
};

const ProviderReviews = () => {
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);

  const calculateStats = useCallback((reviewsList) => {
    if (!Array.isArray(reviewsList) || reviewsList.length === 0) {
      setStats(EMPTY_STATS);
      return;
    }

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const byListing = {};
    let ratingSum = 0;

    reviewsList.forEach((review) => {
      const rating = Number(review?.rating || 0);
      ratingSum += rating;
      const roundedRating = Math.round(rating);
      if (ratingCounts[roundedRating] !== undefined) {
        ratingCounts[roundedRating] += 1;
      }

      const listingId =
        review?.listing?._id ||
        review?.listing?.id ||
        review?.listing ||
        review?.tour?._id ||
        review?.tour?.id ||
        review?.tour;

      const listingTitle =
        review?.listing?.title ||
        review?.tour?.title ||
        'Unknown Listing';

      if (listingId) {
        const key = String(listingId);
        if (!byListing[key]) {
          byListing[key] = { title: listingTitle, count: 0, sum: 0 };
        }
        byListing[key].count += 1;
        byListing[key].sum += rating;
      }
    });

    const publishedCount = reviewsList.filter(
      (r) => r?.status === 'published'
    ).length;
    const hiddenCount = reviewsList.filter(
      (r) =>
        r?.status === 'hidden' ||
        r?.isDeleted === true ||
        r?.status === 'deleted'
    ).length;
    const pendingCount = reviewsList.filter(
      (r) => r?.status === 'pending'
    ).length;

    const average = ratingSum / reviewsList.length;

    setStats({
      average: Number(average.toFixed(1)),
      total: reviewsList.length,
      byListing,
      ratingCounts,
      pendingCount,
      publishedCount,
      hiddenCount,
      listingCount: Object.keys(byListing).length,
    });
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const reviewsResult =
        await reviewService.getProviderReviews();

      let reviewsList = [];
      if (reviewsResult && Array.isArray(reviewsResult.reviews)) {
        reviewsList = reviewsResult.reviews;
      } else if (
        reviewsResult &&
        Array.isArray(reviewsResult.data)
      ) {
        reviewsList = reviewsResult.data;
      } else if (Array.isArray(reviewsResult)) {
        reviewsList = reviewsResult;
      }

      setReviews(reviewsList);

      if (
        reviewsResult?.stats &&
        typeof reviewsResult.stats === 'object'
      ) {
        const apiStats = reviewsResult.stats;

        const apiByListing =
          apiStats.byListing &&
          typeof apiStats.byListing === 'object'
            ? apiStats.byListing
            : {};

        const ratingCounts =
          apiStats.ratingCounts &&
          typeof apiStats.ratingCounts === 'object'
            ? {
                1: Number(apiStats.ratingCounts[1] || 0),
                2: Number(apiStats.ratingCounts[2] || 0),
                3: Number(apiStats.ratingCounts[3] || 0),
                4: Number(apiStats.ratingCounts[4] || 0),
                5: Number(apiStats.ratingCounts[5] || 0),
              }
            : EMPTY_STATS.ratingCounts;

        setStats({
          average: Number(
            apiStats.averageRating ?? apiStats.average ?? 0
          ),
          total: Number(
            apiStats.totalReviews ??
              apiStats.total ??
              reviewsList.length
          ),
          byListing: apiByListing,
          ratingCounts,
          pendingCount: Number(apiStats.pendingCount || 0),
          publishedCount: Number(apiStats.publishedCount || 0),
          hiddenCount: Number(apiStats.hiddenCount || 0),
          listingCount: Number(
            apiStats.listingCount ||
              Object.keys(apiByListing).length
          ),
        });
      } else {
        calculateStats(reviewsList);
      }
    } catch (err) {
      const message =
        reviewService.getErrorMessage?.(err) ||
        err?.response?.data?.message ||
        'Failed to load reviews. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ✅ Auto-refresh when reviews are invalidated elsewhere
  useRefreshOn(
    ['reviews', 'reviews:provider'],
    fetchReviews
  );

  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((review) => {
        const comment = review?.comment?.toLowerCase() || '';
        const title = review?.title?.toLowerCase() || '';
        const listingTitle =
          review?.listing?.title?.toLowerCase() ||
          review?.tour?.title?.toLowerCase() ||
          '';
        const travelerName =
          review?.traveler?.name?.toLowerCase() ||
          review?.traveler?.fullName?.toLowerCase() ||
          review?.user?.name?.toLowerCase() ||
          review?.user?.fullName?.toLowerCase() ||
          '';
        return (
          comment.includes(term) ||
          title.includes(term) ||
          listingTitle.includes(term) ||
          travelerName.includes(term)
        );
      });
    }

    if (ratingFilter !== 'all') {
      const selectedRating = Number(ratingFilter);
      result = result.filter(
        (review) =>
          Math.round(Number(review?.rating || 0)) ===
          selectedRating
      );
    }

    return result;
  }, [reviews, searchTerm, ratingFilter]);

  const handleReply = useCallback(
    async (reviewId, replyText) => {
      if (!reviewId) {
        toast.error('Review ID is missing.');
        return false;
      }
      if (!replyText || !replyText.trim()) {
        toast.error('Please enter a reply.');
        return false;
      }

      try {
        const result = await reviewService.respondToReview(
          reviewId,
          replyText.trim()
        );

        if (result?.success !== false) {
          toast.success('Reply added successfully!');

          await fetchReviews();

          // ✅ Broadcast — dashboard, other consumers refetch
          refreshMany('reviews', 'reviews:provider');

          return true;
        }

        toast.error(result?.message || 'Failed to add reply.');
        return false;
      } catch (err) {
        const status = err?.response?.status;
        if (status === 403) {
          toast.error(
            'You can only reply to reviews on your own listings.'
          );
        } else {
          toast.error(
            reviewService.getErrorMessage?.(err) ||
              err?.response?.data?.message ||
              'Failed to add reply.'
          );
        }
        return false;
      }
    },
    [fetchReviews]
  );

  const handleHelpfulToggle = useCallback(
    async (reviewId) => {
      if (!reviewId) return false;

      try {
        const result = await reviewService.toggleHelpful(reviewId);
        if (result?.success !== false) {
          await fetchReviews();
          return result;
        }
        return false;
      } catch (err) {
        toast.error(
          reviewService.getErrorMessage?.(err) ||
            'Failed to update helpful vote.'
        );
        return false;
      }
    },
    [fetchReviews]
  );

  const listingCount = useMemo(() => {
    return (
      stats.listingCount ||
      Object.keys(stats.byListing || {}).length
    );
  }, [stats.listingCount, stats.byListing]);

  const highRatingCount = useMemo(() => {
    return reviews.filter(
      (review) => Number(review?.rating || 0) >= 4
    ).length;
  }, [reviews]);

  const totalReviews = reviews.length;

  const ratingDistribution = useMemo(() => {
    const total = stats.total || totalReviews || 1;
    return [5, 4, 3, 2, 1].map((star) => {
      const count = Number(stats.ratingCounts?.[star] || 0);
      return {
        star,
        count,
        percentage: (count / total) * 100,
      };
    });
  }, [stats.total, stats.ratingCounts, totalReviews]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Loading reviews...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Unable to load reviews
        </h2>
        <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
          {error}
        </p>
        <button
          type="button"
          onClick={fetchReviews}
          className="mt-5 px-6 py-2.5 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#0D9488]/90 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in px-4 py-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#374151] dark:text-white">
              Reviews on My Listings
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              See what travelers are saying about your listings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Sparkles className="w-4 h-4 text-[#0D9488]" />
          <span>
            {totalReviews}{' '}
            {totalReviews === 1 ? 'review' : 'reviews'}
          </span>
        </div>
      </div>

      {/* STATS */}
      {totalReviews > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" />
              <span className="text-2xl font-bold text-[#374151] dark:text-white">
                {Number(stats.average || 0).toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Average Rating
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#0D9488]" />
              <span className="text-2xl font-bold text-[#374151] dark:text-white">
                {stats.total || totalReviews}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total Reviews
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#0D9488]" />
              <span className="text-2xl font-bold text-[#374151] dark:text-white">
                {listingCount}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Listings with Reviews
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#F59E0B]" />
              <span className="text-2xl font-bold text-[#374151] dark:text-white">
                {highRatingCount}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              4+ Star Reviews
            </p>
          </div>
        </div>
      )}

      {/* RATING DISTRIBUTION */}
      {totalReviews > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-[#374151] dark:text-white mb-4">
            Rating Distribution
          </h3>
          <div className="space-y-2 max-w-lg">
            {ratingDistribution.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-8">
                  {star}★
                </span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, percentage)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LISTING BREAKDOWN */}
      {listingCount > 0 &&
        Object.keys(stats.byListing || {}).length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-[#374151] dark:text-white mb-4">
              Reviews by Listing
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.byListing).map(([id, data]) => {
                const count = Number(data?.count || 0);
                const sum = Number(data?.sum || 0);
                const average =
                  count > 0 ? (sum / count).toFixed(1) : '0.0';

                return (
                  <Link
                    key={id}
                    to={`/listing/${id}`}
                    className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-[#0D9488]/10 transition flex items-center gap-2"
                  >
                    <span className="text-sm font-medium text-[#374151] dark:text-white">
                      {data?.title || 'Unknown Listing'}
                    </span>
                    <span className="text-xs bg-[#0D9488]/10 text-[#0D9488] px-2 py-0.5 rounded-full">
                      {count}{' '}
                      {count === 1 ? 'review' : 'reviews'}
                    </span>
                    <span className="text-xs text-[#F59E0B]">
                      ⭐ {average}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      {/* SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search reviews by traveler, listing or comment..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>

        <select
          value={ratingFilter}
          onChange={(event) => setRatingFilter(event.target.value)}
          className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          <option value="all">All Ratings</option>
          <option value="5">⭐ 5 Stars</option>
          <option value="4">⭐ 4 Stars</option>
          <option value="3">⭐ 3 Stars</option>
          <option value="2">⭐ 2 Stars</option>
          <option value="1">⭐ 1 Star</option>
        </select>
      </div>

      {/* RESULT COUNT */}
      {totalReviews > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Showing{' '}
            <strong className="text-[#374151] dark:text-white">
              {filteredReviews.length}
            </strong>{' '}
            of{' '}
            <strong className="text-[#374151] dark:text-white">
              {totalReviews}
            </strong>{' '}
            reviews
          </span>
        </div>
      )}

      {/* EMPTY */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-5">
            {searchTerm || ratingFilter !== 'all' ? (
              <Search className="w-10 h-10 text-[#0D9488]" />
            ) : (
              <MessageCircle className="w-10 h-10 text-[#0D9488]" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            {searchTerm || ratingFilter !== 'all'
              ? 'No Reviews Found'
              : 'No Reviews Yet'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {searchTerm || ratingFilter !== 'all'
              ? 'Try adjusting your search or rating filter.'
              : 'Reviews will appear here once travelers review your listings.'}
          </p>
          {searchTerm || ratingFilter !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setRatingFilter('all');
              }}
              className="mt-5 px-5 py-2 rounded-xl bg-[#0D9488] text-white hover:bg-[#0D9488]/90 transition"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <ReviewCard
              key={review?._id || review?.id}
              review={review}
              showActions={false}
              showTourInfo={true}
              isProvider={true}
              onHelpfulToggle={handleHelpfulToggle}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProviderReviews;