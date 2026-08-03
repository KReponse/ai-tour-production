// frontend/src/components/listing/ListingCard.jsx
// ✅ COMPLETE FIXED - Added Cover Media support with proper image URL helper

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

// ✅ FIXED: Import media helpers
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
            <div className="w-12 h-12 rounded-full bg-[#0D9488]/80 backdrop-blur flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
          </div>
          {/* Video badge */}
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
            <Play className="w-3 h-3" />
            Video
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
        <Sparkles className="w-16 h-16" />
      </div>
    );
  };

  // ── Compact View ──
  if (compact) {
    return (
      <Link
        to={`/listing/${_id}`}
        className={`block bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-800 ${className}`}
      >
        <div className="flex gap-4 p-4">
          {/* Image */}
          <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative">
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
                <Sparkles className="w-8 h-8" />
              </div>
            )}
            {isVideoCover && (
              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Play className="w-2 h-2" />
                Video
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[#374151] dark:text-white text-sm truncate">
                {title}
              </h3>
              <ListingStatusBadge status={status} size="sm" />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <MapPin className="w-3 h-3 text-[#0D9488]" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="font-bold text-[#0D9488] text-sm">
                {formatPrice(price, currency)}
              </span>
              {averageRating > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
                  <span className="font-medium text-[#374151] dark:text-white">
                    {ratingDisplay}
                  </span>
                  <span className="text-gray-400">({totalReviews || 0})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Full View ──
  return (
    <div
      className={`
        bg-white dark:bg-gray-900 rounded-3xl overflow-hidden
        shadow-sm hover:shadow-xl transition-all duration-300
        border border-gray-100 dark:border-gray-800
        ${className}
      `}
    >
      {/* ── Image ── */}
      <Link to={`/listing/${_id}`} className="block relative overflow-hidden group">
        <div className="relative h-56 overflow-hidden bg-gray-100 dark:bg-gray-800">
          {renderCoverMedia()}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            <ListingStatusBadge status={status} size="md" />
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-4 left-4 bg-[#0D9488] text-white px-4 py-2 rounded-xl font-bold shadow-lg">
            {formatPrice(price, currency)}
          </div>

          {/* Listing Type */}
          {listingType && (
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium">
              {listingType}
            </div>
          )}

          {/* Cover Media Type Badge */}
          <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
            {isVideoCover ? (
              <>
                <Play className="w-3 h-3" />
                Video Cover
              </>
            ) : (
              <>
                <ImageIcon className="w-3 h-3" />
                Image Cover
              </>
            )}
          </div>

          {/* Stats overlay */}
          <div className="absolute bottom-4 right-24 flex items-center gap-3 text-white/90 text-xs bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
            {views > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {views}
              </span>
            )}
            {averageRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
                {ratingDisplay}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Content ── */}
      <div className="p-5 space-y-3">
        {/* Title & Location */}
        <Link to={`/listing/${_id}`}>
          <h3 className="text-lg font-bold text-[#374151] dark:text-white hover:text-[#0D9488] transition line-clamp-1">
            {title}
          </h3>
        </Link>

        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <MapPin className="w-4 h-4 text-[#0D9488]" />
          <span className="line-clamp-1">{location}</span>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#0D9488]" />
              {duration}
            </span>
          )}
          {capacity && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-[#F59E0B]" />
              {capacity} {capacity === 1 ? 'person' : 'people'}
            </span>
          )}
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="capitalize">{businessType?.replace('_', ' ') || 'Service'}</span>
          {isVideoCover && (
            <span className="flex items-center gap-1 text-[#0D9488]">
              <Play className="w-3 h-3" />
              Video Cover
            </span>
          )}
        </div>

        {/* ── Actions ── */}
        {showActions && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            {/* View Details */}
            <Link
              to={`/listing/${_id}`}
              className="flex-1 h-10 rounded-xl bg-[#0D9488] text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#0f766e] transition"
            >
              <Eye className="w-4 h-4" />
              View Details
            </Link>

            {/* Edit Button */}
            <Link
              to={`/provider/listings/edit/${_id}`}
              className="w-10 h-10 rounded-xl bg-[#374151] text-white flex items-center justify-center hover:bg-[#374151]/80 transition"
              title="Edit Listing"
            >
              <Pencil className="w-4 h-4" />
            </Link>

            {/* Toggle Status (if provided) */}
            {onToggleStatus && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onToggleStatus(_id);
                }}
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition ${
                  status === 'approved'
                    ? 'border-[#0D9488] text-[#0D9488] hover:bg-[#0D9488]/10'
                    : status === 'pending'
                    ? 'border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10'
                    : 'border-gray-300 text-gray-400 hover:bg-gray-100'
                }`}
                title={`Toggle Status (currently ${status})`}
              >
                <span className="text-xs font-bold">
                  {status === 'approved' ? '✓' : status === 'pending' ? '⏳' : '✕'}
                </span>
              </button>
            )}

            {/* Favorite */}
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onToggleFavorite(_id);
                }}
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition ${
                  isFavorite
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-red-500 hover:bg-red-500/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
              </button>
            )}

            {/* Delete */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (window.confirm(`Delete "${title}"? This action cannot be undone.`)) {
                    onDelete(_id);
                  }
                }}
                className="w-10 h-10 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition flex items-center justify-center"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingCard;