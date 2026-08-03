// frontend/src/pages/provider/PaymentDetails.jsx
// ✅ PROVIDER PAYMENT DETAILS PAGE

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2, Sparkles, Calendar, DollarSign, User, Building2, CheckCircle, XCircle, Clock, AlertCircle, Receipt, TrendingUp } from 'lucide-react';
import { getPaymentById } from '../../services/paymentService';
import toast from 'react-hot-toast';

const PaymentStatusBadge = ({ status }) => {
  const configs = {
    paid: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]', icon: CheckCircle, label: 'Paid' },
    pending: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', icon: Clock, label: 'Pending' },
    failed: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle, label: 'Failed' },
    refunded: { bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle, label: 'Refunded' },
  };
  const config = configs[status] || configs.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
      <Icon className="w-4 h-4" /> {config.label}
    </span>
  );
};

const ProviderPaymentDetails = () => {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPayment();
  }, [paymentId]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPaymentById(paymentId);
      if (data.success) setPayment(data.payment);
      else setError(data.message || 'Payment not found');
    } catch (err) {
      console.error('Error fetching payment:', err);
      setError(err.response?.data?.message || 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="relative w-16 h-16"><div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" /><div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" /></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading payment details...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Payment Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{error || 'The payment you\'re looking for doesn\'t exist.'}</p>
        <button onClick={() => navigate('/provider/payments')} className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition">Back to Payments</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      <button onClick={() => navigate('/provider/payments')} className="flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition">
        <ArrowLeft className="w-4 h-4" /> Back to Payments
      </button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg"><Receipt className="w-6 h-6 text-white" /></div>
          <div><h1 className="text-2xl font-black text-[#374151] dark:text-white">Payment Details</h1><p className="text-gray-500 dark:text-gray-400 text-sm font-mono">Transaction: {payment.transactionId || payment.stripePaymentId || 'N/A'}</p></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><p className="text-sm text-gray-500">Amount</p><p className="text-3xl font-bold text-[#0D9488]">${payment.amount?.toFixed(2) || '0.00'}</p><div className="mt-2">{PaymentStatusBadge({ status: payment.status })}</div></div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-500">Payment Method</p><p className="font-semibold text-[#374151] dark:text-white capitalize">{payment.paymentMethod || 'stripe'}</p></div>
            <div><p className="text-sm text-gray-500">Date</p><p className="font-semibold text-[#374151] dark:text-white">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}</p></div>
            <div><p className="text-sm text-gray-500">Platform Fee</p><p className="font-semibold text-[#0D9488]">${payment.platformFee?.toFixed(2) || '0.00'}</p></div>
            <div><p className="text-sm text-gray-500">Net Earnings</p><p className="font-semibold text-[#0D9488]">${(payment.amount - (payment.platformFee || 0)).toFixed(2)}</p></div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#F59E0B]" /> Booking & Traveler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><p className="text-sm text-gray-500">Booking Code</p><p className="font-semibold text-[#0D9488]">{payment.booking?.bookingCode || 'N/A'}</p></div>
          <div><p className="text-sm text-gray-500">Traveler</p><p className="font-semibold text-[#374151] dark:text-white">{payment.user?.name || 'N/A'}</p></div>
          <div><p className="text-sm text-gray-500">Traveler Email</p><p className="font-semibold text-[#374151] dark:text-white">{payment.user?.email || 'N/A'}</p></div>
          <div><p className="text-sm text-gray-500">Listing</p><p className="font-semibold text-[#374151] dark:text-white">{payment.listing?.title || 'N/A'}</p></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-[#0D9488]" /> Status Timeline</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3"><div className="w-3 h-3 rounded-full bg-[#0D9488] mt-1.5 flex-shrink-0" /><div><p className="font-semibold text-[#374151] dark:text-white">Payment Created</p><p className="text-sm text-gray-500">{new Date(payment.createdAt).toLocaleString()}</p></div></div>
          {payment.paidAt && <div className="flex items-start gap-3"><div className="w-3 h-3 rounded-full bg-[#0D9488] mt-1.5 flex-shrink-0" /><div><p className="font-semibold text-[#374151] dark:text-white">Payment Completed</p><p className="text-sm text-gray-500">{new Date(payment.paidAt).toLocaleString()}</p></div></div>}
          {payment.refundedAt && <div className="flex items-start gap-3"><div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 flex-shrink-0" /><div><p className="font-semibold text-red-500">Refunded</p><p className="text-sm text-gray-500">{new Date(payment.refundedAt).toLocaleString()}</p></div></div>}
        </div>
      </div>
    </div>
  );
};

export default ProviderPaymentDetails;