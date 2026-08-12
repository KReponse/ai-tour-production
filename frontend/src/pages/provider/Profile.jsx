// src/pages/provider/Profile.jsx
// ✅ COMPLETE FIXED - Using correct endpoint /listings/my

import React, { useState, useEffect, useRef } from 'react';
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
  Camera,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../services/api';
import toast from 'react-hot-toast';

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

// ✅ Format business hours
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
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalListings: 0,
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalReviews: 0,
    memberSince: null,
    pendingBookings: 0,
    completedBookings: 0,
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
        setError('Please login to view your profile');
        setTimeout(() => navigate('/login'), 2000);
        setLoading(false);
        return;
      }

      console.log('📌 Fetching provider profile...');

      // ✅ Fetch provider profile
      const profileResponse = await API.get('/provider-profiles/me');
      
      if (profileResponse.data.success) {
        setProfile(profileResponse.data.profile);
        
        // Set member since from profile
        if (profileResponse.data.profile?.createdAt) {
          setStats(prev => ({
            ...prev,
            memberSince: profileResponse.data.profile.createdAt,
          }));
        }
      }

      // ✅ Fetch provider stats from correct endpoints
      await fetchProviderStats();

    } catch (err) {
      console.error('❌ Profile fetch error:', err);
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
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

  // ✅ Fetch real stats from backend using correct endpoints
  const fetchProviderStats = async () => {
    try {
      // 1. Get listing count - ✅ USE /listings/my (correct endpoint from listingRoutes.js)
      try {
        console.log('📌 Fetching listings from /listings/my...');
        const listingsResponse = await API.get('/listings/my');
        console.log('📌 Listings response:', listingsResponse.data);
        
        if (listingsResponse.data.success) {
          const listings = listingsResponse.data.listings || listingsResponse.data.data || [];
          const listingsCount = listings.length || 0;
          
          setStats(prev => ({
            ...prev,
            totalListings: listingsCount,
          }));
          console.log('✅ Total listings:', listingsCount);
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch from /listings/my:', e.message);
        // Set to 0 as fallback
        setStats(prev => ({
          ...prev,
          totalListings: 0,
        }));
      }

      // 2. Get booking stats - ✅ Use /bookings/provider
      try {
        console.log('📌 Fetching bookings from /bookings/provider...');
        const bookingsResponse = await API.get('/bookings/provider');
        if (bookingsResponse.data.success) {
          const bookings = bookingsResponse.data.bookings || bookingsResponse.data.data || [];
          const pending = bookings.filter(b => 
            b.status === 'pending' || b.status === 'pending_payment'
          ).length;
          const completed = bookings.filter(b => 
            b.status === 'completed' || b.status === 'confirmed'
          ).length;
          
          setStats(prev => ({
            ...prev,
            totalBookings: bookings.length || 0,
            pendingBookings: pending,
            completedBookings: completed,
          }));
          console.log('✅ Total bookings:', bookings.length);
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch bookings:', e.message);
      }

      // 3. Get earnings/revenue - ✅ Use /earnings/provider
      try {
        console.log('📌 Fetching earnings from /earnings/provider...');
        const earningsResponse = await API.get('/earnings/provider');
        if (earningsResponse.data.success) {
          const earnings = earningsResponse.data.totalEarnings || 
                          earningsResponse.data.totalRevenue || 
                          earningsResponse.data.earnings?.totalEarnings || 0;
          setStats(prev => ({
            ...prev,
            totalRevenue: earnings || 0,
          }));
          console.log('✅ Total revenue:', earnings);
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch earnings:', e.message);
      }

      // 4. Get review stats - ✅ Use /provider/reviews/stats
      try {
        console.log('📌 Fetching review stats from /provider/reviews/stats...');
        const reviewResponse = await API.get('/provider/reviews/stats');
        if (reviewResponse.data.success) {
          const reviewStats = reviewResponse.data.stats || reviewResponse.data;
          setStats(prev => ({
            ...prev,
            averageRating: reviewStats.averageRating || 0,
            totalReviews: reviewStats.totalReviews || 0,
          }));
          console.log('✅ Average rating:', reviewStats.averageRating);
          console.log('✅ Total reviews:', reviewStats.totalReviews);
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch review stats:', e.message);
      }

    } catch (error) {
      console.error('❌ Error fetching provider stats:', error);
    }
  };

  // ✅ Handle profile photo upload
  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      setUploading(true);
      
      const response = await API.put('/provider-profiles/me/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Update profile with new logo
        setProfile(prev => ({
          ...prev,
          logo: response.data.logo || response.data.profile?.logo,
        }));
        toast.success('Profile photo updated successfully!');
      } else {
        toast.error(response.data.message || 'Failed to update photo');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const profilePhoto = profile.logo || profile.avatar || profile.profileImage;

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

          {/* LEFT - Profile Photo with Upload */}
          <div className="flex flex-col items-center xl:items-start">
            <div className="relative group">
              {profilePhoto ? (
                <img
                  src={getImageUrl(profilePhoto)}
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
              
              {/* Upload overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoUpload}
                className="hidden"
              />
              
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-[#0D9488] rounded-full p-1.5 border-4 border-white dark:border-gray-900">
                  <BadgeCheck className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400 text-center">
              Click photo to upload
            </p>
            <span className="mt-1 text-sm font-semibold text-[#374151] dark:text-white text-center">
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
                      {isVerified ? '✅ Verified Provider' : '⏳ Pending Verification'}
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

            {/* ✅ STATS CARDS - REAL DATA */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Total Listings */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#0f766e] text-white shadow-lg shadow-[#0D9488]/30">
                <div>
                  <p className="text-xs opacity-80">Total Listings</p>
                  <h2 className="text-2xl font-black mt-1">{stats.totalListings}</h2>
                </div>
              </div>

              {/* Total Bookings */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#d97706] text-white shadow-lg shadow-[#F59E0B]/30">
                <div>
                  <p className="text-xs opacity-80">Total Bookings</p>
                  <h2 className="text-2xl font-black mt-1">{stats.totalBookings}</h2>
                  {stats.pendingBookings > 0 && (
                    <p className="text-[10px] opacity-80 mt-0.5">Pending: {stats.pendingBookings}</p>
                  )}
                </div>
              </div>

              {/* Total Revenue */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#374151] to-[#1f2937] text-white shadow-lg shadow-[#374151]/30">
                <div>
                  <p className="text-xs opacity-80">Total Revenue</p>
                  <h2 className="text-xl font-black mt-1">{formatCurrency(stats.totalRevenue)}</h2>
                </div>
              </div>

              {/* Average Rating */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#d97706] text-white shadow-lg shadow-[#F59E0B]/30">
                <div>
                  <p className="text-xs opacity-80">Average Rating</p>
                  <h2 className="text-2xl font-black mt-1 flex items-center gap-1">
                    {ratingDisplay}
                    <Star className="w-4 h-4 fill-white text-white" />
                  </h2>
                </div>
              </div>

              {/* Total Reviews & Member Since */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#0f766e] text-white shadow-lg shadow-[#0D9488]/30">
                <div>
                  <p className="text-xs opacity-80">Total Reviews</p>
                  <h2 className="text-2xl font-black mt-1">{stats.totalReviews}</h2>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    Since {stats.memberSince ? new Date(stats.memberSince).getFullYear() : 'N/A'}
                  </p>
                </div>
              </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;