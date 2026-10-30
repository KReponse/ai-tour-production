// frontend/src/pages/BookingDetails.jsx
// ============================================================
// AI TOUR — BOOKING DETAILS PAGE
// ============================================================
// ✅ Auto-refreshes when other pages invalidate 'bookings'
//    (e.g. after canceling from TripDetails or paying from
//    PaymentSuccess).
// ✅ Cancels broadcast 'bookings', 'bookings:traveler', and
//    'dashboard' so Trips / Dashboard counters update.
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  DollarSign,
  User,
  FileText,
  Printer,
  Share2,
  Sparkles,
  AlertCircle,
  MessageCircle,
  Star,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { getBookingById, cancelBooking } from '../services/bookingService';
import { useAuth } from '../contexts/AuthContext';
import { refreshData, refreshMany } from '../utils/dataRefresh';
import useRefreshOn from '../hooks/useRefreshOn';
import toast from 'react-hot-toast';

import {
  getImageUrl,
  getCoverMedia,
  getCoverMediaType,
  getCoverVideo,
  hasVideo,
} from '../utils/mediaHelpers';

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

const BookingDetails = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view booking details');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      const data = await getBookingById(bookingId, token);
      setBooking(data.booking);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please login to view booking details');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 404) {
        setError('Booking not found');
      } else {
        setError('Failed to load booking details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // ✅ Auto-refresh when a sibling page invalidates 'bookings'
  useRefreshOn(['bookings', 'bookings:traveler'], fetchBooking);

  const handleCancel = async () => {
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
      setCancelling(true);
      await cancelBooking(bookingId, cancellationReason);
      await fetchBooking();
      refreshMany('bookings', 'bookings:traveler', 'dashboard');
      toast.success('Booking cancelled successfully');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to cancel booking'
      );
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending_payment: {
        icon: Clock,
        label: 'Awaiting Payment',
        color: 'text-[#F59E0B]',
        bg: 'bg-[#F59E0B]/10',
        border: 'border-[#F59E0B]/20',
        text: 'Awaiting Payment',
      },
      paid: {
        icon: CreditCard,
        label: 'Paid',
        color: 'text-[#0D9488]',
        bg: 'bg-[#0D9488]/10',
        border: 'border-[#0D9488]/20',
        text: 'Payment Received',
      },
      confirmed: {
        icon: CheckCircle,
        label: 'Confirmed',
        color: 'text-[#0D9488]',
        bg: 'bg-[#0D9488]/10',
        border: 'border-[#0D9488]/20',
        text: 'Confirmed',
      },
      in_progress: {
        icon: Clock,
        label: 'In Progress',
        color: 'text-[#0D9488]',
        bg: 'bg-[#0D9488]/10',
        border: 'border-[#0D9488]/20',
        text: 'Trip in Progress',
      },
      completed: {
        icon: CheckCircle,
        label: 'Completed',
        color: 'text-green-600',
        bg: 'bg-green-100',
        border: 'border-green-200',
        text: 'Trip Completed',
      },
      review_eligible: {
        icon: Star,
        label: 'Ready for Review',
        color: 'text-[#F59E0B]',
        bg: 'bg-[#F59E0B]/10',
        border: 'border-[#F59E0B]/20',
        text: 'Ready for Review',
      },
      cancelled: {
        icon: XCircle,
        label: 'Cancelled',
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'Cancelled',
      },
      failed_payment: {
        icon: XCircle,
        label: 'Payment Failed',
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'Payment Failed',
      },
    };
    return configs[status] || configs.pending_payment;
  };

  const getEntity = () => booking?.listing || booking?.tour || null;
  const getEntityLink = () => {
    if (booking?.listing) {
      const listingId = booking.listing._id || booking.listing;
      return `/listing/${listingId}`;
    }
    if (booking?.tour) {
      const tourId = booking.tour._id || booking.tour;
      return `/tour/${tourId}`;
    }
    return '#';
  };
  const getEntityTitle = () => getEntity()?.title || 'Experience';
  const getEntityLocation = () =>
    getEntity()?.location || 'Location not specified';
  const getEntityDuration = () => getEntity()?.duration || 'N/A';
  const getEntityPrice = () => getEntity()?.price || 0;
  const getEntityTravelers = () => {
    const e = getEntity();
    return e?.travelers || e?.capacity || 10;
  };

  const getEntityMedia = (entity) => {
    if (!entity) {
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

  const renderMedia = (media, title) => {
    if (media.isVideo && media.videoUrl) {
      return (
        <div className="relative w-full h-48 md:h-56 lg:h-64 bg-black rounded-2xl overflow-hidden">
          <video
            key={media.videoUrl}
            src={media.videoUrl}
            className="w-full h-full object-contain"
            controls
            autoPlay
            muted
            playsInline
            poster={media.poster}
            onError={(e) => {
              const parent = e.target.parentElement;
              e.target.style.display = 'none';
              if (parent && !parent.querySelector('img.fallback-poster')) {
                const img = document.createElement('img');
                img.src = media.poster || FALLBACK_IMAGE;
                img.className = 'w-full h-full object-cover fallback-poster';
                img.alt = title || 'Experience';
                parent.appendChild(img);
              }
            }}
          />
        </div>
      );
    }
    return (
      <div className="relative w-full h-48 md:h-56 lg:h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden">
        <img
          src={media.imageUrl}
          alt={title || 'Experience image'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = FALLBACK_IMAGE;
          }}
        />
      </div>
    );
  };

  const getUserName = () =>
    booking?.user?.name || booking?.user?.fullName || booking?.fullName || 'User';
  const getUserEmail = () => booking?.user?.email || booking?.email || 'N/A';
  const getUserPhone = () => booking?.user?.phone || booking?.phone || 'N/A';
  const getBookingCode = () =>
    booking?.bookingCode || booking?._id?.slice(-8)?.toUpperCase() || 'N/A';

  const isJWT = (str) =>
    typeof str === 'string' && str.startsWith('eyJ') && str.split('.').length >= 3;

  const getSafeCancellationReason = (reason) => {
    if (!reason) return null;
    if (isJWT(reason)) return null;
    return reason;
  };

  const safeCancellationReason = getSafeCancellationReason(
    booking?.cancellationReason
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="relative w-20 h-20">
          <div className="w-20 h-20 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-6 text-lg font-semibold text-[#374151] dark:text-white">
          Loading Booking Details...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-center p-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-[#374151] dark:text-white mb-2">
          Booking Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/90 transition"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!booking) return null;

  const statusConfig = getStatusConfig(booking.status);
  const StatusIcon = statusConfig.icon;
  const providerName = getProviderName(booking.provider);

  const canCancel = ['pending_payment', 'paid', 'confirmed'].includes(
    booking.status
  );
  const isPastExperience =
    booking.startDate && new Date(booking.startDate) < new Date();
  const isActive = [
    'pending_payment',
    'paid',
    'confirmed',
    'in_progress',
  ].includes(booking.status);
  const canReview =
    (booking.status === 'completed' ||
      booking.status === 'review_eligible') &&
    !booking.reviewSubmitted;
  const canPay =
    booking.status === 'pending_payment' &&
    booking.paymentStatus !== 'paid';
  const isEnded = ['cancelled', 'failed_payment'].includes(booking.status);

  const entity = getEntity();
  const media = getEntityMedia(entity);
  const entityTitle = getEntityTitle();
  const entityLocation = getEntityLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition mb-6 no-print"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {entity && renderMedia(media, entityTitle)}

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6 mb-6 mt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold text-[#374151] dark:text-white">
                  {entityTitle}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}
                >
                  <span className="flex items-center gap-1">
                    <StatusIcon className="w-4 h-4" />
                    {statusConfig.label}
                  </span>
                </span>
                {isActive && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-600 border border-green-200">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <MapPin className="w-4 h-4 text-[#0D9488]" />
                <span>{entityLocation}</span>
              </div>
              {providerName && (
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  by{' '}
                  <span className="text-[#0D9488] font-semibold">
                    {providerName}
                  </span>
                </p>
              )}
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Booking Reference:{' '}
                <span className="font-mono font-semibold text-[#0D9488]">
                  {getBookingCode()}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 no-print">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={() => {
                  navigator.share?.({
                    title: `Booking ${getBookingCode()}`,
                    text: `Booking for ${entityTitle}`,
                    url: window.location.href,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              {canCancel && !isPastExperience && !isEnded && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {cancelling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>{cancelling ? 'Cancelling...' : 'Cancel Booking'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F59E0B]" />
                Experience Information
              </h2>
              {entity ? (
                <div className="space-y-4">
                  <Link
                    to={getEntityLink()}
                    className="block hover:opacity-80 transition"
                  >
                    <h3 className="text-lg font-semibold text-[#0D9488]">
                      {entityTitle}
                    </h3>
                  </Link>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <MapPin className="w-4 h-4 text-[#0D9488]" />
                      <span>{entityLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Calendar className="w-4 h-4 text-[#0D9488]" />
                      <span>{getEntityDuration()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Users className="w-4 h-4 text-[#0D9488]" />
                      <span>Max {getEntityTravelers()} travelers</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <DollarSign className="w-4 h-4 text-[#0D9488]" />
                      <span>${getEntityPrice()} per person</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Experience information unavailable
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0D9488]" />
                Booking Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Booking Date
                    </label>
                    <p className="text-[#374151] dark:text-white font-medium">
                      {formatDateTime(booking.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </label>
                    <p className={`font-medium ${statusConfig.color}`}>
                      {statusConfig.text}
                    </p>
                  </div>
                  {booking.startDate && (
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Start Date
                      </label>
                      <p className="text-[#374151] dark:text-white font-medium">
                        {formatDate(booking.startDate)}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Travelers
                    </label>
                    <p className="text-[#374151] dark:text-white font-medium">
                      {booking.numberOfPeople || booking.travelers || 1}{' '}
                      person
                      {(booking.numberOfPeople || booking.travelers || 1) > 1
                        ? 's'
                        : ''}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total Amount
                    </label>
                    <p className="text-2xl font-bold text-[#0D9488]">
                      $
                      {booking.totalPrice ||
                        booking.amount ||
                        getEntityPrice() ||
                        0}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Payment
                    </label>
                    <p
                      className={`font-medium ${
                        booking.paymentStatus === 'paid'
                          ? 'text-green-600'
                          : booking.paymentStatus === 'failed'
                          ? 'text-red-500'
                          : 'text-[#F59E0B]'
                      }`}
                    >
                      {formatPaymentStatus(booking.paymentStatus)}
                    </p>
                  </div>
                </div>

                {booking.specialRequests && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Special Requests
                    </label>
                    <p className="text-[#374151] dark:text-white mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      {booking.specialRequests}
                    </p>
                  </div>
                )}

                {booking.status === 'cancelled' && safeCancellationReason && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Cancellation Reason
                    </label>
                    <p className="text-red-600 dark:text-red-400 mt-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl break-words whitespace-pre-wrap">
                      {safeCancellationReason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#0D9488]" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Full Name
                  </label>
                  <p className="text-[#374151] dark:text-white font-medium">
                    {getUserName()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </label>
                  <p className="text-[#374151] dark:text-white font-medium">
                    {getUserEmail()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Phone
                  </label>
                  <p className="text-[#374151] dark:text-white font-medium">
                    {getUserPhone()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                {entity && (
                  <Link to={getEntityLink()}>
                    <Button variant="outline" className="w-full">
                      View Experience
                    </Button>
                  </Link>
                )}
                {canPay && (
                  <Link
                    to={`/payment/${booking._id}`}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold hover:scale-[1.02] transition flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" /> Pay Now
                  </Link>
                )}
                {canReview && (
                  <Link
                    to={`/review/${booking._id}`}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold hover:scale-[1.02] transition flex items-center justify-center gap-2"
                  >
                    <Star className="w-4 h-4" /> Leave a Review
                  </Link>
                )}
                {booking.provider && (
                  <Link
                    to={`/messages?userId=${
                      booking.provider._id || booking.provider
                    }`}
                    className="w-full py-2.5 rounded-xl bg-[#0D9488] text-white hover:bg-[#0D9488]/90 transition flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" /> Contact Provider
                  </Link>
                )}
                {canCancel && !isPastExperience && !isEnded && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {cancelling ? 'Processing...' : 'Cancel Booking'}
                  </button>
                )}
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-2.5 rounded-xl bg-[#0D9488] text-white hover:bg-[#0D9488]/90 transition"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4">
                Booking Progress
              </h2>
              <div className="space-y-3">
                <ProgressStep
                  active={[
                    'pending_payment',
                    'paid',
                    'confirmed',
                    'in_progress',
                    'completed',
                    'review_eligible',
                  ].includes(booking.status)}
                  label="Booking Created"
                />
                <ProgressStep
                  active={[
                    'paid',
                    'confirmed',
                    'in_progress',
                    'completed',
                    'review_eligible',
                  ].includes(booking.status)}
                  label="Payment Received"
                />
                <ProgressStep
                  active={[
                    'confirmed',
                    'in_progress',
                    'completed',
                    'review_eligible',
                  ].includes(booking.status)}
                  label="Confirmed by Provider"
                />
                <ProgressStep
                  active={['completed', 'review_eligible'].includes(
                    booking.status
                  )}
                  label="Experience Completed"
                />
                <ProgressStep
                  gold
                  active={
                    booking.status === 'review_eligible' ||
                    (booking.status === 'completed' &&
                      !booking.reviewSubmitted)
                  }
                  label="Ready for Review"
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#0D9488]/5 to-[#F59E0B]/5 rounded-3xl border border-[#0D9488]/10 p-6">
              <h3 className="font-bold text-[#374151] dark:text-white mb-2">
                Need Help?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Have questions about your booking? Contact our support team.
              </p>
              <button
                onClick={() => navigate('/contact')}
                className="w-full py-2 rounded-xl bg-[#0D9488] text-white hover:bg-[#0D9488]/90 transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Contact Support
              </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-[#F59E0B] mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#F59E0B]" />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Secure booking • Best price guarantee • 24/7 support
              </p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .min-h-screen { min-height: auto !important; padding: 0 !important; }
          .max-w-4xl { max-width: 100% !important; margin: 0 !important; }
          button { display: none !important; }
          a { text-decoration: none !important; }
          .bg-white { background: white !important; }
          .shadow-lg { box-shadow: none !important; }
          .border { border: 1px solid #e5e7eb !important; }
        }
      ` }} />
    </div>
  );
};

const ProgressStep = ({ active, gold = false, label }) => (
  <div className="flex items-center gap-3">
    <div
      className={`w-3 h-3 rounded-full ${
        active
          ? gold
            ? 'bg-[#F59E0B]'
            : 'bg-[#0D9488]'
          : 'bg-gray-300'
      }`}
    />
    <span className="text-sm text-gray-600 dark:text-gray-300">
      {label}
    </span>
  </div>
);

export default BookingDetails;