// frontend/src/pages/traveler/PaymentDetails.jsx
// ✅ COMPLETE FIXED PAYMENT DETAILS PAGE
//
// Fixes:
// - Uses payment.traveler instead of payment.user
// - Uses backend permissions.canRefund when available
// - Never treats pending_refund as refunded
// - Never assumes a refund happened before provider/backend confirmation
// - Supports multi-currency display
// - Uses backend formatted amounts when available
// - Preserves settlement/provider amount information
// - Handles missing populated objects safely
// - Preserves AI Tour branding

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Loader2,
  Sparkles,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Receipt,
  Building2,
  CreditCard,
  User,
  Mail,
  Phone,
  ExternalLink,
} from 'lucide-react';

import {
  getPaymentById,
  downloadReceipt,
  requestRefund,
} from '../../services/paymentService';

import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AI_TOUR_COLORS = {
  teal: '#0D9488',
  gold: '#F59E0B',
  slate: '#374151',
  white: '#FFFFFF',
};

// ============================================================
// Helpers
// ============================================================

const unwrapResponse = (response) => {
  return response?.data ?? response ?? {};
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const formatMoney = (amount, currency = 'USD') => {
  const numericAmount = toNumber(amount);

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: String(currency || 'USD').toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${String(currency || 'USD').toUpperCase()} ${numericAmount.toFixed(2)}`;
  }
};

const formatDate = (value, withTime = false) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return withTime
    ? date.toLocaleString()
    : date.toLocaleDateString();
};

const getErrorMessage = (
  error,
  fallback = 'Unable to load payment details.'
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

// ============================================================
// Status configuration
// ============================================================

const STATUS_CONFIG = {
  paid: {
    bg: 'bg-[#0D9488]/10',
    text: 'text-[#0D9488]',
    icon: CheckCircle,
    label: 'Paid',
  },

  pending: {
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#F59E0B]',
    icon: Clock,
    label: 'Pending',
  },

  processing: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    icon: Clock,
    label: 'Processing',
  },

  failed: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    icon: XCircle,
    label: 'Failed',
  },

  pending_refund: {
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#F59E0B]',
    icon: Clock,
    label: 'Refund Requested',
  },

  refunded: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-300',
    icon: CheckCircle,
    label: 'Refunded',
  },
};

const PaymentStatusBadge = ({ status }) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();

  const config =
    STATUS_CONFIG[normalizedStatus] ||
    STATUS_CONFIG.pending;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}
    >
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
};

// ============================================================
// Component
// ============================================================

const PaymentDetails = () => {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [payment, setPayment] = useState(null);
  const [permissions, setPermissions] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [refunding, setRefunding] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  // ==========================================================
  // Fetch payment
  // ==========================================================

  const fetchPayment = useCallback(async () => {
    if (!paymentId) {
      setError('Payment ID is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await getPaymentById(paymentId);
      const payload = unwrapResponse(response);

      if (!payload?.success || !payload?.payment) {
        setPayment(null);
        setPermissions(null);

        setError(
          payload?.message ||
          'Payment not found.'
        );

        return;
      }

      setPayment(payload.payment);
      setPermissions(payload.permissions || null);
    } catch (err) {
      console.error('❌ Error fetching payment:', err);

      setPayment(null);
      setPermissions(null);

      setError(
        getErrorMessage(
          err,
          'Failed to load payment details.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  // ==========================================================
  // Derived values
  // ==========================================================

  const currency = useMemo(() => {
    return String(
      payment?.currency ||
      payment?.booking?.currency ||
      'USD'
    ).toUpperCase();
  }, [payment]);

  const amount = useMemo(() => {
    return toNumber(payment?.amount);
  }, [payment]);

  const tax = useMemo(() => {
    return toNumber(payment?.tax);
  }, [payment]);

  const serviceFee = useMemo(() => {
    return toNumber(payment?.serviceFee);
  }, [payment]);

  const discount = useMemo(() => {
    return toNumber(payment?.discount);
  }, [payment]);

  const subtotal = useMemo(() => {
    return amount - tax - serviceFee;
  }, [amount, tax, serviceFee]);

  const settlementAmount = useMemo(() => {
    return toNumber(payment?.settlementAmount);
  }, [payment]);

  const settlementCurrency = useMemo(() => {
    return String(
      payment?.settlementCurrency ||
      currency
    ).toUpperCase();
  }, [payment, currency]);

  const providerAmount = useMemo(() => {
    return toNumber(
      payment?.providerAmount,
      settlementAmount || amount
    );
  }, [payment, settlementAmount, amount]);

  const traveler = payment?.traveler || null;
  const provider = payment?.provider || null;
  const booking = payment?.booking || null;
  const listing = payment?.listing || null;

  const displayFormattedAmount = useMemo(() => {
    if (
      typeof payment?.formattedAmount === 'string' &&
      payment.formattedAmount.trim()
    ) {
      return payment.formattedAmount;
    }

    return formatMoney(amount, currency);
  }, [payment, amount, currency]);

  const displaySettlementAmount = useMemo(() => {
    if (
      typeof payment?.formattedSettlementAmount === 'string' &&
      payment.formattedSettlementAmount.trim()
    ) {
      return payment.formattedSettlementAmount;
    }

    if (payment?.settlementAmount == null) {
      return null;
    }

    return formatMoney(
      settlementAmount,
      settlementCurrency
    );
  }, [
    payment,
    settlementAmount,
    settlementCurrency,
  ]);

  // Backend permissions are authoritative when available.
  // Fallback uses traveler ID because backend populates "traveler".
  const canRefund = useMemo(() => {
    if (typeof permissions?.canRefund === 'boolean') {
      return (
        permissions.canRefund &&
        payment?.status === 'paid'
      );
    }

    const travelerId =
      traveler?._id ||
      traveler?.id;

    const currentUserId =
      user?._id ||
      user?.id;

    return (
      payment?.status === 'paid' &&
      travelerId &&
      currentUserId &&
      String(travelerId) === String(currentUserId)
    );
  }, [
    permissions,
    payment,
    traveler,
    user,
  ]);

  const canDownload = useMemo(() => {
    if (typeof permissions?.canDownload === 'boolean') {
      return permissions.canDownload;
    }

    return true;
  }, [permissions]);

  const paymentMethodLabel = useMemo(() => {
    const method =
      payment?.paymentMethod ||
      payment?.providerId ||
      'stripe';

    return String(method)
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }, [payment]);

  const transactionId = useMemo(() => {
    return (
      payment?.transactionId ||
      payment?.stripePaymentId ||
      payment?.providerTransactionId ||
      payment?.providerReference ||
      'N/A'
    );
  }, [payment]);

  // ==========================================================
  // Receipt
  // ==========================================================

  const handleDownloadReceipt = async () => {
    if (!paymentId || downloadingReceipt) {
      return;
    }

    try {
      setDownloadingReceipt(true);

      await downloadReceipt(paymentId);

      toast.success(
        'Receipt downloaded successfully.'
      );
    } catch (err) {
      console.error(
        '❌ Receipt download error:',
        err
      );

      toast.error(
        getErrorMessage(
          err,
          'Failed to download receipt.'
        )
      );
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // ==========================================================
  // Refund request
  // ==========================================================

  const handleRequestRefund = async () => {
    if (!canRefund || refunding) {
      return;
    }

    const reason = window.prompt(
      'Please provide a reason for the refund:'
    );

    if (reason === null) {
      return;
    }

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      toast.error(
        'Please provide a refund reason.'
      );
      return;
    }

    try {
      setRefunding(true);

      const response = await requestRefund(
        paymentId,
        trimmedReason
      );

      const payload = unwrapResponse(response);

      if (!payload?.success) {
        throw new Error(
          payload?.message ||
          'Failed to submit refund request.'
        );
      }

      toast.success(
        'Refund request submitted successfully.'
      );

      // Important:
      // Backend may change the payment to pending_refund.
      // That is only a request, not a completed refund.
      await fetchPayment();
    } catch (err) {
      console.error(
        '❌ Refund request error:',
        err
      );

      toast.error(
        getErrorMessage(
          err,
          'Failed to request refund.'
        )
      );
    } finally {
      setRefunding(false);
    }
  };

  // ==========================================================
  // Loading
  // ==========================================================

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] px-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />

          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>

        <p className="mt-4 text-gray-500 dark:text-gray-400">
          Loading payment details...
        </p>
      </div>
    );
  }

  // ==========================================================
  // Error
  // ==========================================================

  if (error || !payment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />

          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
            Payment Not Found
          </h2>

          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {error ||
              'The payment you are looking for does not exist.'}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/traveler/payments')
            }
            className="mt-6 px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/90 transition"
          >
            Back to Payments
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // Main UI
  // ==========================================================

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto px-4 py-6">

      {/* ======================================================
          BACK
      ======================================================= */}

      <button
        type="button"
        onClick={() =>
          navigate('/traveler/payments')
        }
        className="flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Payments
      </button>

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="flex items-center justify-between flex-wrap gap-4">

        <div className="flex items-center gap-3">

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Receipt className="w-6 h-6 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-[#374151] dark:text-white">
              Payment Details
            </h1>

            <p className="text-gray-500 dark:text-gray-400 text-sm font-mono break-all">
              Transaction: {transactionId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">

          {canDownload && payment.status === 'paid' && (
            <button
              type="button"
              onClick={handleDownloadReceipt}
              disabled={downloadingReceipt}
              className="px-4 py-2 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#0D9488]/90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {downloadingReceipt ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}

              {downloadingReceipt
                ? 'Preparing...'
                : 'Receipt'}
            </button>
          )}

          {canRefund && (
            <button
              type="button"
              onClick={handleRequestRefund}
              disabled={refunding}
              className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
            >
              {refunding && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}

              {refunding
                ? 'Submitting...'
                : 'Request Refund'}
            </button>
          )}
        </div>
      </div>

      {/* ======================================================
          REFUND NOTICE
      ======================================================= */}

      {payment.status === 'pending_refund' && (
        <div className="p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-start gap-3">
          <Clock className="w-5 h-5 text-[#F59E0B] mt-0.5 flex-shrink-0" />

          <div>
            <p className="font-semibold text-[#F59E0B]">
              Refund request pending
            </p>

            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Your refund request has been submitted.
              The payment has not been marked as refunded yet.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================
          PAYMENT SUMMARY
      ======================================================= */}

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Amount */}
          <div>

            <p className="text-sm text-gray-500">
              Amount Paid
            </p>

            <p className="text-3xl font-bold text-[#0D9488]">
              {displayFormattedAmount}
            </p>

            <div className="mt-3">
              <PaymentStatusBadge
                status={payment.status}
              />
            </div>

            {displaySettlementAmount && (
              <div className="mt-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500">
                  Settlement Amount
                </p>

                <p className="font-bold text-[#374151] dark:text-white mt-1">
                  {displaySettlementAmount}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Provider settlement currency: {settlementCurrency}
                </p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-5">

            <div>
              <p className="text-sm text-gray-500">
                Payment Method
              </p>

              <p className="font-semibold text-[#374151] dark:text-white mt-1 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0D9488]" />
                {paymentMethodLabel}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Currency
              </p>

              <p className="font-semibold text-[#374151] dark:text-white mt-1">
                {currency}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Date
              </p>

              <p className="font-semibold text-[#374151] dark:text-white mt-1">
                {formatDate(
                  payment.paidAt ||
                  payment.createdAt
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Receipt
              </p>

              <p className="font-semibold text-[#0D9488] mt-1">
                {payment.receiptNumber || 'N/A'}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ======================================================
          AMOUNT BREAKDOWN
      ======================================================= */}

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">

        <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#F59E0B]" />
          Amount Breakdown
        </h2>

        <div className="space-y-3">

          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-gray-500">
              Subtotal
            </span>

            <span className="font-semibold text-[#374151] dark:text-white">
              {formatMoney(subtotal, currency)}
            </span>
          </div>

          {tax > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">
                Tax
              </span>

              <span className="font-semibold text-[#374151] dark:text-white">
                {formatMoney(tax, currency)}
              </span>
            </div>
          )}

          {serviceFee > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">
                Service Fee
              </span>

              <span className="font-semibold text-[#374151] dark:text-white">
                {formatMoney(
                  serviceFee,
                  currency
                )}
              </span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 text-green-600">
              <span>
                Discount
              </span>

              <span>
                -{formatMoney(discount, currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between py-3">
            <span className="text-lg font-bold text-[#374151] dark:text-white">
              Total
            </span>

            <span className="text-xl font-bold text-[#0D9488]">
              {formatMoney(amount, currency)}
            </span>
          </div>

          {/* Provider amount / commission */}
          <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">

            <div className="flex justify-between py-2">
              <span className="text-gray-500">
                Platform Fee
              </span>

              <span className="font-semibold text-[#374151] dark:text-white">
                {formatMoney(
                  toNumber(payment.platformFee),
                  currency
                )}
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-gray-500">
                Provider Amount
              </span>

              <span className="font-semibold text-[#0D9488]">
                {formatMoney(
                  providerAmount,
                  settlementCurrency
                )}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ======================================================
          BOOKING + PROVIDER
      ======================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Booking */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">

          <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-5 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0D9488]" />
            Booking Information
          </h2>

          {booking ? (
            <div className="space-y-4">

              {listing?.title && (
                <div>
                  <p className="text-sm text-gray-500">
                    Experience
                  </p>

                  <p className="font-semibold text-[#374151] dark:text-white mt-1">
                    {listing.title}
                  </p>
                </div>
              )}

              {booking.bookingCode && (
                <div>
                  <p className="text-sm text-gray-500">
                    Booking Code
                  </p>

                  <p className="font-semibold text-[#0D9488] mt-1 font-mono">
                    {booking.bookingCode}
                  </p>
                </div>
              )}

              {booking.startDate && (
                <div>
                  <p className="text-sm text-gray-500">
                    Travel Date
                  </p>

                  <p className="font-semibold text-[#374151] dark:text-white mt-1">
                    {formatDate(
                      booking.startDate
                    )}
                  </p>
                </div>
              )}

              {booking.endDate && (
                <div>
                  <p className="text-sm text-gray-500">
                    End Date
                  </p>

                  <p className="font-semibold text-[#374151] dark:text-white mt-1">
                    {formatDate(
                      booking.endDate
                    )}
                  </p>
                </div>
              )}

              {booking.numberOfPeople != null && (
                <div>
                  <p className="text-sm text-gray-500">
                    Travelers
                  </p>

                  <p className="font-semibold text-[#374151] dark:text-white mt-1">
                    {booking.numberOfPeople}
                  </p>
                </div>
              )}

              {booking.status && (
                <div>
                  <p className="text-sm text-gray-500">
                    Booking Status
                  </p>

                  <p className="font-semibold text-[#374151] dark:text-white mt-1 capitalize">
                    {String(
                      booking.status
                    ).replace(/_/g, ' ')}
                  </p>
                </div>
              )}

            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No booking information available.
            </p>
          )}
        </div>

        {/* Provider */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">

          <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-5 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0D9488]" />
            Provider
          </h2>

          {provider ? (
            <div className="space-y-4">

              <div>
                <p className="text-sm text-gray-500">
                  Business Name
                </p>

                <p className="font-semibold text-[#374151] dark:text-white mt-1">
                  {provider.businessName ||
                    provider.name ||
                    'N/A'}
                </p>
              </div>

              {provider.email && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </p>

                  <p className="font-semibold text-[#374151] dark:text-white mt-1 break-all">
                    {provider.email}
                  </p>
                </div>
              )}

              {provider.phone && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </p>

                  <p className="font-semibold text-[#374151] dark:text-white mt-1">
                    {provider.phone}
                  </p>
                </div>
              )}

            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No provider information available.
            </p>
          )}
        </div>
      </div>

      {/* ======================================================
          TRAVELER
      ======================================================= */}

      {traveler && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">

          <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-[#0D9488]" />
            Traveler
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">

            {traveler.profileImage && (
              <img
                src={traveler.profileImage}
                alt={
                  traveler.name ||
                  'Traveler'
                }
                className="w-14 h-14 rounded-full object-cover border-2 border-[#0D9488]/20"
              />
            )}

            <div>
              <p className="font-bold text-[#374151] dark:text-white">
                {traveler.name || 'Traveler'}
              </p>

              {traveler.email && (
                <p className="text-sm text-gray-500 mt-1">
                  {traveler.email}
                </p>
              )}

              {traveler.phone && (
                <p className="text-sm text-gray-500 mt-1">
                  {traveler.phone}
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ======================================================
          STATUS TIMELINE
      ======================================================= */}

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">

        <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-5 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#0D9488]" />
          Status Timeline
        </h2>

        <div className="space-y-5">

          {/* Created */}
          <div className="flex items-start gap-3">

            <div className="w-3 h-3 rounded-full bg-[#0D9488] mt-1.5 flex-shrink-0" />

            <div>
              <p className="font-semibold text-[#374151] dark:text-white">
                Payment Created
              </p>

              <p className="text-sm text-gray-500">
                {formatDate(
                  payment.createdAt,
                  true
                )}
              </p>
            </div>
          </div>

          {/* Paid */}
          {payment.paidAt && (
            <div className="flex items-start gap-3">

              <div className="w-3 h-3 rounded-full bg-[#0D9488] mt-1.5 flex-shrink-0" />

              <div>
                <p className="font-semibold text-[#374151] dark:text-white">
                  Payment Completed
                </p>

                <p className="text-sm text-gray-500">
                  {formatDate(
                    payment.paidAt,
                    true
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Refund requested */}
          {payment.refundRequestedAt && (
            <div className="flex items-start gap-3">

              <div className="w-3 h-3 rounded-full bg-[#F59E0B] mt-1.5 flex-shrink-0" />

              <div>
                <p className="font-semibold text-[#F59E0B]">
                  Refund Requested
                </p>

                <p className="text-sm text-gray-500">
                  {formatDate(
                    payment.refundRequestedAt,
                    true
                  )}
                </p>

                {payment.refundReason && (
                  <p className="text-sm text-gray-500 mt-1">
                    Reason: {payment.refundReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Refunded */}
          {payment.refundedAt && (
            <div className="flex items-start gap-3">

              <div className="w-3 h-3 rounded-full bg-gray-500 mt-1.5 flex-shrink-0" />

              <div>
                <p className="font-semibold text-gray-600 dark:text-gray-300">
                  Refund Completed
                </p>

                <p className="text-sm text-gray-500">
                  {formatDate(
                    payment.refundedAt,
                    true
                  )}
                </p>

                {payment.refundReason && (
                  <p className="text-sm text-gray-500 mt-1">
                    Reason: {payment.refundReason}
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ======================================================
          PAYMENT IDENTIFIERS
      ======================================================= */}

      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-200 dark:border-gray-800 p-6">

        <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4">
          Payment Reference
        </h2>

        <div className="space-y-3 text-sm">

          <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <span className="text-gray-500">
              Payment ID
            </span>

            <span className="font-mono text-[#374151] dark:text-gray-300 break-all">
              {payment._id || 'N/A'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <span className="text-gray-500">
              Transaction ID
            </span>

            <span className="font-mono text-[#374151] dark:text-gray-300 break-all">
              {transactionId}
            </span>
          </div>

          {payment.stripePaymentId && (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
              <span className="text-gray-500">
                Stripe Payment ID
              </span>

              <span className="font-mono text-[#374151] dark:text-gray-300 break-all">
                {payment.stripePaymentId}
              </span>
            </div>
          )}

        </div>
      </div>

      {/* ======================================================
          TRUST
      ======================================================= */}

      <div className="p-4 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-start gap-3">

        <CheckCircle className="w-5 h-5 text-[#0D9488] mt-0.5 flex-shrink-0" />

        <p className="text-sm text-[#0D9488]">
          Payment status is displayed from the AI Tour backend.
          Refund completion is shown only after the payment system confirms it.
        </p>

      </div>
    </div>
  );
};

export default PaymentDetails;