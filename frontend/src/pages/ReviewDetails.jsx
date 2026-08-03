// frontend/src/pages/ReviewDetails.jsx

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  MessageCircle,
  ThumbsUp,
  Share2,
  Facebook,
  Twitter,
  Link as LinkIcon,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Award,
  Building2,
  Mail,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
} from 'lucide-react';
import { getPublicReviewById } from '../services/reviewService';
import { getListingById } from '../services/listingService';
import ReviewCard from '../components/ReviewCard'; // ✅ ADD THIS IMPORT
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Custom WhatsApp Icon
const WhatsAppIcon = ({ className = "w-5 h-5 text-green-500" }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ✅ Image Gallery Component
const ImageGallery = ({ images, onImageClick }) => {
  const [loadedImages, setLoadedImages] = useState({});
  const [failedImages, setFailedImages] = useState({});

  const handleImageLoad = (index) => {
    setLoadedImages(prev => ({ ...prev, [index]: true }));
  };

  const handleImageError = (index) => {
    setFailedImages(prev => ({ ...prev, [index]: true }));
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon className="w-5 h-5 text-[#0D9488]" />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Traveler Photos ({images.length})
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((img, index) => {
          const isLoaded = loadedImages[index];
          const hasError = failedImages[index];
          
          return (
            <button
              key={index}
              onClick={() => onImageClick(index)}
              className="relative overflow-hidden rounded-xl aspect-square hover:opacity-90 transition group bg-gray-100 dark:bg-gray-800"
            >
              {!isLoaded && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" />
                </div>
              )}
              
              {hasError ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
              ) : (
                <img
                  src={img.url}
                  alt={img.caption || `Review photo ${index + 1}`}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                  loading="lazy"
                />
              )}
              
              {index === 3 && images.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl">
                  +{images.length - 4}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ✅ Lightbox Component
const Lightbox = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') navigateImage(-1);
      if (e.key === 'ArrowRight') navigateImage(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onClose]);

  useEffect(() => {
    if (isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  const navigateImage = (direction) => {
    const newIndex = (currentIndex + direction + images.length) % images.length;
    setCurrentIndex(newIndex);
    setZoomLevel(1);
    setIsLoading(true);
    setHasError(false);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={() => navigateImage(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 hover:bg-white/20 rounded-full transition z-10"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={() => navigateImage(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 hover:bg-white/20 rounded-full transition z-10"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/50 rounded-full p-2 backdrop-blur-sm">
        <button
          onClick={handleZoomOut}
          className="p-2 text-white hover:bg-white/20 rounded-full transition"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="px-3 py-1 text-white text-sm hover:bg-white/20 rounded-full transition"
        >
          {Math.round(zoomLevel * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2 text-white hover:bg-white/20 rounded-full transition"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 text-white hover:bg-white/20 rounded-full transition"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center p-16">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-white/50" />
          </div>
        )}
        
        {hasError ? (
          <div className="text-white text-center">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p>Failed to load image</p>
          </div>
        ) : (
          <img
            ref={imageRef}
            src={currentImage?.url}
            alt={currentImage?.caption || `Review photo ${currentIndex + 1}`}
            className={`max-w-full max-h-full object-contain transition-transform duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ transform: `scale(${zoomLevel})` }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}
      </div>

      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm z-10">
        {currentIndex + 1} / {images.length}
      </p>
    </div>
  );
};

const ReviewDetails = () => {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [relatedReviews, setRelatedReviews] = useState([]);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    if (!reviewId) {
      setError('No review ID provided');
      setLoading(false);
      return;
    }
    fetchReviewData();
  }, [reviewId]);

  const fetchReviewData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getPublicReviewById(reviewId);
      
      if (!response.success || !response.review) {
        setError('Review not found');
        setLoading(false);
        return;
      }

      const reviewData = response.review;
      
      if (reviewData.images) {
        reviewData.images = reviewData.images.map(img => {
          if (typeof img === 'string') {
            return { url: img };
          }
          return img;
        });
      }
      
      setReview(reviewData);

      // Fetch listing details if available
      if (reviewData.listing) {
        try {
          const listingId = typeof reviewData.listing === 'object' 
            ? reviewData.listing._id 
            : reviewData.listing;
          const listingResponse = await getListingById(listingId);
          if (listingResponse.success) {
            setListing(listingResponse.listing);
          }
        } catch (err) {
          console.warn('Could not fetch listing details:', err);
        }
      }

      // Fetch related reviews (same listing)
      if (reviewData.listing) {
        try {
          const listingId = typeof reviewData.listing === 'object' 
            ? reviewData.listing._id 
            : reviewData.listing;
          const relatedResponse = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/public/listings/${listingId}/reviews?limit=3`
          );
          const relatedData = await relatedResponse.json();
          if (relatedData.success) {
            setRelatedReviews(
              relatedData.reviews.filter(r => r._id !== reviewId).slice(0, 3)
            );
          }
        } catch (err) {
          console.warn('Could not fetch related reviews:', err);
        }
      }

    } catch (err) {
      console.error('Error fetching review:', err);
      setError(err.response?.data?.message || 'Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating, size = 'w-5 h-5') => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating
                ? 'text-[#F59E0B] fill-[#F59E0B]'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAvatar = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0D9488&color=fff&size=80`;
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === 'string') {
      if (image.startsWith('http')) return image;
      if (image.startsWith('/')) return image;
      return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${image}`;
    }
    if (image.url) {
      if (image.url.startsWith('http')) return image.url;
      if (image.url.startsWith('/')) return image.url;
      return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${image.url}`;
    }
    return null;
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out this review: "${review?.title || 'Review'}"`;
    
    let shareUrl = '';
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url).then(() => {
          toast.success('Link copied to clipboard!');
        }).catch(() => {
          toast.error('Failed to copy link');
        });
        setShowShareMenu(false);
        return;
      default:
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank');
      setShowShareMenu(false);
    }
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  };

  const handleReport = () => {
    if (window.confirm('Are you sure you want to report this review?')) {
      toast.success('Review reported. Our team will review it shortly.');
    }
  };

  const getEntityName = () => {
    if (review?.listing) {
      return typeof review.listing === 'object' ? review.listing.title : 'Experience';
    }
    if (review?.tour) {
      return typeof review.tour === 'object' ? review.tour.title : 'Tour';
    }
    return 'Experience';
  };

  const getEntityLocation = () => {
    if (review?.listing) {
      return typeof review.listing === 'object' ? review.listing.location : null;
    }
    if (review?.tour) {
      return typeof review.tour === 'object' ? review.tour.location : null;
    }
    return null;
  };

  const getEntityId = () => {
    if (review?.listing) {
      return typeof review.listing === 'object' ? review.listing._id : review.listing;
    }
    if (review?.tour) {
      return typeof review.tour === 'object' ? review.tour._id : review.tour;
    }
    return null;
  };

  const getProviderName = () => {
    if (review?.provider) {
      return typeof review.provider === 'object' ? review.provider.name : 'Provider';
    }
    return 'Provider';
  };

  // ✅ Get all images with proper URLs
  const getAllImages = () => {
    if (!review?.images || review.images.length === 0) return [];
    return review.images
      .map(img => {
        const url = getImageUrl(img);
        return url ? { 
          url, 
          caption: img.caption || img.alt || `Photo ${review.images.indexOf(img) + 1}`,
          alt: img.alt || img.caption || `Review photo ${review.images.indexOf(img) + 1}`
        } : null;
      })
      .filter(Boolean);
  };

  const images = getAllImages();
  const hasImages = images.length > 0;
  const entityId = getEntityId();
  const entityName = getEntityName();
  const entityLocation = getEntityLocation();
  const providerName = getProviderName();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading review...</p>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Review Not Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error || 'The review you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <Link
            to="/reviews"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Reviews
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* Back Button */}
        <Link
          to="/reviews"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Reviews</span>
        </Link>

        {/* Main Review Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">

          {/* Header - Reviewer Info */}
          <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={review.traveler?.profileImage || getAvatar(review.traveler?.name || 'User')}
                  alt={review.traveler?.name || 'User'}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#0D9488]"
                  onError={(e) => {
                    e.target.src = getAvatar(review.traveler?.name || 'User');
                  }}
                />
                <div>
                  <h3 className="text-lg font-bold text-[#374151] dark:text-white">
                    {review.traveler?.name || 'Anonymous Traveler'}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      {renderStars(review.rating, 'w-4 h-4')}
                      <span className="ml-1 font-medium">{review.rating}.0</span>
                    </span>
                    <span>•</span>
                    <span>{formatDate(review.createdAt)}</span>
                    {review.isVerifiedBooking && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[#0D9488]">
                          <CheckCircle className="w-4 h-4" />
                          Verified Booking
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <Share2 className="w-5 h-5 text-gray-500" />
                </button>

                {showShareMenu && (
                  <div className="absolute right-0 top-12 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-2 z-10 min-w-[180px]">
                    <button
                      onClick={() => handleShare('copy')}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
                    >
                      <WhatsAppIcon className="w-5 h-5 text-green-500" />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleShare('facebook')}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
                    >
                      <Facebook className="w-4 h-4 text-blue-600" />
                      Facebook
                    </button>
                    <button
                      onClick={() => handleShare('x')}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
                    >
                      <Twitter className="w-4 h-4 text-black dark:text-white" />
                      X (Twitter)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Experience Info */}
            <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-[#0D9488] font-medium">
                <MapPin className="w-4 h-4" />
                <span>{entityLocation || 'Location not specified'}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {entityName}
                </p>
                {entityId && (
                  <Link
                    to={`/listing/${entityId}`}
                    className="text-xs text-[#0D9488] hover:underline font-medium"
                  >
                    View Experience →
                  </Link>
                )}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-[#374151] dark:text-white mb-4">
              {review.title || 'Review'}
            </h1>

            {/* Comment */}
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-base">
                {review.comment}
              </p>
            </div>

            {/* ✅ Image Gallery */}
            <ImageGallery 
              images={images} 
              onImageClick={openLightbox} 
            />

            {/* Provider Response */}
            {review.providerResponse && review.providerResponse.comment && (
              <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-[#0D9488]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0D9488]">
                      {providerName} (Provider)
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      {review.providerResponse.comment}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Responded on {formatDate(review.providerResponse.respondedAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm text-gray-600 dark:text-gray-300">
                <ThumbsUp className="w-4 h-4" />
                Helpful ({review.helpfulCount || 0})
              </button>
              <button
                onClick={handleReport}
                className="text-xs text-gray-400 hover:text-red-500 transition ml-auto"
              >
                Report Review
              </button>
            </div>
          </div>

          {/* Footer - Book Now */}
          {entityId && (
            <div className="p-6 sm:p-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Experience this adventure</p>
                  <p className="font-bold text-[#374151] dark:text-white">{entityName}</p>
                </div>
                <Link
                  to={`/listing/${entityId}`}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Book Now
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ✅ Related Reviews - Using ReviewCard */}
        {relatedReviews.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#0D9488]" />
              More Reviews
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedReviews.map((related) => (
                <ReviewCard
                  key={related._id}
                  review={related}
                  compact={true}
                  showTourInfo={false}
                  showUserInfo={true}
                  showProviderResponse={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ✅ Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
};

export default ReviewDetails;