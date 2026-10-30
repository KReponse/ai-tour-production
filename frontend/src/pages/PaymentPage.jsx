// frontend/src/pages/PaymentPage.jsx
// ============================================================
// AI TOUR - SECURE PAYMENT PAGE  (FINAL)
// ============================================================
// ✅ Origin-aware success/cancel URLs
// ✅ Multi-key extractPaymentUrl (matches every backend shape)
// ✅ Multi-key extractSessionId
// ✅ Safe rendering for populated MongoDB objects
// ✅ Multi-currency display and conversion
// ✅ Supports image and video cover media
// ✅ Never treats sessionId alone as payment success
// ✅ Redirects only when backend returns a real checkout URL
// ✅ Prevents duplicate checkout requests
// ✅ Broadcasts booking/payment domains after checkout creation
//    so Trips / Dashboard / TripDetails reflect "pending
//    payment" immediately on the next visit.
// ✅ Subscribes to booking invalidations so this page also
//    updates if a webhook or another page mutates the booking.
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

import CurrencySelector from '../components/ui/CurrencySelector';
import { getBookingById } from '../services/bookingService';
import { createCheckout } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { refreshMany } from '../utils/dataRefresh';
import useRefreshOn from '../hooks/useRefreshOn';

// ============================================================
// AI TOUR BRAND COLORS
// ============================================================

const AI_TOUR = {
  teal: '#0D9488',
  gold: '#F59E0B',
  slate: '#374151',
  white: '#FFFFFF',
};

// ============================================================
// STRIPE PROVIDER (MVP)
// ============================================================

const STRIPE_PROVIDER = {
  id: 'stripe',
  name: 'Stripe',
  description: 'Pay securely with a credit or debit card.',
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'RWF'],
};

// ============================================================
// FRONTEND API BASE
// ============================================================

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

const API_ORIGIN = API_URL.replace(/\/api$/i, '');

// ============================================================
// SAFE VALUE HELPERS
// ============================================================

const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value);

const safeNumber = (value, fallback = 0) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : fallback;
};

const safeString = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  return fallback;
};

const normalizeCurrency = (value, fallback = 'USD') => {
  const normalized = safeString(value, fallback)
    .trim()
    .toUpperCase();

  return normalized || fallback;
};

const normalizeRate = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

const getObjectId = (value) => {
  if (!value) {
    return '';
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return String(value);
  }

  if (isPlainObject(value)) {
    return safeString(value._id || value.id);
  }

  return '';
};

const getDisplayName = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    const result = String(value).trim();

    return result || fallback;
  }

  if (Array.isArray(value)) {
    return fallback;
  }

  if (isPlainObject(value)) {
    const candidates = [
      value.name,
      value.fullName,
      value.displayName,
      value.businessName,
      value.username,
      value.title,
      value.email,
      value.label,
    ];

    for (const candidate of candidates) {
      if (
        candidate !== null &&
        candidate !== undefined &&
        (
          typeof candidate === 'string' ||
          typeof candidate === 'number' ||
          typeof candidate === 'boolean'
        )
      ) {
        const result = String(candidate).trim();

        if (result) {
          return result;
        }
      }
    }
  }

  return fallback;
};

const getLocationDisplay = (location) => {
  if (!location) {
    return 'Location not specified';
  }

  if (
    typeof location === 'string' ||
    typeof location === 'number'
  ) {
    return String(location);
  }

  if (Array.isArray(location)) {
    const values = location
      .filter(
        (item) =>
          typeof item === 'string' ||
          typeof item === 'number'
      )
      .map((item) => String(item).trim())
      .filter(Boolean);

    return values.length
      ? [...new Set(values)].join(', ')
      : 'Location not specified';
  }

  if (isPlainObject(location)) {
    const parts = [
      location.address,
      location.city,
      location.state,
      location.province,
      location.district,
      location.country,
    ]
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          (
            typeof value === 'string' ||
            typeof value === 'number'
          )
      )
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (parts.length) {
      return [...new Set(parts)].join(', ');
    }

    return getDisplayName(
      location,
      'Location not specified'
    );
  }

  return 'Location not specified';
};

