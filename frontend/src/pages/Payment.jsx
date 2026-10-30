// frontend/src/pages/Payment.jsx
//
// Payment page
// - Backend provider list is the source of truth
// - Frontend never declares payment successful
// - Stripe Checkout redirects using backend-provided URL
// - A sessionId alone is NOT treated as a successful payment
// - Booking/payment amount shown here is for display; backend remains authoritative
// - AI Tour brand colors preserved

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CreditCard,
  Smartphone,
  Wallet,
  ShieldCheck,
  Sparkles,
  Lock,
  ArrowLeft,
  Loader2,
  Building2,
  AlertCircle,
} from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

import {
  createCheckoutSession,
  getPaymentProviders,
} from '../services/paymentService';

import { getBookingById } from '../services/bookingService';
import { useAuth } from '../contexts/AuthContext';

// =====================================================
// AI TOUR BRAND COLORS
// =====================================================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// =====================================================

// IMPORTANT:
// This is only a UI fallback.
// It must NEVER be used to invent payment providers.
// Current backend logs show Stripe is the active provider.
//
// Do not add MTN/Airtel/PayPal here unless the backend
// actually exposes those providers as available.
const FALLBACK_PROVIDER = {
  id: 'stripe',
  name: 'Stripe',
  icon: 'credit-card',
  isTestMode: false,
};

// Provider icons
const providerIcons = {
  stripe: CreditCard,
  momo: Smartphone,
  airtel: Smartphone,
  paypal: Wallet,
  bankTransfer: Building2,
};

// Provider colors
const providerColors = {
  stripe: 'from-blue-500 to-blue-600',
  momo: 'from-yellow-500 to-yellow-600',
  airtel: 'from-red-500 to-red-600',
  paypal: 'from-blue-400 to-indigo-500',
  bankTransfer: 'from-green-500 to-green-600',
};

// Normalize API responses without assuming one exact axios shape.
const unwrapResponse = (response) => {
  return response?.data ?? response ?? {};
};

// Safely extract a human-readable error message.
const getErrorMessage = (error, fallback = 'Payment initialization failed') => {
  const apiData = error?.response?.data;

  return (
    apiData?.message ||
    apiData?.error ||
    error?.message ||
    fallback
  );
};

