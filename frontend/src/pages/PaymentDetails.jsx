// frontend/src/pages/traveler/PaymentDetails.jsx
// ✅ COMPLETE PAYMENT DETAILS PAGE

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Download,
  Loader2,
  Sparkles,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Receipt,
  FileText,
  Printer,
  Share2,
} from 'lucide-react';
import { getPaymentById, downloadReceipt, requestRefund } from '../../services/paymentService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const PaymentDetails = () => {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    fetchPayment();
  }, [paymentId]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPaymentById(paymentId);
      if (data.success) {
        setPayment(data.payment);
      } else {
        setError(data.message || 'Payment not found');
      }
    } catch (err) {
      console.error('Error fetching payment:', err);
      setError(err.response?.data?.message || 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      await downloadReceipt(paymentId);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  const handleRequestRefund = async () => {
    const reason = window.prompt('Please provide a reason for the refund:');
    if (reason === null) return;
    
    try {
      setRefunding(true);
      await requestRefund(paymentId, reason);
      toast.success('Refund request submitted successfully');
      fetchPayment();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request refund');
    } finally {
      setRefunding(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      paid: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]', icon: CheckCircle, label: 'Paid' },
      pending: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', icon: Clock, label: 'Pending' },
      failed: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle, label: 'Failed' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle, label: 'Refunded' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-600', icon: Clock, label: 'Processing' },
      pending_refund: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', icon: Clock, label: 'Refund Requested' },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading payment details...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Payment Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{error || 'The payment you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => navigate('/traveler/payments')}
            className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            Back to Payments
          </button>
        </div>
      </div>
    );
  }

  const canRefund = payment.status === 'paid' && payment.user._id === user._id;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto px-4 py-6">
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate('/traveler/payments')}
        className="flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Payments
      </button>

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#374151] dark:text-white">Payment Details</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-mono">
              Transaction: {payment.transactionId || payment.stripePaymentId || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {payment.status === 'paid' && (
            <button
              onClick={handleDownloadReceipt}
              className="px-4 py-2 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#0D9488]/80 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Receipt
            </button>
          )}
          {canRefund && (
            <button
              onClick={handleRequestRefund}
              disabled={refunding}
              className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
            >
              {refunding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Refund'}
            </button>
          )}
        </div>
      </div>

      {/* PAYMENT SUMMARY */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Amount</p>
            <p className="text-3xl font-bold text-[#0D9488]">${payment.amount.toFixed(2)}</p>
            <div className="mt-2">{getStatusBadge(payment.status)}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="font-semibold text-[#374151] dark:text-white capitalize">
                {payment.paymentMethod || 'stripe'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold text-[#374151] dark:text-white">
                {payment.paidAt
                  ? new Date(payment.paidAt).toLocaleDateString()
                  : new Date(payment.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Currency</p>
              <p className="font-semibold text-[#374151] dark:text-white">{payment.currency || 'USD'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Receipt</p>
              <p className="font-semibold text-[#0D9488]">{payment.receiptNumber || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AMOUNT BREAKDOWN */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#F59E0B]" />
          Amount Breakdown
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold text-[#374151] dark:text-white">${(payment.amount - (payment.tax || 0) - (payment.serviceFee || 0)).toFixed(2)}</span>
          </div>
          {payment.tax > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Tax</span>
              <span className="font-semibold text-[#374151] dark:text-white">${payment.tax.toFixed(2)}</span>
            </div>
          )}
          {payment.serviceFee > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Service Fee</span>
              <span className="font-semibold text-[#374151] dark:text-white">${payment.serviceFee.toFixed(2)}</span>
            </div>
          )}
          {payment.discount > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 text-red-500">
              <span>Discount</span>
              <span>-${payment.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-2">
            <span className="text-lg font-bold text-[#374151] dark:text-white">Total</span>
            <span className="text-xl font-bold text-[#0D9488]">${payment.amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* BOOKING & CONTACT INFO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Booking Information */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0D9488]" />
            Booking Information
          </h2>
          {payment.booking ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Booking Code</p>
                <p className="font-semibold text-[#0D9488]">{payment.booking.bookingCode}</p>
              </div>
              {payment.booking.startDate && (
                <div>
                  <p className="text-sm text-gray-500">Travel Date</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {new Date(payment.booking.startDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {payment.booking.totalPrice && (
                <div>
                  <p className="text-sm text-gray-500">Booking Total</p>
                  <p className="font-semibold text-[#374151] dark:text-white">${payment.booking.totalPrice.toFixed(2)}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No booking information available</p>
          )}
        </div>

        {/* Provider Information */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0D9488]" />
            Provider
          </h2>
          {payment.provider ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Business Name</p>
                <p className="font-semibold text-[#374151] dark:text-white">
                  {payment.provider.businessName || payment.provider.name}
                </p>
              </div>
              {payment.provider.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold text-[#374151] dark:text-white">{payment.provider.email}</p>
                </div>
              )}
              {payment.provider.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold text-[#374151] dark:text-white">{payment.provider.phone}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No provider information available</p>
          )}
        </div>
      </div>

      {/* STATUS TIMELINE */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#0D9488]" />
          Status Timeline
        </h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-[#0D9488] mt-1.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#374151] dark:text-white">Payment Created</p>
              <p className="text-sm text-gray-500">{new Date(payment.createdAt).toLocaleString()}</p>
            </div>
          </div>
          {payment.paidAt && (
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-[#0D9488] mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#374151] dark:text-white">Payment Completed</p>
                <p className="text-sm text-gray-500">{new Date(payment.paidAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          {payment.refundedAt && (
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-500">Refunded</p>
                <p className="text-sm text-gray-500">{new Date(payment.refundedAt).toLocaleString()}</p>
                {payment.refundReason && <p className="text-sm text-gray-500">Reason: {payment.refundReason}</p>}
              </div>
            </div>
          )}
          {payment.status === 'pending_refund' && (
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-[#F59E0B] mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#F59E0B]">Refund Requested</p>
                <p className="text-sm text-gray-500">{new Date(payment.refundRequestedAt || payment.updatedAt).toLocaleString()}</p>
                {payment.refundReason && <p className="text-sm text-gray-500">Reason: {payment.refundReason}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;