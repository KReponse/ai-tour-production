// src/pages/admin/ManagementListings.jsx
// ============================================================
// AI TOUR — ADMIN LISTING MANAGEMENT (FINAL)
// ============================================================
// ✅ Real optimistic updates — rows flip / disappear
//    instantly on approve / reject / suspend / delete.
// ✅ Broadcasts every mutation to 'listings',
//    'listings:admin', 'listings:provider', 'dashboard'
//    so all consumers stay in sync.
// ✅ Auto-refreshes when the list is invalidated elsewhere.
// ✅ Prevents duplicate submissions via submittingRef.
// ✅ Preserves all UI: analytics cards, filters, table,
//    action icons, modals, pagination.
// ============================================================

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Clock,
  Image,
  X,
  RefreshCw,
  Ban,
  Trash2,
  Video,
  Play,
  Calendar,
} from 'lucide-react';
import {
  getAdminListings,
  approveListing,
  rejectListing,
  suspendListing,
  deleteListingAdmin,
} from '../../services/adminService';
import ListingStatusBadge from '../../components/listing/ListingStatusBadge';
import ListingDetailsDrawer from '../../components/admin/listings/ListingDetailsDrawer';
import RejectListingModal from '../../components/admin/listings/RejectListingModal';
import SuspendListingModal from '../../components/admin/listings/SuspendListingModal';
import DeleteListingModal from '../../components/admin/listings/DeleteListingModal';
import usePagination from '../../hooks/usePagination';
import useRefreshOn from '../../hooks/useRefreshOn';
import { refreshMany } from '../../utils/dataRefresh';
import Pagination from '../../components/ui/Pagination';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import BackToTop from '../../components/ui/BackToTop';
import { PAGINATION } from '../../utils/constants';
import {
  getImageUrl,
  getCoverMedia,
  getCoverMediaType,
} from '../../utils/mediaHelpers';
import toast from 'react-hot-toast';

// ── Brand tokens ─────────────────────────────────────────────────
const TEAL = '#0D9488';
const GOLD = '#F59E0B';
const SLATE = '#374151';

