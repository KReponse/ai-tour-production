// src/pages/Dashboard.jsx
// ✅ COMPLETE FIXED - User Dashboard with proper role-based content
// ✅ ADDED - Payments section with payment stats and recent payments

import React, { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Heart,
  User,
  Map,
  Loader2,
  Sparkles,
  TrendingUp,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  MessageCircle,
  Shield,
  DollarSign,
  Users,
  CreditCard,
  Wallet,
  Eye,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getMyBookings } from "../services/bookingService";
import { getMyProviderRequest } from "../services/providerService";
import { getMyReviews } from "../services/reviewService";
import paymentService from "../services/paymentService";
import ReviewCard from "../components/ReviewCard";
import VerifyEmailBanner from "../components/VerifyEmailBanner";
import toast from "react-hot-toast";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Payment Status Badge Component
const PaymentStatusBadge = ({ status }) => {
  const configs = {
    paid: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]', label: 'Paid' },
    pending: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Pending' },
    failed: { bg: 'bg-red-100', text: 'text-red-600', label: 'Failed' },
    refunded: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Refunded' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Processing' },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [providerRequest, setProviderRequest] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState(0);
  const [payments, setPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [error, setError] = useState(null);
  const [showBanner, setShowBanner] = useState(true);

  // ✅ Get user from localStorage with safe parsing
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // ✅ Role checks with fallbacks
  const isAdmin = user?.role === "admin" || user?.role === "ADMIN";
  const isProvider = user?.role === "provider" || user?.role === "PROVIDER";
  const isTraveler = !isAdmin && !isProvider && (user?.role === "traveler" || user?.role === "TRAVELER" || user?.role === "user" || !user?.role);

  // ✅ Check if user is unverified
  const showVerificationBanner = user && user._id && !user.isEmailVerified && showBanner;

  // ✅ Fetch payment data
  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      
      // Get payment stats
      const statsResponse = await paymentService.getPaymentStats();
      if (statsResponse.success) {
        setPaymentStats(statsResponse.stats);
      }

      // Get recent payments (last 5)
      const paymentsResponse = await paymentService.getMyPayments({ page: 1, limit: 5 });
      if (paymentsResponse.success) {
        setPayments(paymentsResponse.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      // Don't show error to user, just log it
    } finally {
      setLoadingPayments(false);
    }
  };

  // ✅ Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login to view your dashboard");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      // ✅ Fetch bookings
      try {
        const bookingsData = await getMyBookings(token);
        setBookings(bookingsData.bookings || []);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        if (err.response?.status === 401) {
          setError("Your session has expired. Please login again.");
          setTimeout(() => navigate("/login"), 2000);
        }
      }

      // ✅ Fetch user's reviews
      try {
        const reviewsData = await getMyReviews();
        setReviews(reviewsData.reviews || []);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      }

      // ✅ Fetch favorites count
      try {
        const favoritesData = JSON.parse(localStorage.getItem("favorites") || "[]");
        setFavorites(favoritesData.length || 0);
      } catch (err) {
        console.error("Error fetching favorites:", err);
        setFavorites(0);
      }

      // ✅ Fetch provider request (only for travelers)
      if (isTraveler) {
        try {
          const providerData = await getMyProviderRequest();
          setProviderRequest(providerData.request);
        } catch (err) {
          console.log("Error fetching provider request:", err);
        }
      }

      // ✅ Fetch payments
      await fetchPayments();

    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [navigate, isTraveler]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ Calculate stats
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : 0;
    
  const confirmedTrips = bookings.filter(b => b.status === "confirmed" || b.status === "paid").length;
  const pendingBookings = bookings.filter(b => b.status === "pending_payment" || b.status === "pending").length;
  const completedTrips = bookings.filter(b => b.status === "completed").length;

  const getDisplayName = () => {
    if (!user || !user._id) return 'Traveler';
    return user.fullName || user.name || 'Traveler';
  };

  // ✅ Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="relative w-20 h-20">
          <div className="w-20 h-20 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-6 text-lg font-semibold text-[#374151] dark:text-white">
          Loading Dashboard...
        </p>
      </div>
    );
  }

  // ✅ Error State
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ✅ If user is not logged in, show login prompt
  if (!user || !user._id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-[#F59E0B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Welcome to AI Tour
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Please login to access your dashboard.
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg hover:scale-[1.02] transition"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ✅ VERIFICATION BANNER */}
        {showVerificationBanner && (
          <div className="mb-8">
            <VerifyEmailBanner 
              email={user.email} 
              onDismiss={() => setShowBanner(false)} 
            />
          </div>
        )}

        {/* HEADER */}
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#374151] dark:text-white">
                Welcome {getDisplayName()}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#0D9488]" />
                {isProvider ? 'Manage your listings and bookings' : 
                 isAdmin ? 'Manage the platform' : 
                 'Manage your travel experience'}
              </p>
            </div>
          </div>
        </div>

        {/* ✅ PROVIDER FLOW FOR TRAVELERS */}
        {isTraveler && !providerRequest && (
          <div className="mb-10 rounded-3xl p-8 text-white bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-xl shadow-[#0D9488]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h2 className="text-3xl font-black">Become A Provider</h2>
              </div>
              <p className="text-white/90 max-w-md">
                Offer tours and travel services on AI Tour and start earning.
              </p>
              <Link
                to="/provider/request"
                className="inline-block mt-5 px-8 py-3.5 rounded-xl bg-white text-[#0D9488] font-bold shadow-lg hover:scale-[1.02] transition-all duration-300"
              >
                Apply Now →
              </Link>
            </div>
          </div>
        )}

        {/* ✅ PROVIDER REQUEST STATUS */}
        {isTraveler && providerRequest && (
          <div className={`mb-10 p-8 rounded-3xl border-2 ${
            providerRequest.status === "pending" 
              ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 dark:bg-[#F59E0B]/20' 
              : providerRequest.status === "approved"
              ? 'bg-[#0D9488]/10 border-[#0D9488]/30 dark:bg-[#0D9488]/20'
              : 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {providerRequest.status === "pending" && <Clock className="w-8 h-8 text-[#F59E0B]" />}
              {providerRequest.status === "approved" && <CheckCircle className="w-8 h-8 text-[#0D9488]" />}
              {providerRequest.status === "rejected" && <XCircle className="w-8 h-8 text-red-600" />}
              <h2 className={`text-2xl font-bold ${
                providerRequest.status === "pending" ? 'text-[#F59E0B]' : 
                providerRequest.status === "approved" ? 'text-[#0D9488]' : 
                'text-red-600'
              }`}>
                {providerRequest.status === "pending" && 'Provider Application Pending'}
                {providerRequest.status === "approved" && 'Provider Approved! 🎉'}
                {providerRequest.status === "rejected" && 'Application Rejected'}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {providerRequest.status === "pending" && 'Your application is currently under review by our team. We\'ll notify you once it\'s processed.'}
              {providerRequest.status === "approved" && 'Your provider account is active. Start managing your listings.'}
              {providerRequest.status === "rejected" && (providerRequest.adminNotes || 'Please review your application and try again.')}
            </p>
            {providerRequest.status === "approved" && (
              <Link
                to="/provider/dashboard"
                className="inline-block mt-4 px-8 py-3.5 rounded-xl bg-[#0D9488] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300"
              >
                Open Dashboard →
              </Link>
            )}
            {providerRequest.status === "rejected" && (
              <Link
                to="/provider/request"
                className="inline-block mt-4 px-8 py-3.5 rounded-xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/30 hover:scale-[1.02] transition-all duration-300"
              >
                Apply Again →
              </Link>
            )}
          </div>
        )}

        {/* ✅ PROVIDER DASHBOARD OVERVIEW */}
        {isProvider && (
          <div className="mb-10 p-8 rounded-3xl bg-[#0D9488]/10 border-2 border-[#0D9488]/30 dark:bg-[#0D9488]/20">
            <div className="flex items-center gap-3 mb-3">
              <Briefcase className="w-8 h-8 text-[#0D9488]" />
              <h2 className="text-2xl font-bold text-[#0D9488]">
                Provider Dashboard
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your listings, bookings, and earnings.
            </p>
            <Link
              to="/provider/dashboard"
              className="inline-block mt-4 px-8 py-3.5 rounded-xl bg-[#0D9488] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300"
            >
              Go to Provider Dashboard →
            </Link>
          </div>
        )}

        {/* ✅ ADMIN DASHBOARD OVERVIEW */}
        {isAdmin && (
          <div className="mb-10 p-8 rounded-3xl bg-purple-100 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-8 h-8 text-purple-600" />
              <h2 className="text-2xl font-bold text-purple-600">
                Admin Dashboard
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Manage users, listings, and platform settings.
            </p>
            <Link
              to="/admin/dashboard"
              className="inline-block mt-4 px-8 py-3.5 rounded-xl bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/30 hover:scale-[1.02] transition-all duration-300"
            >
              Go to Admin Dashboard →
            </Link>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-6 mb-10">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center mb-3 md:mb-4">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-[#0D9488]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#374151] dark:text-white">
              {bookings.length}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total Bookings</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3 md:mb-4">
              <Heart className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#374151] dark:text-white">
              {favorites}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Favorites</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center mb-3 md:mb-4">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-[#0D9488]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#374151] dark:text-white">
              {confirmedTrips}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Confirmed Trips</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center mb-3 md:mb-4">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-[#F59E0B]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#374151] dark:text-white">
              {pendingBookings}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Pending</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center mb-3 md:mb-4">
              <Star className="w-5 h-5 md:w-6 md:h-6 text-[#F59E0B]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#374151] dark:text-white">
              {totalReviews}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">My Reviews</p>
            {totalReviews > 0 && (
              <p className="text-xs text-[#0D9488] mt-1">
                Avg: {averageRating} ★
              </p>
            )}
          </div>

          {/* ✅ Payment Stats Card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center mb-3 md:mb-4">
              <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-[#0D9488]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#374151] dark:text-white">
              {paymentStats?.total || 0}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total Payments</p>
          </div>
        </div>

        {/* ✅ PAYMENT STATS BREAKDOWN */}
        {paymentStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
              <p className="text-xl font-bold text-[#0D9488]">{paymentStats.paid || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-xl font-bold text-[#F59E0B]">{paymentStats.pending || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
              <p className="text-xl font-bold text-red-600">{paymentStats.failed || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Refunded</p>
              <p className="text-xl font-bold text-gray-500">{paymentStats.refunded || 0}</p>
            </div>
          </div>
        )}

        {/* ✅ RECENT PAYMENTS SECTION */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#374151] dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#0D9488]" />
              Recent Payments
            </h2>
            <Link to="/traveler/payments" className="text-sm text-[#0D9488] hover:underline font-medium">
              View All →
            </Link>
          </div>

          {loadingPayments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p>No payment history yet</p>
              <Link to="/explore" className="inline-block mt-3 text-[#0D9488] hover:underline text-sm font-medium">
                Start exploring tours →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.slice(0, 5).map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                  <div>
                    <p className="font-semibold text-[#374151] dark:text-white">
                      {payment.listing?.title || 'Payment'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {payment.transactionId || payment.stripePaymentId || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#0D9488]">
                      ${payment.amount?.toFixed(2) || '0.00'}
                    </span>
                    <PaymentStatusBadge status={payment.status} />
                    <Link
                      to={`/traveler/payments/${payment._id}`}
                      className="text-sm text-[#0D9488] hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENT BOOKINGS SECTION */}
        {bookings.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#374151] dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0D9488]" />
                Recent Bookings
              </h2>
              <Link to="/my-bookings" className="text-sm text-[#0D9488] hover:underline font-medium">
                View All →
              </Link>
            </div>
            <div className="space-y-4">
              {bookings.slice(0, 5).map((booking) => {
                const entity = booking.listing || booking.tour;
                const title = entity?.title || 'Experience';
                
                return (
                  <div key={booking._id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <div>
                      <p className="font-semibold text-[#374151] dark:text-white">
                        {title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : new Date(booking.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'confirmed' || booking.status === 'paid'
                          ? 'bg-[#0D9488]/10 text-[#0D9488]'
                          : booking.status === 'pending_payment' || booking.status === 'pending'
                          ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                          : booking.status === 'completed'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {booking.status || 'Pending'}
                      </span>
                      <Link
                        to={`/trip/${booking._id}`}
                        className="text-sm text-[#0D9488] hover:underline"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ✅ MY REVIEWS SECTION */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#374151] dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#0D9488]" />
              My Reviews
            </h2>
            <Link to="/my-reviews" className="text-sm text-[#0D9488] hover:underline font-medium">
              View All →
            </Link>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>You haven't written any reviews yet.</p>
              {bookings.filter(b => b.status === 'completed').length > 0 && (
                <Link 
                  to="/explore" 
                  className="inline-block mt-3 text-[#0D9488] hover:underline text-sm font-medium"
                >
                  Browse experiences to review →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.slice(0, 3).map((review) => (
                <ReviewCard
                  key={review._id}
                  review={review}
                  compact
                  showTourInfo={true}
                />
              ))}
              {reviews.length > 3 && (
                <div className="text-center pt-2">
                  <Link to="/my-reviews" className="text-sm text-[#0D9488] hover:underline font-medium">
                    View all {reviews.length} reviews →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;