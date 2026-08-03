// frontend/src/pages/Payment.jsx
// ✅ COMPLETE FIXED - Removed broken API call, using local config
// ✅ Multi-provider payment support with local configuration

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CreditCard,
  Smartphone,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  ArrowLeft,
  Loader2,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Building2,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { 
  createCheckoutSession, 
  getPaymentProviders,
  getWalletBalance 
} from '../services/paymentService';
import { getBookingById } from '../services/bookingService';
import { useAuth } from '../contexts/AuthContext';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Local provider configuration (backup if API fails)
const DEFAULT_PROVIDERS = [
  { id: 'stripe', name: 'Stripe', icon: 'credit-card', isTestMode: true },
  { id: 'momo', name: 'MTN Mobile Money', icon: 'smartphone', isTestMode: true },
  { id: 'airtel', name: 'Airtel Money', icon: 'smartphone', isTestMode: true },
  { id: 'paypal', name: 'PayPal', icon: 'wallet', isTestMode: true },
  { id: 'bankTransfer', name: 'Bank Transfer', icon: 'building', isTestMode: true },
];

// Provider icons mapping
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

const Payment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // ✅ Fetch booking and providers
  useEffect(() => {
    if (bookingId) {
      fetchBooking();
      loadProviders();
    } else if (location.state?.booking) {
      setBooking(location.state.booking);
      setFetching(false);
      loadProviders();
    } else {
      setError('No booking found');
      setFetching(false);
    }
  }, [bookingId, location]);

  const fetchBooking = async () => {
    try {
      setFetching(true);
      const token = localStorage.getItem('token');
      const data = await getBookingById(bookingId, token);
      setBooking(data.booking);
    } catch (error) {
      console.error('Error fetching booking:', error);
      setError('Failed to load booking details');
    } finally {
      setFetching(false);
    }
  };

  // ✅ Load providers - uses API with fallback to local config
  const loadProviders = async () => {
    try {
      setLoadingProviders(true);
      const response = await getPaymentProviders();
      
      if (response.success && response.providers?.length > 0) {
        setProviders(response.providers);
        setPaymentMethod(response.providers[0].id);
      } else {
        // Fallback to local config
        setProviders(DEFAULT_PROVIDERS);
        setPaymentMethod('stripe');
      }
    } catch (error) {
      console.warn('Failed to fetch providers, using defaults:', error);
      setProviders(DEFAULT_PROVIDERS);
      setPaymentMethod('stripe');
    } finally {
      setLoadingProviders(false);
    }
  };

  // ✅ Get entity details
  const getEntity = () => {
    return booking?.listing || booking?.tour || null;
  };

  const getEntityTitle = () => {
    const entity = getEntity();
    return entity?.title || 'Experience';
  };

  const getEntityLocation = () => {
    const entity = getEntity();
    return entity?.location || 'Location not specified';
  };

  const getEntityPrice = () => {
    const entity = getEntity();
    return entity?.price || 0;
  };

  const getTotalPrice = () => {
    return booking?.totalPrice || (getEntityPrice() * (booking?.numberOfPeople || 1));
  };

  // ✅ Handle Payment
  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please login to continue');
      navigate('/login');
      return;
    }

    if (!booking || !booking._id) {
      alert('Booking not found. Please try again.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await createCheckoutSession(booking._id, paymentMethod);
      
      console.log('✅ Checkout response:', response);
      
      if (response.url) {
        // Redirect to payment provider
        window.location.href = response.url;
      } else if (response.sessionId) {
        // Navigate to success page
        navigate('/payment-success', {
          state: {
            sessionId: response.sessionId,
            bookingId: booking._id,
            provider: paymentMethod,
          },
        });
      } else {
        setError('Failed to create payment session. Please try again.');
      }

    } catch (error) {
      console.error('❌ Payment error:', error);
      setError(error.response?.data?.message || 'Payment initialization failed');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (fetching || loadingProviders) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    );
  }

  // Error state
  if (error || !booking) {
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

  const total = getTotalPrice();
  const entity = getEntity();
  const entityTitle = getEntityTitle();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back</span>
      </button>

      {/* ERROR */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-8">

          {/* HEADER */}
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
                  Complete your booking securely with your preferred method.
                </p>
              </div>
            </div>
          </div>

          {/* EXPERIENCE SUMMARY */}
          <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
            <h2 className="text-2xl font-bold mb-4 text-[#374151] dark:text-white">
              Booking Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Experience</span>
                <span className="font-semibold text-[#374151] dark:text-white">
                  {entityTitle}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="font-semibold text-[#374151] dark:text-white">
                  {getEntityLocation()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Travelers</span>
                <span className="font-semibold text-[#374151] dark:text-white">
                  {booking.numberOfPeople || 1}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Travel Date</span>
                <span className="font-semibold text-[#374151] dark:text-white">
                  {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-[#374151] dark:text-white">
                    Total
                  </span>
                  <span className="text-3xl font-bold text-[#0D9488]">
                    ${total}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* PAYMENT FORM */}
          <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
            <h2 className="text-2xl font-bold mb-6 text-[#374151] dark:text-white">
              Payment Details
            </h2>

            <form onSubmit={handlePayment} className="space-y-5">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium mb-3 text-[#374151] dark:text-white">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {providers.map((provider) => {
                    const Icon = providerIcons[provider.id] || CreditCard;
                    const colorClass = providerColors[provider.id] || 'from-gray-500 to-gray-600';
                    const isSelected = paymentMethod === provider.id;
                    
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setPaymentMethod(provider.id)}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          isSelected
                            ? `border-[#0D9488] bg-[#0D9488]/10 dark:bg-[#0D9488]/20 shadow-lg shadow-[#0D9488]/20`
                            : 'border-gray-200 dark:border-gray-700 hover:border-[#0D9488]/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${colorClass} flex items-center justify-center mx-auto mb-2`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className={`text-sm font-medium text-center ${
                          isSelected ? 'text-[#0D9488]' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {provider.name}
                        </p>
                        {provider.isTestMode && (
                          <span className="text-[8px] text-gray-400 block text-center mt-1">Test Mode</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
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
                    Pay ${total} with {providers.find(p => p.id === paymentMethod)?.name || 'Stripe'}
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-gray-400">
                🔒 Your payment is secure and encrypted
              </p>
            </form>
          </Card>
        </div>

        {/* RIGHT SIDEBAR */}
        <div>
          <Card className="p-6 rounded-3xl sticky top-24 border border-gray-100 dark:border-gray-800 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-[#374151] dark:text-white">
              Order Summary
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Booking ID</span>
                <span className="font-semibold text-[#374151] dark:text-white text-xs">
                  {booking.bookingCode || booking._id?.slice(0, 8) || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Experience</span>
                <span className="font-semibold text-[#374151] dark:text-white text-sm text-right max-w-[55%]">
                  {entityTitle}
                </span>
              </div>

              <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Travelers</span>
                <span className="font-semibold text-[#374151] dark:text-white">
                  {booking.numberOfPeople || 1}
                </span>
              </div>

              <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-[#374151] dark:text-white">
                  ${total}
                </span>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <span className="text-xl font-bold text-[#374151] dark:text-white">
                  Total
                </span>
                <span className="text-3xl font-bold text-[#0D9488]">
                  ${total}
                </span>
              </div>
            </div>

            {/* Trust Badge */}
            <div className="mt-6 p-4 rounded-2xl bg-[#0D9488]/10 dark:bg-[#0D9488]/20 border border-[#0D9488]/20 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#0D9488] flex-shrink-0" />
              <p className="text-sm text-[#0D9488] dark:text-[#0D9488]">
                Your payment is protected and encrypted.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Payment;