// src/components/ui/MediaCard.jsx
// ✅ COMPLETE FIXED - Stable rendering with fixed dimensions
// ✅ Added proper aspect ratio containers
// ✅ Fixed image loading with pre-dimensions
// ✅ Added image placeholder to prevent layout shift
// ✅ Added lazy loading with blur placeholder
// ✅ Memoized for performance
// ✅ FIXED: Better video rendering with controls and autoplay

import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, 
  MapPin, 
  Clock, 
  Play,
  Heart,
  Eye,
  Volume2,
  VolumeX,
} from 'lucide-react';
import clsx from 'clsx';

// ===============================
// CONSTANTS - Stable fallback images
// ===============================
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&h=300&fit=crop',
];

// ===============================
// HELPERS
// ===============================
const getFallbackImage = (seed) => {
  const index = typeof seed === 'number' ? seed : Math.floor(Math.random() * FALLBACK_IMAGES.length);
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
};

// ===============================
// MEDIA CARD COMPONENT - Memoized
// ===============================
const MediaCard = memo(({
  id,
  title,
  image,
  location,
  price,
  duration,
  rating,
  type, // 'experience' or 'video'
  videoUrl, // For cover video or standalone video
  coverMediaType, // 'image' or 'video'
  views,
  likes,
  onSelect,
  className,
  isLoading = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  // ✅ Stable ID for fallback
  const stableId = useMemo(() => {
    if (typeof id === 'string') {
      return id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }
    return id || Date.now();
  }, [id]);

  // Determine what to display
  const isVideo = type === 'video';
  const isCoverVideo = coverMediaType === 'video' && videoUrl;
  const shouldDisplayVideo = (isVideo || isCoverVideo) && !videoError && videoUrl;

  // ✅ Stable image URL with fallback
  const imageUrl = useMemo(() => {
    if (!image || imageError) {
      return getFallbackImage(stableId);
    }
    return image;
  }, [image, imageError, stableId]);

  // Handle clicks
  const handleClick = () => {
    if (onSelect) {
      onSelect(id);
    }
  };

  // ✅ Toggle mute on video
  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  // Render video
  const renderVideo = () => {
    if (!videoUrl || videoError) return null;
    
    return (
      <div className="w-full h-full bg-black relative">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted={isMuted}
          loop
          playsInline
          poster={imageUrl}
          onError={() => setVideoError(true)}
          preload="metadata"
        />
        {/* Video overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
        
        {/* Play icon overlay - shows when not playing */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-[#0D9488]/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
        
        {/* Video badge */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 pointer-events-none">
          <Play className="w-3 h-3" />
          Video
        </div>

        {/* Mute toggle - visible on hover */}
        <button
          onClick={toggleMute}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    );
  };

  // Render image with placeholder
  const renderImage = () => {
    return (
      <div className="w-full h-full bg-gray-100 dark:bg-gray-800 relative">
        {/* ✅ Placeholder for layout stability */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        )}
        <img
          src={imageUrl}
          alt={title || 'Media'}
          className={clsx(
            'w-full h-full object-cover transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
          width="400"
          height="300"
          decoding="async"
        />
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    );
  };

  // ===============================
  // LOADING STATE
  // ===============================
  if (isLoading) {
    return (
      <div className={clsx(
        'flex-shrink-0 w-full snap-start animate-pulse',
        className
      )}>
        <div className="relative overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-700">
          <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // ===============================
  // RENDER
  // ===============================
  return (
    <div 
      className={clsx(
        'flex-shrink-0 w-full snap-start group cursor-pointer',
        'transition-all duration-300 hover:scale-[1.02]',
        'bg-white dark:bg-gray-900 rounded-xl overflow-hidden',
        'shadow-md hover:shadow-xl',
        'border border-gray-100 dark:border-gray-800',
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={title}
    >
      {/* Media Container - Fixed Aspect Ratio */}
      <div className="relative overflow-hidden bg-gray-200 dark:bg-gray-700">
        <div className="aspect-[4/3]">
          {shouldDisplayVideo ? renderVideo() : renderImage()}
        </div>

        {/* Price Badge - Only show for non-video */}
        {price !== undefined && price > 0 && !isVideo && !isCoverVideo && (
          <div className="absolute bottom-2 left-2 bg-[#0D9488] text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow-lg pointer-events-none">
            ${price}
          </div>
        )}

        {/* Video badge for cover video */}
        {isCoverVideo && (
          <div className="absolute bottom-2 left-2 bg-[#0D9488] text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow-lg pointer-events-none flex items-center gap-1">
            <Play className="w-3 h-3" />
            Video
          </div>
        )}

        {/* Rating Badge */}
        {rating > 0 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-xs text-white flex items-center gap-0.5 pointer-events-none">
            <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
            {rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Info Section - Stable min-height */}
      <div className="p-3 min-h-[76px]">
        <h3 className="font-semibold text-sm text-[#374151] dark:text-white line-clamp-1">
          {title || 'Untitled'}
        </h3>
        
        {location && (
          <div className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <MapPin className="w-3 h-3 text-[#0D9488] flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
          {duration && !isVideo && !isCoverVideo && (
            <div className="flex items-center gap-0.5">
              <Clock className="w-3 h-3 text-[#0D9488] flex-shrink-0" />
              <span>{duration}</span>
            </div>
          )}
          {isVideo && views !== undefined && (
            <div className="flex items-center gap-0.5">
              <Eye className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span>{views}</span>
            </div>
          )}
          {isVideo && likes !== undefined && (
            <div className="flex items-center gap-0.5">
              <Heart className="w-3 h-3 text-[#F59E0B] flex-shrink-0" />
              <span>{likes}</span>
            </div>
          )}
          {isCoverVideo && (
            <div className="flex items-center gap-0.5 text-[#0D9488]">
              <Play className="w-3 h-3 flex-shrink-0" />
              <span>Preview</span>
            </div>
          )}
          {!duration && !isVideo && !isCoverVideo && (
            <span className="text-transparent">-</span>
          )}
        </div>
      </div>
    </div>
  );
});

MediaCard.displayName = 'MediaCard';

// ===============================
// MEDIA CARD GRID - For stable grid rendering
// ===============================
export const MediaCardGrid = ({ 
  items = [], 
  renderItem,
  className = '',
  emptyMessage = 'No items found',
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={clsx(
      'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4',
      className
    )}>
      {items.map((item) => (
        <div key={item._id || item.id} className="w-full">
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
};

export default MediaCard;