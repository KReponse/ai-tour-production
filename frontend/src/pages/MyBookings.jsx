// frontend/src/pages/MyBookings.jsx
// ✅ COMPLETE FIXED - Server-Side Pagination (Strategy B)
// ✅ Added: usePagination hook for pagination controls
// ✅ Added: Pagination component, search, filters, sorting
// ✅ Improved video detection and entity handling with mediaHelpers
// ✅ FIXED: Better video rendering with error logging and fallbacks

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Loader2,
  Eye,
  XCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  DollarSign,
  Star,
  Wallet,
  Receipt,
  RefreshCw,
  Play,
  Video,
  Search,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getMyBookings,
  cancelBooking,
} from '../services/bookingService';
import { getWalletBalance, getTransactionHistory } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

import usePagination from '../hooks/usePagination';
import Pagination from '../components/ui/Pagination';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import BackToTop from '../components/ui/BackToTop';
import { PAGINATION } from '../utils/constants';
import { getImageUrl, getCoverMedia, getCoverMediaType, getCoverVideo, hasVideo } from '../utils/mediaHelpers';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const MyBookings = () => {
  const { user } = useAuth();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showWallet, setShowWallet] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');

  // ✅ usePagination hook for server-side pagination
  const {
    data: bookings,
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
    fetchFn: getMyBookings,
    initialParams: {
      status: 'all',
      limit: PAGINATION.DEFAULT_LIMIT,
      sort: '-createdAt',
    },
    dataKey: 'bookings',
  });

  // Fetch wallet data
  const fetchWalletData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.role === 'provider' || userData.role === 'admin') {
        const balanceRes = await getWalletBalance();
        if (balanceRes.success) {
          setWalletBalance(balanceRes);
        }
        
        const txRes = await getTransactionHistory({ limit: 5 });
        if (txRes.success) {
          setTransactions(txRes.transactions || []);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  // Handle search with debounce (handled by usePagination)
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPaginationSearch(value);
  }, [setPaginationSearch]);

  // Handle status filter
  const handleStatusFilter = useCallback((status) => {
    setStatusFilter(status);
    applyFilter('status', status);
  }, [applyFilter]);

  // Handle sort change
  const handleSortChange = useCallback((e) => {
    const value = e.target.value;
    setSortBy(value);
    applyFilter('sort', value);
  }, [applyFilter]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refresh();
    if (showWallet) {
      fetchWalletData();
    }
    toast.success('Refreshed successfully');
  }, [refresh, showWallet]);

  // Toggle wallet
  const toggleWallet = useCallback(() => {
    setShowWallet(prev => !prev);
    if (!showWallet) {
      fetchWalletData();
    }
  }, [showWallet]);

  // ===============================
  // ENTITY HELPERS (Using mediaHelpers)
  // ===============================

  const getEntity = (booking) => {
    if (!booking) return null;
    if (booking.listing && typeof booking.listing === 'object' && booking.listing._id) {
      return booking.listing;
    }
    if (booking.tour && typeof booking.tour === 'object' && booking.tour._id) {
      return booking.tour;
    }
    if (booking.coverMedia || booking.coverImage || booking.galleryImages) {
      return booking;
    }
    if (booking.title || booking.coverImage) {
      return booking;
    }
    return null;
  };

  const getEntityMedia = (booking) => {
    const defaultImage = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
    
    let entity = getEntity(booking);
    if (!entity) {
      entity = booking;
    }
    if (!entity) {
      return {
        url: defaultImage,
        type: 'image',
        isVideo: false,
        videoUrl: null,
        poster: defaultImage,
      };
    }
    
    const coverType = getCoverMediaType(entity);
    const coverUrl = getCoverMedia(entity);
    const videoUrl = getCoverVideo(entity);
    const hasVideoContent = hasVideo(entity);
    
    // Log for debugging
    console.log('📹 [MyBookings] Entity media:', {
      title: entity.title,
      coverType,
      coverUrl,
      videoUrl,
      hasVideoContent,
    });
    
    if ((coverType === 'video' || hasVideoContent) && videoUrl) {
      return {
        url: videoUrl,
        type: 'video',
        isVideo: true,
        videoUrl: videoUrl,
        poster: coverUrl || defaultImage,
        thumbnail: coverUrl || defaultImage,
      };
    }
    
    return {
      url: coverUrl || defaultImage,
      type: 'image',
      isVideo: false,
      videoUrl: null,
      poster: coverUrl || defaultImage,
      thumbnail: coverUrl || defaultImage,
    };
  };

  const getEntityTitle = (booking) => {
    const entity = getEntity(booking) || booking;
    return entity?.title || 'Experience';
  };

  const getEntityLocation = (booking) => {
    const entity = getEntity(booking) || booking;
    return entity?.location || 'Location not specified';
  };

  const getEntityLink = (booking) => {
    if (booking?.listing) {
      return `/listing/${booking.listing._id || booking.listing}`;
    }
    if (booking?.tour) {
      return `/tour/${booking.tour._id || booking.tour}`;
    }
    return '#';
  };

  // ===============================
  // BOOKING ACTIONS
  // ===============================

  const handleCancel = async (bookingId) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmCancel) return;

    try {
      setCancelling(bookingId);
      const token = localStorage.getItem('token');
      await cancelBooking(bookingId, token);

      refresh();
      toast.success('Booking cancelled successfully');
      if (showWallet) {
        fetchWalletData();
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  };

  // ===============================
  // HELPERS
  // ===============================

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', icon: Clock, label: 'Draft' },
      pending_payment: { bg: 'bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20', text: 'text-[#F59E0B] dark:text-[#F59E0B]', icon: Clock, label: 'Pending Payment' },
      paid: { bg: 'bg-[#0D9488]/10 dark:bg-[#0D9488]/20', text: 'text-[#0D9488] dark:text-[#0D9488]', icon: CheckCircle, label: 'Paid' },
      confirmed: { bg: 'bg-[#0D9488]/10 dark:bg-[#0D9488]/20', text: 'text-[#0D9488] dark:text-[#0D9488]', icon: CheckCircle, label: 'Confirmed' },
      in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', icon: Clock, label: 'In Progress' },
      completed: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', icon: CheckCircle, label: 'Completed' },
      review_eligible: { bg: 'bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20', text: 'text-[#F59E0B] dark:text-[#F59E0B]', icon: Star, label: 'Ready for Review' },
      cancelled: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', icon: XCircle, label: 'Cancelled' },
      rejected: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', icon: XCircle, label: 'Rejected' },
      refunded: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', icon: CheckCircle, label: 'Refunded' },
    };
    return styles[status] || styles.pending_payment;
  };

  const getPaymentBadge = (status) => {
    const styles = {
      paid: 'text-[#0D9488]',
      pending: 'text-[#F59E0B]',
      unpaid: 'text-gray-400',
      failed: 'text-red-600',
      refunded: 'text-gray-400',
    };
    return styles[status] || styles.pending;
  };

  const getTravelDate = (booking) => {
    if (booking.travelDate) return booking.travelDate;
    if (booking.startDate) return booking.startDate;
    return null;
  };

  const canCancel = (status) => {
    return ['pending_payment', 'paid', 'confirmed'].includes(status);
  };

  const canPay = (status) => {
    return status === 'pending_payment';
  };

  const canReview = (booking) => {
    return (booking.status === 'completed' || booking.status === 'review_eligible') 
           && !booking.reviewSubmitted 
           && !booking.canReview === false;
  };

  // ===============================
  // RENDER BOOKING CARD
  // ===============================
  const renderBookingCard = (booking) => {
    const statusStyle = getStatusBadge(booking.status);
    const StatusIcon = statusStyle.icon;
    const travelDate = getTravelDate(booking);
    const paymentColor = getPaymentBadge(booking.paymentStatus);
    const entityTitle = getEntityTitle(booking);
    const entityLocation = getEntityLocation(booking);
    const entityLink = getEntityLink(booking);
    const media = getEntityMedia(booking);
    const isCancellable = canCancel(booking.status);
    const isPayable = canPay(booking.status);
    const isReviewable = canReview(booking);

    const paymentMethod = booking.paymentMethod || booking.paymentProvider || 'stripe';
    const providerDisplay = {
      stripe: '💳 Card',
      momo: '📱 MTN MoMo',
      airtel: '📱 Airtel Money',
      paypal: '💰 PayPal',
      bankTransfer: '🏦 Bank Transfer',
    }[paymentMethod] || '💳 Card';

    return (
      <div
        key={booking._id || booking.id}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-1 duration-300 border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <div className="grid md:grid-cols-4">
          {/* Media */}
          <div className="relative bg-gray-100 dark:bg-gray-800 min-h-[220px]">
            {media.isVideo && media.videoUrl ? (
              <div className="relative w-full h-full min-h-[220px] bg-black">
                <video
                  key={media.videoUrl}
                  src={media.videoUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={media.poster}
                  preload="metadata"
                  onError={(e) => {
                    console.error('❌ [MyBookings] Video error:', media.videoUrl, e);
                    // Show fallback image
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    if (parent) {
                      const img = document.createElement('img');
                      img.src = media.poster || 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
                      img.className = 'w-full h-full object-cover';
                      img.alt = entityTitle;
                      parent.appendChild(img);
                      // Add video badge
                      const badge = document.createElement('div');
                      badge.className = 'absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1';
                      badge.innerHTML = '📹 Video (fallback)';
                      parent.appendChild(badge);
                    }
                  }}
                  onLoadedData={() => {
                    console.log('✅ [MyBookings] Video loaded:', media.videoUrl);
                  }}
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-[#0D9488]/80 backdrop-blur flex items-center justify-center">
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  Video
                </div>
              </div>
            ) : (
              <img
                src={media.url}
                alt={entityTitle}
                className="w-full h-full object-cover min-h-[220px]"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
                }}
              />
            )}
            
            <div className="absolute top-4 left-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusStyle.label}
              </span>
            </div>
            
            {booking.totalPrice && (
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${booking.totalPrice}
              </div>
            )}
            
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-2 py-1 rounded-full text-white text-xs">
              {providerDisplay}
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3 p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
                  {entityTitle}
                </h2>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
                  <MapPin size={16} className="text-[#0D9488]" />
                  {entityLocation}
                </div>
                {booking.bookingCode && (
                  <p className="text-xs text-gray-400 mt-1">
                    Ref: {booking.bookingCode}
                  </p>
                )}
                {media.isVideo && (
                  <span className="inline-flex items-center gap-1 text-xs text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-full mt-1">
                    <Play className="w-3 h-3" />
                    Video Cover
                  </span>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Calendar size={18} className="text-[#0D9488]" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Travel Date</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {travelDate ? new Date(travelDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Users size={18} className="text-[#F59E0B]" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Travelers</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {booking.numberOfPeople || booking.travelers || 1}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <CreditCard size={18} className="text-[#0D9488]" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Payment</p>
                  <p className={`font-semibold ${paymentColor}`}>
                    {booking.paymentStatus || 'Pending'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {providerDisplay}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/trip/${booking._id}`}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#0f766e] hover:scale-[1.02] text-white font-semibold transition-all duration-300 flex items-center gap-2 shadow-md shadow-[#0D9488]/25"
              >
                <Eye size={18} />
                View Details
              </Link>

              {isPayable && (
                <Link
                  to={`/payment/${booking._id}`}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#d97706] hover:scale-[1.02] text-white font-semibold transition-all duration-300 flex items-center gap-2 shadow-md shadow-[#F59E0B]/25"
                >
                  <CreditCard size={18} />
                  Pay Now
                </Link>
              )}

              {isReviewable && booking._id && (
                <Link
                  to={`/review/${booking._id}`}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] hover:scale-[1.02] text-white font-semibold transition-all duration-300 flex items-center gap-2 shadow-md shadow-[#0D9488]/25"
                >
                  <Star size={18} />
                  Leave Review
                </Link>
              )}

              {isCancellable && (
                <button
                  onClick={() => handleCancel(booking._id)}
                  disabled={cancelling === booking._id}
                  className="px-5 py-3 rounded-xl border-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {cancelling === booking._id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle size={18} />
                      Cancel Booking
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===============================
  // LOADING STATE
  // ===============================
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
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
  // MAIN RENDER
  // ===============================
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 text-gray-900 dark:text-white">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[#374151] dark:text-white">
              My Bookings
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {meta.total} {meta.total === 1 ? 'booking' : 'bookings'} found
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {(user?.role === 'provider' || user?.role === 'admin') && (
            <button
              onClick={toggleWallet}
              className={`px-4 py-2.5 rounded-xl border-2 transition-all duration-300 flex items-center gap-2 ${
                showWallet
                  ? 'border-[#0D9488] bg-[#0D9488]/10 text-[#0D9488]'
                  : 'border-gray-200 dark:border-gray-700 hover:border-[#0D9488]/50'
              }`}
            >
              <Wallet className="w-4 h-4" />
              {showWallet ? 'Hide Wallet' : 'Show Wallet'}
            </button>
          )}
          
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Wallet Summary */}
      {showWallet && walletBalance && (
        <div className="mb-6 p-6 rounded-3xl bg-gradient-to-br from-[#0D9488]/10 to-[#F59E0B]/10 border border-[#0D9488]/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#374151] dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#0D9488]" />
                Wallet Balance
              </h3>
              <div className="mt-2 flex-wrap gap-6">
                <div>
                  <p className="text-sm text-gray-500">Total Balance</p>
                  <p className="text-2xl font-bold text-[#0D9488]">
                    ${walletBalance.summary?.total || 0}
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/wallet"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition flex items-center gap-2"
            >
              View Full Wallet
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search bookings by experience or location..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="paid">Paid</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={sortBy}
          onChange={handleSortChange}
          className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          <option value="-createdAt">Newest First</option>
          <option value="createdAt">Oldest First</option>
          <option value="-startDate">Travel Date (Newest)</option>
          <option value="startDate">Travel Date (Oldest)</option>
          <option value="-totalPrice">Highest Price</option>
          <option value="totalPrice">Lowest Price</option>
        </select>
      </div>

      {/* BOOKINGS LIST */}
      {bookings.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            {searchTerm || statusFilter !== 'all' ? 'No matching bookings' : 'No Bookings Yet'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Explore experiences and make your first booking.'}
          </p>
          {searchTerm || statusFilter !== 'all' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                clearFilters();
              }}
              className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
            >
              Clear Filters
            </button>
          ) : (
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition"
            >
              Explore Experiences
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking) => renderBookingCard(booking))}
        </div>
      )}

      {/* PAGINATION */}
      {meta.totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            meta={meta}
            onPageChange={goToPage}
            onLimitChange={setLimit}
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
                Booking Details
              </h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Experience</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {getEntityTitle(selectedBooking)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-semibold capitalize ${
                    selectedBooking.status === 'confirmed' ? 'text-[#0D9488]' :
                    selectedBooking.status === 'pending_payment' ? 'text-[#F59E0B]' :
                    selectedBooking.status === 'completed' ? 'text-green-600' :
                    'text-red-600'
                  }`}>
                    {selectedBooking.status}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Travel Date</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {getTravelDate(selectedBooking) 
                      ? new Date(getTravelDate(selectedBooking)).toLocaleDateString() 
                      : 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Travelers</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {selectedBooking.numberOfPeople || selectedBooking.travelers || 1}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Total Price</p>
                  <p className="font-semibold text-[#0D9488]">
                    ${selectedBooking.totalPrice || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <p className={`font-semibold ${getPaymentBadge(selectedBooking.paymentStatus)}`}>
                    {selectedBooking.paymentStatus || 'Pending'}
                  </p>
                  {selectedBooking.paymentMethod && (
                    <p className="text-[10px] text-gray-400">
                      {selectedBooking.paymentMethod}
                    </p>
                  )}
                </div>
              </div>
              
              {selectedBooking.bookingCode && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Booking Reference</p>
                  <p className="font-mono font-semibold text-[#0D9488]">
                    {selectedBooking.bookingCode}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedBooking(null)}
              className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
};

export default MyBookings;