// src/components/provider/ProviderCard.jsx
// ✅ NEW - Provider Card Component with WhatsApp Contact & In-App Messaging

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Verified,
  MessageCircle,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Award,
  BadgeCheck,
  Loader2,
  ExternalLink,
  Send,
} from 'lucide-react';
import { getPublicProviderProfile } from '../../services/providerService';
import { useAuth } from '../../contexts/AuthContext';
import { createTravelerProviderConversation } from '../../services/conversationService';

// ===============================
// AI TOUR COLORS
// ===============================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ===============================
// HELPERS
// ===============================

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/uploads/')) return `${API_URL}${path}`;
  return `${API_URL}/uploads/${path}`;
};

/**
 * Normalize phone number for WhatsApp
 * Examples: +250788123456, 250788123456, 0788123456
 * All become: 250788123456
 */
const normalizePhoneForWhatsApp = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If number starts with 0 (e.g., 0788123456), remove the leading 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // If number doesn't have country code (less than 10 digits), assume Rwanda (+250)
  if (cleaned.length < 10) {
    cleaned = `250${cleaned}`;
  }
  
  // If number has 10 digits and starts with 78, 72, etc., assume Rwanda
  if (cleaned.length === 10 && (cleaned.startsWith('78') || cleaned.startsWith('72') || cleaned.startsWith('73'))) {
    cleaned = `250${cleaned}`;
  }
  
  return cleaned;
};

/**
 * Generate WhatsApp link
 */
const generateWhatsAppLink = (phone, message = '') => {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return null;
  
  const baseUrl = 'https://wa.me/';
  const encodedMessage = encodeURIComponent(message);
  return `${baseUrl}${normalized}?text=${encodedMessage}`;
};

/**
 * Generate default message
 */
const generateDefaultMessage = (providerName, listingTitle, listingId = '') => {
  const lines = [
    'Hello,',
    '',
    `I found your listing on AI Tour Rwanda.`,
    '',
    `Listing: ${listingTitle}`,
    '',
    'I would like more information before making my booking.',
    '',
    'Thank you.',
  ];
  
  // Add listing ID if provided
  if (listingId) {
    lines.splice(5, 0, `Listing ID: ${listingId}`);
  }
  
  return lines.join('\n');
};

// ===============================
// MAIN COMPONENT
// ===============================