// ============================================================
// MEDIA HELPERS
// ============================================================

const getMediaSource = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    if (trimmed.startsWith('data:')) {
      return trimmed;
    }

    if (trimmed.startsWith('blob:')) {
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      return `${API_ORIGIN}${trimmed}`;
    }

    return `${API_ORIGIN}/uploads/${trimmed}`;
  }

  if (isPlainObject(value)) {
    return (
      getMediaSource(value.url) ||
      getMediaSource(value.path) ||
      getMediaSource(value.src)
    );
  }

  return null;
};

const looksLikeVideo = (value) => {
  const source = getMediaSource(value);

  if (!source) {
    return false;
  }

  return /\.(mp4|webm|ogg|mov|m4v)(?:$|\?)/i.test(
    source
  );
};

const normalizeMediaType = (value) => {
  const type = safeString(value)
    .trim()
    .toLowerCase();

  if (type === 'video') {
    return 'video';
  }

  if (type === 'image') {
    return 'image';
  }

  return '';
};

const getCoverMediaInfo = (listing) => {
  if (!listing) {
    return {
      type: 'image',
      source: null,
      poster: null,
    };
  }

  const explicitType = normalizeMediaType(
    listing.coverMediaType ||
      listing.cover_media_type
  );

  const coverMedia =
    listing.coverMedia ||
    listing.cover_media ||
    null;

  const coverImage =
    listing.coverImage ||
    listing.cover_image ||
    listing.thumbnail ||
    listing.posterImage ||
    listing.poster ||
    null;

  const coverVideo =
    listing.video ||
    listing.videoUrl ||
    listing.video_url ||
    null;

  if (
    explicitType === 'video' &&
    coverMedia
  ) {
    return {
      type: 'video',
      source: getMediaSource(coverMedia),
      poster: getMediaSource(coverImage),
    };
  }

  if (
    explicitType === 'image' &&
    coverMedia
  ) {
    return {
      type: 'image',
      source: getMediaSource(coverMedia),
      poster: null,
    };
  }

  if (
    coverMedia &&
    looksLikeVideo(coverMedia)
  ) {
    return {
      type: 'video',
      source: getMediaSource(coverMedia),
      poster: getMediaSource(coverImage),
    };
  }

  if (coverVideo) {
    return {
      type: 'video',
      source: getMediaSource(coverVideo),
      poster: getMediaSource(coverImage),
    };
  }

  const imageCandidates = [
    coverImage,

    Array.isArray(listing.galleryImages)
      ? listing.galleryImages[0]
      : null,

    Array.isArray(listing.images)
      ? listing.images[0]
      : null,

    listing.image,
  ];

  for (const candidate of imageCandidates) {
    const source = getMediaSource(candidate);

    if (
      source &&
      !looksLikeVideo(candidate)
    ) {
      return {
        type: 'image',
        source,
        poster: null,
      };
    }
  }

  return {
    type: 'image',
    source: null,
    poster: null,
  };
};

// ============================================================
// BOOKING HELPERS
// ============================================================

const getEntity = (booking) =>
  booking?.listing ||
  booking?.tour ||
  booking?.experience ||
  null;

const getEntityTitle = (booking) =>
  getDisplayName(
    getEntity(booking)?.title,
    'Experience'
  );

const getEntityPrice = (booking) =>
  safeNumber(
    getEntity(booking)?.price,
    0
  );

const getBookingPeople = (booking) => {
  const people = safeNumber(
    booking?.numberOfPeople ??
      booking?.travelers ??
      booking?.guests,
    1
  );

  return people > 0
    ? Math.floor(people)
    : 1;
};

const getTotalPrice = (booking) => {
  const bookingTotal = safeNumber(
    booking?.totalPrice,
    0
  );

  if (bookingTotal > 0) {
    return bookingTotal;
  }

  return (
    getEntityPrice(booking) *
    getBookingPeople(booking)
  );
};

const getBookingCurrency = (booking) =>
  normalizeCurrency(
    booking?.currency,
    'USD'
  );

