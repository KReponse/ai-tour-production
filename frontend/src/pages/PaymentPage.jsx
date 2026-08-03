// frontend/src/pages/PaymentPage.jsx
// ✅ COMPLETE FIXED - Fixed rate.toFixed error with safe type checking
// ✅ Multi-currency support with fallback providers

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Smartphone,
  Wallet,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Clock,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import CurrencySelector from '../components/ui/CurrencySelector';
import CurrencyBadge from '../components/ui/CurrencyBadge';
import { 
  createCheckout, 
  getPaymentProviders,
  getWalletBalance,
} from '../services/paymentService';
import { getBookingById } from '../services/bookingService';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Safe rate formatter helper
const formatRate = (rate, fromCurrency, toCurrency) => {
  if (!rate || typeof rate !== 'number') return '1:1';
  if (rate === 1) return '1:1';
  return `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
};

// ✅ Safe rate display helper
const getRateDisplay = (rate, fromCurrency, toCurrency) => {
  if (!rate || typeof rate !== 'number') return '';
  if (rate === 1) return '';
  return ` ≈ ${rate.toFixed(4)} rate`;
};

// ✅ Local provider configuration (used as fallback)
const PROVIDER_CONFIG = {
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    icon: CreditCard,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-600',
    description: 'Pay with credit or debit card',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'RWF'],
  },
  momo: {
    id: 'momo',
    name: 'MTN Mobile Money',
    icon: Smartphone,
    color: 'from-yellow-500 to-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-600',
    description: 'Pay with MTN Mobile Money',
    supportedCurrencies: ['RWF', 'USD'],
  },
  airtel: {
    id: 'airtel',
    name: 'Airtel Money',
    icon: Smartphone,
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-600',
    description: 'Pay with Airtel Money',
    supportedCurrencies: ['RWF', 'USD'],
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    icon: Wallet,
    color: 'from-blue-400 to-indigo-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-600',
    description: 'Pay with PayPal account',
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
  },
  bankTransfer: {
    id: 'bankTransfer',
    name: 'Bank Transfer',
    icon: Building2,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-600',
    description: 'Pay via bank transfer',
    supportedCurrencies: ['RWF', 'USD', 'EUR', 'GBP'],
  },
};

// ✅ Default providers list (fallback)
const DEFAULT_PROVIDERS = Object.keys(PROVIDER_CONFIG).map(id => ({
  id,
  name: PROVIDER_CONFIG[id].name,
  supportedCurrencies: PROVIDER_CONFIG[id].supportedCurrencies,
  isTestMode: true,
}));

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    selectedCurrency, 
    formatAmount, 
    convert, 
    loading: currencyLoading,
    setCurrency,
  } = useCurrency();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('stripe');
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [convertedTotal, setConvertedTotal] = useState(null);
  const [isConverting, setIsConverting] = useState(false);

  // ✅ Fetch booking and providers
  useEffect(() => {
    if (bookingId) {
      fetchBooking();
      loadProviders();
    } else {
      setError('No booking found');
      setFetching(false);
    }
  }, [bookingId]);

  // ✅ Convert total when currency or booking changes
  useEffect(() => {
    if (booking && selectedCurrency) {
      convertTotal();
    }
  }, [booking, selectedCurrency]);

  const convertTotal = async () => {
    if (!booking) return;
    
    const total = getTotalPrice();
    const bookingCurrency = booking.currency || 'USD';
    
    if (bookingCurrency === selectedCurrency) {
      setConvertedTotal({
        amount: total,
        currency: selectedCurrency,
        formatted: formatAmount(total, selectedCurrency),
        rate: 1,
      });
      return;
    }

    setIsConverting(true);
    const result = await convert(total, bookingCurrency, selectedCurrency);
    setIsConverting(false);

    if (result.success) {
      setConvertedTotal({
        amount: result.convertedAmount,
        currency: selectedCurrency,
        formatted: result.formatted?.to || formatAmount(result.convertedAmount, selectedCurrency),
        rate: result.rate,
        originalAmount: total,
        originalCurrency: bookingCurrency,
      });
    } else {
      setConvertedTotal({
        amount: total,
        currency: bookingCurrency,
        formatted: formatAmount(total, bookingCurrency),
        rate: 1,
        originalAmount: total,
        originalCurrency: bookingCurrency,
      });
    }
  };

  const fetchBooking = async () => {
    try {
      setFetching(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please login to continue');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      const data = await getBookingById(bookingId, token);
      setBooking(data.booking);
    } catch (error) {
      console.error('Error fetching booking:', error);
      
      if (error.response?.status === 401) {
        setError('Please login to view this payment');
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 404) {
        setError('Booking not found');
      } else {
        setError('Failed to load booking details. Please try again.');
      }
    } finally {
      setFetching(false);
    }
  };

  // ✅ Load providers - uses API with fallback to local config
  const loadProviders = async () => {
    try {
      setLoadingProviders(true);
      
      let providerList = [];
      
      try {
        const response = await getPaymentProviders();
        if (response.success && response.providers?.length > 0) {
          providerList = response.providers;
        }
      } catch (apiError) {
        console.warn('Failed to fetch providers from API, using defaults:', apiError);
      }
      
      // Always fallback to local config if API fails or returns empty
      if (providerList.length === 0) {
        providerList = DEFAULT_PROVIDERS;
      }
      
      setProviders(providerList);
      
      // Set default provider based on currency support
      const supported = providerList.filter(p => 
        p.supportedCurrencies?.includes(selectedCurrency)
      );
      setSelectedProvider(supported.length > 0 ? supported[0].id : providerList[0]?.id || 'stripe');
      
    } catch (error) {
      console.error('Error loading providers:', error);
      setProviders(DEFAULT_PROVIDERS);
      setSelectedProvider('stripe');
    } finally {
      setLoadingProviders(false);
    }
  };

  // ✅ Get the entity (listing)
  const getEntity = () => {
    return booking?.listing || null;
  };

  const getEntityTitle = () => {
    const entity = getEntity();
    return entity?.title || 'Experience';
  };

  const getEntityLocation = () => {
    const entity = getEntity();
    return entity?.location || 'Location not specified';
  };

  const getEntityImage = () => {
    const entity = getEntity();
    if (!entity) return null;
    return (
      entity.coverImage ||
      entity.galleryImages?.[0] ||
      entity.images?.[0] ||
      entity.image ||
      null
    );
  };

  const getEntityPrice = () => {
    const entity = getEntity();
    return entity?.price || 0;
  };

  const getTotalPrice = () => {
    return booking?.totalPrice || (getEntityPrice() * (booking?.numberOfPeople || 1));
  };

  const getProviderName = () => {
    return booking?.provider?.name || booking?.provider || 'Provider';
  };

  // ✅ Get booking currency
  const getBookingCurrency = () => {
    return booking?.currency || 'USD';
  };

  // ✅ Check if provider supports selected currency
  const checkProviderSupportsCurrency = (providerId) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return false;
    return provider.supportedCurrencies?.includes(selectedCurrency) || false;
  };

  // ✅ Handle Payment
  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to continue');
      navigate('/login');
      return;
    }

    if (!booking || !booking._id) {
      toast.error('Booking not found. Please try again.');
      return;
    }

    if (booking.paymentStatus === 'paid') {
      toast.error('This booking has already been paid');
      navigate(`/trip/${booking._id}`);
      return;
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      toast.error('This booking has been cancelled and cannot be paid');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await createCheckout(booking._id, selectedProvider, selectedCurrency);
      
      console.log('✅ Checkout response:', response);
      
      if (response.url) {
        window.location.href = response.url;
      } else if (response.sessionId) {
        navigate('/payment-success', {
          state: {
            sessionId: response.sessionId,
            bookingId: booking._id,
            provider: selectedProvider,
            currency: selectedCurrency,
          },
        });
      } else {
        setError('Failed to create payment session. Please try again.');
        toast.error('Payment initialization failed');
      }

    } catch (error) {
      console.error('❌ Payment error:', error);
      const errorMsg = error.response?.data?.message || 'Payment initialization failed. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
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

  // Loading state
  if (fetching || loadingProviders || currencyLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading payment details...</p>
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-center p-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-[#374151] dark:text-white mb-2">
          Payment Error
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          {error || 'Unable to process payment. Please try again.'}
        </p>
        <div className="flex gap-3 mt-6 flex-wrap justify-center">
          <button
            onClick={() => navigate('/trips')}
            className="px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/90 transition"
          >
            My Trips
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Explore Experiences
          </button>
        </div>
      </div>
    );
  }

  const total = getTotalPrice();
  const entity = getEntity();
  const entityTitle = getEntityTitle();
  const entityLocation = getEntityLocation();
  const entityImage = getEntityImage();
  const providerName = getProviderName();
  const bookingCurrency = getBookingCurrency();

  // Check if already paid
  const isPaid = booking.paymentStatus === 'paid';

  // Get selected provider config
  const selectedProviderConfig = PROVIDER_CONFIG[selectedProvider] || PROVIDER_CONFIG.stripe;
  const SelectedIcon = selectedProviderConfig.icon;

  // ✅ Safe rate values
  const rate = convertedTotal?.rate;
  const originalCurrency = convertedTotal?.originalCurrency;
  const isRateValid = rate && typeof rate === 'number';
  const showRate = isRateValid && rate !== 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-[#374151] dark:text-white">
                Secure Payment
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Complete your payment securely for {entityTitle}
              </p>
            </div>
          </div>
          
          {/* Currency Selector */}
          <CurrencySelector 
            variant="default"
            showLabel={false}
            showRefresh={true}
            align="right"
          />
        </div>

        {/* Already Paid Warning */}
        {isPaid && (
          <div className="mb-6 p-4 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[#0D9488]" />
            <span className="text-[#0D9488] font-medium">
              This booking has already been paid. No further action needed.
            </span>
            <Link
              to={`/trip/${booking._id}`}
              className="ml-auto px-4 py-2 rounded-xl bg-[#0D9488] text-white text-sm font-medium hover:bg-[#0D9488]/80 transition"
            >
              View Trip
            </Link>
          </div>
        )}

        {/* Error */}
        {error && !isPaid && (
          <div className="mb-6 p-4 rounded-2xl bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN - Payment Form */}
          <div className="lg:col-span-2 space-y-6">

            {/* Booking Summary */}
            <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F59E0B]" />
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
                    {entityLocation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Provider</span>
                  <span className="font-semibold text-[#374151] dark:text-white">
                    {providerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Travel Date</span>
                  <span className="font-semibold text-[#374151] dark:text-white">
                    {booking.startDate ? formatDate(booking.startDate) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Travelers</span>
                  <span className="font-semibold text-[#374151] dark:text-white">
                    {booking.numberOfPeople || 1} {booking.numberOfPeople > 1 ? 'people' : 'person'}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-[#374151] dark:text-white">
                      Total Amount
                    </span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[#0D9488]">
                        {convertedTotal?.formatted || formatAmount(total, selectedCurrency)}
                      </span>
                      {convertedTotal?.originalCurrency && convertedTotal.originalCurrency !== selectedCurrency && (
                        <p className="text-xs text-gray-400 mt-1">
                          {formatAmount(convertedTotal.originalAmount, convertedTotal.originalCurrency)}
                          {getRateDisplay(rate, originalCurrency, selectedCurrency)}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {formatAmount(getEntityPrice(), bookingCurrency)} × {booking.numberOfPeople || 1} traveler{booking.numberOfPeople > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Card>

            {/* Payment Method Selection */}
            {!isPaid && (
              <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0D9488]" />
                  Select Payment Method
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {providers.map((provider) => {
                    const config = PROVIDER_CONFIG[provider.id];
                    if (!config) return null;
                    const Icon = config.icon;
                    const isSelected = selectedProvider === provider.id;
                    const supportsCurrency = checkProviderSupportsCurrency(provider.id);
                    const isDisabled = !supportsCurrency;

                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => !isDisabled && setSelectedProvider(provider.id)}
                        disabled={isDisabled}
                        className={`p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
                          isSelected
                            ? `border-[#0D9488] bg-[#0D9488]/10 dark:bg-[#0D9488]/20 shadow-md`
                            : `border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600`
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${config.color} flex items-center justify-center mx-auto mb-2`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className={`text-sm font-medium ${isSelected ? 'text-[#0D9488]' : 'text-gray-600 dark:text-gray-300'}`}>
                          {config.name}
                        </p>
                        {provider.isTestMode && (
                          <span className="text-[8px] text-gray-400 block mt-1">Test Mode</span>
                        )}
                        {isDisabled && (
                          <span className="text-[8px] text-gray-400 block mt-1">
                            {selectedCurrency} not supported
                          </span>
                        )}
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 mx-auto mt-1 text-[#0D9488]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Provider Details */}
                {selectedProviderConfig && (
                  <div className={`p-4 rounded-2xl ${selectedProviderConfig.bgColor} border ${selectedProviderConfig.borderColor} mb-5`}>
                    <div className="flex items-center gap-3">
                      <SelectedIcon className={`w-6 h-6 ${selectedProviderConfig.textColor}`} />
                      <div>
                        <p className="font-semibold text-[#374151] dark:text-white">
                          {selectedProviderConfig.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedProviderConfig.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Currency: {selectedCurrency}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Summary */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">You will pay</span>
                    <span className="text-xl font-bold text-[#0D9488]">
                      {convertedTotal?.formatted || formatAmount(total, selectedCurrency)}
                    </span>
                  </div>
                  {convertedTotal?.originalCurrency && convertedTotal.originalCurrency !== selectedCurrency && (
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Original amount</span>
                      <span>
                        {formatAmount(convertedTotal.originalAmount, convertedTotal.originalCurrency)}
                        {getRateDisplay(rate, originalCurrency, selectedCurrency)}
                      </span>
                    </div>
                  )}
                </div>

                <form onSubmit={handlePayment} className="space-y-5">
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
                        Pay {convertedTotal?.formatted || formatAmount(total, selectedCurrency)} with {selectedProviderConfig?.name || 'Stripe'}
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      SSL Encrypted
                    </span>
                    <span>•</span>
                    <span>Secure Checkout</span>
                    <span>•</span>
                    <span>No fees</span>
                  </div>
                </form>
              </Card>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: ShieldCheck, label: 'Secure Payment', color: 'text-[#0D9488]' },
                { icon: Lock, label: 'Encrypted Data', color: 'text-[#0D9488]' },
                { icon: CheckCircle, label: 'Instant Confirmation', color: 'text-[#0D9488]' },
                { icon: Users, label: '24/7 Support', color: 'text-[#F59E0B]' },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs font-medium text-[#374151] dark:text-white">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR - Order Summary */}
          <div className="space-y-6">
            <Card className="p-6 rounded-3xl sticky top-24 border border-gray-100 dark:border-gray-800 shadow-xl">
              <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-6">
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
                  <span className="text-gray-500">Travel Date</span>
                  <span className="font-semibold text-[#374151] dark:text-white">
                    {booking.startDate ? formatDate(booking.startDate) : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Price per person</span>
                  <span className="font-semibold text-[#374151] dark:text-white">
                    {formatAmount(getEntityPrice(), bookingCurrency)}
                  </span>
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <span className="text-xl font-bold text-[#374151] dark:text-white">
                    Total
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#0D9488]">
                      {convertedTotal?.formatted || formatAmount(total, selectedCurrency)}
                    </span>
                    {convertedTotal?.originalCurrency && convertedTotal.originalCurrency !== selectedCurrency && (
                      <p className="text-xs text-gray-400">
                        {formatAmount(convertedTotal.originalAmount, convertedTotal.originalCurrency)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Currency Info */}
              <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Payment Currency</span>
                  <CurrencyBadge currency={selectedCurrency} size="sm" />
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500">Exchange Rate</span>
                  <span className="text-gray-600 dark:text-gray-300">
                    {showRate 
                      ? formatRate(rate, originalCurrency, selectedCurrency)
                      : '1:1'
                    }
                  </span>
                </div>
              </div>

              {/* Payment Status */}
              <div className="mt-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Payment Status</span>
                  <span className={`text-sm font-semibold ${
                    booking.paymentStatus === 'paid' ? 'text-[#0D9488]' :
                    booking.paymentStatus === 'pending' ? 'text-[#F59E0B]' :
                    'text-gray-400'
                  }`}>
                    {booking.paymentStatus || 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-500">Booking Status</span>
                  <span className={`text-sm font-semibold capitalize ${
                    booking.status === 'confirmed' ? 'text-[#0D9488]' :
                    booking.status === 'pending_payment' ? 'text-[#F59E0B]' :
                    booking.status === 'completed' ? 'text-green-600' :
                    'text-gray-400'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#0D9488]/10 to-[#F59E0B]/10 border border-[#0D9488]/20 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#0D9488] flex-shrink-0" />
                <p className="text-sm text-[#374151] dark:text-white">
                  Your payment is <span className="font-semibold text-[#0D9488]">protected</span> and <span className="font-semibold text-[#0D9488]">encrypted</span>.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;