const ProviderCard = ({ 
  provider, 
  listingTitle, 
  listingId,
  variant = 'default', // 'default', 'compact', 'detailed'
  showContact = true,
  showViewProfile = true,
  showInAppMessage = true, // ✅ NEW: Show in-app message button
  className = '',
  onContactClick,
  onViewProfileClick,
  onMessageClick,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [publicProfile, setPublicProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showContactOptions, setShowContactOptions] = useState(false);
  const [contactError, setContactError] = useState(null);
  const [messageLoading, setMessageLoading] = useState(false);

  if (!provider) return null;

  // ─── Helper Functions ──────────────────────────────────────────

  const getDisplayName = () => {
    return provider.businessName || provider.name || 'Provider';
  };

  const getAvatar = () => {
    if (provider.logo) return getImageUrl(provider.logo);
    if (provider.avatar) return getImageUrl(provider.avatar);
    return null;
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const isVerified = () => {
    return provider.verificationStatus === 'approved' || 
           provider.verified === true || 
           provider.role === 'provider';
  };

  const getRating = () => {
    return provider.averageRating || 0;
  };

  const getTotalReviews = () => {
    return provider.totalReviews || 0;
  };

  const getLocation = () => {
    if (provider.city && provider.country) {
      return `${provider.city}, ${provider.country}`;
    }
    return provider.location || provider.city || 'Location not specified';
  };

  const getMemberSince = () => {
    const date = provider.createdAt || provider.memberSince;
    if (!date) return null;
    return new Date(date).getFullYear();
  };

  // ─── Get Contact Information ──────────────────────────────────

  const getPhoneNumber = () => {
    return provider.businessPhone || provider.phone || provider.whatsapp || null;
  };

  const getWhatsAppNumber = () => {
    return provider.whatsapp || provider.businessPhone || provider.phone || null;
  };

  const getEmail = () => {
    return provider.businessEmail || provider.email || null;
  };

  // ─── In-App Message Handler ───────────────────────────────────

  const handleInAppMessage = useCallback(async (e) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role === 'provider') {
      // Provider messaging another provider
      if (user._id === provider._id) {
        alert('You cannot message yourself');
        return;
      }
      alert('Providers can use WhatsApp or contact support');
      return;
    }

    setMessageLoading(true);
    try {
      const response = await createTravelerProviderConversation(
        provider._id,
        listingId || null,
        null, // no booking yet
        null // no initial message
      );

      if (response.success && response.data) {
        if (onMessageClick) {
          onMessageClick(response.data);
        } else {
          navigate(`/messages/${response.data._id}`);
        }
      } else {
        alert(response.message || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      
      // Check if conversation already exists
      if (error.response?.data?.data) {
        // Existing conversation found
        navigate(`/messages/${error.response.data.data._id}`);
        return;
      }
      
      alert(error.response?.data?.message || 'Failed to start conversation');
    } finally {
      setMessageLoading(false);
    }
  }, [user, provider._id, listingId, navigate, onMessageClick]);

  // ─── WhatsApp Contact Handler ─────────────────────────────────

  const handleWhatsAppContact = useCallback((e) => {
    e.stopPropagation();
    setContactError(null);
    
    const phone = getWhatsAppNumber();
    
    if (!phone) {
      setContactError('Provider contact information is not available.');
      return;
    }
    
    const message = generateDefaultMessage(
      getDisplayName(),
      listingTitle || 'Experience',
      listingId
    );
    
    const link = generateWhatsAppLink(phone, message);
    
    if (!link) {
      setContactError('Invalid phone number format.');
      return;
    }
    
    // Open WhatsApp in new tab
    window.open(link, '_blank');
    
    if (onContactClick) {
      onContactClick({ phone, link, message });
    }
  }, [provider, listingTitle, listingId, onContactClick]);

  // ─── View Profile Handler ─────────────────────────────────────

  const handleViewProfile = useCallback((e) => {
    e.stopPropagation();
    const providerId = provider._id || provider.id;
    if (providerId) {
      if (onViewProfileClick) {
        onViewProfileClick(providerId);
      } else {
        navigate(`/provider/${providerId}`);
      }
    }
  }, [provider, navigate, onViewProfileClick]);

  // ─── Fetch Public Profile ─────────────────────────────────────

  const fetchPublicProfile = useCallback(async () => {
    if (publicProfile) return;
    try {
      setLoadingProfile(true);
      const data = await getPublicProviderProfile(provider._id);
      if (data.success && data.provider) {
        setPublicProfile(data.provider);
      }
    } catch (error) {
      console.error('Error fetching provider profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  }, [provider._id, publicProfile]);

  const handleShowContactOptions = useCallback((e) => {
    e.stopPropagation();
    if (!showContactOptions) {
      fetchPublicProfile();
    }
    setShowContactOptions(!showContactOptions);
  }, [showContactOptions, fetchPublicProfile]);

  // ─── Render Variants ──────────────────────────────────────────

  // Compact variant (for listings, search results)
  if (variant === 'compact') {
    const avatarUrl = getAvatar();
    const displayName = getDisplayName();
    const verified = isVerified();
    const rating = getRating();
    const totalReviews = getTotalReviews();
    const ratingDisplay = rating > 0 ? rating.toFixed(1) : 'New';
    const phone = getWhatsAppNumber();
    const hasWhatsApp = !!phone;
    const isTraveler = user?.role === 'traveler';
    const isOwnProfile = user?._id === provider._id;

    return (
      <div className={`flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex-shrink-0 flex items-center justify-center text-white font-bold">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              getInitials()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-[#374151] dark:text-white text-sm truncate">
                {displayName}
              </span>
              {verified && (
                <BadgeCheck className="w-3.5 h-3.5 text-[#0D9488] flex-shrink-0" />
              )}
            </div>
            {rating > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="font-medium text-[#374151] dark:text-white">{ratingDisplay}</span>
                <span>({totalReviews})</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* ✅ In-App Message Button (Compact) */}
          {showInAppMessage && isTraveler && !isOwnProfile && (
            <button
              onClick={handleInAppMessage}
              disabled={messageLoading}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-[#0D9488] text-white text-xs font-medium hover:bg-[#0f766e] transition flex items-center gap-1.5 shadow-sm hover:shadow-md"
              title="Send in-app message"
            >
              {messageLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Message</span>
            </button>
          )}

          {/* WhatsApp Button */}
          {showContact && hasWhatsApp && (
            <button
              onClick={handleWhatsAppContact}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-medium hover:bg-[#1da851] transition flex items-center gap-1.5 shadow-sm hover:shadow-md"
              title="Contact on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Default / Detailed Variant ──────────────────────────────

  const avatarUrl = getAvatar();
  const displayName = getDisplayName();
  const verified = isVerified();
  const rating = getRating();
  const totalReviews = getTotalReviews();
  const ratingDisplay = rating > 0 ? rating.toFixed(1) : 'New';
  const location = getLocation();
  const memberSince = getMemberSince();
  const phone = getWhatsAppNumber();
  const email = getEmail();
  const hasWhatsApp = !!phone;
  const businessType = provider.businessType || 'Service Provider';
  const description = provider.description || provider.bio;
  const isTraveler = user?.role === 'traveler';
  const isOwnProfile = user?._id === provider._id;

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 ${className}`}>
      {/* ─── Provider Info ─── */}
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar / Logo */}
          <div className="flex-shrink-0">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                getInitials()
              )}
              {verified && (
                <div className="absolute -bottom-1 -right-1 bg-[#0D9488] rounded-full p-0.5 border-2 border-white dark:border-gray-900">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-[#374151] dark:text-white truncate">
                {displayName}
              </h3>
              {verified && (
                <span className="flex items-center gap-1 text-[#0D9488] text-xs font-medium flex-shrink-0">
                  <Verified className="w-4 h-4 fill-[#0D9488]" />
                  Verified
                </span>
              )}
              {businessType && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-medium text-gray-600 dark:text-gray-400 capitalize flex-shrink-0">
                  {businessType.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Rating & Location */}
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
              {rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                  <span className="font-medium text-[#374151] dark:text-white">{ratingDisplay}</span>
                  <span className="text-gray-400">({totalReviews} reviews)</span>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span className="truncate">{location}</span>
                </div>
              )}
              {memberSince && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Member since {memberSince}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* ─── Actions ─── */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {/* ✅ In-App Message Button */}
          {showInAppMessage && isTraveler && !isOwnProfile && (
            <button
              onClick={handleInAppMessage}
              disabled={messageLoading}
              className="flex-1 min-w-[120px] h-11 rounded-xl bg-[#0D9488] text-white font-medium text-sm hover:bg-[#0f766e] transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-[#0D9488]/20 hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {messageLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Message Provider
            </button>
          )}

          {/* WhatsApp Contact Button */}
          {showContact && (
            <button
              onClick={handleWhatsAppContact}
              disabled={!hasWhatsApp}
              className={`flex-1 min-w-[120px] h-11 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                hasWhatsApp
                  ? 'bg-[#25D366] text-white hover:bg-[#1da851] shadow-md shadow-[#25D366]/20 hover:shadow-lg hover:scale-[1.02]'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
              title={hasWhatsApp ? 'Contact on WhatsApp' : 'Provider contact information is not available'}
            >
              <MessageCircle className="w-4 h-4" />
              {hasWhatsApp ? 'Chat on WhatsApp' : 'Contact Unavailable'}
            </button>
          )}

          {/* View Profile Button */}
          {showViewProfile && (
            <button
              onClick={handleViewProfile}
              className="flex-1 min-w-[100px] h-11 rounded-xl border-2 border-[#0D9488] text-[#0D9488] font-medium text-sm hover:bg-[#0D9488] hover:text-white transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#0D9488]/20 hover:scale-[1.02]"
            >
              <Eye className="w-4 h-4" />
              View Profile
            </button>
          )}

          {/* Contact Options Toggle (for email/phone) */}
          {showContact && (email || phone) && (
            <button
              onClick={handleShowContactOptions}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-[#0D9488] hover:border-[#0D9488] transition-all duration-300 flex items-center justify-center"
              title="More contact options"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ─── Contact Options Dropdown ─── */}
        {showContactOptions && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-fade-in">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Contact Options
            </p>
            <div className="space-y-2">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition group"
                >
                  <Phone className="w-4 h-4 text-[#0D9488]" />
                  <span className="text-sm text-[#374151] dark:text-white group-hover:text-[#0D9488] transition">
                    {phone}
                  </span>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition group"
                >
                  <Mail className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-sm text-[#374151] dark:text-white group-hover:text-[#F59E0B] transition">
                    {email}
                  </span>
                </a>
              )}
              {loadingProfile && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
                </div>
              )}
              {contactError && (
                <p className="text-xs text-red-500 text-center">{contactError}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderCard;