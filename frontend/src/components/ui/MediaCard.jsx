// src/components/ui/MediaCard.jsx
// AI Tour — Media Card
// Navigates to /listing/:id when a card is clicked.
//
// ✅ Removed "Video" and "Preview" labels from the media area
// ✅ Removed floating play overlay on cover videos
// ✅ Provider name now shown in place of "Preview"
// ✅ Minimal, purposeful icons only
// ✅ Brand colors: Teal #0D9488, Gold #F59E0B, Slate #374151
// ✅ Responsive, mobile-first
// ✅ All existing props, exports, and behaviors preserved

import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  MapPin,
  Clock,
  Heart,
  Eye,
  Volume2,
  VolumeX,
} from 'lucide-react';
import clsx from 'clsx';

// ===============================
// FALLBACK IMAGES
// ===============================
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&h=300&fit=crop',
];

const getFallbackImage = (seed = '') => {
  const value = String(seed || 'ai-tour');
  const hash = [...value].reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );

  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
};

// ===============================
// PROVIDER NAME RESOLVER
// ===============================
// Providers can arrive as a populated object, a plain string, or
// be missing entirely. Never render an object as a React child.
const getProviderName = (provider) => {
  if (!provider) return '';

  if (typeof provider === 'string') return provider.trim();

  if (typeof provider === 'object') {
    const candidates = [
      provider.businessName,
      provider.name,
      provider.fullName,
      provider.displayName,
      provider.username,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return '';
};

// ===============================
// MEDIA CARD
// ===============================
const MediaCard = memo(({
  id,
  title,
  image,
  location,
  price,
  duration,
  rating,
  type,
  videoUrl,
  coverMediaType,
  provider,
  views,
  likes,
  onSelect,
  className,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const videoRef = useRef(null);

  const isVideo = type === 'video';
  const isCoverVideo = coverMediaType === 'video' && Boolean(videoUrl);

  const shouldDisplayVideo =
    (isVideo || isCoverVideo) && !videoError && Boolean(videoUrl);

  const providerName = getProviderName(provider);

  // Stable image fallback
  const imageUrl = useMemo(() => {
    if (!image || imageError) {
      return getFallbackImage(id || title);
    }

    return image;
  }, [image, imageError, id, title]);

  // Reset image state when the image changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [image]);

  // Reset video error when video changes
  useEffect(() => {
    setVideoError(false);
  }, [videoUrl]);

  // ===============================
  // NAVIGATION
  // ===============================
  const handleClick = () => {
    if (id === undefined || id === null || String(id).trim() === '') {
      console.error(
        'MediaCard: Missing listing ID. Pass the listing _id or id.'
      );
      return;
    }

    if (onSelect) {
      onSelect(id);
    }

    navigate(`/listing/${encodeURIComponent(String(id))}`);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  // ===============================
  // VIDEO MUTE
  // ===============================
  const toggleMute = (event) => {
    event.stopPropagation();

    if (!videoRef.current) return;

    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // ===============================
  // VIDEO RENDERER  — clean, no overlays
  // ===============================
  const renderVideo = () => {
    if (!videoUrl || videoError) return null;

    return (
      <div className="relative h-full w-full bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-cover"
          autoPlay
          muted={isMuted}
          loop
          playsInline
          poster={imageUrl}
          onError={() => setVideoError(true)}
          preload="metadata"
        />

        {/* Mute toggle — kept because it's the only useful control */}
        <button
          type="button"
          onClick={toggleMute}
          className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    );
  };

  // ===============================
  // IMAGE RENDERER
  // ===============================
  const renderImage = () => (
    <div className="relative h-full w-full bg-gray-100 dark:bg-gray-800">
      {!imageLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
      )}

      <img
        src={imageUrl}
        alt={title || 'AI Tour experience'}
        className={clsx(
          'h-full w-full object-cover transition-opacity duration-300',
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onError={() => {
          if (!imageError) {
            setImageError(true);
          } else {
            setImageLoaded(true);
          }
        }}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
        width="400"
        height="300"
        decoding="async"
      />
    </div>
  );

  // ===============================
  // LOADING STATE
  // ===============================
  if (isLoading) {
    return (
      <div
        className={clsx(
          'w-full flex-shrink-0 snap-start animate-pulse',
          className
        )}
      >
        <div className="overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-700">
          <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-600" />
            <div className="h-3 w-1/2 rounded bg-gray-300 dark:bg-gray-600" />
            <div className="h-3 w-2/3 rounded bg-gray-300 dark:bg-gray-600" />
          </div>
        </div>
      </div>
    );
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  return (
    <div
      className={clsx(
        'group w-full flex-shrink-0 snap-start cursor-pointer',
        'overflow-hidden rounded-xl border border-gray-100 bg-white',
        'shadow-sm transition-all duration-300 hover:shadow-lg',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2',
        'dark:border-gray-800 dark:bg-gray-900',
        'dark:focus-visible:ring-offset-gray-950',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`View details for ${title || 'experience'}${
        providerName ? ` by ${providerName}` : ''
      }`}
    >
      {/* ── MEDIA ── */}
      <div className="relative overflow-hidden bg-gray-200 dark:bg-gray-700">
        <div className="aspect-[4/3]">
          {shouldDisplayVideo ? renderVideo() : renderImage()}
        </div>

        {/* Rating — top-right, only when present */}
        {Number(rating) > 0 && (
          <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-[#374151] shadow-sm backdrop-blur-sm">
            <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
            {Number(rating).toFixed(1)}
          </div>
        )}
      </div>

      {/* ── INFO ── */}
      <div className="p-3">
        {/* Title */}
        <h3 className="line-clamp-1 text-sm font-bold leading-tight text-[#374151] dark:text-white">
          {title || 'Untitled'}
        </h3>

        {/* Location */}
        {location && (
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="h-3 w-3 flex-shrink-0 text-[#0D9488]" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}

        {/* Provider — replaces old "Preview" label */}
        {providerName && (
          <p className="mt-1 line-clamp-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
            by <span className="text-[#0D9488]">{providerName}</span>
          </p>
        )}

        {/* Meta row — duration OR video stats */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Left: duration for regular cards, video stats for videos */}
          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            {duration && !isVideo && !isCoverVideo && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 flex-shrink-0 text-[#0D9488]" />
                {duration}
              </span>
            )}

            {isVideo && views !== undefined && views !== null && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3 flex-shrink-0" />
                {views}
              </span>
            )}

            {isVideo && likes !== undefined && likes !== null && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 flex-shrink-0 text-[#F59E0B]" />
                {likes}
              </span>
            )}
          </div>

          {/* Right: price if present */}
          {price !== undefined &&
            price !== null &&
            Number(price) > 0 && (
              <span className="whitespace-nowrap text-sm font-bold text-[#0D9488] dark:text-[#0D9488]">
                ${Number(price).toLocaleString()}
              </span>
            )}
        </div>
      </div>
    </div>
  );
});

MediaCard.displayName = 'MediaCard';

// ===============================
// MEDIA CARD GRID
// ===============================
export const MediaCardGrid = ({
  items = [],
  renderItem,
  className = '',
  emptyMessage = 'No items found',
}) => {
  if (!items.length) {
    return (
      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-6',
        className
      )}
    >
      {items.map((item, index) => (
        <div key={item._id || item.id || index} className="w-full">
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
};

export default MediaCard;