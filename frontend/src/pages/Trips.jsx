// src/pages/Trips.jsx
// ============================================================
// AI TOUR — MY TRIPS PAGE
// ============================================================
// ✅ Adds shared traveler top tabs (Trips | My Bookings | Payments)
// ✅ Auto-refreshes on booking-domain invalidation
// ✅ All prior UI/UX + internal Upcoming/Past filtering preserved
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Loader2,
  Sparkles,
  Plane,
  Users,
  Star,
  ArrowRight,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getMyBookings, cancelBooking } from '../services/bookingService';
import { useAuth } from '../contexts/AuthContext';
import usePagination from '../hooks/usePagination';
import Pagination from '../components/ui/Pagination';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import BackToTop from '../components/ui/BackToTop';
import { PAGINATION } from '../utils/constants';
import { refreshMany } from '../utils/dataRefresh';
import useRefreshOn from '../hooks/useRefreshOn';
import TravelerTabs from '../components/navigation/TravelerTabs';
import {
  getImageUrl,
  getCoverMedia,
  getCoverMediaType,
  getCoverVideo,
  hasVideo,
} from '../utils/mediaHelpers';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Not yet paid',
  pending: 'Payment processing',
  processing: 'Payment processing',
  paid: 'Paid',
  succeeded: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

const formatPaymentStatus = (status) => {
  if (!status) return PAYMENT_STATUS_LABELS.unpaid;
  const key = String(status).toLowerCase();
  return PAYMENT_STATUS_LABELS[key] || 'Unknown';
};

const getProviderName = (provider) => {
  if (!provider) return '';
  if (typeof provider === 'string') return provider.trim();
  if (typeof provider === 'object') {
    const candidates = [
      provider.businessName,
      provider.name,
      provider.fullName,
      provider.displayName,
      provider.username,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c.trim();
    }
  }
  return '';
};