// ============================================================
// PAYMENT RESPONSE HELPERS
// ============================================================

const extractResponseData = (result) => {
  if (
    result?.data &&
    typeof result.data === 'object' &&
    !Array.isArray(result.data)
  ) {
    return result.data;
  }

  return result || {};
};

const extractPaymentUrl = (result) => {
  const response = extractResponseData(result);

  const candidates = [
    response.url,
    response.paymentUrl,
    response.checkoutUrl,
    response.redirectUrl,
    response.sessionUrl,

    response.data?.url,
    response.data?.paymentUrl,
    response.data?.checkoutUrl,
    response.data?.redirectUrl,

    response.payment?.paymentUrl,
    response.payment?.checkoutUrl,
    response.payment?.url,

    response.providerResult?.paymentUrl,
    response.providerResult?.checkoutUrl,
    response.providerResult?.url,

    response.providerResult?.data?.paymentUrl,
    response.providerResult?.data?.checkoutUrl,
    response.providerResult?.data?.url,
    response.providerResult?.data?.session?.url,
    response.providerResult?.data?.checkoutSession?.url,

    response.checkout?.url,
    response.checkout?.checkoutUrl,
    response.checkout?.paymentUrl,
  ];

  for (const candidate of candidates) {
    const url = safeString(candidate).trim();

    if (/^https?:\/\//i.test(url)) {
      return url;
    }
  }

  return null;
};

const extractSessionId = (result) => {
  const response = extractResponseData(result);

  return (
    safeString(response.sessionId).trim() ||
    safeString(response.data?.sessionId).trim() ||
    safeString(response.providerResult?.providerReference).trim() ||
    safeString(response.providerResult?.data?.sessionId).trim() ||
    safeString(response.payment?.stripeSessionId).trim() ||
    safeString(response.payment?.providerReference).trim() ||
    ''
  );
};

// ============================================================
// ERROR HELPERS
// ============================================================

const getErrorMessage = (error) => {
  const status = error?.response?.status;

  const backendMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error;

  if (status === 401) {
    return 'Your session has expired. Please login again.';
  }

  if (status === 403) {
    return 'You are not authorized to make this payment.';
  }

  if (status === 404) {
    return 'Booking or payment service was not found.';
  }

  if (status === 409) {
    return (
      backendMessage ||
      'This booking already has an active payment session.'
    );
  }

  if (status === 429) {
    return 'Too many payment requests. Please wait a moment and try again.';
  }

  if (status >= 500) {
    return (
      backendMessage ||
      'Payment service is temporarily unavailable. Please try again.'
    );
  }

  if (backendMessage) {
    return safeString(
      backendMessage,
      'Payment initialization failed. Please try again.'
    );
  }

  if (error?.message) {
    return safeString(
      error.message,
      'Payment initialization failed. Please try again.'
    );
  }

  return 'Payment initialization failed. Please try again.';
};

