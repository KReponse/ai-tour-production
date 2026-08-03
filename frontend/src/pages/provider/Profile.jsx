// src/pages/provider/Profile.jsx
// ✅ FIXED - Private provider dashboard with correct API URL
// ✅ ADDED: WhatsApp support
// ✅ FIXED: Better stats handling with fallbacks

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  BadgeCheck,
  Star,
  Briefcase,
  Loader2,
  Sparkles,
  Edit2,
  User,
  Calendar,
  Award,
  TrendingUp,
  Shield,
  CheckCircle,
  Building2,
  Clock,
  Users,
  MessageCircle,
  XCircle,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ✅ FIXED: Use API client for consistent base URL
import API from '../../services/api';

// ===============================
// AI TOUR COLORS
// ===============================
const TEAL = "#0D9488";
const GOLD = "#F59E0B";
const SLATE = "#374151";

// ✅ Get base URL for uploads (without /api)
const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL || "http://localhost:5000";
  return url.replace(/\/api$/, '');
};

// ✅ Format business hours for display
const formatBusinessHours = (businessHours) => {
  if (!businessHours) return null;
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return days.map((day, index) => {
    const hours = businessHours[day];
    if (!hours) return null;
    if (hours.closed) {
      return { day: dayLabels[index], hours: 'Closed' };
    }
    return {
      day: dayLabels[index],
      hours: `${hours.open || '08:00'} – ${hours.close || '18:00'}`,
    };
  }).filter(Boolean);
};

// ✅ Helper for image URLs
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('data:image')) return path;
  
  const baseUrl = getBaseUrl();
  
  if (path.startsWith('/uploads/')) {
    return `${baseUrl}${path}`;
  }
  
  return `${baseUrl}/uploads/${path}`;
};

// ✅ Helper to get WhatsApp number
const getWhatsAppNumber = (profile) => {
  if (profile?.whatsapp) return profile.whatsapp;
  if (profile?.phone) return profile.phone;
  if (profile?.user?.phone) return profile.user.phone;
  return null;
};