const Trips = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTrip, setExpandedTrip] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const {
    data: bookings,
    loading,
    error,
    meta,
    goToPage,
    setLimit,
    refresh,
    setSearchTerm: setPaginationSearch,
  } = usePagination({
    fetchFn: getMyBookings,
    initialParams: {
      status: 'all',
      limit: PAGINATION.DEFAULT_LIMIT,
      sort: '-createdAt',
    },
    dataKey: 'bookings',
  });

  useRefreshOn(
    ['bookings', 'bookings:traveler', 'dashboard'],
    refresh
  );

  const upcomingBookings = useMemo(
    () =>
      bookings.filter((b) =>
        ['paid', 'confirmed', 'pending_payment', 'in_progress'].includes(
          b.status
        )
      ),
    [bookings]
  );

  const pastBookings = useMemo(
    () =>
      bookings.filter((b) =>
        ['completed', 'cancelled', 'rejected', 'refunded'].includes(
          b.status
        )
      ),
    [bookings]
  );

  const currentBookings = useMemo(
    () => (activeTab === 'upcoming' ? upcomingBookings : pastBookings),
    [activeTab, upcomingBookings, pastBookings]
  );

  const handleSearch = useCallback(
    (value) => {
      setSearchTerm(value);
      setPaginationSearch(value);
    },
    [setPaginationSearch]
  );

  const handleCancel = async (bookingId) => {
    const reason = window.prompt(
      'Please tell us why you want to cancel this booking:',
      'I need to change my travel plans'
    );

    if (reason === null) return;
    const cancellationReason =
      reason.trim() || 'User requested cancellation';

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel this booking?\n\nReason: ${cancellationReason}`
    );
    if (!confirmCancel) return;

    try {
      setCancelling(bookingId);
      await cancelBooking(bookingId, cancellationReason);
      await refresh();
      refreshMany(
        'bookings',
        'bookings:traveler',
        'bookings:provider',
        'dashboard'
      );
      toast.success('Booking cancelled successfully');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to cancel booking'
      );
    } finally {
      setCancelling(null);
    }
  };

  const getEntity = (booking) => {
    if (!booking) return {};
    if (
      booking.listing &&
      typeof booking.listing === 'object' &&
      booking.listing._id
    ) {
      return booking.listing;
    }
    if (
      booking.tour &&
      typeof booking.tour === 'object' &&
      booking.tour._id
    ) {
      return booking.tour;
    }
    if (booking.title || booking.coverImage || booking.coverMedia) {
      return booking;
    }
    return {};
  };

  const getEntityMedia = (entity) => {
    if (!entity || typeof entity === 'string') {
      return {
        isVideo: false,
        videoUrl: null,
        poster: FALLBACK_IMAGE,
        imageUrl: FALLBACK_IMAGE,
      };
    }

    const coverType = getCoverMediaType(entity);
    const coverUrl = getCoverMedia(entity);
    const videoUrl = getCoverVideo(entity);
    const hasVideoContent = hasVideo(entity);

    let poster = FALLBACK_IMAGE;
    if (entity.coverImage) {
      poster = getImageUrl(entity.coverImage) || FALLBACK_IMAGE;
    } else if (
      Array.isArray(entity.galleryImages) &&
      entity.galleryImages.length
    ) {
      poster = getImageUrl(entity.galleryImages[0]) || FALLBACK_IMAGE;
    } else if (Array.isArray(entity.images) && entity.images.length) {
      poster = getImageUrl(entity.images[0]) || FALLBACK_IMAGE;
    } else if (entity.image) {
      poster = getImageUrl(entity.image) || FALLBACK_IMAGE;
    }

    const imageUrl = coverUrl || FALLBACK_IMAGE;

    if ((coverType === 'video' || hasVideoContent) && videoUrl) {
      return { isVideo: true, videoUrl, poster, imageUrl };
    }

    return { isVideo: false, videoUrl: null, poster: imageUrl, imageUrl };
  };

  const getTravelDate = (booking) =>
    booking.startDate || booking.travelDate || null;
  const getTravelers = (booking) =>
    booking.numberOfPeople || booking.travelers || 1;
  const getTotalPrice = (booking) => booking.totalPrice || 0;
  const canCancel = (status) =>
    ['pending_payment', 'paid', 'confirmed'].includes(status);
  const canPay = (status) => status === 'pending_payment';
  const canReview = (status) =>
    status === 'completed' || status === 'review_eligible';

  const getStatusColor = (status) => {
    const colors = {
      pending_payment: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
      paid: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20',
      confirmed: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20',
      in_progress: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20',
      completed: 'bg-green-100 text-green-600 border-green-200',
      cancelled: 'bg-red-100 text-red-600 border-red-200',
      rejected: 'bg-red-100 text-red-600 border-red-200',
      refunded: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return colors[status] || colors.pending_payment;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending_payment: 'Awaiting Payment',
      paid: 'Paid',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
      refunded: 'Refunded',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending_payment: Clock,
      paid: CheckCircle,
      confirmed: CheckCircle,
      in_progress: Clock,
      completed: CheckCircle,
      cancelled: XCircle,
      rejected: XCircle,
      refunded: CheckCircle,
    };
    return icons[status] || Clock;
  };

  const MediaDisplay = ({ media, title, className }) => {
    const [videoError, setVideoError] = React.useState(false);
    const [imageError, setImageError] = React.useState(false);

    if (media.isVideo && media.videoUrl && !videoError) {
      return (
        <video
          key={media.videoUrl}
          src={media.videoUrl}
          className={className || 'w-full h-full object-cover'}
          autoPlay
          muted
          loop
          playsInline
          poster={media.poster}
          onError={() => setVideoError(true)}
        />
      );
    }

    const imageSrc = imageError ? FALLBACK_IMAGE : media.imageUrl;
    return (
      <img
        src={imageSrc}
        alt={title || 'Trip image'}
        className={className || 'w-full h-full object-cover'}
        onError={() => setImageError(true)}
      />
    );
  };

  const TripCard = ({ booking }) => {
    const entity = getEntity(booking);
    const StatusIcon = getStatusIcon(booking.status);
    const isExpanded = expandedTrip === booking._id;
    const travelDate = getTravelDate(booking);
    const travelers = getTravelers(booking);
    const totalPrice = getTotalPrice(booking);
    const isCancellable = canCancel(booking.status);
    const isPayable = canPay(booking.status);
    const isReviewable = canReview(booking.status);

    const media = getEntityMedia(entity);
    const entityTitle = entity.title || booking.title || 'Experience';
    const entityLocation =
      entity.location || booking.location || 'Location not specified';
    const providerName = getProviderName(
      booking.provider || entity.provider
    );

    return (
      <Card
        hover
        className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-3xl"
      >
        <div className="grid md:grid-cols-3">
          <div className="relative md:col-span-1 bg-gray-100 dark:bg-gray-800 min-h-[192px] md:min-h-full overflow-hidden">
            <MediaDisplay
              media={media}
              title={entityTitle}
              className="w-full h-48 md:h-full object-cover"
            />

            <div className="absolute top-3 left-3">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                  booking.status
                )}`}
              >
                <StatusIcon className="w-3 h-3" />
                {getStatusLabel(booking.status)}
              </span>
            </div>

            {totalPrice > 0 && (
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3" />${totalPrice}
              </div>
            )}
          </div>

          <div className="md:col-span-2 p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-bold text-[#374151] dark:text-white line-clamp-1">
                  {entityTitle}
                </h3>
                <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mt-1">
                  <MapPin className="w-4 h-4 mr-1 text-[#0D9488]" />
                  <span>{entityLocation}</span>
                </div>
                {providerName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    by{' '}
                    <span className="text-[#0D9488] font-semibold">
                      {providerName}
                    </span>
                  </p>
                )}
                {booking.bookingCode && (
                  <p className="text-xs text-gray-400 mt-1">
                    Booking Reference:{' '}
                    <span className="font-mono text-[#0D9488]">
                      {booking.bookingCode}
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={() =>
                  setExpandedTrip(isExpanded ? null : booking._id)
                }
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 mr-2 text-[#0D9488]" />
                <span className="text-sm">
                  {travelDate
                    ? new Date(travelDate).toLocaleDateString()
                    : 'Date not set'}
                </span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                <Users className="w-4 h-4 mr-2 text-[#F59E0B]" />
                <span className="text-sm">
                  {travelers} {travelers > 1 ? 'Travelers' : 'Traveler'}
                </span>
              </div>
            </div>

            {isExpanded && (
              <div className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 animate-fade-in">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {booking.bookingCode && (
                    <div>
                      <p className="text-gray-500">Booking Reference</p>
                      <p className="font-mono font-semibold text-[#0D9488] text-xs">
                        {booking.bookingCode}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Payment</p>
                    <p
                      className={`font-semibold ${
                        booking.paymentStatus === 'paid'
                          ? 'text-[#0D9488]'
                          : booking.paymentStatus === 'failed'
                          ? 'text-red-500'
                          : 'text-[#F59E0B]'
                      }`}
                    >
                      {formatPaymentStatus(booking.paymentStatus)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Total Price</p>
                    <p className="font-bold text-[#0D9488]">${totalPrice}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link to={`/trip/${booking._id}`} className="flex-1">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition text-sm"
                >
                  View Details
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>

              {isPayable && (
                <Link to={`/payment/${booking._id}`} className="flex-1">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-[#F59E0B] text-white hover:bg-[#F59E0B]/80 transition text-sm"
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    Pay Now
                  </Button>
                </Link>
              )}

              {isCancellable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel(booking._id)}
                  disabled={cancelling === booking._id}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  {cancelling === booking._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Cancel'
                  )}
                </Button>
              )}

              {isReviewable && !booking.reviewSubmitted && (
                <Link to={`/review/${booking._id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#0D9488] text-white hover:bg-[#0D9488]/80 transition text-sm"
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Review
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center max-w-7xl mx-auto px-4">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
          Failed to Load Trips
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in pb-20 md:pb-6">
      {/* ✅ SHARED TRAVELER TABS — top of page */}
      <TravelerTabs variant="trips" />

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#374151] dark:text-white">
                My Trips
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {meta.total} total bookings • Manage your upcoming and
                past adventures
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4 text-[#0D9488]" />
          <span>
            {bookings.length}{' '}
            {bookings.length === 1 ? 'booking' : 'bookings'}
          </span>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search trips..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full h-10 pl-4 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition text-sm"
        />
      </div>

      {/* INTERNAL UPCOMING / PAST SUB-TABS (unchanged) */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'upcoming'
              ? 'text-[#0D9488]'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming
            <span className="text-xs bg-[#0D9488]/10 text-[#0D9488] px-2 py-0.5 rounded-full">
              {upcomingBookings.length}
            </span>
          </div>
          {activeTab === 'upcoming' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D9488]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'past'
              ? 'text-[#0D9488]'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Past Trips
            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
              {pastBookings.length}
            </span>
          </div>
          {activeTab === 'past' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D9488]" />
          )}
        </button>
      </div>

      {/* TRIP LIST */}
      {currentBookings.length > 0 ? (
        <div className="space-y-6">
          {currentBookings.map((booking) => (
            <TripCard key={booking._id} booking={booking} />
          ))}
        </div>
      ) : (
        <div className="col-span-full text-center py-16 bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800">
          {activeTab === 'upcoming' ? (
            <>
              <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-[#0D9488]" />
              </div>
              <h3 className="text-xl font-bold text-[#374151] dark:text-white mb-2">
                No upcoming trips
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Start planning your next adventure
              </p>
              <Link to="/explore">
                <Button className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition">
                  Explore Experiences
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-[#374151] dark:text-white mb-2">
                No past trips yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Your completed trips will appear here
              </p>
            </>
          )}
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

      <BackToTop />
    </div>
  );
};

export default Trips;