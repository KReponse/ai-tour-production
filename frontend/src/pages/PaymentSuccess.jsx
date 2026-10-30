// src/pages/PaymentSuccess.jsx
// ============================================================
// AI TOUR - PAYMENT SUCCESS PAGE  (FINAL)
// ============================================================
// ✅ Waits for AuthContext to finish loading before verify
// ✅ Sends Authorization only if token is present
// ✅ Never throws "Authentication required" client-side
// ✅ Handles cross-origin / anonymous Stripe returns gracefully
// ✅ Guards every rendered field against objects (React safe)
// ✅ Trusts only backend-verified payment status
// ✅ After successful verification, broadcasts all affected
//    data domains so Trips, Dashboard, BookingDetails,
//    TripDetails, provider Bookings, and admin Payments
//    update without a page reload.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Sparkles,
  Calendar,
  Home,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { verifyPayment } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { refreshMany } from '../utils/dataRefresh';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// Safe string coercer — never returns an object
const toStr = (val, fallback = '') => {
  if (val == null) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (typeof val.en === 'string') return val.en;
    if (typeof val.fr === 'string') return val.fr;
    if (typeof val.rw === 'string') return val.rw;
    if (typeof val.name === 'string') return val.name;
    if (typeof val.text === 'string') return val.text;
    if (typeof val.value === 'string') return val.value;
    if (typeof val.to === 'string') return val.to;
    if (typeof val.from === 'string') return val.from;
    if (typeof val.formatted === 'string') return val.formatted;
    if (typeof val.title === 'string') return val.title;
    const firstString = Object.values(val).find((v) => typeof v === 'string');
    if (firstString) return firstString;
  }
  return fallback;
};

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');

  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');

  // Prevent duplicate in-flight verification
  const inFlightRef = useRef(false);
  // Track whether we've already run once with auth ready
  const hasRunWithAuthRef = useRef(false);
  // Track whether we've already broadcast a success for this session
  const hasBroadcastRef = useRef(false);

  const verifyPaymentStatus = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      setLoading(true);
      setError('');

      // SECURITY: booking_id alone is NOT proof of payment.
      // The Stripe session ID is what proves it.
      if (!sessionId) {
        setError(
          'Payment confirmation is still being prepared. No payment session was provided.'
        );
        setLoading(false);
        return;
      }

      const response = await verifyPayment(sessionId);

      if (!response?.success) {
        throw new Error(
          response?.message || 'Payment verification failed.'
        );
      }

      const verifiedPayment =
        response.payment || response.data?.payment || null;

      const verifiedBooking =
        response.booking || response.data?.booking || null;

      const paymentStatus =
        verifiedPayment?.status ||
        response.status ||
        response.data?.status ||
        '';

      const normalizedPaymentStatus = String(paymentStatus).toLowerCase();

      if (
        normalizedPaymentStatus &&
        normalizedPaymentStatus !== 'paid' &&
        normalizedPaymentStatus !== 'succeeded'
      ) {
        setError(
          'Your payment session was found, but the payment has not been confirmed yet. Please wait a moment and try again.'
        );
        setPayment(verifiedPayment);
        setBooking(verifiedBooking);
        return;
      }

      if (
        bookingId &&
        verifiedBooking?._id &&
        String(verifiedBooking._id) !== String(bookingId)
      ) {
        throw new Error('The payment session does not match this booking.');
      }

      setPayment(verifiedPayment);
      setBooking(verifiedBooking);

      // ✅ Broadcast once per payment success
      if (!hasBroadcastRef.current) {
        hasBroadcastRef.current = true;
        refreshMany(
          'bookings',
          'bookings:traveler',
          'bookings:provider',
          'payments',
          'payments:traveler',
          'payments:admin',
          'dashboard'
        );
      }
    } catch (err) {
      const status = err?.response?.status;
      const message = String(err?.message || '').toLowerCase();

      if (
        status === 401 ||
        message.includes('authentication required') ||
        message.includes('unauthorized')
      ) {
        setError(
          'Your session has expired or you are not signed in. Please sign in again to view your payment status.'
        );
      } else if (status === 404) {
        setError(
          'The payment session could not be found. Please contact AI Tour support if you completed the payment.'
        );
      } else if (status === 409) {
        setError(
          'This payment is still being processed. Please wait a moment and try again.'
        );
      } else if (status === 429) {
        setError(
          'Too many verification requests. Please wait a moment and try again.'
        );
      } else if (err?.message === 'Network Error') {
        setError(
          'Unable to connect to AI Tour. Please check your connection and try again.'
        );
      } else {
        setError(
          toStr(
            err?.response?.data?.message,
            toStr(
              err?.message,
              'Could not verify your payment. Please try again.'
            )
          )
        );
      }

      setBooking(null);
      setPayment(null);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [sessionId, bookingId]);

  // WAIT FOR AUTH BEFORE VERIFYING
  useEffect(() => {
    if (authLoading) return;

    if (!hasRunWithAuthRef.current) {
      hasRunWithAuthRef.current = true;
      verifyPaymentStatus();
    }
  }, [authLoading, verifyPaymentStatus]);

  // --------------------------------------------------
  // Helpers (unchanged)
  // --------------------------------------------------

  const getEntityTitle = () => {
    if (!booking) return 'Your Experience';
    return toStr(
      booking.listing?.title || booking.tour?.title || booking.title,
      'Your Experience'
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return 'N/A';
    return parsedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getBookingReference = () => {
    if (!booking) return 'Pending';
    return toStr(
      booking.bookingCode || booking.reference || booking._id,
      'Confirmed'
    );
  };

  const getCurrency = () => {
    return toStr(
      payment?.currency || booking?.currency || booking?.paymentCurrency,
      'USD'
    );
  };

  const getTotalPaid = () => {
    const rawAmount =
      payment?.amount ?? booking?.totalPrice ?? booking?.totalAmount ?? 0;

    const amount =
      typeof rawAmount === 'object' && rawAmount !== null
        ? rawAmount.value ?? rawAmount.amount ?? 0
        : rawAmount;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return '0.00';

    return numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isVerifiedPaid =
    !error &&
    (String(payment?.status || '').toLowerCase() === 'paid' ||
      String(payment?.status || '').toLowerCase() === 'succeeded' ||
      (!payment?.status && !!booking));

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>

        <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-400">
          Verifying your payment...
        </p>

        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 text-center">
          Please wait while we confirm your payment with AI Tour.
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // Verification failed / pending
  // --------------------------------------------------

  if (!isVerifiedPaid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 md:p-12 text-center max-w-md w-full border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-11 h-11 text-[#F59E0B]" />
          </div>

          <h1 className="text-2xl font-bold text-[#374151] dark:text-white mb-3">
            Payment Confirmation Pending
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-sm leading-6">
            {toStr(
              error,
              'We have not received final confirmation of your payment yet.'
            )}
          </p>

          {bookingId && (
            <div className="mt-5 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400">Booking Reference</p>
              <p className="text-sm font-mono font-semibold text-[#0D9488] break-all mt-1">
                {toStr(bookingId)}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-6">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full h-12 rounded-2xl bg-[#0D9488] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#0b7f74] transition-colors"
              >
                Sign In to View Payment
              </button>
            ) : (
              <button
                type="button"
                onClick={verifyPaymentStatus}
                className="w-full h-12 rounded-2xl bg-[#0D9488] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#0b7f74] transition-colors"
              >
                <Loader2 className="w-4 h-4" />
                Try Again
              </button>
            )}

            <Link
              to="/my-bookings"
              className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              View My Bookings
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Need help?{' '}
              <a
                href="mailto:support@aitour.rw"
                className="text-[#0D9488] hover:underline font-medium"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // VERIFIED SUCCESS
  // --------------------------------------------------

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 md:p-12 text-center max-w-md w-full border border-gray-100 dark:border-gray-800 animate-fade-in">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#0D9488]/10 dark:bg-[#0D9488]/20 flex items-center justify-center mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-[#F59E0B]/20 animate-ping animation-delay-150" />
            <CheckCircle className="w-12 h-12 text-[#0D9488] relative z-10" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-[#374151] dark:text-white mb-2">
          Payment Successful! 🎉
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mb-1">
          Your payment has been verified successfully.
        </p>

        <p className="text-sm text-gray-400 dark:text-gray-500">
          Your booking is now confirmed by AI Tour.
        </p>

        <div className="mt-5 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400">Booking Reference</p>
          <p className="text-lg font-bold text-[#0D9488] font-mono tracking-wider break-all">
            {getBookingReference()}
          </p>
        </div>

        {booking && (
          <div className="mt-4 text-left bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-sm py-1 gap-4">
              <span className="text-gray-500">Experience</span>
              <span className="font-medium text-[#374151] dark:text-white truncate max-w-[180px]">
                {getEntityTitle()}
              </span>
            </div>

            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Travelers</span>
              <span className="font-medium text-[#374151] dark:text-white">
                {Number(booking.numberOfPeople || booking.travelers || 1) || 1}
              </span>
            </div>

            {booking.startDate && (
              <div className="flex justify-between text-sm py-1 gap-4">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-[#374151] dark:text-white">
                  {formatDate(booking.startDate)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm py-1 border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
              <span className="text-gray-500">Total Paid</span>
              <span className="font-bold text-[#0D9488] text-lg">
                {getCurrency()} {getTotalPaid()}
              </span>
            </div>

            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Status</span>
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-[#0D9488]/10 text-[#0D9488]">
                Paid & Confirmed
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 text-left bg-gradient-to-r from-[#0D9488]/5 to-[#F59E0B]/5 rounded-2xl p-4 border border-[#0D9488]/10">
          <h3 className="text-sm font-bold text-[#374151] dark:text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0D9488]" />
            What's Next?
          </h3>

          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-[#0D9488]">✓</span>
              <span>You'll receive a confirmation email shortly.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0D9488]">✓</span>
              <span>Your booking has been confirmed.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0D9488]">✓</span>
              <span>Prepare for your amazing Rwanda adventure!</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link
            to="/my-bookings"
            className="flex-1 flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300"
          >
            <Calendar className="w-4 h-4" />
            View My Bookings
          </Link>

          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="flex-1 flex items-center justify-center gap-2 h-12 px-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
          >
            <Home className="w-4 h-4" />
            Explore More
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Need help?{' '}
            <a
              href="mailto:support@aitour.rw"
              className="text-[#0D9488] hover:underline font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;