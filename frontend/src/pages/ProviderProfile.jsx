// src/pages/ProviderProfile.jsx
// ✅ COMPLETE FIXED - Correct useParams parameter name (providerId) and robust error handling
// ✅ FIXED: Tours endpoint changed from /tours/provider/:id to /listings/provider/:id
// ✅ FIXED: Uses API client instead of axios directly
// ✅ ADDED: Stats fetching

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  Calendar,
  Award,
} from "lucide-react";

// ✅ Use API client instead of axios
import API from "../services/api";
import { getImageUrl } from "../utils/mediaHelpers";

const ProviderProfile = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tours, setTours] = useState([]);
  const [stats, setStats] = useState({
    totalTours: 0,
    totalReviews: 0,
    averageRating: 0,
    verified: false,
  });

  useEffect(() => {
    if (providerId) {
      fetchProviderProfile();
    } else {
      setError("Provider ID is required");
      setLoading(false);
    }
  }, [providerId]);

  const fetchProviderProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Use API client for profile
      console.log('📌 Fetching public profile for provider:', providerId);
      const profileRes = await API.get(`/provider-profiles/public/${providerId}`);
      
      if (profileRes.data.success) {
        setProfile(profileRes.data.profile);
        
        // ✅ Set stats from profile data
        setStats({
          totalTours: profileRes.data.profile.totalTours || 0,
          totalReviews: profileRes.data.profile.totalReviews || 0,
          averageRating: profileRes.data.profile.averageRating || 0,
          verified: profileRes.data.profile.verified || false,
        });
      } else {
        setError("Provider profile not found");
      }

      // ✅ Fetch provider listings
      try {
        const toursRes = await API.get(`/listings/provider/${providerId}`);
        setTours(toursRes.data.listings || toursRes.data.data || []);
      } catch (err) {
        console.error("Error fetching listings:", err);
        // Don't set error for tours, just log
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      if (err.response?.status === 404) {
        setError("Provider profile not found. The provider may not be active yet.");
      } else {
        setError(err.response?.data?.message || "Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ✅ Helper to get WhatsApp number
  const getWhatsAppNumber = () => {
    if (profile?.whatsapp) return profile.whatsapp;
    if (profile?.phone) return profile.phone;
    if (profile?.user?.phone) return profile.user.phone;
    return null;
  };

  // ✅ Helper to get display phone
  const getDisplayPhone = () => {
    if (profile?.phone) return profile.phone;
    if (profile?.user?.phone) return profile.user.phone;
    return null;
  };

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
          Provider Not Found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {error || "The provider you're looking for does not exist."}
        </p>
        <button
          onClick={() => navigate("/explore")}
          className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
        >
          Browse Experiences
        </button>
      </div>
    );
  }

  // ✅ Social links
  const socialLinks = [
    { key: "facebook", icon: Facebook, label: "Facebook" },
    { key: "instagram", icon: Instagram, label: "Instagram" },
    { key: "twitter", icon: Twitter, label: "Twitter" },
    { key: "linkedin", icon: Linkedin, label: "LinkedIn" },
    { key: "youtube", icon: Youtube, label: "YouTube" },
  ].filter((s) => profile.socialLinks?.[s.key]);

  const whatsappNumber = getWhatsAppNumber();
  const displayPhone = getDisplayPhone();
  const isVerified = stats.verified || profile.verified;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Cover Image ── */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden bg-gradient-to-r from-[#0D9488] to-[#F59E0B]">
        {profile.coverImage && (
          <img
            src={getImageUrl(profile.coverImage)}
            alt="Cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-7xl mx-auto flex items-end gap-6">
            {/* ── Logo ── */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden flex-shrink-0 border-4 border-white dark:border-gray-900">
              {profile.logo ? (
                <img
                  src={getImageUrl(profile.logo)}
                  alt={profile.businessName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "";
                    e.target.alt = "No logo";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-4xl font-bold text-white">
                  {profile.businessName?.charAt(0) || "P"}
                </div>
              )}
            </div>

            {/* ── Info ── */}
            <div className="flex-1 text-white">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-4xl font-black">
                  {profile.businessName}
                </h1>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-sm">
                    <BadgeCheck className="w-4 h-4" />
                    Verified
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-sm">
                  <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'New'} ({stats.totalReviews} reviews)
                </span>
              </div>
              <p className="text-white/80 text-sm mt-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {profile.city}, {profile.country}
              </p>
              <p className="text-white/60 text-sm mt-1">
                Member since {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT: Profile Details ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Description */}
            {profile.description && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#0D9488]" />
                  About
                </h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {profile.description}
                </p>
              </div>
            )}

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.languages?.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.specializations?.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4" /> Specializations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="px-3 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.yearsOfExperience && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Experience
                  </h3>
                  <p className="text-lg font-bold text-[#374151] dark:text-white">
                    {profile.yearsOfExperience}
                  </p>
                </div>
              )}

              {profile.businessHours && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 md:col-span-2">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Business Hours
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(profile.businessHours).map(([day, hours]) => (
                      <div
                        key={day}
                        className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 py-1.5"
                      >
                        <span className="capitalize text-gray-600 dark:text-gray-400">
                          {day}
                        </span>
                        <span className="font-medium text-[#374151] dark:text-white">
                          {hours.closed
                            ? "Closed"
                            : hours.open && hours.close
                            ? `${hours.open} - ${hours.close}`
                            : "Not set"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Social Media */}
            {socialLinks.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#0D9488]" />
                  Connect
                </h2>
                <div className="flex gap-3 flex-wrap">
                  {socialLinks.map(({ key, icon: Icon, label }) => (
                    <a
                      key={key}
                      href={profile.socialLinks[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-[#0D9488]/10 hover:text-[#0D9488] transition text-sm font-medium text-[#374151] dark:text-white"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Actions ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Contact Card */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-24">
              <h3 className="text-lg font-bold text-[#374151] dark:text-white mb-4">
                Contact Provider
              </h3>

              <div className="space-y-3 text-sm">
                {displayPhone && (
                  <a
                    href={`tel:${displayPhone}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-[#0D9488]/5 transition text-[#374151] dark:text-white"
                  >
                    <Phone className="w-5 h-5 text-[#0D9488]" />
                    <span>{displayPhone}</span>
                  </a>
                )}

                {(profile.email || profile.user?.email) && (
                  <a
                    href={`mailto:${profile.email || profile.user?.email}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-[#0D9488]/5 transition text-[#374151] dark:text-white"
                  >
                    <Mail className="w-5 h-5 text-[#0D9488]" />
                    <span>{profile.email || profile.user?.email}</span>
                  </a>
                )}

                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <MapPin className="w-5 h-5 text-[#0D9488]" />
                  <span className="text-[#374151] dark:text-white">
                    {profile.city}, {profile.country}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-12 rounded-xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition shadow-lg shadow-[#25D366]/30"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </a>
                )}

                <button
                  onClick={() => navigate(`/explore?provider=${profile.userId}`)}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition shadow-lg shadow-[#0D9488]/30"
                >
                  <Briefcase className="w-5 h-5" />
                  View All ({stats.totalTours} experiences)
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div className="text-2xl font-black text-[#0D9488]">
                    {stats.totalTours}
                  </div>
                  <div className="text-xs text-gray-400">Experiences</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div className="text-2xl font-black text-[#F59E0B]">
                    {stats.totalReviews}
                  </div>
                  <div className="text-xs text-gray-400">Reviews</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div className="text-2xl font-black text-[#0D9488]">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'New'}
                  </div>
                  <div className="text-xs text-gray-400">Rating</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div className="text-2xl font-black text-[#F59E0B]">
                    {isVerified ? "✓" : "⏳"}
                  </div>
                  <div className="text-xs text-gray-400">Verified</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderProfile;