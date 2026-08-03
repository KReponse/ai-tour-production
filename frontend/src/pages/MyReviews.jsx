// frontend/src/pages/MyReviews.jsx
// ✅ COMPLETE FIXED - Server-Side Pagination (Strategy B)
// ✅ Added: usePagination hook for pagination controls
// ✅ Added: Pagination component with page numbers, First/Last
// ✅ Added: LoadingSkeleton for initial load
// ✅ Added: BackToTop button
// ✅ Removed status badge from review card
// ✅ Added handleHelpfulToggle function for Helpful button

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  MessageCircle,
  Sparkles,
  Loader2,
  Search,
  Filter,
  Edit2,
  Trash2,
  ThumbsUp,
  Calendar,
  MapPin,
  ChevronDown,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ReviewCard from '../components/ReviewCard';
import ReviewForm from '../components/ReviewForm';
import { getMyReviews, deleteReview, updateReview, toggleHelpful } from '../services/reviewService';
import { useAuth } from '../contexts/AuthContext';
import usePagination from '../hooks/usePagination';
import Pagination from '../components/ui/Pagination';
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

const MyReviews = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingReview, setEditingReview] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ✅ usePagination hook for server-side pagination
  const {
    data: reviews,
    loading,
    error,
    meta,
    goToPage,
    setLimit,
    applyFilter,
    clearFilters,
    refresh,
    setSearchTerm: setPaginationSearch,
    searchTerm: paginationSearch,
  } = usePagination({
    fetchFn: getMyReviews,
    initialParams: {
      status: 'all',
      limit: PAGINATION.DEFAULT_LIMIT,
      sort: '-createdAt',
    },
    dataKey: 'reviews',
  });

  // ✅ STABLE: handleDelete with useCallback
  const handleDelete = useCallback(async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    try {
      await deleteReview(reviewId);
      await refresh();
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error(error.response?.data?.message || 'Failed to delete review');
    }
  }, [refresh]);

  // ✅ STABLE: handleEdit with useCallback
  const handleEdit = useCallback((review) => {
    setEditingReview(review);
    setShowForm(true);
  }, []);

  // ✅ STABLE: handleSubmit with useCallback
  const handleSubmit = useCallback(async (data) => {
    try {
      setSubmitting(true);
      
      await updateReview(editingReview._id, {
        rating: data.rating,
        title: data.title || editingReview.title,
        comment: data.comment,
      });
      
      setShowForm(false);
      setEditingReview(null);
      await refresh();
      toast.success('Review updated successfully');
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error(error.response?.data?.message || 'Failed to update review');
    } finally {
      setSubmitting(false);
    }
  }, [editingReview, refresh]);

  // ✅ STABLE: handleHelpfulToggle with useCallback
  const handleHelpfulToggle = useCallback(async (reviewId) => {
    try {
      console.log('📤 [MyReviews] Toggling helpful for review:', reviewId);
      
      const result = await toggleHelpful(reviewId);
      
      if (result && result.success) {
        await refresh();
        return result;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [MyReviews] Error toggling helpful:', error);
      toast.error('Failed to toggle helpful');
      return false;
    }
  }, [refresh]);

  // ✅ STABLE: getStats with useMemo
  const stats = useMemo(() => {
    const total = reviews.length;
    const published = reviews.filter(r => r.status === 'published').length;
    const pending = reviews.filter(r => r.status === 'pending').length;
    const hidden = reviews.filter(r => r.status === 'hidden').length;
    const avgRating = total > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
      : 0;
    return { total, published, pending, hidden, avgRating };
  }, [reviews]);

  // ✅ STABLE: handleClearFilters with useCallback
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setRatingFilter('all');
    setStatusFilter('all');
    clearFilters();
  }, [clearFilters]);

  // ✅ STABLE: handleCancelEdit with useCallback
  const handleCancelEdit = useCallback(() => {
    setShowForm(false);
    setEditingReview(null);
  }, []);

  // ✅ Handle search with useCallback
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPaginationSearch(value);
  }, [setPaginationSearch]);

  // ✅ Handle rating filter with useCallback
  const handleRatingFilter = useCallback((value) => {
    setRatingFilter(value);
    applyFilter('rating', value);
  }, [applyFilter]);

  // ✅ Handle status filter with useCallback
  const handleStatusFilter = useCallback((value) => {
    setStatusFilter(value);
    applyFilter('status', value);
  }, [applyFilter]);

  // ✅ Status options - only valid statuses from the model
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'published', label: 'Published' },
    { value: 'hidden', label: 'Hidden' },
  ];

  // ✅ Rating options
  const ratingOptions = [
    { value: 'all', label: 'All Ratings' },
    { value: '5', label: '⭐ 5 Stars' },
    { value: '4', label: '⭐ 4 Stars' },
    { value: '3', label: '⭐ 3 Stars' },
    { value: '2', label: '⭐ 2 Stars' },
    { value: '1', label: '⭐ 1 Star' },
  ];

  // ===============================
  // LOADING STATE
  // ===============================
  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-1" />
          </div>
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
      <div className="flex flex-col items-center justify-center h-[300px] text-center max-w-5xl mx-auto px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <button
          onClick={refresh}
          className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white hover:bg-[#0D9488]/80 transition"
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
    <div className="space-y-6 animate-fade-in px-4 py-6 max-w-5xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#374151] dark:text-white">
              My Reviews
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {meta.total} reviews • Manage your reviews and feedback
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4 text-[#0D9488]" />
          <span>{reviews.length} reviews</span>
        </div>
      </div>

      {/* STATS */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" />
              <span className="text-2xl font-bold text-[#374151] dark:text-white">
                {stats.avgRating}
              </span>
            </div>
            <p className="text-xs text-gray-500">Average Rating</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#0D9488]" />
              <span className="text-2xl font-bold text-[#374151] dark:text-white">
                {stats.total}
              </span>
            </div>
            <p className="text-xs text-gray-500">Total Reviews</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#0D9488]" />
              <span className="text-2xl font-bold text-[#0D9488]">
                {stats.published}
              </span>
            </div>
            <p className="text-xs text-gray-500">Published</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
              <span className="text-2xl font-bold text-[#F59E0B]">
                {stats.pending}
              </span>
            </div>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
        </div>
      )}

      {/* SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your reviews..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <select
          value={ratingFilter}
          onChange={(e) => handleRatingFilter(e.target.value)}
          className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          {ratingOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(searchTerm || ratingFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={handleClearFilters}
            className="h-12 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm font-medium whitespace-nowrap"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* EMPTY STATE */}
      {reviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            {searchTerm || ratingFilter !== 'all' || statusFilter !== 'all' ? 'No Reviews Found' : 'No Reviews Yet'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || ratingFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start exploring tours and leave your first review!'}
          </p>
          {!searchTerm && ratingFilter === 'all' && statusFilter === 'all' && (
            <Link to="/explore">
              <Button className="mt-6 bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white">
                Explore Tours
              </Button>
            </Link>
          )}
          {(searchTerm || ratingFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const canEdit = review.status !== 'hidden';
            
            return (
              <ReviewCard
                key={review._id}
                review={review}
                onEdit={() => canEdit && handleEdit(review)}
                onDelete={() => canEdit && handleDelete(review._id)}
                onHelpfulToggle={handleHelpfulToggle}
                showActions={canEdit}
              />
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {meta.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            meta={meta}
            onPageChange={goToPage}
            onLimitChange={setLimit}
          />
        </div>
      )}

      {/* EDIT FORM MODAL */}
      {showForm && editingReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <ReviewForm
              initialData={editingReview}
              tourId={editingReview.tour?._id || editingReview.listing?._id}
              tourTitle={editingReview.tour?.title || editingReview.listing?.title}
              isEditing={true}
              hidePhotoUpload={true}
              onSubmit={handleSubmit}
              onCancel={handleCancelEdit}
              isLoading={submitting}
            />
          </div>
        </div>
      )}

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
};

export default MyReviews;