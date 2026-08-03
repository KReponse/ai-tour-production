// frontend/src/pages/provider/MyListings.jsx
// ✅ COMPLETE FIXED - Server-Side Pagination (Strategy B)
// ✅ Added: usePagination hook for pagination controls
// ✅ Added: Pagination component with page numbers, First/Last
// ✅ Added: Search, filters, sorting
// ✅ Added: Skeleton loader, Back to Top button
// ✅ Prevent infinite loop, added cover media support

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  TrendingUp,
  Sparkles,
  BarChart3,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  LayoutGrid,
  List,
  Filter,
  X,
  Play,
  Image as ImageIcon,
} from 'lucide-react';
import { getMyListings, deleteListing, toggleListingStatus } from '../../services/listingService';
import { useAuth } from '../../contexts/AuthContext';
import ListingCard from '../../components/listing/ListingCard';
import { getBusinessConfig } from '../../config/listingConfigs';
import usePagination from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import BackToTop from '../../components/ui/BackToTop';
import { PAGINATION } from '../../utils/constants';
import toast from 'react-hot-toast';

// ── Helpers ──────────────────────────────────────────────────────
const getStatusCount = (listings, status) => {
  return listings.filter((l) => l.status === status).length;
};

// ── Main Component ──────────────────────────────────────────────
const MyListings = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // ✅ usePagination hook for server-side pagination
  const {
    data: listings,
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
    fetchFn: getMyListings,
    initialParams: {
      status: 'all',
      limit: PAGINATION.DEFAULT_LIMIT,
      sort: '-createdAt',
    },
    dataKey: 'listings',
  });

  // ── Analytics ──────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const total = listings.length;
    const approved = getStatusCount(listings, 'approved');
    const pending = getStatusCount(listings, 'pending');
    const rejected = getStatusCount(listings, 'rejected');
    const totalRevenue = listings.reduce((sum, l) => sum + Number(l.price || 0), 0);
    const avgPrice = totalRevenue / total || 0;
    const withVideoCover = listings.filter((l) => l.coverMediaType === 'video').length;

    return { 
      total, 
      approved, 
      pending, 
      rejected, 
      totalRevenue, 
      avgPrice,
      withVideoCover,
    };
  }, [listings]);

  // ── Handle Search ─────────────────────────────────────────────
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPaginationSearch(value);
  }, [setPaginationSearch]);

  // ── Handle Status Filter ──────────────────────────────────────
  const handleStatusFilter = useCallback((status) => {
    setStatusFilter(status);
    applyFilter('status', status);
  }, [applyFilter]);

  // ── Handle Sort Change ────────────────────────────────────────
  const handleSortChange = useCallback((e) => {
    const value = e.target.value;
    setSortBy(value);
    applyFilter('sort', value);
  }, [applyFilter]);

  // ── Handle Delete ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    
    try {
      setActionLoading(id);
      await deleteListing(id, token);
      await refresh();
      toast.success('Listing deleted successfully');
    } catch (error) {
      console.error('❌ Delete error:', error);
      toast.error(error.response?.data?.message || 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Handle Toggle Status ──────────────────────────────────────
  const handleToggleStatus = async (id) => {
    try {
      setActionLoading(id);
      await toggleListingStatus(id, token);
      await refresh();
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('❌ Status toggle error:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Handle Toggle Favorite ────────────────────────────────────
  const handleToggleFavorite = (id) => {
    toast.info('Favorites coming soon!');
  };

  // ── Get cover media type icon ─────────────────────────────────
  const getCoverIcon = (listing) => {
    if (listing.coverMediaType === 'video') {
      return Play;
    }
    return ImageIcon;
  };

  // ── Show Notification ─────────────────────────────────────────
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ===============================
  // LOADING STATE
  // ===============================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-[#374151]/10 dark:from-gray-950 dark:via-gray-900 dark:to-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div>
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white/20 rounded-xl p-4 animate-pulse">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
              </div>
            ))}
          </div>
          <LoadingSkeleton count={6} type="grid" />
        </div>
      </div>
    );
  }

  // ===============================
  // ERROR STATE
  // ===============================
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-[#374151]/10 dark:from-gray-950 dark:via-gray-900 dark:to-black p-6">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-[#374151] dark:text-white">Failed to Load Listings</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
          <button
            onClick={refresh}
            className="mt-6 px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-[#374151]/10 dark:from-gray-950 dark:via-gray-900 dark:to-black p-6">
      {/* ── Notification ── */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-2xl shadow-2xl text-white flex items-center gap-3 animate-fade-in ${
            notification.type === 'success'
              ? 'bg-[#0D9488]'
              : notification.type === 'error'
              ? 'bg-red-500'
              : 'bg-[#F59E0B]'
          }`}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* ── Analytics Banner ── */}
        {analytics.total > 0 && (
          <div className="mb-8 rounded-3xl p-6 text-white shadow-2xl bg-gradient-to-r from-[#0D9488] via-[#F59E0B] to-[#374151]">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-9 h-9" />
                <div>
                  <h3 className="text-xl font-black">Listing Analytics</h3>
                  <p className="text-sm opacity-90">Smart insights for your business</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white/20 rounded-xl p-3 text-center">
                  <p className="text-xs opacity-80">Total</p>
                  <strong className="text-2xl">{analytics.total}</strong>
                </div>
                <div className="bg-white/20 rounded-xl p-3 text-center">
                  <p className="text-xs opacity-80">Approved</p>
                  <strong className="text-2xl text-[#0D9488]">{analytics.approved}</strong>
                </div>
                <div className="bg-white/20 rounded-xl p-3 text-center">
                  <p className="text-xs opacity-80">Pending</p>
                  <strong className="text-2xl text-[#F59E0B]">{analytics.pending}</strong>
                </div>
                <div className="bg-white/20 rounded-xl p-3 text-center">
                  <p className="text-xs opacity-80">Avg Price</p>
                  <strong className="text-2xl">${analytics.avgPrice.toFixed(0)}</strong>
                </div>
                <div className="bg-white/20 rounded-xl p-3 text-center">
                  <p className="text-xs opacity-80">🎬 Videos</p>
                  <strong className="text-2xl">{analytics.withVideoCover}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-[#374151] to-[#0D9488] bg-clip-text text-transparent">
              My Listings
            </h1>
            <p className="mt-2 text-gray-500 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0D9488]" />
              {meta.total} Listings
              {analytics.withVideoCover > 0 && (
                <span className="ml-2 text-xs bg-[#0D9488]/10 text-[#0D9488] px-2 py-1 rounded-full">
                  🎬 {analytics.withVideoCover} with video
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="h-12 px-4 rounded-xl border-2 border-[#374151]/20 hover:border-[#0D9488] font-bold flex items-center gap-2 transition"
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
            </button>

            <button
              onClick={() => navigate('/provider/add-listing')}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#0D9488] via-[#F59E0B] to-[#374151] text-white font-black shadow-lg hover:scale-105 transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Listing
            </button>
          </div>
        </div>

        {/* ── Search & Filters ── */}
        {listings.length > 0 && (
          <div className="mb-8 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-3 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search listings..."
                className="w-full h-12 pl-12 pr-4 rounded-xl border focus:ring-2 focus:ring-[#0D9488] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="h-12 rounded-xl border px-4 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="all">All Status ({meta.total})</option>
              <option value="pending">Pending ({getStatusCount(listings, 'pending')})</option>
              <option value="approved">Approved ({getStatusCount(listings, 'approved')})</option>
              <option value="rejected">Rejected ({getStatusCount(listings, 'rejected')})</option>
            </select>

            <select
              value={sortBy}
              onChange={handleSortChange}
              className="h-12 rounded-xl border px-4 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="-createdAt">Newest</option>
              <option value="createdAt">Oldest</option>
              <option value="-likesCount">Popular</option>
              <option value="price">Low Price</option>
              <option value="-price">High Price</option>
            </select>
          </div>
        )}

        {/* ── Empty State ── */}
        {listings.length === 0 && !loading && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center bg-[#0D9488]/10">
              <TrendingUp className="w-12 h-12 text-[#0D9488]" />
            </div>
            <h2 className="text-3xl font-black mt-6 text-[#374151] dark:text-white">
              No Listings Yet
            </h2>
            <p className="text-gray-500 mt-2">Create your first listing on AI Tour</p>
            <button
              onClick={() => navigate('/provider/add-listing')}
              className="mt-6 px-8 py-3 rounded-xl bg-[#0D9488] hover:bg-[#0D9488]/90 text-white font-black flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create Listing
            </button>
          </div>
        )}

        {/* ── Empty Filter Result ── */}
        {listings.length > 0 && listings.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center bg-[#F59E0B]/10">
              <Search className="w-12 h-12 text-[#F59E0B]" />
            </div>
            <h2 className="text-3xl font-black mt-6 text-[#374151] dark:text-white">
              No Listings Found
            </h2>
            <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                clearFilters();
              }}
              className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* ── Listings Grid ── */}
        {listings.length > 0 && (
          <>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid lg:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {listings.map((listing) => (
                <ListingCard
                  key={listing._id}
                  listing={listing}
                  compact={viewMode === 'list'}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleStatus={handleToggleStatus}
                  isLoading={actionLoading === listing._id}
                />
              ))}
            </div>

            {/* ── Pagination ── */}
            {meta.totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  meta={meta}
                  onPageChange={goToPage}
                  onLimitChange={setLimit}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Back to Top ── */}
      <BackToTop />

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MyListings;