const formatDate = (value) => {
  if (!value) {
    return 'Not specified';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not specified';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// ============================================================
// PAGE
// ============================================================

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    selectedCurrency,
    formatAmount,
    convert,
    loading: currencyLoading,
  } = useCurrency();

  const checkoutLockRef = useRef(false);
  const redirectingRef = useRef(false);

  const [booking, setBooking] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [convertedTotal, setConvertedTotal] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  // ============================================================
  // MONEY FORMATTER
  // ============================================================

  const formatMoney = (amount, currency) => {
    try {
      const value = formatAmount(amount, currency);

      return safeString(
        value,
        `${safeNumber(amount, 0)} ${normalizeCurrency(currency, 'USD')}`
      );
    } catch (formatError) {
      console.warn('Currency formatting failed:', formatError);

      return `${safeNumber(amount, 0)} ${normalizeCurrency(currency, 'USD')}`;
    }
  };

  // ============================================================
  // FETCH BOOKING
  // ============================================================

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setError('No booking was found for this payment.');
      setFetching(false);
      return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      setError('Please login to continue.');
      setFetching(false);
      window.setTimeout(() => navigate('/login'), 1200);
      return;
    }

    try {
      setFetching(true);
      setError('');

      const response = await getBookingById(bookingId, token);

      const responseData =
        response?.data && typeof response.data === 'object'
          ? response.data
          : response;

      const nextBooking = responseData?.booking;

      if (!nextBooking) {
        throw new Error('Booking not found');
      }

      setBooking(nextBooking);
    } catch (fetchError) {
      console.error('PaymentPage booking load error:', fetchError);

      const status = fetchError?.response?.status;

      if (status === 401) {
        setError('Your session has expired. Please login again.');
        window.setTimeout(() => navigate('/login'), 1200);
      } else if (status === 404) {
        setError('Booking not found.');
      } else {
        setError(
          fetchError?.message === 'Booking not found'
            ? 'Booking not found.'
            : 'Failed to load booking details. Please try again.'
        );
      }
    } finally {
      setFetching(false);
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // ✅ Auto-refresh when another page invalidates booking data
  //    (e.g. webhook confirmed payment, or provider cancelled).
  useRefreshOn(['bookings', 'bookings:traveler'], fetchBooking);

  // ============================================================
  // CONVERT DISPLAY TOTAL
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const runConversion = async () => {
      if (!booking || !selectedCurrency) {
        return;
      }

      const total = getTotalPrice(booking);
      const bookingCurrency = getBookingCurrency(booking);
      const targetCurrency = normalizeCurrency(
        selectedCurrency,
        bookingCurrency
      );

      setIsConverting(true);

      try {
        if (bookingCurrency === targetCurrency) {
          if (mounted) {
            setConvertedTotal({
              amount: total,
              currency: targetCurrency,
              formatted: formatMoney(total, targetCurrency),
              rate: 1,
              originalAmount: total,
              originalCurrency: bookingCurrency,
            });
          }
          return;
        }

        const result = await convert(
          total,
          bookingCurrency,
          targetCurrency
        );

        if (
          result?.success &&
          Number.isFinite(Number(result.convertedAmount))
        ) {
          const convertedAmount = safeNumber(
            result.convertedAmount,
            total
          );

          const rate =
            normalizeRate(result.rate) ||
            normalizeRate(result.exchangeRate) ||
            1;

          const formatted =
            safeString(result.formatted?.to) ||
            safeString(result.formatted) ||
            formatMoney(convertedAmount, targetCurrency);

          if (mounted) {
            setConvertedTotal({
              amount: convertedAmount,
              currency: targetCurrency,
              formatted,
              rate,
              originalAmount: total,
              originalCurrency: bookingCurrency,
            });
          }
        } else if (mounted) {
          setConvertedTotal({
            amount: total,
            currency: bookingCurrency,
            formatted: formatMoney(total, bookingCurrency),
            rate: 1,
            originalAmount: total,
            originalCurrency: bookingCurrency,
          });
        }
      } catch (conversionError) {
        console.error(
          'Payment display conversion failed:',
          conversionError
        );

        if (mounted) {
          setConvertedTotal({
            amount: total,
            currency: bookingCurrency,
            formatted: formatMoney(total, bookingCurrency),
            rate: 1,
            originalAmount: total,
            originalCurrency: bookingCurrency,
          });
        }
      } finally {
        if (mounted) {
          setIsConverting(false);
        }
      }
    };

    runConversion();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking, selectedCurrency]);

  // ============================================================
  // MEDIA ERROR
  // ============================================================

  const handleMediaError = () => {
    setMediaError(true);
  };

  // ============================================================
  // HANDLE PAYMENT
  // ============================================================

  const handlePayment = async (event) => {
    event.preventDefault();

    if (
      checkoutLockRef.current ||
      loading ||
      redirectingRef.current
    ) {
      return;
    }

    if (!user) {
      toast.error('Please login to continue.');
      navigate('/login');
      return;
    }

    if (!booking?._id) {
      toast.error('Booking not found. Please try again.');
      return;
    }

    const paymentStatus = safeString(
      booking.paymentStatus || booking.payment?.status,
      ''
    ).toLowerCase();

    const bookingStatus = safeString(booking.status, '').toLowerCase();

    if (paymentStatus === 'paid') {
      toast.success('This booking has already been paid.');
      navigate(`/trip/${booking._id}`);
      return;
    }

    if (
      bookingStatus === 'cancelled' ||
      bookingStatus === 'rejected'
    ) {
      toast.error('This booking is no longer available for payment.');
      return;
    }

    const bookingCurrency = getBookingCurrency(booking);

    const requestedCurrency = normalizeCurrency(
      selectedCurrency,
      bookingCurrency
    );

    const checkoutCurrency =
      STRIPE_PROVIDER.supportedCurrencies.includes(requestedCurrency)
        ? requestedCurrency
        : bookingCurrency;

    if (
      !STRIPE_PROVIDER.supportedCurrencies.includes(checkoutCurrency)
    ) {
      toast.error(
        `Stripe does not support ${checkoutCurrency} for this checkout.`
      );
      return;
    }

    checkoutLockRef.current = true;

    setLoading(true);
    setError('');

    try {
      const origin = window.location.origin;

      const successUrl =
        `${origin}/payment-success` +
        `?session_id={CHECKOUT_SESSION_ID}` +
        `&booking_id=${booking._id}`;

      const cancelUrl =
        `${origin}/payment-cancel` +
        `?booking_id=${booking._id}`;

      console.log('🔗 Checkout origin:', origin);
      console.log('🔗 successUrl:', successUrl);
      console.log('🔗 cancelUrl:', cancelUrl);
      console.log('Creating checkout session:', {
        bookingId: booking._id,
        providerId: STRIPE_PROVIDER.id,
        currency: checkoutCurrency,
      });

      const checkoutResult = await createCheckout(
        booking._id,
        STRIPE_PROVIDER.id,
        {
          currency: checkoutCurrency,
          successUrl,
          cancelUrl,
        }
      );

      console.log('Checkout service response:', checkoutResult);

      const response = extractResponseData(checkoutResult);

      if (response?.success === false) {
        const backendError =
          response?.message ||
          response?.error ||
          'Payment checkout could not be created.';

        throw new Error(
          safeString(
            backendError,
            'Payment checkout could not be created.'
          )
        );
      }

      const paymentUrl = extractPaymentUrl(checkoutResult);

      if (paymentUrl) {
        // ✅ A checkout session now exists on the backend. Broadcast
        //    so Trips / Dashboard show "pending payment" immediately
        //    if the traveler navigates away from Stripe and returns.
        refreshMany(
          'bookings',
          'bookings:traveler',
          'payments',
          'payments:traveler',
          'dashboard'
        );

        redirectingRef.current = true;
        window.location.assign(paymentUrl);
        return;
      }

      const sessionId = extractSessionId(checkoutResult);

      console.warn('Checkout created without redirect URL:', {
        sessionId,
        response,
      });

      throw new Error(
        sessionId
          ? 'Payment session was created, but Stripe did not return a checkout URL.'
          : 'Payment checkout could not be created.'
      );
    } catch (paymentError) {
      console.error('Payment initialization error:', paymentError);

      const message = getErrorMessage(paymentError);

      setError(message);
      toast.error(message);
    } finally {
      if (!redirectingRef.current) {
        checkoutLockRef.current = false;
        setLoading(false);
      }
    }
  };

  // ============================================================
  // RETRY
  // ============================================================

  const handleRetry = () => {
    setError('');
    window.location.reload();
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (fetching || currencyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0D9488]/10">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D9488]" />
          </div>

          <h1 className="text-xl font-bold text-[#374151] dark:text-white">
            Loading payment details...
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please wait while we load your booking.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE ERROR STATE
  // ============================================================

  if (!booking || (error && !booking)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>

          <h1 className="text-2xl font-black text-[#374151] dark:text-white">
            Payment Error
          </h1>

          <p className="mt-3 text-gray-500 dark:text-gray-400">
            {safeString(error, 'Unable to load this booking.')}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-xl bg-[#0D9488] px-5 py-3 font-bold text-white transition hover:bg-[#0D9488]/90"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() => navigate('/trips')}
              className="rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-3 font-bold text-[#374151] dark:text-white transition hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              My Trips
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // DISPLAY DATA
  // ============================================================

  const entity = getEntity(booking);
  const title = getEntityTitle(booking);
  const location = getLocationDisplay(entity?.location);
  const media = getCoverMediaInfo(entity);
  const mediaSource = media.source;
  const mediaType = media.type;
  const mediaPoster = media.poster;

  const providerName = getDisplayName(booking.provider, 'Provider');
  const total = getTotalPrice(booking);
  const people = getBookingPeople(booking);
  const bookingCurrency = getBookingCurrency(booking);

  const displayCurrency = normalizeCurrency(
    convertedTotal?.currency,
    bookingCurrency
  );

  const displayTotal =
    convertedTotal?.formatted ||
    formatMoney(total, displayCurrency);

  const originalAmount = safeNumber(
    convertedTotal?.originalAmount,
    total
  );

  const originalCurrency = normalizeCurrency(
    convertedTotal?.originalCurrency,
    bookingCurrency
  );

  const conversionRate = normalizeRate(convertedTotal?.rate) || 1;

  const converted =
    originalCurrency !== displayCurrency && conversionRate !== 1;

  const isPaid =
    safeString(
      booking.paymentStatus || booking.payment?.status,
      ''
    ).toLowerCase() === 'paid';

  const bookingIdDisplay = getObjectId(booking._id);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="group mb-6 flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#0D9488]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back
        </button>

        <div className="mb-8 flex flex-col gap-5 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] shadow-lg">
              <Lock className="h-7 w-7 text-white" />
            </div>

            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#0D9488]">
                AI Tour Secure Checkout
              </p>

              <h1 className="text-3xl font-black text-[#374151] dark:text-white">
                Complete Your Payment
              </h1>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your booking amount is calculated from the booking stored by the server.
              </p>
            </div>
          </div>

          <CurrencySelector
            variant="default"
            showLabel={false}
            showRefresh={true}
            align="right"
          />
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">Payment issue</p>
              <p className="mt-1 text-sm">{safeString(error)}</p>
            </div>

            <button
              type="button"
              onClick={() => setError('')}
              className="text-sm font-semibold underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {isPaid && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#0D9488]/20 bg-[#0D9488]/10 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-[#0D9488]" />

              <div>
                <p className="font-bold text-[#374151] dark:text-white">
                  This booking has already been paid.
                </p>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No additional payment is required.
                </p>
              </div>
            </div>

            <Link
              to={`/trip/${booking._id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D9488] px-5 py-3 font-bold text-white transition hover:bg-[#0D9488]/90 sm:ml-auto"
            >
              View Trip
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">

          <div className="space-y-6">

            <section className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">

              <div className="relative h-64 bg-gray-100 dark:bg-gray-800 sm:h-80">
                {mediaSource && !mediaError ? (
                  mediaType === 'video' ? (
                    <div className="relative h-full w-full">
                      <video
                        src={mediaSource}
                        poster={mediaPoster || undefined}
                        className="h-full w-full object-cover"
                        controls
                        playsInline
                        muted
                        autoPlay
                        loop
                        preload="metadata"
                        onError={handleMediaError}
                      />

                      <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                        Video
                      </div>
                    </div>
                  ) : (
                    <img
                      src={mediaSource}
                      alt={title}
                      className="h-full w-full object-cover"
                      onError={handleMediaError}
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0D9488]/10 via-white to-[#F59E0B]/10 dark:from-[#0D9488]/20 dark:via-gray-900 dark:to-[#F59E0B]/10">
                    <div className="text-center text-gray-400">
                      <ImageIcon className="mx-auto h-12 w-12" />

                      <p className="mt-2 text-sm font-medium">
                        No media available
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6">
                  <p className="mb-1 inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#374151] backdrop-blur">
                    Booking #{bookingIdDisplay.slice(-8)}
                  </p>

                  <h2 className="text-2xl font-black text-white sm:text-3xl">
                    {title}
                  </h2>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#0D9488]/10 p-2.5">
                      <MapPin className="h-5 w-5 text-[#0D9488]" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Location
                      </p>
                      <p className="mt-1 font-semibold text-[#374151] dark:text-white">
                        {location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#F59E0B]/10 p-2.5">
                      <Users className="h-5 w-5 text-[#F59E0B]" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Travelers
                      </p>
                      <p className="mt-1 font-semibold text-[#374151] dark:text-white">
                        {people} {people === 1 ? 'traveler' : 'travelers'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#0D9488]/10 p-2.5">
                      <CalendarDays className="h-5 w-5 text-[#0D9488]" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Travel date
                      </p>
                      <p className="mt-1 font-semibold text-[#374151] dark:text-white">
                        {formatDate(booking.startDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#F59E0B]/10 p-2.5">
                      <Sparkles className="h-5 w-5 text-[#F59E0B]" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Provider
                      </p>
                      <p className="mt-1 font-semibold text-[#374151] dark:text-white">
                        {providerName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40 p-4">
                  <p className="text-sm font-semibold text-[#374151] dark:text-white">
                    Payment provider
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                      <CreditCard className="h-5 w-5 text-[#374151] dark:text-white" />
                    </div>

                    <div>
                      <p className="font-bold text-[#374151] dark:text-white">
                        {STRIPE_PROVIDER.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {STRIPE_PROVIDER.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#0D9488]/10 p-2.5">
                  <ShieldCheck className="h-5 w-5 text-[#0D9488]" />
                </div>

                <div>
                  <h3 className="font-bold text-[#374151] dark:text-white">
                    Secure payment flow
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    AI Tour sends the booking ID and selected currency to the backend. The server creates the payment session, and Stripe handles the actual payment.
                  </p>

                  <p className="mt-3 text-xs font-semibold text-gray-400">
                    Payment is only considered successful after server-side verification.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-lg">

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0D9488]">
                    Order summary
                  </p>

                  <h2 className="mt-1 text-xl font-black text-[#374151] dark:text-white">
                    {title}
                  </h2>
                </div>

                <div className="rounded-xl bg-[#0D9488]/10 p-2.5">
                  <Lock className="h-5 w-5 text-[#0D9488]" />
                </div>
              </div>

              <div className="my-6 space-y-4">

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-500">
                    Price per traveler
                  </span>

                  <span className="font-semibold text-[#374151] dark:text-white">
                    {formatMoney(getEntityPrice(booking), bookingCurrency)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-500">
                    Travelers
                  </span>

                  <span className="font-semibold text-[#374151] dark:text-white">
                    × {people}
                  </span>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-500">
                        Total
                      </p>

                      <p className="mt-1 text-3xl font-black text-[#0D9488]">
                        {displayTotal}
                      </p>
                    </div>

                    <p className="text-right text-xs text-gray-400">
                      {displayCurrency}
                    </p>
                  </div>

                  {converted && (
                    <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-950/50 p-3">
                      <p className="text-xs text-gray-400">
                        Original booking amount
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#374151] dark:text-white">
                        {formatMoney(originalAmount, originalCurrency)}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        1 {originalCurrency} ≈ {conversionRate.toFixed(4)}{' '}
                        {displayCurrency}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handlePayment}>
                <button
                  type="submit"
                  disabled={loading || isPaid || isConverting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0D9488] px-5 py-4 text-base font-black text-white shadow-lg shadow-[#0D9488]/20 transition hover:bg-[#0D9488]/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating secure checkout...
                    </>
                  ) : isPaid ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Already Paid
                    </>
                  ) : (
                    <>
                      Pay {displayTotal}
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 rounded-2xl bg-[#374151]/5 dark:bg-white/5 p-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
                You will be redirected to Stripe's secure checkout page. Leaving this page before payment is confirmed will not mark your booking as paid.
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400">
                <Lock className="h-3.5 w-3.5" />
                Secure checkout
                <span className="text-gray-300">•</span>
                AI Tour
              </div>
            </section>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">
                Booking ID: {bookingIdDisplay || 'Unavailable'}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;