// ── Constants ────────────────────────────────────────────────────
const BUSINESS_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'tour_operator', label: 'Tour Operator' },
  { value: 'guide', label: 'Guide' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'lodge', label: 'Lodge' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'transport', label: 'Transport' },
  { value: 'events', label: 'Events' },
  { value: 'shop', label: 'Shop' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

const LISTING_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'experience', label: 'Experience' },
  { value: 'tour', label: 'Tour' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'restaurant', label: 'Restaurant & Cafe' },
  { value: 'activity', label: 'Activity' },
  { value: 'transport', label: 'Transport' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

// ── Analytics Card ──────────────────────────────────────────────
const AnalyticsCard = ({ title, value, icon: Icon, color, bgColor }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          {title}
        </p>
        <p className="text-3xl font-black text-[#374151] dark:text-white mt-1">
          {value}
        </p>
      </div>
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bgColor}`}
      >
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  </div>
);

// ── Media Preview ──
const MediaPreview = ({ listing }) => {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const coverType = getCoverMediaType(listing);
  const coverUrl = getCoverMedia(listing);

  if (!coverUrl) {
    return (
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 flex-shrink-0">
        <Image className="w-5 h-5" />
      </div>
    );
  }

  if (coverType === 'video' && !videoError) {
    return (
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center flex-shrink-0 relative">
        <video
          src={coverUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
          onError={() => setVideoError(true)}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-5 h-5 rounded-full bg-[#0D9488]/80 flex items-center justify-center">
            <Play className="w-2.5 h-2.5 text-white ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative">
      <img
        src={coverUrl}
        alt={listing.title}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────
const ManagementListings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
  const [listingTypeFilter, setListingTypeFilter] = useState('all');

  const [selectedListing, setSelectedListing] = useState(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);

  // ✅ Optimistic overrides: { [listingId]: { status } | 'deleted' }
  const [optimisticOverrides, setOptimisticOverrides] = useState({});

  // ✅ Duplicate-submit guard
  const submittingRef = useRef(new Set());

  // ✅ usePagination — server-side
  const {
    data: rawListings,
    loading,
    error,
    meta,
    goToPage,
    setLimit,
    applyFilter,
    clearFilters,
    refresh,
    setSearchTerm: setPaginationSearch,
  } = usePagination({
    fetchFn: getAdminListings,
    initialParams: {
      status: 'all',
      limit: PAGINATION.DEFAULT_LIMIT,
      sort: '-createdAt',
    },
    dataKey: 'listings',
  });

  // ✅ Merge optimistic overrides into server data
  const listings = useMemo(() => {
    if (!Array.isArray(rawListings)) return [];
    if (!Object.keys(optimisticOverrides).length) return rawListings;

    const result = [];
    for (const item of rawListings) {
      const override = optimisticOverrides[item._id];
      if (override === 'deleted') continue;
      if (override) {
        result.push({ ...item, ...override });
      } else {
        result.push(item);
      }
    }
    return result;
  }, [rawListings, optimisticOverrides]);

  // ✅ Auto-refresh when listings are invalidated elsewhere
  useRefreshOn(
    ['listings', 'listings:admin'],
    useCallback(() => {
      setOptimisticOverrides({});
      refresh();
    }, [refresh])
  );

  // ── Analytics ──
  const analytics = useMemo(() => {
    const total = listings.length;
    const pending = listings.filter((l) => l.status === 'pending').length;
    const approved = listings.filter((l) => l.status === 'approved').length;
    const rejected = listings.filter((l) => l.status === 'rejected').length;
    const suspended = listings.filter((l) => l.status === 'suspended').length;
    const today = listings.filter((l) => {
      const todayStr = new Date().toDateString();
      return new Date(l.createdAt).toDateString() === todayStr;
    }).length;
    return { total, pending, approved, rejected, suspended, today };
  }, [listings]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Filter handlers ──
  const handleSearch = useCallback(
    (value) => {
      setSearchTerm(value);
      setPaginationSearch(value);
    },
    [setPaginationSearch]
  );

  const handleStatusFilter = useCallback(
    (status) => {
      setStatusFilter(status);
      applyFilter('status', status);
    },
    [applyFilter]
  );

  const handleBusinessTypeFilter = useCallback(
    (type) => {
      setBusinessTypeFilter(type);
      applyFilter('businessType', type);
    },
    [applyFilter]
  );

  const handleListingTypeFilter = useCallback(
    (type) => {
      setListingTypeFilter(type);
      applyFilter('listingType', type);
    },
    [applyFilter]
  );

  const handleSortChange = useCallback(
    (e) => {
      applyFilter('sort', e.target.value);
    },
    [applyFilter]
  );

  // ✅ Broadcast helper
  const broadcastListingsChange = useCallback(() => {
    refreshMany(
      'listings',
      'listings:admin',
      'listings:provider',
      'dashboard'
    );
  }, []);

  // ✅ Optimistic apply + delayed refresh
  const applyOptimisticAndRefresh = useCallback(
    (id, patch) => {
      setOptimisticOverrides((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), ...patch },
      }));

      window.setTimeout(() => {
        refresh();
        setOptimisticOverrides((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 1000);
    },
    [refresh]
  );

  const applyOptimisticRemoveAndRefresh = useCallback(
    (id) => {
      setOptimisticOverrides((prev) => ({ ...prev, [id]: 'deleted' }));

      window.setTimeout(() => {
        refresh();
        setOptimisticOverrides((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 1000);
    },
    [refresh]
  );

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleApprove = useCallback(
    async (id) => {
      const key = `approve-${id}`;
      if (submittingRef.current.has(key)) return;
      if (
        !window.confirm(
          'Are you sure you want to approve this listing?'
        )
      )
        return;

      try {
        submittingRef.current.add(key);
        setActionLoading(id);

        await approveListing(id);

        applyOptimisticAndRefresh(id, { status: 'approved' });

        toast.success('✅ Listing approved successfully!');
        showNotification('✅ Listing approved successfully!', 'success');
        broadcastListingsChange();
      } catch (err) {
        const msg =
          err.response?.data?.message || 'Failed to approve';
        toast.error(msg);
        showNotification(msg, 'error');
      } finally {
        submittingRef.current.delete(key);
        setActionLoading(null);
      }
    },
    [applyOptimisticAndRefresh, broadcastListingsChange]
  );

  const handleReject = useCallback(
    async (id, reason) => {
      const key = `reject-${id}`;
      if (submittingRef.current.has(key)) return;

      try {
        submittingRef.current.add(key);
        setActionLoading(id);

        await rejectListing(id, reason);

        applyOptimisticAndRefresh(id, { status: 'rejected' });

        toast.success('❌ Listing rejected');
        showNotification('❌ Listing rejected', 'success');
        setShowRejectModal(false);
        broadcastListingsChange();
      } catch (err) {
        const msg =
          err.response?.data?.message || 'Failed to reject';
        toast.error(msg);
        showNotification(msg, 'error');
      } finally {
        submittingRef.current.delete(key);
        setActionLoading(null);
      }
    },
    [applyOptimisticAndRefresh, broadcastListingsChange]
  );

  const handleSuspend = useCallback(
    async (id, reason) => {
      const key = `suspend-${id}`;
      if (submittingRef.current.has(key)) return;

      try {
        submittingRef.current.add(key);
        setActionLoading(id);

        await suspendListing(id, reason);

        applyOptimisticAndRefresh(id, { status: 'suspended' });

        toast.success('⛔ Listing suspended');
        showNotification('⛔ Listing suspended', 'success');
        setShowSuspendModal(false);
        broadcastListingsChange();
      } catch (err) {
        const msg =
          err.response?.data?.message || 'Failed to suspend';
        toast.error(msg);
        showNotification(msg, 'error');
      } finally {
        submittingRef.current.delete(key);
        setActionLoading(null);
      }
    },
    [applyOptimisticAndRefresh, broadcastListingsChange]
  );

  const handleDelete = useCallback(
    async (id) => {
      const key = `delete-${id}`;
      if (submittingRef.current.has(key)) return;
      if (
        !window.confirm(
          'Are you sure you want to delete this listing? This action cannot be undone.'
        )
      )
        return;

      try {
        submittingRef.current.add(key);
        setActionLoading(id);

        await deleteListingAdmin(id);

        applyOptimisticRemoveAndRefresh(id);

        toast.success('🗑️ Listing deleted');
        showNotification('🗑️ Listing deleted', 'success');
        setShowDeleteModal(false);
        broadcastListingsChange();
      } catch (err) {
        const msg =
          err.response?.data?.message || 'Failed to delete';
        toast.error(msg);
        showNotification(msg, 'error');
      } finally {
        submittingRef.current.delete(key);
        setActionLoading(null);
      }
    },
    [applyOptimisticRemoveAndRefresh, broadcastListingsChange]
  );

  // ===============================
  // LOADING
  // ===============================
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm animate-pulse"
            >
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
            </div>
          ))}
        </div>
        <LoadingSkeleton count={5} type="list" />
      </div>
    );
  }

  // ===============================
  // ERROR
  // ===============================
  if (error) {
    return (
      <div className="space-y-6 p-6 flex flex-col items-center justify-center h-96 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
          Failed to Load Listings
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
        <button
          onClick={refresh}
          className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  return (
    <div className="space-y-6 p-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl text-white flex items-center gap-3 animate-slide-in ${
            notification.type === 'success'
              ? 'bg-[#0D9488]'
              : notification.type === 'error'
              ? 'bg-red-500'
              : 'bg-[#F59E0B]'
          }`}
        >
          {notification.type === 'success' && (
            <CheckCircle className="w-5 h-5" />
          )}
          {notification.type === 'error' && (
            <XCircle className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#374151] dark:text-white">
            Listing Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {meta.total} listings • Review and manage all provider listings
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <AnalyticsCard
          title="Total"
          value={analytics.total}
          icon={Building2}
          color="text-[#374151]"
          bgColor="bg-gray-100 dark:bg-gray-800"
        />
        <AnalyticsCard
          title="Pending"
          value={analytics.pending}
          icon={Clock}
          color="text-[#F59E0B]"
          bgColor="bg-[#F59E0B]/10"
        />
        <AnalyticsCard
          title="Approved"
          value={analytics.approved}
          icon={CheckCircle}
          color="text-[#0D9488]"
          bgColor="bg-[#0D9488]/10"
        />
        <AnalyticsCard
          title="Rejected"
          value={analytics.rejected}
          icon={XCircle}
          color="text-red-600"
          bgColor="bg-red-100"
        />
        <AnalyticsCard
          title="Suspended"
          value={analytics.suspended}
          icon={Ban}
          color="text-[#F59E0B]"
          bgColor="bg-[#F59E0B]/10"
        />
        <AnalyticsCard
          title="Today"
          value={analytics.today}
          icon={Calendar}
          color="text-[#0D9488]"
          bgColor="bg-[#0D9488]/10"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, location, provider, category..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none dark:text-white min-w-[140px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={listingTypeFilter}
            onChange={(e) => handleListingTypeFilter(e.target.value)}
            className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none dark:text-white min-w-[160px]"
          >
            {LISTING_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={businessTypeFilter}
            onChange={(e) => handleBusinessTypeFilter(e.target.value)}
            className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none dark:text-white min-w-[160px]"
          >
            {BUSINESS_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            onChange={handleSortChange}
            className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none dark:text-white min-w-[140px]"
          >
            <option value="-createdAt">Newest</option>
            <option value="createdAt">Oldest</option>
            <option value="-price">Price: High to Low</option>
            <option value="price">Price: Low to High</option>
          </select>
        </div>
      </div>

      {/* Listings Table */}
      {listings.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Building2 className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">
            No listings found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchTerm ||
            statusFilter !== 'all' ||
            businessTypeFilter !== 'all' ||
            listingTypeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No listings have been submitted yet'}
          </p>
          {(searchTerm ||
            statusFilter !== 'all' ||
            businessTypeFilter !== 'all' ||
            listingTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setBusinessTypeFilter('all');
                setListingTypeFilter('all');
                clearFilters();
              }}
              className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Listing
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {listings.map((listing) => {
                    const isActionLoading =
                      actionLoading === listing._id;

                    return (
                      <tr
                        key={listing._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <MediaPreview listing={listing} />
                            <div>
                              <p className="font-semibold text-[#374151] dark:text-white line-clamp-1">
                                {listing.title}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {listing.listingType || 'Listing'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-[#374151] dark:text-white">
                            {listing.provider?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {listing.provider?.email || ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                            {listing.businessType?.replace('_', ' ') ||
                              'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {listing.category || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {listing.location || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-[#0D9488]">
                            ${listing.price || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ListingStatusBadge
                            status={listing.status}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedListing(listing);
                                setShowDetailsDrawer(true);
                              }}
                              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-400 hover:text-[#0D9488]"
                              title="View Details"
                              disabled={isActionLoading}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {listing.status === 'pending' && (
                              <button
                                onClick={() => handleApprove(listing._id)}
                                disabled={isActionLoading}
                                className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition text-gray-400 hover:text-[#0D9488] disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Approve"
                              >
                                {isActionLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {listing.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setSelectedListing(listing);
                                  setShowRejectModal(true);
                                }}
                                disabled={isActionLoading}
                                className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                            {listing.status === 'approved' && (
                              <button
                                onClick={() => {
                                  setSelectedListing(listing);
                                  setShowSuspendModal(true);
                                }}
                                disabled={isActionLoading}
                                className="p-2 rounded-xl hover:bg-[#F59E0B]/10 transition text-gray-400 hover:text-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Suspend"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedListing(listing);
                                setShowDeleteModal(true);
                              }}
                              disabled={isActionLoading}
                              className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {meta.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                meta={meta}
                onPageChange={goToPage}
                onLimitChange={setLimit}
              />
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ListingDetailsDrawer
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        listing={selectedListing}
        onApprove={handleApprove}
        onReject={(id) => {
          setShowDetailsDrawer(false);
          setSelectedListing(listings.find((l) => l._id === id));
          setShowRejectModal(true);
        }}
        onSuspend={(id) => {
          setShowDetailsDrawer(false);
          setSelectedListing(listings.find((l) => l._id === id));
          setShowSuspendModal(true);
        }}
        onDelete={(id) => {
          setShowDetailsDrawer(false);
          setSelectedListing(listings.find((l) => l._id === id));
          setShowDeleteModal(true);
        }}
        actionLoading={actionLoading}
      />

      <RejectListingModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        listing={selectedListing}
        onConfirm={handleReject}
        loading={actionLoading === selectedListing?._id}
      />

      <SuspendListingModal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        listing={selectedListing}
        onConfirm={handleSuspend}
        loading={actionLoading === selectedListing?._id}
      />

      <DeleteListingModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        listing={selectedListing}
        onConfirm={handleDelete}
        loading={actionLoading === selectedListing?._id}
      />

      <BackToTop />
    </div>
  );
};

export default ManagementListings;