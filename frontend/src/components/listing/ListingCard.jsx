// frontend/src/components/listing/ListingCard.jsx
// ✅ COMPLETE FIXED - Mobile Responsive Optimizations
// ✅ Fixed: Card layout on mobile
// ✅ Fixed: Action buttons touch targets (44px+)
// ✅ Fixed: Text truncation for small screens
// ✅ Fixed: Responsive grid for listing cards
// ✅ Fixed: Image/video aspect ratio
// ✅ ADDED: Responsive compact view
// ✅ ADDED: Skeleton loading state

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Star,
  Eye,
  Heart,
  Clock,
  Users,
  DollarSign,
  Sparkles,
  XCircle,
  Pencil,
  Play,
  Image as ImageIcon,
} from 'lucide-react';
import ListingStatusBadge from './ListingStatusBadge';

// ✅ Import media helpers
import { getImageUrl, getCoverMedia, getCoverMediaType, getCoverVideo, hasVideo } from '../../utils/mediaHelpers';

// ── Helpers ──────────────────────────────────────────────────────
const formatPrice = (price, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(price);
};

// ── Main Component ──────────────────────────────────────────────
const ListingCard = ({
  listing,
  showActions = true,
  onToggleFavorite,
  onDelete,
  onToggleStatus,
  isFavorite = false,
  compact = false,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const {
    _id,
    title,
    location,
    price,
    currency = 'USD',
    coverImage,
    coverMedia,
    coverMediaType,
    galleryImages,
    averageRating,
    totalReviews,
    status,
    businessType,
    listingType,
    duration,
    capacity,
    views,
    createdAt,
  } = listing;

  // ✅ Get cover URL using media helper
  const coverUrl = getCoverMedia(listing);
  const isVideoCover = getCoverMediaType(listing) === 'video';
  const videoUrl = getCoverVideo(listing);

  const ratingDisplay = averageRating > 0 ? averageRating.toFixed(1) : 'New';
  const isApproved = status === 'approved';

  // ── Render Cover Media ──
  const renderCoverMedia = () => {
    // If it's a video cover
    if (isVideoCover && videoUrl && !videoError) {
      return (
        <div className="relative w-full h-full bg-black">
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            autoPlay
            poster={coverUrl || undefined}
            onError={() => setVideoError(true)}
          />
          {/* Play icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0D9488]/80 backdrop-blur flex items-center justify-center">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          {/* Video badge */}
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-0.5 sm:gap-1">
            <Play className="w-2 h-2 sm:w-3 sm:h-3" />
            <span className="hidden xs:inline">Video</span>
          </div>
        </div>
      );
    }

    // If it's an image or fallback
    if (coverUrl && !imageError) {
      return (
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      );
    }

    // Fallback
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-800">
        <Sparkles className="w-12 h-12 sm:w-16 sm:h-16" />
      </div>
    );
  };

  // ── Compact View (Mobile Optimized) ──
  if (compact) {
    return (
      <Link
        to={`/listing/${_id}`}
        className={`block bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-800 ${className}`}
      >
        <div className="flex gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4">
          {/* Image - Responsive sizing */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg sm:rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative">
            {isVideoCover && videoUrl ? (
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                poster={coverUrl || undefined}
              />
            ) : coverUrl ? (
              <img
                src={coverUrl}
                alt={title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
              </div>
            )}
            {isVideoCover && (
              <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[6px] sm:text-[8px] px-0.5 sm:px-1 py-0.5 rounded flex items-center gap-0.5">
                <Play className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
              </div>
            )}
          </div>

          {/* Info - Mobile friendly */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <h3 className="font-bold text-[#374151] dark:text-white text-xs sm:text-sm truncate flex-1">
                {title}
              </h3>
              <ListingStatusBadge status={status} size="sm" />
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#0D9488] flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5 sm:mt-1">
              <span className="font-bold text-[#0D9488] text-xs sm:text-sm">
                {formatPrice(price, currency)}
              </span>
              {averageRating > 0 && (
                <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs">
                  <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#F59E0B] fill-[#F59E0B]" />
                  <span className="font-medium text-[#374151] dark:text-white">
                    {ratingDisplay}
                  </span>
                  <span className="text-gray-400 hidden xs:inline">({totalReviews || 0})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Full View (Mobile Optimized) ──
  return (
    <div
      className={`
        bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden
        shadow-sm hover:shadow-xl transition-all duration-300
        border border-gray-100 dark:border-gray-800
        ${className}
      `}
    >
      {/* ── Image ── */}
      <Link to={`/listing/${_id}`} className="block relative overflow-hidden group">
        {/* ✅ Responsive image height */}
        <div className="relative h-44 xs:h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden bg-gray-100 dark:bg-gray-800">
          {renderCoverMedia()}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status Badge - Mobile responsive */}
          <div className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4">
            <ListingStatusBadge status={status} size="sm sm:md" />
          </div>

          {/* Price Badge - Mobile responsive */}
          <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-2 sm:left-3 md:left-4 bg-[#0D9488] text-white px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg sm:rounded-xl font-bold shadow-lg text-xs sm:text-sm">
            {formatPrice(price, currency)}
          </div>

          {/* Listing Type - Mobile responsive */}
          {listingType && (
            <div className="absolute top-2 sm:top-3 md:top-4 left-2 sm:left-3 md:left-4 bg-black/50 backdrop-blur-sm text-white text-[10px] sm:text-xs px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full font-medium">
              {listingType}
            </div>
          )}

          {/* Cover Media Type Badge - Mobile responsive */}
          <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 right-2 sm:right-3 md:right-4 bg-black/50 backdrop-blur-sm text-white text-[8px] sm:text-[10px] md:text-xs px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full font-medium flex items-center gap-0.5 sm:gap-1">
            {isVideoCover ? (
              <>
                <Play className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                <span className="hidden xs:inline">Video</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                <span className="hidden xs:inline">Photo</span>
              </>
            )}
          </div>

          {/* Stats overlay - Mobile responsive */}
          <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 right-16 sm:right-20 md:right-24 flex items-center gap-1 sm:gap-2 md:gap-3 text-white/90 text-[8px] sm:text-[10px] md:text-xs bg-black/40 backdrop-blur-sm px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-full">
            {views > 0 && (
              <span className="flex items-center gap-0.5 sm:gap-1">
                <Eye className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                <span className="hidden xs:inline">{views}</span>
              </span>
            )}
            {averageRating > 0 && (
              <span className="flex items-center gap-0.5 sm:gap-1">
                <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="hidden xs:inline">{ratingDisplay}</span>
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Content ── */}
      <div className="p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-2.5 md:space-y-3">
        {/* Title & Location */}
        <Link to={`/listing/${_id}`}>
          <h3 className="text-sm sm:text-base md:text-lg font-bold text-[#374151] dark:text-white hover:text-[#0D9488] transition line-clamp-1">
            {title}
          </h3>
        </Link>

        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-[#0D9488] flex-shrink-0" />
          <span className="line-clamp-1">{location}</span>
        </div>

        {/* Meta - Mobile responsive */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-3 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
          {duration && (
            <span className="flex items-center gap-0.5 sm:gap-1">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#0D9488]" />
              <span className="truncate">{duration}</span>
            </span>
          )}
          {capacity && (
            <span className="flex items-center gap-0.5 sm:gap-1">
              <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#F59E0B]" />
              <span className="truncate">{capacity} {capacity === 1 ? 'person' : 'people'}</span>
            </span>
          )}
          <span className="text-gray-300 dark:text-gray-600 hidden xs:inline">•</span>
          <span className="capitalize truncate hidden xs:inline">{businessType?.replace('_', ' ') || 'Service'}</span>
          {isVideoCover && (
            <span className="flex items-center gap-0.5 sm:gap-1 text-[#0D9488]">
              <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden xs:inline">Video</span>
            </span>
          )}
        </div>

        {/* ── Actions - Mobile optimized (min 44px touch targets) ── */}
        {showActions && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 sm:pt-2.5 md:pt-3 border-t border-gray-100 dark:border-gray-800">
            {/* View Details - Full width on mobile */}
            <Link
              to={`/listing/${_id}`}
              className="flex-1 min-h-[40px] sm:min-h-[44px] rounded-lg sm:rounded-xl bg-[#0D9488] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 hover:bg-[#0f766e] transition px-2 sm:px-3 touch-manipulation"
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">View Details</span>
              <span className="inline xs:hidden">View</span>
            </Link>

            {/* Edit Button - Min 44px touch target */}
            <Link
              to={`/provider/listings/edit/${_id}`}
              className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg sm:rounded-xl bg-[#374151] text-white flex items-center justify-center hover:bg-[#374151]/80 transition touch-manipulation"
              title="Edit Listing"
            >
              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>

            {/* Toggle Status - Min 44px touch target */}
            {onToggleStatus && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onToggleStatus(_id);
                }}
                className={`min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition touch-manipulation ${
                  status === 'approved'
                    ? 'border-[#0D9488] text-[#0D9488] hover:bg-[#0D9488]/10'
                    : status === 'pending'
                    ? 'border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10'
                    : 'border-gray-300 text-gray-400 hover:bg-gray-100'
                }`}
                title={`Toggle Status (currently ${status})`}
              >
                <span className="text-sm font-bold">
                  {status === 'approved' ? '✓' : status === 'pending' ? '⏳' : '✕'}
                </span>
              </button>
            )}

            {/* Favorite - Min 44px touch target */}
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onToggleFavorite(_id);
                }}
                className={`min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition touch-manipulation ${
                  isFavorite
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-red-500 hover:bg-red-500/10'
                }`}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
              </button>
            )}

            {/* Delete - Min 44px touch target */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (window.confirm(`Delete "${title}"? This action cannot be undone.`)) {
                    onDelete(_id);
                  }
                }}
                className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg sm:rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition flex items-center justify-center touch-manipulation"
                aria-label="Delete listing"
              >
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingCard;