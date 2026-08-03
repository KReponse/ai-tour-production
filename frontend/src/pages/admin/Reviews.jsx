// frontend/src/pages/admin/Reviews.jsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  MessageCircle,
  Sparkles,
  Loader2,
  Search,
  Filter,
  ThumbsUp,
  Calendar,
  User,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Award,
  Eye,
} from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ReviewCard from '../../components/ReviewCard';
import { getAdminReviews, deleteReview, updateReviewStatus } from '../../services/reviewService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const AdminReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    pending: 0,
    published: 0,    // ✅ Changed from approved
    hidden: 0,
    deleted: 0,
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    filterReviews();
  }, [reviews, searchTerm, ratingFilter, statusFilter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await getAdminReviews();
      const reviewsList = data.reviews || [];
      setReviews(reviewsList);
      setFilteredReviews(reviewsList);

      // Calculate stats
      if (reviewsList.length > 0) {
        const total = reviewsList.length;
        const sum = reviewsList.reduce((acc, r) => acc + r.rating, 0);
        const avg = (sum / total).toFixed(1);
        const pending = reviewsList.filter(r => r.status === 'pending').length;
        const published = reviewsList.filter(r => r.status === 'published').length;
        const hidden = reviewsList.filter(r => r.status === 'hidden').length;
        const deleted = reviewsList.filter(r => r.status === 'deleted').length;

        setStats({ total, average: avg, pending, published, hidden, deleted });
      }
    } catch (error) {
      console.error('Error fetching admin reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const filterReviews = () => {
    let filtered = [...reviews];

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.tour?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.listing?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (ratingFilter !== 'all') {
      filtered = filtered.filter(r => r.rating === parseInt(ratingFilter));
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    setFilteredReviews(filtered);
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) return;
    
    try {
      await deleteReview(reviewId);
      await fetchReviews();
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  // ✅ FIXED: Use correct status values
  const handleStatusUpdate = async (reviewId, status) => {
    try {
      // Map frontend display status to backend enum values
      const statusMap = {
        'pending': 'pending',
        'published': 'published',   // ✅ This is the correct value
        'approved': 'published',    // ✅ Map approved → published
        'hidden': 'hidden',
        'deleted': 'deleted',
        'rejected': 'hidden',       // ✅ Map rejected → hidden
      };
      
      const backendStatus = statusMap[status] || status;
      
      await updateReviewStatus(reviewId, backendStatus);
      await fetchReviews();
      toast.success(`Review ${status} successfully`);
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error(error.response?.data?.message || 'Failed to update review status');
    }
  };

  // ✅ Get status display name
  const getStatusDisplay = (status) => {
    const map = {
      'pending': 'Pending',
      'published': 'Published',
      'hidden': 'Hidden',
      'flagged': 'Flagged',
      'deleted': 'Deleted'
    };
    return map[status] || status;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading reviews...</p>
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
              Review Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage all traveler reviews across the platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users className="w-4 h-4 text-[#0D9488]" />
          <span>{reviews.length} total reviews</span>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <Star className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" />
            <span className="text-2xl font-bold text-[#374151] dark:text-white">
              {stats.average}
            </span>
          </div>
          <p className="text-xs text-gray-500">Average Rating</p>
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
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-2xl font-bold text-red-500">
              {stats.hidden}
            </span>
          </div>
          <p className="text-xs text-gray-500">Hidden</p>
        </div>
      </div>

      {/* SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search reviews by traveler, tour, or comment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending ({stats.pending})</option>
          <option value="published">Published ({stats.published})</option>
          <option value="hidden">Hidden ({stats.hidden})</option>
          <option value="deleted">Deleted ({stats.deleted})</option>
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          <option value="all">All Ratings</option>
          <option value="5">⭐ 5 Stars</option>
          <option value="4">⭐ 4 Stars</option>
          <option value="3">⭐ 3 Stars</option>
          <option value="2">⭐ 2 Stars</option>
          <option value="1">⭐ 1 Star</option>
        </select>
      </div>

      {/* EMPTY STATE */}
      {filteredReviews.length === 0 ? (
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
              : 'Reviews will appear here once travelers share their experiences'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div key={review._id} className="relative">
              <ReviewCard
                review={review}
                showActions={true}
                showTourInfo={true}
                showUserInfo={true}
                onDelete={() => handleDelete(review._id)}
                onHelpfulToggle={() => fetchReviews()}
              />
              {/* Admin Status Controls */}
              <div className="mt-3 flex flex-wrap gap-2">
                {review.status !== 'published' && review.status !== 'deleted' && (
                  <button
                    onClick={() => handleStatusUpdate(review._id, 'published')}
                    className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0D9488]/80 text-white text-sm font-medium transition flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Publish
                  </button>
                )}
                {review.status !== 'hidden' && review.status !== 'deleted' && (
                  <button
                    onClick={() => handleStatusUpdate(review._id, 'hidden')}
                    className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Hide
                  </button>
                )}
                {review.status !== 'deleted' && (
                  <button
                    onClick={() => handleDelete(review._id)}
                    className="px-4 py-2 rounded-xl bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium transition flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-auto flex items-center">
                  Status: <span className="font-medium ml-1">{getStatusDisplay(review.status)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;