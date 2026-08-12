// src/pages/PublicProfile.jsx
// ✅ UPDATED - Uses ProviderCard component with WhatsApp contact
// ✅ FIXED: Uses getPublicProviderListings instead of deprecated getPublicProviderTours
// ✅ FIXED: Uses getProviderPublicReviews for provider reviews
// ✅ ADDED: Chat with Provider button

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  User,
  Calendar,
  Award,
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
  Heart,
  Eye,
  ArrowLeft,
  Share2,
  ExternalLink,
  Store,
  Map,
} from 'lucide-react';
import {
  getPublicProviderProfile,
  getPublicProviderListings,
} from '../services/providerService';
import { getProviderPublicReviews } from '../services/reviewService';
import { useAuth } from '../contexts/AuthContext';
import ReviewCard from '../components/ReviewCard';
import MediaCard from '../components/ui/MediaCard';
import Button from '../components/ui/Button';
import ProviderCard from '../components/provider/ProviderCard';
import { getOrCreateRoom } from '../services/chatService';
import toast from 'react-hot-toast';

// ✅ Use centralized API client helpers
import { getImageUrl } from '../utils/mediaHelpers';

// ===============================
// HELPERS
// ===============================

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getCoverMedia = (listing) => {
  if (listing.coverMedia) {
    return getImageUrl(listing.coverMedia);
  }
  if (listing.coverImage) {
    return getImageUrl(listing.coverImage);
  }
  if (listing.galleryImages && listing.galleryImages.length > 0) {
    return getImageUrl(listing.galleryImages[0]);
  }
  if (listing.images && listing.images.length > 0) {
    return getImageUrl(listing.images[0]);
  }
  return null;
};