const Profile = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalTours: 0,
    totalListings: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalTravelers: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalReviews: 0,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('⚠️ No token found, redirecting to login...');
        setError('Please login to view your profile');
        setTimeout(() => navigate('/login'), 2000);
        setLoading(false);
        return;
      }

      console.log('📌 Fetching provider profile from: /provider-profiles/me');

      // ✅ FIXED: Use API client - NO duplicate /api
      const response = await API.get('/provider-profiles/me');

      if (response.data.success) {
        setProfile(response.data.profile);
      } else {
        setError(response.data.message || 'Failed to load profile');
      }

      // ✅ Fetch provider stats - FIXED with multiple endpoints
      await fetchProviderStats();

    } catch (err) {
      console.error('❌ Profile fetch error:', err);
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setError('Session expired. Please login again.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 403) {
        setError('You are not a provider. Please complete your application first.');
      } else if (err.response?.status === 404) {
        setError('Provider profile not found. Please complete your application.');
      } else {
        setError(err.response?.data?.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Separate function for fetching stats
  const fetchProviderStats = async () => {
    try {
      // Try analytics endpoint
      try {
        const statsResponse = await API.get('/analytics/provider');
        if (statsResponse.data.success) {
          const analytics = statsResponse.data.analytics || statsResponse.data.data || {};
          setStats(prev => ({
            ...prev,
            totalTours: analytics.totalTours || analytics.totalListings || 0,
            totalListings: analytics.totalListings || analytics.totalTours || 0,
            totalBookings: analytics.totalBookings || 0,
            pendingBookings: analytics.pendingBookings || 0,
            completedBookings: analytics.completedBookings || 0,
            totalTravelers: analytics.totalTravelers || 0,
            totalRevenue: analytics.totalRevenue || 0,
            averageRating: analytics.averageRating || 0,
            totalReviews: analytics.totalReviews || 0,
          }));
          return;
        }
      } catch (analyticsError) {
        console.warn('⚠️ Analytics endpoint failed, trying earnings:', analyticsError.message);
      }

      // Try earnings endpoint as fallback
      try {
        const earningsResponse = await API.get('/earnings/provider');
        if (earningsResponse.data.success) {
          const earnings = earningsResponse.data.earnings || earningsResponse.data.data || {};
          setStats(prev => ({
            ...prev,
            totalRevenue: earnings.totalEarnings || earnings.totalRevenue || 0,
          }));
        }
      } catch (earningsError) {
        console.warn('⚠️ Earnings endpoint failed:', earningsError.message);
      }

      // Try bookings endpoint for booking counts
      try {
        const bookingsResponse = await API.get('/bookings/provider');
        if (bookingsResponse.data.success) {
          const bookings = bookingsResponse.data.bookings || [];
          const pending = bookings.filter(b => b.status === 'pending' || b.status === 'pending_payment').length;
          const completed = bookings.filter(b => b.status === 'completed' || b.status === 'confirmed').length;
          setStats(prev => ({
            ...prev,
            totalBookings: bookings.length,
            pendingBookings: pending,
            completedBookings: completed,
          }));
        }
      } catch (bookingsError) {
        console.warn('⚠️ Bookings endpoint failed:', bookingsError.message);
      }

    } catch (error) {
      console.error('❌ Error fetching provider stats:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const businessHoursList = formatBusinessHours(profile?.businessHours);
  const whatsappNumber = getWhatsAppNumber(profile);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            {error.includes('Please login') || error.includes('Session expired') 
              ? 'Authentication Required' 
              : error.includes('application')
                ? 'Provider Account Required'
                : 'Failed to Load Profile'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          
          {error.includes('Please login') || error.includes('Session expired') ? (
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
            >
              Go to Login
            </button>
          ) : error.includes('application') || error.includes('Provider profile not found') ? (
            <Link
              to="/provider/request"
              className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition inline-block"
            >
              Complete Application
            </Link>
          ) : (
            <button
              onClick={fetchProfile}
              className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-[#F59E0B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Profile Not Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Please complete your provider profile setup.
          </p>
          <Link
            to="/provider/request"
            className="inline-block mt-6 px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            Complete Application
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = profile.verified;
  const ratingDisplay = stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'New';

  const socialLinks = [
    { key: 'facebook', icon: Facebook, label: 'Facebook' },
    { key: 'instagram', icon: Instagram, label: 'Instagram' },
    { key: 'twitter', icon: Twitter, label: 'Twitter' },
    { key: 'linkedin', icon: Linkedin, label: 'LinkedIn' },
    { key: 'youtube', icon: Youtube, label: 'YouTube' },
  ].filter(s => profile.socialLinks?.[s.key]);

  return (
    <div className="space-y-8 animate-fade-in">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#374151] dark:text-white">
                Provider Profile
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage your business profile and public information
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/provider/profile/edit')}
          className="h-12 px-6 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold shadow-lg shadow-[#0D9488]/30 hover:scale-105 transition-all duration-300 flex items-center gap-2"
        >
          <Edit2 className="w-5 h-5" />
          Edit Profile
        </button>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="flex flex-col xl:flex-row gap-8">

          {/* LEFT - Logo/Avatar */}
          <div className="flex flex-col items-center xl:items-start">
            <div className="relative">
              {profile.logo ? (
                <img
                  src={getImageUrl(profile.logo)}
                  alt={profile.businessName}
                  className="w-32 h-32 rounded-3xl object-cover shadow-xl border-4 border-white dark:border-gray-900"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '';
                    e.target.className = 'w-32 h-32 rounded-3xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] text-white flex items-center justify-center text-5xl font-black shadow-xl shadow-[#0D9488]/30';
                    e.target.alt = profile.businessName?.charAt(0) || 'P';
                  }}
                />
              ) : (
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] text-white flex items-center justify-center text-5xl font-black shadow-xl shadow-[#0D9488]/30">
                  {profile.businessName?.charAt(0) || 'P'}
                </div>
              )}
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-[#0D9488] rounded-full p-1.5 border-4 border-white dark:border-gray-900">
                  <BadgeCheck className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <span className="mt-3 text-sm font-semibold text-[#374151] dark:text-white text-center">
              {profile.businessName}
            </span>
          </div>

          {/* RIGHT */}
          <div className="flex-1 space-y-6">

            {/* TOP */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-3xl font-black text-[#374151] dark:text-white">
                    {profile.businessName || 'Provider'}
                  </h2>
                  {isVerified && (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-bold">
                      <BadgeCheck className="w-4 h-4" />
                      Verified
                    </div>
                  )}
                  <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                    {profile.businessType?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0D9488]" />
                  Tour Provider • {profile.city}, {profile.country}
                </p>
              </div>

              <button
                onClick={() => navigate('/provider/profile/edit')}
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold shadow-lg shadow-[#0D9488]/30 hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                <Edit2 className="w-5 h-5" />
                Edit Profile
              </button>
            </div>

            {/* INFO GRID */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-[#0D9488]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <h3 className="font-semibold text-[#374151] dark:text-white">
                      {profile.businessEmail || profile.email || profile.user?.email || 'N/A'}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <h3 className="font-semibold text-[#374151] dark:text-white">
                      {profile.businessPhone || profile.phone || profile.user?.phone || 'N/A'}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#0D9488]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <h3 className="font-semibold text-[#374151] dark:text-white">
                      {profile.city && profile.country ? `${profile.city}, ${profile.country}` : 'N/A'}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <h3 className={`font-semibold ${isVerified ? 'text-[#0D9488]' : 'text-[#F59E0B]'}`}>
                      {isVerified ? 'Verified Provider' : 'Pending Verification'}
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Languages & Specializations */}
            <div className="grid grid-cols-2 gap-4">
              {profile.languages?.length > 0 && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Languages</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {profile.languages.map((lang) => (
                      <span key={lang} className="px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-medium">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.specializations?.length > 0 && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Specializations</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {profile.specializations.map((spec) => (
                      <span key={spec} className="px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-medium">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {profile.description && (
              <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0D9488]/5 to-[#F59E0B]/5 border border-[#0D9488]/10">
                <h3 className="font-black text-lg text-[#374151] dark:text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#0D9488]" />
                  About Business
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {profile.description}
                </p>
              </div>
            )}

            {/* Experience & WhatsApp */}
            <div className="grid sm:grid-cols-2 gap-4">
              {profile.yearsOfExperience && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-[#F59E0B]" />
                    <div>
                      <p className="text-sm text-gray-500">Years of Experience</p>
                      <h3 className="font-bold text-[#374151] dark:text-white">
                        {profile.yearsOfExperience}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {whatsappNumber && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    <div>
                      <p className="text-sm text-gray-500">WhatsApp</p>
                      <a
                        href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#25D366] hover:underline"
                      >
                        {whatsappNumber}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Business Hours */}
            {businessHoursList && businessHoursList.length > 0 && (
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 mb-2">Business Hours</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {businessHoursList.map((item) => (
                    <div key={item.day} className="text-xs">
                      <span className="font-semibold text-[#374151] dark:text-white">{item.day}:</span>
                      <span className={`ml-1 ${item.hours === 'Closed' ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                        {item.hours}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Media Links */}
            {socialLinks.length > 0 && (
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 mb-2">Social Media</p>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map(({ key, icon: Icon, label }) => (
                    <a
                      key={key}
                      href={profile.socialLinks[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-[#0D9488] transition text-xs font-medium text-[#374151] dark:text-white"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#0D9488]" />
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* STATS */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#0f766e] text-white shadow-lg shadow-[#0D9488]/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Total Listings</p>
                    <h2 className="text-3xl font-black mt-2">{stats.totalListings || stats.totalTours || 0}</h2>
                  </div>
                  <Briefcase className="w-7 h-7 opacity-80" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#d97706] text-white shadow-lg shadow-[#F59E0B]/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Total Bookings</p>
                    <h2 className="text-3xl font-black mt-2">{stats.totalBookings}</h2>
                    {stats.pendingBookings > 0 && (
                      <p className="text-xs opacity-80 mt-1">Pending: {stats.pendingBookings}</p>
                    )}
                  </div>
                  <Users className="w-7 h-7 opacity-80" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#374151] to-[#1f2937] text-white shadow-lg shadow-[#374151]/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Total Revenue</p>
                    <h2 className="text-2xl font-black mt-2">{formatCurrency(stats.totalRevenue)}</h2>
                  </div>
                  <TrendingUp className="w-7 h-7 opacity-80" />
                </div>
              </div>
            </div>

            {/* Review Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" />
                  <div>
                    <p className="text-sm text-gray-500">Average Rating</p>
                    <h3 className="font-bold text-[#374151] dark:text-white">
                      {ratingDisplay}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="text-sm text-gray-500">Total Reviews</p>
                    <h3 className="font-bold text-[#374151] dark:text-white">
                      {stats.totalReviews}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <h3 className="font-bold text-[#374151] dark:text-white">
                      {profile.createdAt ? new Date(profile.createdAt).getFullYear() : 'N/A'}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;