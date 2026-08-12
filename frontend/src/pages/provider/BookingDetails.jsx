// frontend/src/pages/provider/BookingDetails.jsx
// ✅ COMPLETE FIXED - Single "Chat with Traveler" button with avatar/logo support

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  DollarSign,
  User,
  Mail,
  Phone,
  FileText,
  Printer,
  Share2,
  Sparkles,
  AlertCircle,
  MessageCircle,
  Star,
  Shield,
  Award,
  Calendar as CalendarIcon,
  Play,
  Video,
  Eye,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getBookingById } from '../../services/bookingService';
import { useAuth } from '../../contexts/AuthContext';
import { getOrCreateRoom } from '../../services/chatService';
import toast from 'react-hot-toast';

// ✅ FIXED: Import mediaHelpers for consistent image and video handling
import { getImageUrl, getCoverMedia, getCoverMediaType, getCoverVideo, hasVideo } from '../../utils/mediaHelpers';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Helper to get traveler avatar
const getTravelerAvatar = (traveler) => {
  if (!traveler) return null;
  // Priority: logo > profileImage > avatar
  return traveler.logo || traveler.profileImage || traveler.avatar || null;
};

const ProviderBookingDetails = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    } else {
      setError('Invalid booking ID');
      setLoading(false);
    }
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📤 [ProviderBookingDetails] Fetching booking with ID:', bookingId);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view booking details');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      const data = await getBookingById(bookingId, token);
      console.log('✅ [ProviderBookingDetails] Booking fetched:', data);
      setBooking(data.booking);
    } catch (error) {
      console.error('❌ [ProviderBookingDetails] Error fetching booking:', error);
      
      if (error.response?.status === 401) {
        setError('Please login to view booking details');
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 404) {
        setError('Booking not found');
      } else {
        setError('Failed to load booking details. Please try again.');
      }
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

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ✅ Get entity (listing or tour)
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

  const getBookingCode = () => {
    return booking?.bookingCode || booking?._id?.slice(-8)?.toUpperCase() || 'N/A';
  };

  // ✅ Get traveler info
  const getTraveler = () => {
    return booking?.user || null;
  };

  const getTravelerName = () => {
    const traveler = getTraveler();
    return traveler?.name || booking?.fullName || 'Traveler';
  };

  const getTravelerEmail = () => {
    const traveler = getTraveler();
    return traveler?.email || booking?.email || null;
  };

  const getTravelerPhone = () => {
    const traveler = getTraveler();
    return traveler?.phone || booking?.phone || null;
  };

  // ✅ Get traveler avatar
  const getTravelerAvatarUrl = () => {
    const traveler = getTraveler();
    const avatarPath = getTravelerAvatar(traveler);
    if (avatarPath) {
      return getImageUrl(avatarPath);
    }
    return null;
  };

  // ✅ Copy to clipboard
  const copyToClipboard = useCallback((text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success(`${field} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  }, []);

  // ✅ Handle Chat with Traveler
  const handleChatWithTraveler = useCallback(async () => {
    const travelerId = booking?.user?._id || booking?.userId;
    
    if (!travelerId) {
      toast.error('Traveler information not available');
      return;
    }

    if (!user) {
      toast.error('Please login to chat');
      navigate('/login');
      return;
    }

    try {
      const response = await getOrCreateRoom(travelerId);
      if (response.success) {
        navigate(`/chat/${response.room._id}`);
      } else {
        toast.error(response.message || 'Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat. Please try again.');
    }
  }, [booking, user, navigate]);

  // ✅ Get status config
  const getStatusConfig = (status) => {
    const configs = {
      pending_payment: {
        icon: Clock,
        label: 'Pending Payment',
        color: 'text-[#F59E0B]',
        bg: 'bg-[#F59E0B]/10',
        border: 'border-[#F59E0B]/20',
        text: 'Awaiting Payment',
      },
      paid: {
        icon: CreditCard,
        label: 'Paid',
        color: 'text-[#0D9488]',
        bg: 'bg-[#0D9488]/10',
        border: 'border-[#0D9488]/20',
        text: 'Payment Received',
      },
      confirmed: {
        icon: CheckCircle,
        label: 'Confirmed',
        color: 'text-[#0D9488]',
        bg: 'bg-[#0D9488]/10',
        border: 'border-[#0D9488]/20',
        text: 'Confirmed!',
      },
      in_progress: {
        icon: Clock,
        label: 'In Progress',
        color: 'text-[#0D9488]',
        bg: 'bg-[#0D9488]/10',
        border: 'border-[#0D9488]/20',
        text: 'Trip in Progress',
      },
      completed: {
        icon: CheckCircle,
        label: 'Completed',
        color: 'text-green-600',
        bg: 'bg-green-100',
        border: 'border-green-200',
        text: 'Trip Completed',
      },
      review_eligible: {
        icon: Star,
        label: 'Ready for Review',
        color: 'text-[#F59E0B]',
        bg: 'bg-[#F59E0B]/10',
        border: 'border-[#F59E0B]/20',
        text: 'Ready for Review',
      },
      cancelled: {
        icon: XCircle,
        label: 'Cancelled',
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'Cancelled',
      },
      rejected: {
        icon: XCircle,
        label: 'Rejected',
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'Rejected',
      },
      failed_payment: {
        icon: XCircle,
        label: 'Payment Failed',
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'Payment Failed',
      },
    };
    return configs[status] || configs.pending_payment;
  };

  // ✅ Get entity media using mediaHelpers
  const getEntityMedia = (entity) => {
    const defaultImage = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
    
    if (!entity) {
      return { 
        url: defaultImage, 
        isVideo: false, 
        videoUrl: null, 
        poster: defaultImage,
      };
    }

    const coverType = getCoverMediaType(entity);
    const coverUrl = getCoverMedia(entity);
    const videoUrl = getCoverVideo(entity);
    const hasVideoContent = hasVideo(entity);
    
    let poster = defaultImage;
    if (entity.coverImage) {
      poster = getImageUrl(entity.coverImage) || defaultImage;
    } else if (entity.galleryImages && entity.galleryImages.length > 0) {
      poster = getImageUrl(entity.galleryImages[0]) || defaultImage;
    } else if (entity.images && entity.images.length > 0) {
      poster = getImageUrl(entity.images[0]) || defaultImage;
    }

    let imageUrl = coverUrl || defaultImage;

    if ((coverType === 'video' || hasVideoContent) && videoUrl) {
      return {
        url: videoUrl,
        isVideo: true,
        videoUrl: videoUrl,
        poster: poster,
        imageUrl: imageUrl,
      };
    }

    return {
      url: imageUrl,
      isVideo: false,
      videoUrl: null,
      poster: imageUrl,
      imageUrl: imageUrl,
    };
  };

  // ✅ Render media
  const renderMedia = (media, title) => {
    if (media.isVideo && media.videoUrl) {
      return (
        <div className="relative w-full h-48 md:h-56 lg:h-64 bg-black rounded-2xl overflow-hidden">
          <video
            key={media.videoUrl}
            src={media.videoUrl}
            className="w-full h-full object-contain"
            controls
            autoPlay
            muted
            playsInline
            poster={media.poster}
            onError={(e) => {
              console.error('❌ Video error:', media.videoUrl);
              e.target.style.display = 'none';
              const parent = e.target.parentElement;
              if (parent) {
                const img = document.createElement('img');
                img.src = media.poster || 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
                img.className = 'w-full h-full object-cover';
                img.alt = title || 'Media';
                parent.appendChild(img);
              }
            }}
          />
          <div className="absolute top-3 left-3 bg-[#0D9488]/80 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <Play className="w-3 h-3" />
            Cover Video
          </div>
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <Video className="w-3 h-3" />
            Video
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-48 md:h-56 lg:h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden">
        <img
          src={media.url}
          alt={title || 'Experience image'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
          }}
        />
        <div className="absolute top-3 left-3 bg-[#0D9488]/80 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
          <span>📷</span>
          Cover Image
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
          Booking Not Found
        </h2>
        <p className="text-gray-500 dark:text-gray-400">{error || 'The booking you\'re looking for doesn\'t exist.'}</p>
        <button
          onClick={() => navigate('/provider/bookings')}
          className="mt-6 px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/90 transition"
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(booking.status);
  const StatusIcon = statusConfig.icon;
  const entity = getEntity();
  const entityTitle = getEntityTitle();
  const entityLocation = getEntityLocation();
  const media = getEntityMedia(entity);
  
  // ✅ Traveler info
  const traveler = getTraveler();
  const travelerName = getTravelerName();
  const travelerEmail = getTravelerEmail();
  const travelerPhone = getTravelerPhone();
  const travelerAvatarUrl = getTravelerAvatarUrl();

  // ✅ Helper to check if JWT
  const isJWT = (str) => {
    if (!str || typeof str !== 'string') return false;
    return str.startsWith('eyJ') && str.split('.').length >= 3;
  };

  const getSafeReason = (reason) => {
    if (!reason) return null;
    if (isJWT(reason)) return 'Invalid cancellation reason';
    return reason;
  };

  const safeCancellationReason = getSafeReason(booking.cancellationReason);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => navigate('/provider/bookings')}
        className="flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Bookings</span>
      </button>

      {/* Media */}
      {entity && renderMedia(media, entityTitle)}

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#374151] dark:text-white">
                {entityTitle}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                <span className="flex items-center gap-1">
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-1">
              <MapPin className="w-4 h-4 text-[#0D9488]" />
              <span>{entityLocation}</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Booking Reference: <span className="font-mono font-semibold text-[#0D9488]">{getBookingCode()}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Booking Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Experience Information */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F59E0B]" />
              Experience Information
            </h2>
            {entity ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-[#0D9488]">
                  {entityTitle}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <MapPin className="w-4 h-4 text-[#0D9488]" />
                    <span>{entityLocation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <DollarSign className="w-4 h-4 text-[#0D9488]" />
                    <span>${entity.price || 0} per person</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Experience information unavailable</p>
            )}
          </div>

          {/* ✅ CONTACT TRAVELER - With Avatar */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border-2 border-[#0D9488]/20 dark:border-[#0D9488]/30 p-6">
            <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-[#0D9488]" />
              Contact Traveler
            </h2>
            
            <div className="space-y-4">
              {/* Traveler Name with Avatar */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  {/* ✅ Traveler Avatar with logo support */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex-shrink-0 flex items-center justify-center text-white font-bold">
                    {travelerAvatarUrl && !avatarError ? (
                      <img
                        src={travelerAvatarUrl}
                        alt={travelerName}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      travelerName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Traveler</p>
                    <p className="font-semibold text-[#374151] dark:text-white">{travelerName}</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(travelerName, 'Name')}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  {copiedField === 'Name' ? (
                    <Check className="w-4 h-4 text-[#0D9488]" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400 hover:text-[#0D9488]" />
                  )}
                </button>
              </div>

              {/* Email */}
              {travelerEmail && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-[#F59E0B]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-[#374151] dark:text-white truncate max-w-[180px] sm:max-w-[250px]">
                        {travelerEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(travelerEmail, 'Email')}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      {copiedField === 'Email' ? (
                        <Check className="w-4 h-4 text-[#0D9488]" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400 hover:text-[#0D9488]" />
                      )}
                    </button>
                    <a
                      href={`mailto:${travelerEmail}`}
                      className="p-2 hover:bg-[#0D9488]/10 rounded-lg transition text-gray-400 hover:text-[#0D9488]"
                      title="Send Email"
                    >
                      <Send className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* Phone */}
              {travelerPhone && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0D9488]/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-[#0D9488]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="font-medium text-[#374151] dark:text-white">{travelerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(travelerPhone, 'Phone')}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      {copiedField === 'Phone' ? (
                        <Check className="w-4 h-4 text-[#0D9488]" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400 hover:text-[#0D9488]" />
                      )}
                    </button>
                    <a
                      href={`tel:${travelerPhone}`}
                      className="p-2 hover:bg-[#0D9488]/10 rounded-lg transition text-gray-400 hover:text-[#0D9488]"
                      title="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* ✅ SINGLE CHAT BUTTON */}
              <button
                onClick={handleChatWithTraveler}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold hover:scale-[1.02] transition flex items-center justify-center gap-2 shadow-lg shadow-[#0D9488]/30"
              >
                <MessageCircle className="w-5 h-5" />
                Chat with Traveler
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Booking Details */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0D9488]" />
              Booking Details
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Booking Date</span>
                <span className="text-sm font-medium text-[#374151] dark:text-white">
                  {formatDateTime(booking.createdAt)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Travel Date</span>
                <span className="text-sm font-medium text-[#374151] dark:text-white">
                  {booking.startDate ? formatDate(booking.startDate) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Travelers</span>
                <span className="text-sm font-medium text-[#374151] dark:text-white">
                  {booking.numberOfPeople || booking.travelers || 1}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Total Amount</span>
                <span className="text-lg font-bold text-[#0D9488]">
                  ${booking.totalPrice || 0}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Payment Status</span>
                <span className={`text-sm font-medium ${
                  booking.paymentStatus === 'paid' ? 'text-[#0D9488]' :
                  booking.paymentStatus === 'pending' ? 'text-[#F59E0B]' :
                  'text-gray-400'
                }`}>
                  {booking.paymentStatus || 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          {booking.status === 'cancelled' && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Cancellation Reason
              </h2>
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
                <p className="text-red-600 dark:text-red-400 break-words break-all whitespace-pre-wrap hyphens-auto">
                  {safeCancellationReason || 'No cancellation reason provided.'}
                </p>
              </div>
            </div>
          )}

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-lg font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#0D9488]" />
                Special Requests
              </h2>
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {booking.specialRequests}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 pt-4">
        <button
          onClick={() => navigate('/provider/bookings')}
          className="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition"
        >
          Back to Bookings
        </button>
        {entity && (
          <Link
            to={`/listing/${entity._id}`}
            className="px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View Experience
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProviderBookingDetails;