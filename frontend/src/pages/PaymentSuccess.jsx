// src/pages/PaymentSuccess.jsx

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Sparkles, Calendar, ArrowRight, Home, Loader2 } from 'lucide-react';
import { verifyPayment } from '../services/paymentService';
import axios from 'axios';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [bookingRef, setBookingRef] = useState('');
  const [error, setError] = useState('');

  // ✅ Get session ID from URL using useSearchParams
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No payment session found. Please contact support.');
      setLoading(false);
      return;
    }

    verifyPaymentStatus();
  }, [sessionId]);

  // ✅ Verify payment with backend
  const verifyPaymentStatus = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Verifying payment for session:', sessionId);
      
      const response = await verifyPayment(sessionId);
      console.log('✅ Payment verified:', response);
      
      if (response.success) {
        // Handle different response structures
        const bookingData = response.booking || response.data?.booking || response.data;
        
        if (bookingData) {
          setBooking(bookingData);
          setBookingRef(bookingData.bookingCode || bookingData._id?.slice(-6) || 'N/A');
        } else {
          // If no booking data, generate a reference
          setBookingRef('AI-' + Math.random().toString(36).substring(2, 8).toUpperCase());
        }
      } else {
        setError(response.message || 'Payment verification failed');
        setBookingRef('AI-' + Math.random().toString(36).substring(2, 8).toUpperCase());
      }
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      // Check if it's a network error
      if (error.message === 'Network Error') {
        setError('Cannot connect to server. Please check your internet connection and try again.');
      } else {
        setError(error.response?.data?.message || 'Could not verify payment status. Please check your email for confirmation.');
      }
      setBookingRef('AI-' + Math.random().toString(36).substring(2, 8).toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get entity title (listing or tour)
  const getEntityTitle = () => {
    if (!booking) return 'Your Experience';
    return booking.listing?.title || booking.tour?.title || booking.title || 'Your Experience';
  };

  // ✅ Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-400">Verifying your payment...</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Please wait while we confirm your booking</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 md:p-12 text-center max-w-md w-full border border-gray-100 dark:border-gray-800 animate-fade-in">

        {/* Success Animation */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#0D9488]/10 dark:bg-[#0D9488]/20 flex items-center justify-center mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20 animate-ping"></div>
            <div className="absolute inset-2 rounded-full border-4 border-[#F59E0B]/20 animate-ping animation-delay-150"></div>
            <CheckCircle className="w-12 h-12 text-[#0D9488] relative z-10" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-[#374151] dark:text-white mb-2">
          Payment Successful! 🎉
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mb-1">
          Your booking has been confirmed successfully.
        </p>

        {/* Booking Reference */}
        <div className="mt-4 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400">Booking Reference</p>
          <p className="text-lg font-bold text-[#0D9488] font-mono tracking-wider">
            {bookingRef}
          </p>
        </div>

        {/* Booking Details */}
        {booking && (
          <div className="mt-4 text-left bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Experience</span>
              <span className="font-medium text-[#374151] dark:text-white truncate max-w-[150px]">
                {getEntityTitle()}
              </span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Travelers</span>
              <span className="font-medium text-[#374151] dark:text-white">
                {booking.numberOfPeople || booking.travelers || 1}
              </span>
            </div>
            {booking.startDate && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-[#374151] dark:text-white">
                  {formatDate(booking.startDate)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm py-1 border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
              <span className="text-gray-500">Total Paid</span>
              <span className="font-bold text-[#0D9488] text-lg">
                ${booking.totalPrice || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Status</span>
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-[#0D9488]/10 text-[#0D9488]">
                Confirmed
              </span>
            </div>
          </div>
        )}

        {/* Error Warning */}
        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-left">
            <p className="text-xs text-amber-700 dark:text-amber-400">{error}</p>
            <button
              onClick={verifyPaymentStatus}
              className="mt-2 text-xs text-[#0D9488] hover:underline font-medium"
            >
              Try verifying again
            </button>
          </div>
        )}

        {/* What's Next */}
        <div className="mt-6 text-left bg-gradient-to-r from-[#0D9488]/5 to-[#F59E0B]/5 rounded-2xl p-4 border border-[#0D9488]/10">
          <h3 className="text-sm font-bold text-[#374151] dark:text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0D9488]" />
            What's Next?
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-[#0D9488]">✓</span>
              <span>You'll receive a confirmation email shortly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0D9488]">✓</span>
              <span>Your booking is secured and confirmed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0D9488]">✓</span>
              <span>Prepare for your amazing Rwanda adventure!</span>
            </li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link
            to="/my-bookings"
            className="flex-1 flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300"
          >
            <Calendar className="w-4 h-4" />
            View My Bookings
          </Link>

          <button
            onClick={() => navigate('/explore')}
            className="flex-1 flex items-center justify-center gap-2 h-12 px-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
          >
            <Home className="w-4 h-4" />
            Explore More
          </button>
        </div>

        {/* Footer */}
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