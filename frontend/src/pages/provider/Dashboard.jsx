// src/pages/provider/Dashboard.jsx
// ✅ COMPLETE FIXED - Mobile Responsive Optimizations
// ✅ Fixed: Stats cards on mobile (1 column, then 2, then 4)
// ✅ Fixed: Quick actions grid on mobile
// ✅ Fixed: Review cards responsive
// ✅ Fixed: Spacing for mobile
// ✅ Fixed: Touch targets for mobile

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  Wallet,
  MapPin,
  ArrowUpRight,
  Loader2,
  Sparkles,
  Plus,
  TrendingUp,
  BarChart3,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  MessageCircle,
  ClipboardList,
  CreditCard,
  Globe,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { getProviderBookings, getProviderAnalytics, getProviderEarnings } from '../../services/bookingService';
import { getProviderReviews, getProviderReviewStats } from '../../services/reviewService';
import { getProviderListings } from '../../services/listingService';
import { getProviderSettlementCurrency } from '../../services/currencyService';
import ReviewCard from '../../components/ReviewCard';
import CurrencyBadge from '../../components/ui/CurrencyBadge';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount, selectedCurrency, setCurrency } = useCurrency();
  
  const [providerStats, setProviderStats] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [recentListings, setRecentListings] = useState([]);
  const [listingCount, setListingCount] = useState(0);
  const [settlementCurrency, setSettlementCurrency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Use refs to prevent duplicate fetches and track mounts
  const hasFetched = useRef(false);
  const mountCount = useRef(0);
  const isMounted = useRef(true);

  // ✅ FIXED: Use useMemo for stable display name
  const displayName = useMemo(() => {
    if (!user) return 'Provider';
    return user.fullName || user.name || user.businessName || 'Provider';
  }, [user]);

  // ✅ FIXED: Use useMemo for stable initials
  const initials = useMemo(() => {
    const name = displayName;
    if (name === 'Provider') return 'P';
    return name.charAt(0).toUpperCase();
  }, [displayName]);

  // ✅ Fetch settlement currency
  const fetchSettlementCurrency = useCallback(async () => {
    try {
      const response = await getProviderSettlementCurrency();
      if (response.success) {
        setSettlementCurrency(response.currency);
        // Update currency context if different
        if (response.currency && response.currency !== selectedCurrency) {
          setCurrency(response.currency);
        }
      }
    } catch (error) {
      console.error('Error fetching settlement currency:', error);
    }
  }, [selectedCurrency, setCurrency]);

  // ✅ Fetch data function - FIXED dependencies
  const fetchData = useCallback(async () => {
    // Don't fetch if no user or component unmounted
    if (!user || !isMounted.current) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      // ✅ Check if user is provider before making requests
      const userRole = user?.role?.toLowerCase();
      if (userRole !== 'provider' && userRole !== 'admin') {
        setError('Provider access required. Please apply to become a provider.');
        setLoading(false);
        setTimeout(() => {
          navigate('/provider/request');
        }, 2000);
        return;
      }

      // ✅ Fetch settlement currency
      await fetchSettlementCurrency();

      // ✅ Fetch analytics with error handling
      let analytics = null;
      try {
        analytics = await getProviderAnalytics(token);
        console.log('✅ Analytics:', analytics);
      } catch (analyticsError) {
        if (analyticsError.response?.status === 403) {
          console.warn('⚠️ Provider analytics access denied. User may not be a provider.');
        } else {
          throw analyticsError;
        }
      }

      // ✅ Fetch earnings with error handling
      let earnings = null;
      try {
        earnings = await getProviderEarnings(token);
        console.log('✅ Earnings:', earnings);
      } catch (earningsError) {
        if (earningsError.response?.status === 403) {
          console.warn('⚠️ Provider earnings access denied.');
        } else {
          throw earningsError;
        }
      }

      // ✅ Fetch bookings with error handling
      let bookings = [];
      try {
        const bookingsData = await getProviderBookings(token);
        // ✅ Handle different response formats
        bookings = bookingsData.bookings || bookingsData.data || [];
        console.log('✅ Bookings:', bookings.length);
      } catch (bookingsError) {
        if (bookingsError.response?.status === 403) {
          console.warn('⚠️ Provider bookings access denied.');
        } else {
          throw bookingsError;
        }
      }

      // ✅ Fetch listings - with better error handling
      try {
        console.log('📊 Fetching listings...');
        const listingsData = await getProviderListings(token);
        console.log('✅ Listings data:', listingsData);
        // ✅ FIXED: Handle different response formats
        const listings = listingsData.data || listingsData.listings || [];
        setRecentListings(listings.slice(0, 3));
        setListingCount(listings.length);
      } catch (listingsError) {
        console.error('❌ Error fetching listings:', listingsError);
        console.error('❌ Error response:', listingsError.response?.data);
        console.error('❌ Error status:', listingsError.response?.status);
        
        if (listingsError.response?.status === 401) {
          console.warn('⚠️ Token expired or invalid. Redirecting to login...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
        
        setRecentListings([]);
        setListingCount(0);
      }

      // ✅ Fetch review stats
      try {
        const reviewStatsData = await getProviderReviewStats();
        setReviewStats(reviewStatsData.stats || null);
      } catch (error) {
        console.error('Error fetching review stats:', error);
      }

      // ✅ Fetch recent reviews
      try {
        const reviewsData = await getProviderReviews();
        // ✅ Handle different response formats
        const reviews = reviewsData.reviews || reviewsData.data || [];
        setRecentReviews(reviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setRecentReviews([]);
      }

      // ✅ Build stats from real data
      const displayCurrency = settlementCurrency || selectedCurrency || 'RWF';
      
      const stats = [
        { 
          title: "Total Bookings", 
          value: analytics?.totalBookings || bookings.length || 0, 
          growth: `${analytics?.growth || 0}%` 
        },
        { 
          title: "Travelers", 
          value: analytics?.totalTravelers || 0, 
          growth: `${analytics?.travelerGrowth || 0}%` 
        },
        { 
          title: "Listings",
          value: listingCount || analytics?.totalListings || analytics?.totalTours || 0, 
          growth: `${analytics?.listingGrowth || analytics?.tourGrowth || 0}%` 
        },
        { 
          title: "Revenue", 
          value: formatAmount(earnings?.totalEarnings || 0, displayCurrency),
          growth: `${earnings?.growth || 0}%`,
          isCurrency: true,
          rawValue: earnings?.totalEarnings || 0,
        },
      ];

      setProviderStats(stats);
      setRecentRequests(bookings.slice(0, 5));

    } catch (error) {
      console.error("❌ Dashboard Error:", error);
      
      if (error.response?.status === 403) {
        setError("You need to be a verified provider to access this dashboard. Please apply for provider status.");
        setTimeout(() => {
          navigate('/provider/request');
        }, 3000);
      } else if (error.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(error.response?.data?.message || "Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  }, [user, navigate, fetchSettlementCurrency, formatAmount, selectedCurrency]);

  // ✅ FIXED: Run only once on mount with guard
  useEffect(() => {
    mountCount.current += 1;
    console.log(`🔵 Dashboard mounted ${mountCount.current} times`);
    
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, [fetchData]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      console.log('🔴 Dashboard unmounted');
    };
  }, []);

  const iconMap = {
    "Total Bookings": CalendarCheck,
    "Travelers": Users,
    "Listings": ClipboardList,
    "Revenue": Wallet,
  };

  const colors = [
    "from-[#0D9488] to-[#0f766e]",
    "from-[#F59E0B] to-[#d97706]",
    "from-[#0D9488] to-[#0f766e]",
    "from-[#F59E0B] to-[#d97706]",
  ];

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]', icon: CheckCircle },
      pending: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', icon: Clock },
      cancelled: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle },
      completed: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle },
    };
    return styles[status] || styles.pending;
  };

  const getTravelDate = (booking) => {
    if (booking.startDate) return booking.startDate;
    if (booking.travelDate) return booking.travelDate;
    if (booking.createdAt) return booking.createdAt;
    return null;
  };

  // ✅ Format currency for display
  const formatCurrency = (amount) => {
    const currency = settlementCurrency || selectedCurrency || 'RWF';
    return formatAmount(amount, currency);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm sm:text-base">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm sm:text-base">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/provider/request')}
              className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition text-sm sm:text-base"
            >
              Apply for Provider
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm sm:text-base"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayCurrency = settlementCurrency || selectedCurrency || 'RWF';

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in px-4 sm:px-0">

      {/* HEADER - Mobile Responsive */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#374151] dark:text-white">
                Provider Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                Welcome back, {displayName}!
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Settlement Currency Display */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800">
            <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
              Settlement: <CurrencyBadge currency={displayCurrency} size="xs" />
            </span>
          </div>

          <button
            onClick={() => navigate('/provider/add-listing')}
            className="h-11 sm:h-12 px-4 sm:px-6 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold shadow-lg shadow-[#0D9488]/30 hover:scale-105 transition-all duration-300 flex items-center gap-2 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Create New</span>
            <span className="inline xs:hidden">New</span>
          </button>
        </div>
      </div>

      {/* STATS - Responsive Grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {Array.isArray(providerStats) && providerStats.map((item, index) => {
          const Icon = iconMap[item.title];
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {item.title}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#374151] dark:text-white mt-1 sm:mt-2">
                    {item.value}
                  </h2>
                  {item.isCurrency && (
                    <p className="text-xs text-gray-400 mt-1">
                      in {displayCurrency}
                    </p>
                  )}
                </div>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-r ${colors[index]} shadow-lg flex-shrink-0`}>
                  {Icon && <Icon className="w-5 h-5 sm:w-7 sm:h-7" />}
                </div>
              </div>
              <div className="mt-4 sm:mt-6 flex items-center gap-2 text-[#0D9488] text-xs sm:text-sm font-medium bg-[#0D9488]/5 px-2.5 sm:px-3 py-1.5 rounded-full w-fit">
                <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{item.growth}</span>
                <span className="text-gray-400 text-[10px] sm:text-xs hidden xs:inline">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* RECENT LISTINGS - Mobile Responsive */}
      {recentListings.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D9488]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#374151] dark:text-white">
                Recent Listings
              </h2>
            </div>
            <button
              onClick={() => navigate('/provider/listings')}
              className="text-xs sm:text-sm text-[#0D9488] hover:text-[#0D9488]/80 font-medium flex items-center gap-1 transition"
            >
              View All
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {recentListings.map((listing) => (
              <div
                key={listing._id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-[#374151] dark:text-white text-sm sm:text-base truncate">
                      {listing.title}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                      listing.status === 'approved' ? 'bg-[#0D9488]/10 text-[#0D9488]' :
                      listing.status === 'pending' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {listing.status || 'pending'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {listing.location || 'No location'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {listing.businessType?.replace('_', ' ') || 'Service'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs sm:text-sm font-bold">
                    {formatCurrency(listing.price || 0)}
                  </span>
                  <button
                    onClick={() => navigate(`/listing/${listing._id}`)}
                    className="p-1.5 sm:p-2 rounded-xl hover:bg-[#0D9488]/10 transition"
                    aria-label="View listing"
                  >
                    <Eye className="w-4 h-4 text-gray-400 hover:text-[#0D9488]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVIEW STATS - Mobile Responsive */}
      {reviewStats && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-[#F59E0B]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#374151] dark:text-white">
              Review Analytics
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Total Reviews</p>
              <p className="text-xl sm:text-2xl font-bold text-[#374151] dark:text-white">
                {reviewStats.totalReviews || 0}
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Average Rating</p>
              <p className="text-xl sm:text-2xl font-bold text-[#F59E0B]">
                {reviewStats.averageRating ? reviewStats.averageRating.toFixed(1) : '0.0'} ★
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Replied</p>
              <p className="text-xl sm:text-2xl font-bold text-[#0D9488]">
                {reviewStats.replied || 0}
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Reply Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-[#374151] dark:text-white">
                {reviewStats.replyRate || '0%'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RECENT BOOKINGS - Mobile Responsive */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D9488]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#374151] dark:text-white">
              Recent Bookings
            </h2>
          </div>
          <button
            onClick={() => navigate('/provider/bookings')}
            className="text-xs sm:text-sm text-[#0D9488] hover:text-[#0D9488]/80 font-medium flex items-center gap-1 transition"
          >
            View All
            <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CalendarCheck className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <p className="font-medium text-sm sm:text-base">No bookings yet</p>
            <p className="text-xs sm:text-sm">Bookings will appear here once travelers make reservations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.isArray(recentRequests) && recentRequests.slice(0, 5).map((item) => {
              const statusStyle = getStatusBadge(item.status);
              const StatusIcon = statusStyle.icon;
              const travelDate = getTravelDate(item);
              
              return (
                <div
                  key={item._id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-[#374151] dark:text-white text-sm sm:text-base truncate">
                        {item.tour?.title || item.listing?.title || item.tourTitle || "Service"}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${statusStyle.bg} ${statusStyle.text}`}>
                        <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {item.status || 'pending'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                        Traveler: {item.user?.name || item.fullName || item.travelerName || "Unknown"}
                      </p>
                      {travelDate && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {new Date(travelDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs sm:text-sm font-bold">
                      {formatCurrency(item.totalPrice || item.price || 0)}
                    </span>
                    <button
                      onClick={() => navigate(`/provider/bookings/${item._id}`)}
                      className="p-1.5 sm:p-2 rounded-xl hover:bg-[#0D9488]/10 transition"
                      aria-label="View booking"
                    >
                      <Eye className="w-4 h-4 text-gray-400 hover:text-[#0D9488]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RECENT REVIEWS - Mobile Responsive */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#F59E0B]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#374151] dark:text-white">
              Recent Reviews
            </h2>
          </div>
          <button
            onClick={() => navigate('/provider/reviews')}
            className="text-xs sm:text-sm text-[#0D9488] hover:text-[#0D9488]/80 font-medium flex items-center gap-1 transition"
          >
            View All
            <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>

        {recentReviews.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <p className="font-medium text-sm sm:text-base">No reviews yet</p>
            <p className="text-xs sm:text-sm">Reviews will appear here once travelers leave feedback</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentReviews.slice(0, 3).map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                showTourInfo={true}
                compact
              />
            ))}
            {recentReviews.length > 3 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => navigate('/provider/reviews')}
                  className="text-xs sm:text-sm text-[#0D9488] hover:underline font-medium"
                >
                  View all {recentReviews.length} reviews →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ Quick Actions - Mobile Responsive Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/provider/listings')}
          className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#0D9488] transition-all duration-300 hover:shadow-lg group"
        >
          <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-[#0D9488] mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] sm:text-sm font-semibold text-[#374151] dark:text-white truncate">Listings</p>
        </button>
        <button
          onClick={() => navigate('/provider/add-listing')}
          className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#F59E0B] transition-all duration-300 hover:shadow-lg group"
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] sm:text-sm font-semibold text-[#374151] dark:text-white truncate">Add</p>
        </button>
        <button
          onClick={() => navigate('/provider/analytics')}
          className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#0D9488] transition-all duration-300 hover:shadow-lg group"
        >
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#0D9488] mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] sm:text-sm font-semibold text-[#374151] dark:text-white truncate">Analytics</p>
        </button>
        <button
          onClick={() => navigate('/provider/profile')}
          className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#F59E0B] transition-all duration-300 hover:shadow-lg group"
        >
          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] sm:text-sm font-semibold text-[#374151] dark:text-white truncate">Profile</p>
        </button>
        <button
          onClick={() => navigate('/provider/reviews')}
          className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#F59E0B] transition-all duration-300 hover:shadow-lg group"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] sm:text-sm font-semibold text-[#374151] dark:text-white truncate">Reviews</p>
        </button>
        <button
          onClick={() => navigate('/provider/payments')}
          className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#0D9488] transition-all duration-300 hover:shadow-lg group"
        >
          <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-[#0D9488] mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] sm:text-sm font-semibold text-[#374151] dark:text-white truncate">Payments</p>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;