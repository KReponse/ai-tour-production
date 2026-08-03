// src/pages/ListingDetails.jsx
// ✅ COMPLETE FIXED - Use mediaHelpers for consistent image URLs
// ✅ FIXED: Better 409 conflict handling with redirect to existing booking
// ✅ FIXED: Replaced deprecated getTourReviews with getListingReviews

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Users,
  Star,
  Loader2,
  Sparkles,
  Calendar,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Shield,
  Award,
  Mail,
  Phone,
  Building2,
  ThumbsUp,
  Heart,
  Share2,
  Video,
  Info,
  List,
  Check,
  Camera,
  CreditCard,
  UserCheck,
  ZoomIn,
  Maximize,
  Minimize,
  Verified,
  Globe,
  Image as ImageIcon,
  MessageCircle,
  Send,
  Eye,
  Pause,
  Utensils,
  Bed,
  Car,
  Music,
  ShoppingBag,
  DollarSign,
  Calendar as CalendarIcon,
  ArrowRight,
} from 'lucide-react';

import { getListingById, toggleLike } from '../services/listingService';
import { getPublicProviderProfile } from '../services/providerService';
import { useAuth } from '../contexts/AuthContext';
// ✅ FIXED: Use getListingReviews instead of getTourReviews
import { getListingReviews, createReview, toggleHelpful } from '../services/reviewService';
import { createBooking, getMyBookings } from '../services/bookingService';
import { BIZ_CONFIG, getBusinessConfig } from '../config/listingConfigs';
import ReviewCard from '../components/ReviewCard';
import ProviderCard from '../components/provider/ProviderCard';

// ✅ FIXED: Import mediaHelpers for consistent image URLs
import { getImageUrl, getCoverMedia, getCoverMediaType, getCoverVideo, hasVideo } from '../utils/mediaHelpers';

// ─── Brand tokens ───────────────────────────────────────────────
// ❌ REMOVED: const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Helpers ────────────────────────────────────────────────────
// ✅ FIXED: Use getImageUrl from mediaHelpers
const toUrl = (img) => {
  if (!img) return '/placeholder-tour.jpg';
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('data:image')) return img;
  if (img.startsWith('blob:')) return img;
  return getImageUrl(img);
};

// ✅ FIXED: Use getImageUrl for videos too
const toVideoUrl = (v) => {
  if (!v) return '';
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  return getImageUrl(v);
};

// ✅ UPDATED: Build gallery with coverMediaType support
const buildGallery = (listing) => {
  const seen = new Set();
  const push = (src) => {
    if (src && !seen.has(src)) { seen.add(src); return true; }
    return false;
  };
  const out = [];
  
  // ✅ If coverMediaType is 'image', show cover media first
  if (listing.coverMediaType === 'image' && listing.coverMedia) {
    if (push(listing.coverMedia)) out.push(listing.coverMedia);
  } else if (listing.coverMediaType !== 'video' && listing.coverImage) {
    if (push(listing.coverImage)) out.push(listing.coverImage);
  }
  
  // ✅ Add gallery images
  (listing.galleryImages || []).forEach(i => push(i) && out.push(i));
  return out;
};

// ✅ UPDATED: Build videos with cover video support
const buildVideos = (listing) => {
  const videos = [];
  
  // ✅ If coverMediaType is 'video', add cover video first
  if (listing.coverMediaType === 'video' && listing.coverMedia) {
    videos.push(listing.coverMedia);
  }
  
  // ✅ Add gallery videos
  if (Array.isArray(listing.videos) && listing.videos.length) {
    listing.videos.forEach(v => {
      if (v !== listing.coverMedia) {
        videos.push(v);
      }
    });
  }
  
  // Fallback: if no cover video but video exists
  if (videos.length === 0 && listing.video) {
    videos.push(listing.video);
  }
  
  return videos;
};

// ✅ NEW: Get cover media info
const getCoverMediaInfo = (listing) => {
  if (!listing) return null;
  return {
    url: listing.coverMedia || listing.coverImage || null,
    type: listing.coverMediaType || 'image',
    isVideo: listing.coverMediaType === 'video',
    isImage: listing.coverMediaType === 'image' || !listing.coverMediaType,
  };
};