const Payment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(false);

  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [providers, setProviders] = useState([]);

  // Prevent accidental duplicate checkout requests.
  const paymentRequestLock = useRef(false);

  // -----------------------------------------------------
  // Booking from navigation state
  // -----------------------------------------------------
  const stateBooking = location?.state?.booking ?? null;

  // -----------------------------------------------------
  // Fetch booking
  // -----------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const loadBooking = async () => {
      // When booking was passed through navigation state,
      // use it only when bookingId is not present.
      if (!bookingId && stateBooking) {
        if (!cancelled) {
          setBooking(stateBooking);
          setFetching(false);
        }

        return;
      }

      if (!bookingId) {
        if (!cancelled) {
          setBooking(null);
          setError('No booking found.');
          setFetching(false);
        }

        return;
      }

      try {
        setFetching(true);
        setError('');

        const token = localStorage.getItem('token');

        const response = await getBookingById(bookingId, token);
        const payload = unwrapResponse(response);

        const fetchedBooking =
          payload?.booking ??
          payload?.data?.booking ??
          payload?.data ??
          payload;

        if (!fetchedBooking) {
          throw new Error('Booking details were not returned by the server.');
        }

        if (!cancelled) {
          setBooking(fetchedBooking);
        }
      } catch (err) {
        console.error('❌ Error fetching booking:', err);

        if (!cancelled) {
          setBooking(null);
          setError(
            getErrorMessage(
              err,
              'Failed to load booking details.'
            )
          );
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    };

    loadBooking();

    return () => {
      cancelled = true;
    };
  }, [bookingId, stateBooking]);

  // -----------------------------------------------------
  // Load payment providers
  // -----------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const loadProviders = async () => {
      try {
        setLoadingProviders(true);

        const response = await getPaymentProviders();
        const payload = unwrapResponse(response);

        const apiProviders = Array.isArray(payload?.providers)
          ? payload.providers
          : Array.isArray(payload?.data?.providers)
            ? payload.data.providers
            : [];

        if (apiProviders.length > 0) {
          if (!cancelled) {
            setProviders(apiProviders);

            // Only select a provider the backend actually returned.
            const firstProvider = apiProviders[0];

            if (firstProvider?.id) {
              setPaymentMethod(firstProvider.id);
            }
          }
        } else {
          // Safe fallback: only Stripe, not a fabricated multi-provider list.
          if (!cancelled) {
            setProviders([FALLBACK_PROVIDER]);
            setPaymentMethod(FALLBACK_PROVIDER.id);
          }
        }
      } catch (err) {
        console.error('❌ Failed to fetch payment providers:', err);

        if (!cancelled) {
          // Keep only a known backend provider as fallback.
          setProviders([FALLBACK_PROVIDER]);
          setPaymentMethod(FALLBACK_PROVIDER.id);
        }
      } finally {
        if (!cancelled) {
          setLoadingProviders(false);
        }
      }
    };

    loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------
  // Entity helpers
  // -----------------------------------------------------
  const entity = useMemo(() => {
    return booking?.listing || booking?.tour || null;
  }, [booking]);

  const entityTitle = entity?.title || 'Experience';

  const entityLocation = useMemo(() => {
    const locationValue = entity?.location;

    if (!locationValue) {
      return 'Location not specified';
    }

    if (typeof locationValue === 'string') {
      return locationValue;
    }

    if (typeof locationValue === 'object') {
      return (
        locationValue?.name ||
        locationValue?.city ||
        locationValue?.district ||
        'Location not specified'
      );
    }

    return 'Location not specified';
  }, [entity]);

  // -----------------------------------------------------
  // Currency
  // -----------------------------------------------------
  const currency = useMemo(() => {
    return (
      booking?.currency ||
      entity?.currency ||
      'USD'
    ).toString().toUpperCase();
  }, [booking, entity]);

  // -----------------------------------------------------
  // Amount
  // IMPORTANT:
  // This is display-only.
  // The backend must calculate and charge the real amount.
  // -----------------------------------------------------
  const total = useMemo(() => {
    const bookingTotal = Number(booking?.totalPrice);

    if (Number.isFinite(bookingTotal) && bookingTotal > 0) {
      return bookingTotal;
    }

    const entityPrice = Number(entity?.price);
    const travelers = Number(booking?.numberOfPeople || 1);

    if (
      Number.isFinite(entityPrice) &&
      entityPrice > 0 &&
      Number.isFinite(travelers) &&
      travelers > 0
    ) {
      return entityPrice * travelers;
    }

    return 0;
  }, [booking, entity]);

  const formattedTotal = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(total);
    } catch {
      return `${currency} ${Number(total || 0).toFixed(2)}`;
    }
  }, [currency, total]);

  // -----------------------------------------------------
  // Current provider
  // -----------------------------------------------------
  const selectedProvider = useMemo(() => {
    return (
      providers.find(
        (provider) => provider?.id === paymentMethod
      ) || null
    );
  }, [providers, paymentMethod]);

  // -----------------------------------------------------
  // Payment
  // -----------------------------------------------------
  const handlePayment = async (event) => {
    event.preventDefault();

    // Prevent double-click / duplicate checkout creation.
    if (paymentRequestLock.current || loading) {
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (!booking?._id) {
      setError('Booking not found. Please try again.');
      return;
    }

    if (total <= 0) {
      setError(
        'This booking has an invalid payment amount. Please return to the booking page and try again.'
      );
      return;
    }

    if (!paymentMethod) {
      setError('Please select a payment method.');
      return;
    }

    paymentRequestLock.current = true;

    try {
      setLoading(true);
      setError('');

      console.log('💳 Creating checkout session:', {
        bookingId: booking._id,
        provider: paymentMethod,
      });

      // IMPORTANT:
      // Do not send the frontend-calculated total as the payment amount.
      // The backend must load the booking and calculate the authoritative amount.
      const response = await createCheckoutSession(
        booking._id,
        paymentMethod
      );

      const payload = unwrapResponse(response);

      console.log('✅ Checkout response:', payload);

      // Backend may return url directly or inside data.
      const checkoutUrl =
        payload?.url ||
        payload?.paymentUrl ||
        payload?.checkoutUrl ||
        payload?.data?.url ||
        payload?.data?.paymentUrl ||
        payload?.data?.checkoutUrl;

      // Stripe Checkout:
      // redirect to provider checkout page.
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      // A sessionId means a checkout session was created,
      // NOT that payment succeeded.
      //
      // Do NOT navigate to payment-success here.
      const sessionId =
        payload?.sessionId ||
        payload?.data?.sessionId ||
        payload?.checkoutSessionId ||
        payload?.data?.checkoutSessionId;

      if (sessionId) {
        console.warn(
          '⚠️ Checkout session created without redirect URL. Payment is NOT confirmed.',
          sessionId
        );

        setError(
          'Payment session was created, but the payment page URL was not returned. Please try again.'
        );

        return;
      }

      throw new Error(
        payload?.message ||
        'The payment provider did not return a checkout URL.'
      );
    } catch (err) {
      console.error('❌ Payment initialization error:', err);

      const status = err?.response?.status;

      if (status === 401) {
        setError(
          'Your session has expired. Please log in again and retry the payment.'
        );
      } else if (status === 403) {
        setError(
          'You are not authorized to pay for this booking.'
        );
      } else if (status === 404) {
        setError(
          'The booking or payment service could not be found.'
        );
      } else if (status === 409) {
        setError(
          getErrorMessage(
            err,
            'This booking already has a payment in progress.'
          )
        );
      } else if (status === 422) {
        setError(
          getErrorMessage(
            err,
            'The booking payment details are invalid.'
          )
        );
      } else if (status === 429) {
        setError(
          'Too many payment attempts. Please wait a moment and try again.'
        );
      } else if (status >= 500) {
        setError(
          'The payment service is temporarily unavailable. Please try again.'
        );
      } else {
        setError(
          getErrorMessage(
            err,
            'Unable to start the payment.'
          )
        );
      }
    } finally {
      setLoading(false);
      paymentRequestLock.current = false;
    }
  };

  // -----------------------------------------------------
  // Loading
  // -----------------------------------------------------
  if (fetching || loadingProviders) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>

        <p className="mt-4 text-gray-500">
          Loading payment details...
        </p>
      </div>
    );
  }

  // -----------------------------------------------------
  // Booking error
  // -----------------------------------------------------
  if (!booking) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4">
        <Card className="p-8 rounded-3xl text-center border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-10 h-10 text-[#0D9488]" />
          </div>

          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-4">
            No Booking Found
          </h2>

          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error || 'Please complete your booking first.'}
          </p>

          <Button
            onClick={() => navigate('/explore')}
            className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B]"
          >
            Explore Experiences
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">

      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back</span>
      </button>

      {/* Main Error */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />

          <div>
            <p className="font-medium">
              Payment could not be started
            </p>

            <p className="text-sm mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">

        {/* =================================================
            LEFT
        ================================================== */}
        <div className="lg:col-span-2 space-y-8">

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
                <Lock className="w-6 h-6 text-white" />
              </div>

              <div>
                <h1 className="text-4xl font-bold text-[#374151] dark:text-white">
                  Payment
                </h1>

                <p className="text-gray-500 dark:text-gray-400">
                  Complete your booking securely with your preferred payment method.
                </p>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
            <h2 className="text-2xl font-bold mb-4 text-[#374151] dark:text-white">
              Booking Summary
            </h2>

            <div className="space-y-3">

              <div className="flex justify-between gap-6">
                <span className="text-gray-500">
                  Experience
                </span>

                <span className="font-semibold text-[#374151] dark:text-white text-right">
                  {entityTitle}
                </span>
              </div>

              <div className="flex justify-between gap-6">
                <span className="text-gray-500">
                  Location
                </span>

                <span className="font-semibold text-[#374151] dark:text-white text-right">
                  {entityLocation}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Travelers
                </span>

                <span className="font-semibold text-[#374151] dark:text-white">
                  {booking.numberOfPeople || 1}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Travel Date
                </span>

                <span className="font-semibold text-[#374151] dark:text-white">
                  {booking.startDate
                    ? new Date(booking.startDate).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Currency
                </span>

                <span className="font-semibold text-[#374151] dark:text-white">
                  {currency}
                </span>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-[#374151] dark:text-white">
                    Total
                  </span>

                  <span className="text-3xl font-bold text-[#0D9488]">
                    {formattedTotal}
                  </span>
                </div>
              </div>

            </div>
          </Card>

          {/* Payment Methods */}
          <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800">

            <h2 className="text-2xl font-bold mb-6 text-[#374151] dark:text-white">
              Payment Details
            </h2>

            {providers.length === 0 ? (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 p-5">
                <p className="font-medium text-yellow-800 dark:text-yellow-300">
                  No payment providers are currently available.
                </p>

                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  Please try again later.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handlePayment}
                className="space-y-5"
              >

                <div>
                  <label className="block text-sm font-medium mb-3 text-[#374151] dark:text-white">
                    Select Payment Method
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                    {providers.map((provider) => {
                      const providerId = provider?.id;

                      if (!providerId) {
                        return null;
                      }

                      const Icon =
                        providerIcons[providerId] ||
                        CreditCard;

                      const colorClass =
                        providerColors[providerId] ||
                        'from-gray-500 to-gray-600';

                      const isSelected =
                        paymentMethod === providerId;

                      return (
                        <button
                          key={providerId}
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            setPaymentMethod(providerId);
                            setError('');
                          }}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            isSelected
                              ? 'border-[#0D9488] bg-[#0D9488]/10 dark:bg-[#0D9488]/20 shadow-lg shadow-[#0D9488]/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-[#0D9488]/50'
                          } disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-r ${colorClass} flex items-center justify-center mx-auto mb-2`}
                          >
                            <Icon className="w-5 h-5 text-white" />
                          </div>

                          <p
                            className={`text-sm font-medium text-center ${
                              isSelected
                                ? 'text-[#0D9488]'
                                : 'text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {provider?.name ||
                              providerId}
                          </p>

                          {provider?.isTestMode === true && (
                            <span className="text-[8px] text-gray-400 block text-center mt-1">
                              Test Mode
                            </span>
                          )}
                        </button>
                      );
                    })}

                  </div>
                </div>

                {/* Selected provider info */}
                {selectedProvider && (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-500">
                      Selected payment method
                    </p>

                    <p className="font-semibold text-[#374151] dark:text-white mt-1">
                      {selectedProvider.name ||
                        selectedProvider.id}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !paymentMethod ||
                    total <= 0 ||
                    providers.length === 0
                  }
                  className="w-full h-14 rounded-2xl text-lg bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />

                      Pay {formattedTotal}
                      {' with '}
                      {selectedProvider?.name ||
                        'payment provider'}
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-gray-400">
                  🔒 Payment confirmation is handled securely by the payment provider and verified by AI Tour.
                </p>

              </form>
            )}
          </Card>
        </div>

        {/* =================================================
            RIGHT SIDEBAR
        ================================================== */}
        <div>
          <Card className="p-6 rounded-3xl sticky top-24 border border-gray-100 dark:border-gray-800 shadow-xl">

            <h2 className="text-2xl font-bold mb-6 text-[#374151] dark:text-white">
              Order Summary
            </h2>

            <div className="space-y-4">

              <div className="flex justify-between gap-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">
                  Booking ID
                </span>

                <span className="font-semibold text-[#374151] dark:text-white text-xs text-right">
                  {booking.bookingCode ||
                    booking._id?.slice(0, 8) ||
                    'N/A'}
                </span>
              </div>

              <div className="flex justify-between gap-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">
                  Experience
                </span>

                <span className="font-semibold text-[#374151] dark:text-white text-sm text-right max-w-[55%]">
                  {entityTitle}
                </span>
              </div>

              <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">
                  Travelers
                </span>

                <span className="font-semibold text-[#374151] dark:text-white">
                  {booking.numberOfPeople || 1}
                </span>
              </div>

              <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">
                  Currency
                </span>

                <span className="font-semibold text-[#374151] dark:text-white">
                  {currency}
                </span>
              </div>

              <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">
                  Subtotal
                </span>

                <span className="font-semibold text-[#374151] dark:text-white">
                  {formattedTotal}
                </span>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <span className="text-xl font-bold text-[#374151] dark:text-white">
                  Total
                </span>

                <span className="text-3xl font-bold text-[#0D9488]">
                  {formattedTotal}
                </span>
              </div>

            </div>

            {/* Trust Badge */}
            <div className="mt-6 p-4 rounded-2xl bg-[#0D9488]/10 dark:bg-[#0D9488]/20 border border-[#0D9488]/20 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#0D9488] flex-shrink-0" />

              <p className="text-sm text-[#0D9488] dark:text-[#0D9488]">
                Your payment is protected. AI Tour confirms payment only after server-side verification.
              </p>
            </div>

          </Card>
        </div>

      </div>
    </div>
  );
};

export default Payment;