const getCoverMediaType = (listing) => {
  if (listing.coverMediaType === 'video') return 'video';
  if (listing.coverMediaType === 'image') return 'image';
  if (listing.videos && listing.videos.length > 0) return 'video';
  return 'image';
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

// ===============================
// MAIN COMPONENT
// ===============================

const PublicProfile = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [activeTab, setActiveTab] = useState('listings');

  useEffect(() => {
    fetchProfile();
  }, [providerId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileData = await getPublicProviderProfile(providerId);
      
      if (profileData.success && profileData.provider) {
        setProfile(profileData.provider);
        await fetchListings(providerId);
        await fetchReviews(providerId);
      } else {
        setError('Provider not found');
      }
    } catch (err) {
      console.error('Error fetching provider profile:', err);
      setError(err.response?.data?.message || 'Failed to load provider profile');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Use getPublicProviderListings instead of getPublicProviderTours
  const fetchListings = async (providerId) => {
    try {
      setLoadingListings(true);
      const data = await getPublicProviderListings(providerId);
      setListings(data.listings || []);
    } catch (error) {
      console.error('Error fetching provider listings:', error);
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  };

  // ✅ FIXED: Use getProviderPublicReviews instead of getPublicReviews
  const fetchReviews = async (providerId) => {
    try {
      setLoadingReviews(true);
      const data = await getProviderPublicReviews(providerId, { limit: 10 });
      
      let reviewsList = [];
      if (data.success && data.reviews) {
        reviewsList = data.reviews;
      } else if (Array.isArray(data)) {
        reviewsList = data;
      } else if (data.data && Array.isArray(data.data)) {
        reviewsList = data.data;
      }
      
      const approvedReviews = reviewsList.filter(r => r.status === 'approved' || !r.status);
      setReviews(approvedReviews);
    } catch (error) {
      console.error('Error fetching provider reviews:', error);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  // ✅ Handle Chat with Provider
  const handleStartChat = async () => {
    if (!user) {
      toast.error('Please login to chat with this provider');
      navigate('/login');
      return;
    }

    try {
      const response = await getOrCreateRoom(providerId);
      if (response.success) {
        navigate(`/chat/${response.room._id}`);
      } else {
        toast.error(response.message || 'Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat. Please try again.');
    }
  };

  const isVerified = profile?.verified || profile?.verificationStatus === 'approved';
  const ratingDisplay = profile?.averageRating > 0 ? profile.averageRating.toFixed(1) : 'New';

  const socialLinks = [
    { key: 'facebook', icon: Facebook, label: 'Facebook', color: '#1877F2' },
    { key: 'instagram', icon: Instagram, label: 'Instagram', color: '#E4405F' },
    { key: 'twitter', icon: Twitter, label: 'Twitter', color: '#1DA1F2' },
    { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' },
    { key: 'youtube', icon: Youtube, label: 'YouTube', color: '#FF0000' },
    { key: 'tiktok', icon: Youtube, label: 'TikTok', color: '#000000' },
  ].filter(s => profile?.socialLinks?.[s.key]);

  const businessHoursList = formatBusinessHours(profile?.businessHours);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading provider profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Provider Not Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error || 'The provider you\'re looking for doesn\'t exist.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ✅ Prepare provider data for ProviderCard
  const providerForCard = {
    _id: profile._id,
    id: profile._id,
    name: profile.name || profile.businessName,
    businessName: profile.businessName,
    businessType: profile.businessType,
    logo: profile.logo,
    avatar: profile.avatar,
    phone: profile.businessPhone || profile.phone,
    whatsapp: profile.whatsapp || profile.businessPhone || profile.phone,
    businessPhone: profile.businessPhone,
    email: profile.businessEmail || profile.email,
    businessEmail: profile.businessEmail,
    verificationStatus: profile.verified ? 'approved' : 'pending',
    verified: profile.verified,
    averageRating: profile.averageRating,
    totalReviews: profile.totalReviews,
    city: profile.city,
    country: profile.country,
    location: profile.city && profile.country ? `${profile.city}, ${profile.country}` : profile.city || profile.country,
    description: profile.description,
    bio: profile.description,
    createdAt: profile.memberSince || profile.createdAt,
    memberSince: profile.memberSince,
    socialLinks: profile.socialLinks,
    totalTours: profile.totalTours,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ─── HERO / COVER ─── */}
      <div className="relative bg-gradient-to-r from-[#0D9488] via-[#F59E0B] to-[#374151] h-48 md:h-64">
        <div className="absolute inset-0 bg-black/30" />
        {profile.coverImage && (
          <img
            src={getImageUrl(profile.coverImage)}
            alt={profile.businessName}
            className="w-full h-full object-cover opacity-50"
          />
        )}
        
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 p-2 rounded-xl bg-black/30 backdrop-blur text-white hover:bg-black/50 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: profile.businessName,
                text: `Check out ${profile.businessName} on AI Tour Rwanda`,
                url: window.location.href,
              });
            }
          }}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/30 backdrop-blur text-white hover:bg-black/50 transition"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* ─── PROFILE INFO ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        {/* ✅ ADDED: Chat Button in Profile Header */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleStartChat}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Chat with Provider
          </button>
        </div>
        
        <ProviderCard 
          provider={providerForCard}
          variant="detailed"
          showContact={true}
          showViewProfile={false}
          className="border-0 shadow-none rounded-none"
        />
      </div>

      {/* ─── TABS ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === 'listings'
                ? 'text-[#0D9488]'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Listings
              <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {listings.length}
              </span>
            </div>
            {activeTab === 'listings' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D9488]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === 'reviews'
                ? 'text-[#0D9488]'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Reviews
              <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {reviews.length}
              </span>
            </div>
            {activeTab === 'reviews' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D9488]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === 'about'
                ? 'text-[#0D9488]'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              About
            </div>
            {activeTab === 'about' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D9488]" />
            )}
          </button>
        </div>

        {/* ─── TAB CONTENT ─── */}
        <div className="py-6">
          {/* Listings Tab */}
          {activeTab === 'listings' && (
            <div>
              {loadingListings ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
                </div>
              ) : listings.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[#374151] dark:text-white">No Listings Yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    This provider hasn't created any listings yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {listings.map((listing) => {
                    const coverType = getCoverMediaType(listing);
                    const coverUrl = getCoverMedia(listing);
                    
                    return (
                      <div
                        key={listing._id}
                        onClick={() => navigate(`/listing/${listing._id}`)}
                        className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-100 dark:border-gray-800 hover:-translate-y-1"
                      >
                        <div className="relative overflow-hidden h-48 bg-gray-100 dark:bg-gray-800">
                          {coverType === 'video' && coverUrl ? (
                            <video
                              src={coverUrl}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              muted
                              loop
                              playsInline
                              autoPlay
                              poster={getImageUrl(listing.coverImage)}
                            />
                          ) : (
                            <img
                              src={coverUrl || getImageUrl(listing.coverImage) || 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500'}
                              alt={listing.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              loading="lazy"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          
                          {coverType === 'video' && (
                            <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                              <span>▶</span> Video
                            </div>
                          )}
                          
                          <div className="absolute bottom-3 left-3 bg-[#0D9488] text-white px-3 py-1 rounded-xl font-bold shadow-lg text-sm">
                            ${listing.price}
                          </div>
                          
                          {listing.averageRating > 0 && (
                            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 text-white text-xs">
                              <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
                              {listing.averageRating.toFixed(1)}
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-bold text-[#374151] dark:text-white line-clamp-1">
                            {listing.title}
                          </h3>
                          <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                            <MapPin className="w-3 h-3 text-[#0D9488]" />
                            <span className="line-clamp-1">{listing.location || 'Location not specified'}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                            <span>{listing.duration || 'N/A'}</span>
                            <span>{listing.capacity || 0} people</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div>
              {loadingReviews ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[#374151] dark:text-white">No Reviews Yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    This provider hasn't received any reviews yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review._id}
                      review={review}
                      showTourInfo={true}
                      showUserInfo={true}
                      showProviderResponse={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800">
              <div className="space-y-6">
                {/* Business Info */}
                <div>
                  <h3 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#0D9488]" />
                    Business Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <p className="text-sm text-gray-500">Business Type</p>
                      <p className="font-semibold text-[#374151] dark:text-white capitalize">
                        {profile.businessType?.replace('_', ' ') || 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-semibold text-[#374151] dark:text-white">
                        {profile.city && profile.country ? `${profile.city}, ${profile.country}` : 'N/A'}
                      </p>
                    </div>
                    {profile.province && (
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <p className="text-sm text-gray-500">Province/State</p>
                        <p className="font-semibold text-[#374151] dark:text-white">
                          {profile.province}
                        </p>
                      </div>
                    )}
                    {profile.district && (
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <p className="text-sm text-gray-500">District</p>
                        <p className="font-semibold text-[#374151] dark:text-white">
                          {profile.district}
                        </p>
                      </div>
                    )}
                    {profile.businessAddress && (
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <p className="text-sm text-gray-500">Business Address</p>
                        <p className="font-semibold text-[#374151] dark:text-white">
                          {profile.businessAddress}
                        </p>
                      </div>
                    )}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <p className="text-sm text-gray-500">Member Since</p>
                      <p className="font-semibold text-[#374151] dark:text-white">
                        {profile.memberSince ? formatDate(profile.memberSince) : 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <p className="text-sm text-gray-500">Status</p>
                      <p className={`font-semibold ${isVerified ? 'text-[#0D9488]' : 'text-[#F59E0B]'}`}>
                        {isVerified ? '✅ Verified Provider' : '⏳ Pending Verification'}
                      </p>
                    </div>
                    {profile.totalTours !== undefined && (
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <p className="text-sm text-gray-500">Total Listings</p>
                        <p className="font-semibold text-[#374151] dark:text-white">
                          {profile.totalTours}
                        </p>
                      </div>
                    )}
                    {profile.totalReviews !== undefined && (
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <p className="text-sm text-gray-500">Total Reviews</p>
                        <p className="font-semibold text-[#374151] dark:text-white">
                          {profile.totalReviews}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business Hours */}
                {businessHoursList && businessHoursList.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#F59E0B]" />
                      Business Hours
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {businessHoursList.map((item) => (
                        <div key={item.day} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                          <p className="font-semibold text-[#374151] dark:text-white text-sm">
                            {item.day}
                          </p>
                          <p className={`text-sm ${item.hours === 'Closed' ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                            {item.hours}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages & Specializations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.languages?.length > 0 && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
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
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
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

                {/* Social Links */}
                {socialLinks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-[#0D9488]" />
                      Social Media
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {socialLinks.map(({ key, icon: Icon, label, color }) => (
                        <a
                          key={key}
                          href={profile.socialLinks[key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-[#0D9488]/10 transition group"
                        >
                          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[#0D9488] transition" />
                          <span className="text-sm text-[#374151] dark:text-white group-hover:text-[#0D9488] transition">
                            {label}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;