// ─── Get Business Config ────────────────────────────────────────
const getBusinessIcon = (businessType) => {
  const config = getBusinessConfig(businessType);
  return config?.icon || Building2;
};

const getBusinessLabel = (businessType) => {
  const config = getBusinessConfig(businessType);
  return config?.label || 'Service Provider';
};

// ================================================================
// HERO MEDIA AREA
// ================================================================
const HeroMediaArea = ({
  images = [],
  videos = [],
  coverMedia = null,
  coverMediaType = 'image',
  title = '',
  imageIndex = 0,
  videoIndex = 0,
  onImageIndexChange,
  onVideoIndexChange,
  activeMediaType = 'image',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  // ✅ Build image list (cover image + gallery images)
  const imageList = [];
  if (coverMedia && coverMediaType === 'image') {
    imageList.push({ url: coverMedia, isCover: true, isVideo: false });
  }
  images.forEach(img => {
    if (img) {
      imageList.push({ url: img, isCover: false, isVideo: false });
    }
  });

  // ✅ Build video list (cover video + gallery videos)
  const videoList = [];
  if (coverMedia && coverMediaType === 'video') {
    videoList.push({ url: coverMedia, isCover: true, isVideo: true });
  }
  videos.forEach(v => {
    if (v && v !== coverMedia) {
      videoList.push({ url: v, isCover: false, isVideo: true });
    }
  });

  // ✅ Determine which item to show based on activeMediaType
  const getCurrentItem = () => {
    if (activeMediaType === 'video' && videoList.length > 0) {
      const idx = Math.min(videoIndex, videoList.length - 1);
      return videoList[idx] || null;
    }
    if (activeMediaType === 'image' && imageList.length > 0) {
      const idx = Math.min(imageIndex, imageList.length - 1);
      return imageList[idx] || null;
    }
    // Fallback: show first available
    if (imageList.length > 0) return imageList[0];
    if (videoList.length > 0) return videoList[0];
    return null;
  };

  const currentItem = getCurrentItem();

  // ✅ Reset video states when item changes
  useEffect(() => {
    setVideoError(false);
    setVideoLoading(true);
  }, [currentItem?.url]);

  // ✅ Navigation for images
  const handleImagePrev = () => {
    if (imageList.length <= 1) return;
    const newIndex = (imageIndex - 1 + imageList.length) % imageList.length;
    if (onImageIndexChange) onImageIndexChange(newIndex);
  };

  const handleImageNext = () => {
    if (imageList.length <= 1) return;
    const newIndex = (imageIndex + 1) % imageList.length;
    if (onImageIndexChange) onImageIndexChange(newIndex);
  };

  // ✅ Navigation for videos
  const handleVideoPrev = () => {
    if (videoList.length <= 1) return;
    const newIndex = (videoIndex - 1 + videoList.length) % videoList.length;
    if (onVideoIndexChange) onVideoIndexChange(newIndex);
  };

  const handleVideoNext = () => {
    if (videoList.length <= 1) return;
    const newIndex = (videoIndex + 1) % videoList.length;
    if (onVideoIndexChange) onVideoIndexChange(newIndex);
  };

  const renderMedia = () => {
    if (!currentItem) {
      return (
        <div className="w-full h-[400px] bg-gray-200 dark:bg-gray-800 flex items-center justify-center rounded-2xl">
          <ImageIcon className="w-16 h-16 text-gray-400" />
          <span className="ml-2 text-gray-400">No media available</span>
        </div>
      );
    }

    // ✅ VIDEO RENDERING
    if (currentItem.isVideo) {
      const videoSrc = toVideoUrl(currentItem.url);
      const totalVideos = videoList.length;
      const currentVideoIndex = videoList.findIndex(v => v.url === currentItem.url);
      
      return (
        <div className="relative w-full h-[400px] bg-black rounded-2xl overflow-hidden">
          {videoLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 border-3 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
                <span className="text-white/60 text-sm">Loading video...</span>
              </div>
            </div>
          )}
          {videoSrc && !videoError ? (
            <video
              key={videoSrc}
              src={videoSrc}
              className="w-full h-full object-contain"
              controls
              autoPlay
              muted
              playsInline
              onError={(e) => {
                console.error('❌ Video error:', videoSrc, e);
                setVideoError(true);
                setVideoLoading(false);
              }}
              onLoadedData={() => {
                setVideoLoading(false);
                setVideoError(false);
              }}
              onWaiting={() => setVideoLoading(true)}
              onCanPlay={() => setVideoLoading(false)}
              poster={imageList.length > 0 ? toUrl(imageList[0].url) : undefined}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <Video className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">Video unavailable</p>
                <button 
                  onClick={() => {
                    setVideoError(false);
                    setVideoLoading(true);
                  }}
                  className="mt-4 px-4 py-2 bg-[#0D9488] rounded-lg text-sm hover:bg-[#0f766e] transition"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          {currentItem.isCover && !videoError && (
            <div className="absolute top-4 left-4 bg-[#0D9488]/80 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <Play className="w-3 h-3" />
              Cover Video
            </div>
          )}
          {!videoError && (
            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <Play className="w-3 h-3" />
              Video {currentVideoIndex + 1}/{totalVideos}
            </div>
          )}
          {/* Video Navigation Arrows */}
          {totalVideos > 1 && (
            <>
              <button
                onClick={handleVideoPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition z-10"
                aria-label="Previous video"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleVideoNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition z-10"
                aria-label="Next video"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      );
    }

    // ✅ IMAGE RENDERING
    const totalImages = imageList.length;
    const currentImageIndex = imageList.findIndex(v => v.url === currentItem.url);
    
    return (
      <div className="relative w-full h-[400px] bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden">
        <img
          src={toUrl(currentItem.url)}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = '/placeholder-tour.jpg';
          }}
        />
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute bottom-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition"
        >
          <Maximize className="w-5 h-5" />
        </button>
        {currentItem.isCover && (
          <div className="absolute top-4 left-4 bg-[#0D9488]/80 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            Cover Image
          </div>
        )}
        {/* Image Navigation Arrows */}
        {totalImages > 1 && (
          <>
            <button
              onClick={handleImagePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleImageNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        {/* Image counter */}
        {totalImages > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {imageList.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  if (onImageIndexChange) onImageIndexChange(index);
                }}
                className={`w-2 h-2 rounded-full transition ${
                  index === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (imageList.length === 0 && videoList.length === 0) {
    return (
      <div className="w-full h-[400px] bg-gray-200 dark:bg-gray-800 flex items-center justify-center rounded-2xl">
        <ImageIcon className="w-16 h-16 text-gray-400" />
        <span className="ml-2 text-gray-400">No media available</span>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        {renderMedia()}
      </div>

      {isModalOpen && currentItem && !currentItem.isVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={toUrl(currentItem.url)}
              alt={title}
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};

// ================================================================
// GALLERY THUMBNAILS
// ================================================================
const GalleryThumbnails = ({ 
  images = [], 
  onSelect, 
  title = '',
  coverMedia = null,
  coverMediaType = 'image',
  selectedIndex = 0,
}) => {
  // ✅ Build thumbnail items including cover media
  const buildThumbnails = () => {
    const items = [];
    
    // ✅ Add cover media first if it's an image
    if (coverMedia && coverMediaType === 'image') {
      items.push({
        url: coverMedia,
        isCover: true,
        thumbnail: toUrl(coverMedia),
      });
    }
    
    // ✅ Add gallery images
    images.forEach(img => {
      if (img) {
        items.push({
          url: img,
          isCover: false,
          thumbnail: toUrl(img),
        });
      }
    });
    
    return items;
  };

  const thumbnails = buildThumbnails();
  
  if (thumbnails.length <= 1) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-4 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-5 h-5 text-[#0D9488]" />
        <h3 className="font-semibold text-[#374151] dark:text-white">Gallery</h3>
        <span className="text-sm text-gray-400">({thumbnails.length} photos)</span>
        {coverMediaType === 'video' && (
          <span className="text-xs text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Play className="w-3 h-3" />
            Video Cover
          </span>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {thumbnails.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden snap-start transition relative group ${
              index === selectedIndex 
                ? 'ring-2 ring-[#0D9488] ring-offset-2 ring-offset-white dark:ring-offset-gray-900' 
                : 'hover:ring-2 hover:ring-[#0D9488]'
            }`}
          >
            <img
              src={item.thumbnail}
              alt={`${title} - ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=200&h=200&fit=crop';
              }}
            />
            {item.isCover && (
              <div className="absolute top-1 left-1 bg-[#0D9488]/80 text-white text-[8px] px-1.5 py-0.5 rounded">
                Cover
              </div>
            )}
            {index === selectedIndex && (
              <div className="absolute inset-0 border-2 border-[#0D9488] rounded-xl" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ================================================================
// VIDEO GALLERY
// ================================================================
const VideoGallery = ({ videos = [], onSelect, coverVideo = null, selectedIndex = 0 }) => {
  // ✅ Build video list with cover video first if exists
  const videoList = [];
  
  // Add cover video first
  if (coverVideo) {
    videoList.push({ url: coverVideo, isCover: true });
  }
  
  // Add gallery videos (avoid duplicates)
  videos.forEach(v => {
    if (v !== coverVideo) {
      videoList.push({ url: v, isCover: false });
    }
  });
  
  if (videoList.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-4 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <Video className="w-5 h-5 text-[#0D9488]" />
        <h3 className="font-semibold text-[#374151] dark:text-white">Videos</h3>
        <span className="text-sm text-gray-400">({videoList.length} videos)</span>
        {coverVideo && (
          <span className="text-xs text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Play className="w-3 h-3" />
            Cover Video
          </span>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {videoList.map((video, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`flex-shrink-0 w-48 rounded-xl overflow-hidden snap-start transition relative group ${
              index === selectedIndex 
                ? 'ring-2 ring-[#0D9488] ring-offset-2 ring-offset-white dark:ring-offset-gray-900' 
                : 'hover:ring-2 hover:ring-[#0D9488]'
            }`}
          >
            <div className="relative w-full h-28 bg-gray-800">
              <video
                src={toVideoUrl(video.url)}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
                playsInline
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition">
                <div className="w-12 h-12 rounded-full bg-[#0D9488]/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </div>
              
              {video.isCover && (
                <div className="absolute top-2 left-2 bg-[#0D9488]/80 text-white text-[10px] px-2 py-0.5 rounded">
                  Cover
                </div>
              )}
              
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                <Play className="w-3 h-3" />
                Video {index + 1}
              </div>

              {index === selectedIndex && (
                <div className="absolute inset-0 border-2 border-[#0D9488] rounded-xl" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ================================================================
// REVIEWS SECTION
// ================================================================
const ReviewsSection = ({ listingId, onReviewAdded }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      // ✅ FIXED: Use getListingReviews instead of deprecated getTourReviews
      const data = await getListingReviews(listingId);
      const approvedReviews = (data.reviews || []).filter(r => r.status === 'approved' || !r.status);
      const limitedReviews = approvedReviews.slice(0, 3);
      setReviews(limitedReviews);
      setTotalCount(approvedReviews.length);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleHelpfulToggle = async (reviewId) => {
    try {
      const result = await toggleHelpful(reviewId);
      if (result) {
        await fetchReviews();
      }
      return result;
    } catch (error) {
      console.error('Error toggling helpful:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="w-6 h-6 text-[#0D9488]" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
            Travelers Say
          </h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-[#0D9488]" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
            Travelers Say
          </h2>
          {totalCount > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({totalCount} review{totalCount > 1 ? 's' : ''})
            </span>
          )}
        </div>
        {totalCount > 3 && (
          <Link
            to={`/reviews?listing=${listingId}`}
            className="text-sm text-[#0D9488] hover:underline font-medium flex items-center gap-1"
          >
            View all reviews ({totalCount})
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p>No reviews yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Be the first to share your experience!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              showTourInfo={false}
              showActions={false}
              onHelpfulToggle={handleHelpfulToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ================================================================
// TRUST BADGES
// ================================================================
const ListingTrustBadges = () => {
  const badges = [
    { icon: Shield, label: 'Secure Booking', desc: 'SSL encrypted' },
    { icon: Award, label: 'Verified Provider', desc: 'Trusted partners' },
    { icon: CheckCircle, label: 'Best Price Guarantee', desc: 'Price match' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-4 border border-gray-100 dark:border-gray-800">
      <div className="space-y-2">
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div key={index} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <div className="w-8 h-8 rounded-full bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-[#0D9488]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#374151] dark:text-white">{badge.label}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{badge.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ================================================================
// MAIN PAGE
// ================================================================
const ListingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  
  // ✅ Read coverMediaType from navigation state
  const initialMediaType = location.state?.coverMediaType || 'image';
  
  // ✅ Initialize state based on navigation
  const [imageIndex, setImageIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);
  const [activeMediaType, setActiveMediaType] = useState(initialMediaType);

  // ✅ Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // ✅ TABS DEFINITION
  const TABS = [
    { id: 'about', label: 'About', Icon: Info },
    { id: 'highlights', label: 'Highlights', Icon: Sparkles },
    { id: 'included', label: "What's Included", Icon: Check },
    { id: 'requirements', label: 'Requirements', Icon: List },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchListingData();
  }, [id]);

  const fetchListingData = async () => {
    try {
      setLoading(true);
      const data = await getListingById(id);
      setListing(data.listing);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Separate handlers for image and video gallery
  const handleImageSelect = (index) => {
    setImageIndex(index);
    setActiveMediaType('image');
    const heroElement = document.querySelector('.hero-media-container');
    if (heroElement) {
      heroElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleVideoSelect = (index) => {
    setVideoIndex(index);
    setActiveMediaType('video');
    const heroElement = document.querySelector('.hero-media-container');
    if (heroElement) {
      heroElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleImageIndexChange = (index) => {
    setImageIndex(index);
    setActiveMediaType('image');
  };

  const handleVideoIndexChange = (index) => {
    setVideoIndex(index);
    setActiveMediaType('video');
  };

  // ✅ Handle Booking Submission - FIXED with better 409 handling
  const handleBookingSubmit = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!bookingDate) {
      setBookingError('Please select a date');
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError('');

      const bookingData = {
        listingId: listing._id,
        startDate: bookingDate,
        endDate: bookingDate,
        numberOfPeople: numberOfPeople,
        specialRequests: ''
      };

      const response = await createBooking(bookingData);

      if (response.success && response.booking) {
        navigate(`/payment/${response.booking._id}`);
      } else {
        setBookingError(response.message || 'Failed to create booking');
      }
    } catch (error) {
      console.error('❌ Booking error:', error);
      
      // ✅ Handle 409 Conflict - Active booking exists with redirect
      if (error.response?.status === 409) {
        const activeBooking = error.response?.data?.activeBooking;
        
        // ✅ If we have the active booking ID, redirect to payment
        if (activeBooking?._id) {
          setBookingError(
            `You already have an active booking for this experience. Redirecting to payment...`
          );
          // Redirect after short delay
          setTimeout(() => {
            navigate(`/payment/${activeBooking._id}`);
          }, 1500);
          return;
        }
        
        // ✅ If no booking ID but we know there's a conflict
        if (error.response?.data?.message) {
          setBookingError(error.response.data.message);
          // Try to find the booking via API
          try {
            // Check if user has an active booking for this listing
            const myBookings = await getMyBookings();
            const existingBookings = myBookings?.bookings || [];
            const pendingBooking = existingBookings.find(b => 
              b.listing?._id === listing._id && 
              (b.status === 'pending_payment' || b.paymentStatus === 'pending')
            );
            if (pendingBooking) {
              setBookingError(
                `You have a pending booking. Redirecting to payment...`
              );
              setTimeout(() => {
                navigate(`/payment/${pendingBooking._id}`);
              }, 1500);
            }
          } catch (e) {
            console.error('Error fetching existing bookings:', e);
            // Show a helpful message with a button
            setBookingError(
              `You already have an active booking for this experience. Please check your bookings page.`
            );
          }
        }
      } else {
        setBookingError(error.response?.data?.message || 'Failed to create booking');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="relative w-20 h-20">
        <div className="w-20 h-20 rounded-full border-4 border-[#0D9488]/20" />
        <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
      </div>
      <p className="mt-6 text-lg font-semibold text-[#374151] dark:text-white">Loading Experience...</p>
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-center p-6">
      <div className="w-24 h-24 mx-auto rounded-full bg-[#0D9488]/10 flex items-center justify-center mb-6">
        <MapPin className="w-12 h-12 text-[#0D9488]" />
      </div>
      <h1 className="text-3xl font-bold text-[#374151] dark:text-white mb-2">Experience Not Found</h1>
      <p className="text-gray-500 dark:text-gray-400">The experience you're looking for doesn't exist.</p>
      <button onClick={() => navigate('/explore')} className="mt-6 px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/90 transition">
        Browse Experiences
      </button>
    </div>
  );

  // ✅ Get cover media info
  const coverInfo = getCoverMediaInfo(listing);
  
  // ✅ Build gallery and videos with coverMediaType support
  const gallery = buildGallery(listing);
  const videos = buildVideos(listing);
  const coverVideo = coverInfo?.isVideo ? coverInfo.url : null;
  
  // ✅ Ensure indices are within bounds
  const safeImageIndex = Math.min(imageIndex, gallery.length - 1);
  const safeVideoIndex = Math.min(videoIndex, videos.length - 1);
  
  const isPending = listing.status === 'pending';
  const rating = listing.averageRating || 0;
  const ratingDisplay = rating > 0 ? rating.toFixed(1) : 'New';

  const BusinessIcon = getBusinessIcon(listing.businessType);
  const businessLabel = getBusinessLabel(listing.businessType);

  const tabContent = {
    about: { title: 'About This Experience', body: listing.description || 'No description available.' },
    highlights: { title: 'Highlights', body: listing.highlights || 'No highlights listed.' },
    included: { title: "What's Included", body: listing.included || 'No included services listed.' },
    requirements: { title: 'Requirements', body: listing.requirements || 'No specific requirements.' },
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

        {/* ── HERO SECTION ── */}
        <div className="hero-media-container sticky top-0 z-20 bg-gray-50 dark:bg-gray-950 shadow-lg border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <HeroMediaArea
              images={gallery}
              videos={videos}
              coverMedia={coverInfo?.url}
              coverMediaType={coverInfo?.type}
              title={listing.title}
              imageIndex={safeImageIndex}
              videoIndex={safeVideoIndex}
              onImageIndexChange={handleImageIndexChange}
              onVideoIndexChange={handleVideoIndexChange}
              activeMediaType={activeMediaType}
            />
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-8">

              {/* Business Type Badge */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center">
                  <BusinessIcon className="w-5 h-5 text-[#0D9488]" />
                </div>
                <span className="text-sm font-medium text-[#0D9488] bg-[#0D9488]/10 px-4 py-1.5 rounded-full">
                  {businessLabel}
                </span>
                {listing.listingType && (
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full">
                    {listing.listingType}
                  </span>
                )}
                {isPending && (
                  <span className="text-sm font-medium text-[#F59E0B] bg-[#F59E0B]/10 px-4 py-1.5 rounded-full">
                    Pending Approval
                  </span>
                )}
                {coverInfo?.isVideo && (
                  <span className="text-sm font-medium text-[#0D9488] bg-[#0D9488]/10 px-4 py-1.5 rounded-full flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    Video Cover
                  </span>
                )}
              </div>

              {/* Gallery Thumbnails with selected index */}
              <GalleryThumbnails
                images={gallery}
                title={listing.title}
                onSelect={handleImageSelect}
                coverMedia={coverInfo?.url}
                coverMediaType={coverInfo?.type}
                selectedIndex={safeImageIndex}
              />

              {/* Video Gallery with selected index */}
              <VideoGallery
                videos={videos}
                onSelect={handleVideoSelect}
                coverVideo={coverVideo}
                selectedIndex={safeVideoIndex}
              />

              {/* ✅ Provider Profile - Using new ProviderCard with WhatsApp */}
              {listing.provider && (
                <ProviderCard 
                  provider={listing.provider} 
                  listingTitle={listing.title}
                  listingId={listing._id}
                  variant="detailed"
                  showContact={true}
                  showViewProfile={true}
                />
              )}

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                {TABS.map(({ id: tid, label, Icon }) => (
                  <button
                    key={tid}
                    onClick={() => setActiveTab(tid)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeTab === tid
                        ? 'bg-[#0D9488] text-white shadow-lg shadow-[#0D9488]/25'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Panel */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-4">{tabContent[activeTab].title}</h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{tabContent[activeTab].body}</p>
              </div>

              {/* Reviews Section */}
              <ReviewsSection listingId={listing._id} />
            </div>

            {/* RIGHT COLUMN - Booking Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

                  {/* Price Header */}
                  <div className="bg-gradient-to-r from-[#0D9488] to-[#0f766e] p-6">
                    <div className="flex items-end gap-2 mb-1">
                      <span className="text-4xl font-bold text-white">${listing.price}</span>
                      <span className="text-white/70 text-sm mb-1">per person</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-xs">
                      <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                      <span>{ratingDisplay}</span>
                      <span>•</span>
                      <span>{listing.totalReviews || 0} reviews</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Listing Meta */}
                    <div className="space-y-3 text-sm">
                      {[
                        { label: 'Location', value: listing.location },
                        { label: 'Duration', value: listing.duration },
                        { label: 'Capacity', value: `${listing.capacity || 1} people` },
                        { label: 'Type', value: businessLabel },
                        { label: 'Cover Media', value: coverInfo?.isVideo ? '🎬 Video' : '🖼️ Image' },
                        { label: 'Status', value: listing.status || 'approved', isStatus: true },
                      ].map(({ label, value, isStatus }) => value && (
                        <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <span className="text-gray-500">{label}</span>
                          {isStatus ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              listing.status === 'approved' || !listing.status ? 'bg-[#0D9488]/10 text-[#0D9488]'
                              : listing.status === 'pending' ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                              : 'bg-red-100 text-red-600'
                            }`}>{value}</span>
                          ) : (
                            <span className="font-medium text-[#374151] dark:text-white text-right max-w-[55%]">{value}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Booking Button */}
                    <button
                      onClick={() => setShowBookingModal(true)}
                      disabled={isPending}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold text-lg hover:scale-[1.02] transition-all duration-300 shadow-xl shadow-[#0D9488]/25 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      {isPending ? <><Clock className="w-5 h-5" /> Pending Approval</> : <><Sparkles className="w-5 h-5" /> Book Now</>}
                    </button>

                    <p className="text-center text-xs text-gray-400">Select date and travelers before booking</p>
                  </div>
                </div>

                <ListingTrustBadges />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ================================================================
          BOOKING MODAL
          ================================================================ */}
      {showBookingModal && (
        <>
          <div
            onClick={() => setShowBookingModal(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto">
              
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-[#374151] dark:text-white">
                    Book This Experience
                  </h2>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {listing.title}
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-2">
                    Select Date
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#374151] dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-2">
                    Number of Travelers
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setNumberOfPeople(Math.max(1, numberOfPeople - 1))}
                      className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition text-xl font-bold"
                    >
                      -
                    </button>
                    <span className="text-xl font-bold text-[#374151] dark:text-white min-w-[40px] text-center">
                      {numberOfPeople}
                    </span>
                    <button
                      onClick={() => setNumberOfPeople(Math.min(10, numberOfPeople + 1))}
                      className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition text-xl font-bold"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-500">
                      max 10 people
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Price per person</span>
                    <span className="font-bold text-[#374151] dark:text-white">${listing.price}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-500 dark:text-gray-400">Travelers</span>
                    <span className="font-bold text-[#374151] dark:text-white">× {numberOfPeople}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3 flex justify-between items-center">
                    <span className="font-bold text-[#374151] dark:text-white">Total</span>
                    <span className="text-2xl font-black text-[#0D9488]">
                      ${(listing.price * numberOfPeople).toFixed(2)}
                    </span>
                  </div>
                </div>

                {bookingError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
                    <p className="text-sm text-red-600 dark:text-red-400">{bookingError}</p>
                    {/* ✅ Show manual redirect button if auto-redirect didn't happen */}
                    {bookingError.includes('already have an active booking') && (
                      <button
                        onClick={() => {
                          // Try to find and redirect to the existing booking
                          const getExistingBooking = async () => {
                            try {
                              const myBookings = await getMyBookings();
                              const existing = myBookings?.bookings?.find(b => 
                                b.listing?._id === listing._id && 
                                (b.status === 'pending_payment' || b.paymentStatus === 'pending')
                              );
                              if (existing) {
                                navigate(`/payment/${existing._id}`);
                              } else {
                                navigate('/my-bookings');
                              }
                            } catch (e) {
                              navigate('/my-bookings');
                            }
                          };
                          getExistingBooking();
                        }}
                        className="mt-2 text-sm text-[#0D9488] hover:underline font-medium"
                      >
                        Go to my existing booking →
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBookingSubmit}
                  disabled={bookingLoading || !bookingDate}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#0D9488]/30 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {bookingLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue to Payment
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ListingDetails;