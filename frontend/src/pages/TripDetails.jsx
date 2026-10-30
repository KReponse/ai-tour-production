// src/pages/TripDetails.jsx
// ============================================================
// AI TOUR — TRIP DETAILS PAGE
// ============================================================
// ✅ Auto-refreshes when other pages invalidate any booking
//    domain (e.g. canceling from Trips, provider confirming,
//    PaymentSuccess verifying payment).
// ✅ Cancel broadcasts 'bookings', 'bookings:traveler',
//    'bookings:provider', and 'dashboard' so every consumer
//    (Trips list, Dashboard counters, provider Bookings) stays
//    in sync without a page reload.
// ✅ All prior UI/UX preserved.
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
  Eye,
  Check,
  TrendingUp,
  CalendarDays,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { getBookingById, cancelBooking } from '../services/bookingService';
import { createCheckout } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { refreshMany } from '../utils/dataRefresh';
import useRefreshOn from '../hooks/useRefreshOn';
import toast from 'react-hot-toast';

import {
  getImageUrl,
  getCoverMedia,
  getCoverMediaType,
  getCoverVideo,
  hasVideo,
} from '../utils/mediaHelpers';

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

// ===============================
// PAYMENT STATUS LABELS
// ===============================
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

// ===============================
// PROVIDER NAME RESOLVER
// ===============================
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

const TripDetails = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const data = await getBookingById(bookingId, token);
      setBooking(data.booking);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please login to view trip details');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 404) {
        setError('Trip not found');
      } else {
        setError('Failed to load trip details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // ✅ Auto-refresh when another page mutates any booking
  useRefreshOn(['bookings', 'bookings:traveler'], fetchBooking);

  const handleCancel = async () => {
    const reason = window.prompt(
      'Please tell us why you want to cancel this trip:',
      'I need to change my travel plans'
    );

    if (reason === null) return;
    const cancellationReason =
      reason.trim() || 'User requested cancellation';

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel this trip?\n\nReason: ${cancellationReason}`
    );
    if (!confirmCancel) return;

    try {
      setActionLoading(true);
      await cancelBooking(bookingId, cancellationReason);
      await fetchBooking();
      // ✅ Broadcast to every other consumer
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
      setActionLoading(false);
    }
  };

  const handlePayNow = async () => {
    try {
      setActionLoading(true);
      toast.loading('Initializing payment...');

      const result = await createCheckout(bookingId);

      if (result.url) {
        toast.dismiss();
        window.location.href = result.url;
      } else {
        toast.dismiss();
        toast.error('Failed to create payment session');
      }
    } catch (err) {
      toast.dismiss();
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to initiate payment. Please try again.';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
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

  // ===============================
  // ENTITY RESOLVERS
  // ===============================
  const getEntity = () => booking?.listing || booking?.tour || null;
  const getEntityTitle = () => getEntity()?.title || 'Experience';
  const getEntityLocation = () =>
    getEntity()?.location || 'Location not specified';

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

  const getBookingCode = () => booking?.bookingCode || 'N/A';

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
        icon: TrendingUp,
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

  const canCancel = () =>
    ['pending_payment', 'paid', 'confirmed'].includes(booking?.status);
  const canPay = () => booking?.status === 'pending_payment';
  const canReview = () =>
    (booking?.status === 'completed' ||
      booking?.status === 'review_eligible') &&
    !booking?.reviewSubmitted;
  const isPastTrip = () =>
    booking?.startDate && new Date(booking.startDate) < new Date();

  // ===============================
  // MEDIA RENDERER (clean)
  // ===============================
  const renderMedia = (media, title) => {
    if (media.isVideo && media.videoUrl) {
      return (
        <div className="relative w-full h-64 md:h-72 lg:h-80 bg-black rounded-2xl overflow-hidden">
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
                img.className =
                  'w-full h-full object-cover fallback-poster';
                img.alt = title || 'Experience';
                parent.appendChild(img);
              }
            }}
          />
        </div>
      );
    }

    return (
      <div className="relative w-full h-64 md:h-72 lg:h-80 bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden">
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="relative w-20 h-20">
          <div className="w-20 h-20 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-6 text-lg font-semibold text-[#374151] dark:text-white">
          Loading Trip Details...
        </p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-center p-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-[#374151] dark:text-white mb-2">
          Trip Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {error || "The trip you're looking for doesn't exist."}
        </p>
        <button
          onClick={() => navigate('/trips')}
          className="mt-6 px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/90 transition"
        >
          View My Trips
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(booking.status);
  const StatusIcon = statusConfig.icon;
  const entity = getEntity();
  const entityTitle = getEntityTitle();
  const entityLocation = getEntityLocation();
  const media = getEntityMedia(entity);
  const providerName = getProviderName(
    booking.provider || entity?.provider
  );
  const isActive = [
    'pending_payment',
    'paid',
    'confirmed',
    'in_progress',
  ].includes(booking.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate('/trips')}
          className="flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition mb-6 no-print"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to My Trips</span>
        </button>

        {/* Media */}
        {renderMedia(media, entityTitle)}

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6 mt-6">
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
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={() => {
                  navigator.share?.({
                    title: `Trip ${getBookingCode()}`,
                    text: `Trip: ${entityTitle}`,
                    url: window.location.href,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#0D9488]" />
            Trip Timeline
          </h2>
          <div className="relative">
            <div className="flex items-center justify-between">
              {[
                { label: 'Booking Created', status: true },
                {
                  label: 'Payment',
                  status: [
                    'paid',
                    'confirmed',
                    'in_progress',
                    'completed',
                    'review_eligible',
                  ].includes(booking.status),
                },
                {
                  label: 'Confirmed',
                  status: [
                    'confirmed',
                    'in_progress',
                    'completed',
                    'review_eligible',
                  ].includes(booking.status),
                },
                {
                  label: 'In Progress',
                  status: [
                    'in_progress',
                    'completed',
                    'review_eligible',
                  ].includes(booking.status),
                },
                {
                  label: 'Completed',
                  status: ['completed', 'review_eligible'].includes(
                    booking.status
                  ),
                },
              ].map((step, index) => (
                <div
                  key={step.label}
                  className="flex flex-col items-center flex-1"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step.status
                        ? 'bg-[#0D9488] text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}
                  >
                    {step.status ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  <p
                    className={`text-xs mt-2 text-center ${
                      step.status
                        ? 'text-[#0D9488] font-semibold'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Experience info */}
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
                      <span>{entity.duration || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Users className="w-4 h-4 text-[#0D9488]" />
                      <span>
                        Max {entity.capacity || entity.travelers || 10}{' '}
                        travelers
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <DollarSign className="w-4 h-4 text-[#0D9488]" />
                      <span>${entity.price || 0} per person</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Experience information unavailable
                </p>
              )}
            </div>

            {/* Booking details */}
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
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Travel Date
                    </label>
                    <p className="text-[#374151] dark:text-white font-medium">
                      {booking.startDate
                        ? formatDate(booking.startDate)
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Travelers
                    </label>
                    <p className="text-[#374151] dark:text-white font-medium">
                      {booking.numberOfPeople || 1}{' '}
                      {(booking.numberOfPeople || 1) > 1
                        ? 'people'
                        : 'person'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total Amount
                    </label>
                    <p className="text-2xl font-bold text-[#0D9488]">
                      ${booking.totalPrice || 0}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Payment
                    </label>
                    <p
                      className={`font-medium ${
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
                {booking.cancellationReason && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Cancellation Reason
                    </label>
                    <p className="text-red-600 dark:text-red-400 mt-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl break-words whitespace-pre-wrap">
                      {booking.cancellationReason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact */}
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
                    {booking.user?.name || booking.fullName || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </label>
                  <p className="text-[#374151] dark:text-white font-medium">
                    {booking.user?.email || booking.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Phone
                  </label>
                  <p className="text-[#374151] dark:text-white font-medium">
                    {booking.user?.phone || booking.phone || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                {entity && (
                  <Link to={getEntityLink()}>
                    <Button variant="outline" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View Experience
                    </Button>
                  </Link>
                )}

                {canPay() && (
                  <button
                    onClick={handlePayNow}
                    disabled={actionLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold hover:scale-[1.02] transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    {actionLoading ? 'Processing...' : 'Pay Now'}
                  </button>
                )}

                {canReview() && (
                  <Link
                    to={`/review/${bookingId}`}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold hover:scale-[1.02] transition flex items-center justify-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Leave a Review
                  </Link>
                )}

                {canCancel() && !isPastTrip() && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="w-full py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                        Processing...
                      </>
                    ) : (
                      'Cancel Trip'
                    )}
                  </button>
                )}

                <button
                  onClick={() => navigate('/trips')}
                  className="w-full py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/90 transition"
                >
                  View My Trips
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#0D9488]/5 to-[#F59E0B]/5 rounded-3xl border border-[#0D9488]/10 p-6">
              <h3 className="font-bold text-[#374151] dark:text-white mb-2">
                Need Help?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Have questions about your trip? Contact our support team.
              </p>
              <button
                onClick={() => navigate('/contact')}
                className="w-full py-2 rounded-xl bg-[#0D9488] text-white hover:bg-[#0D9488]/90 transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Support
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

            <div className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-4 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400">Booking Reference</p>
              <p className="font-mono font-bold text-[#0D9488] text-sm mt-1">
                {getBookingCode()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print { display: none !important; }
              .min-h-screen { min-height: auto !important; padding: 0 !important; }
              .max-w-5xl { max-width: 100% !important; margin: 0 !important; }
              button { display: none !important; }
              a { text-decoration: none !important; }
              .bg-white { background: white !important; }
              .shadow-lg { box-shadow: none !important; }
              .border { border: 1px solid #e5e7eb !important; }
            }
          `,
        }}
      />
    </div>
  );
};

export default TripDetails;