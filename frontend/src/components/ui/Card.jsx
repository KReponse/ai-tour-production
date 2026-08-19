// src/components/ui/Card.jsx
// ✅ COMPLETE FIXED - Mobile responsive with proper sizing
// ✅ ADDED: Responsive padding, font sizes, and grid columns
// ✅ ADDED: Video support with responsive controls
// ✅ FIXED: Touch targets for mobile
// ✅ FIXED: Card stacking on mobile

import React, { useState } from 'react';
import clsx from 'clsx';
import { MapPin, Play, Video } from 'lucide-react';

// =====================================
// AI TOUR COLORS
// =====================================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// =====================================

// =====================================
// FALLBACK IMAGES
// =====================================
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=500',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=500',
];

const getFallbackImage = (seed) => {
  const index = typeof seed === 'number' ? seed : Math.floor(Math.random() * FALLBACK_IMAGES.length);
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
};

// =====================================
// MEDIA HELPERS
// =====================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  if (image.startsWith('/')) return image;
  if (image.startsWith('blob:')) return image;
  return `${API_URL}/uploads/${image}`;
};

const isVideoFile = (url) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

const getMediaType = (src) => {
  if (!src) return 'image';
  if (isVideoFile(src)) return 'video';
  return 'image';
};

// =====================================
// CARD - MAIN COMPONENT
// =====================================
const Card = ({ 
  children, 
  className, 
  hover = true,
  variant = 'default',
  padding = true,
  onClick,
}) => {
  const variants = {
    default: {
      bg: 'bg-white dark:bg-gray-900',
      shadow: 'shadow-lg hover:shadow-2xl',
      border: 'border border-gray-100 dark:border-gray-800',
      rounded: 'rounded-2xl',
    },
    featured: {
      bg: 'bg-gradient-to-br from-[#0D9488]/5 to-[#F59E0B]/5 dark:from-[#0D9488]/10 dark:to-[#F59E0B]/10',
      shadow: 'shadow-xl hover:shadow-2xl',
      border: 'border-2 border-[#0D9488]/30 dark:border-[#0D9488]/20',
      rounded: 'rounded-3xl',
    },
    compact: {
      bg: 'bg-white dark:bg-gray-900',
      shadow: 'shadow-md hover:shadow-xl',
      border: 'border border-gray-200 dark:border-gray-700',
      rounded: 'rounded-xl',
    },
  };

  const variantStyles = variants[variant] || variants.default;

  return (
    <div 
      onClick={onClick}
      className={clsx(
        variantStyles.bg,
        variantStyles.shadow,
        variantStyles.border,
        variantStyles.rounded,
        'overflow-hidden',
        'transition-all duration-300',
        hover && 'hover:scale-[1.02] hover:-translate-y-1',
        padding && 'p-4 sm:p-6',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

// =====================================
// CARD IMAGE - ✅ UPDATED with video support & responsive
// =====================================
export const CardImage = ({ 
  src, 
  alt, 
  className, 
  height = 'h-48 sm:h-56 md:h-64',
  fallback = true,
  children,
  seed,
  videoPoster,
}) => {
  const [error, setError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Determine if this is a video
  const mediaType = getMediaType(src);
  const isVideoFile_ = mediaType === 'video';

  // Get image URL for fallback/poster
  const imageUrl = getImageUrl(src);
  const finalPoster = videoPoster || imageUrl || getFallbackImage(seed);
  const finalSrc = (!src || error) && fallback 
    ? getFallbackImage(seed) 
    : imageUrl;

  const handleError = () => {
    if (fallback) {
      setError(true);
    }
  };

  const handleVideoError = (e) => {
    e.target.style.display = 'none';
    const parent = e.target.parentElement;
    if (parent) {
      const img = document.createElement('img');
      img.src = finalPoster;
      img.className = 'w-full h-full object-cover';
      img.alt = alt || 'Media';
      parent.appendChild(img);
    }
  };

  return (
    <div className={clsx(
      'relative overflow-hidden bg-gradient-to-br from-[#0D9488]/10 to-[#F59E0B]/10',
      height,
      className
    )}>
      {isVideoFile_ && src ? (
        <video
          src={src}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          muted
          autoPlay
          loop
          playsInline
          poster={finalPoster}
          onError={handleVideoError}
          onLoadedData={() => setVideoLoaded(true)}
        />
      ) : finalSrc ? (
        <img
          src={finalSrc}
          alt={alt || 'Tour image'}
          onError={handleError}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B]">
          🏔️
        </div>
      )}
      
      {/* Video badge - responsive */}
      {isVideoFile_ && src && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1">
          <Play className="w-2 h-2 sm:w-3 sm:h-3" />
          <span className="hidden xs:inline">Video</span>
        </div>
      )}
      
      {children}
    </div>
  );
};

// =====================================
// CARD CONTENT - ✅ Responsive
// =====================================
export const CardContent = ({ 
  children, 
  className,
  noPadding = false,
}) => (
  <div className={clsx(
    'space-y-2 sm:space-y-3',
    !noPadding && 'p-4 sm:p-6',
    className
  )}>
    {children}
  </div>
);

// =====================================
// CARD BADGE - ✅ Responsive
// =====================================
export const CardBadge = ({ 
  children, 
  variant = 'default',
  className 
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    success: 'bg-[#0D9488]/10 text-[#0D9488] dark:bg-[#0D9488]/20 dark:text-[#0D9488]',
    warning: 'bg-[#F59E0B]/10 text-[#F59E0B] dark:bg-[#F59E0B]/20 dark:text-[#F59E0B]',
    danger: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    info: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  };

  return (
    <span className={clsx(
      'px-2 py-0.5 sm:px-3 sm:py-1 rounded-full',
      'text-[10px] sm:text-xs font-bold uppercase tracking-wide',
      variants[variant] || variants.default,
      className
    )}>
      {children}
    </span>
  );
};

// =====================================
// CARD TITLE - ✅ Responsive
// =====================================
export const CardTitle = ({ 
  children, 
  className,
  featured = false,
}) => (
  <h3 className={clsx(
    'text-base sm:text-lg md:text-xl font-bold text-[#374151] dark:text-white',
    featured && 'bg-gradient-to-r from-[#0D9488] to-[#F59E0B] bg-clip-text text-transparent',
    className
  )}>
    {children}
  </h3>
);

// =====================================
// CARD SUBTITLE - ✅ Responsive
// =====================================
export const CardSubtitle = ({ 
  children, 
  className,
  icon = MapPin,
}) => {
  const Icon = icon;
  return (
    <div className={clsx(
      'flex items-center gap-1.5 sm:gap-2',
      'text-xs sm:text-sm',
      'text-gray-500 dark:text-gray-400',
      className
    )}>
      {Icon && <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-[#0D9488]" />}
      {children}
    </div>
  );
};

// =====================================
// CARD PRICE - ✅ Responsive
// =====================================
export const CardPrice = ({ 
  price, 
  className,
  currency = '$',
}) => (
  <div className={clsx(
    'font-black text-[#0D9488]',
    'text-base sm:text-lg',
    className
  )}>
    {currency}{price}
  </div>
);

// =====================================
// CARD STATS - ✅ Responsive
// =====================================
export const CardStats = ({ 
  children, 
  className,
}) => (
  <div className={clsx(
    'flex items-center gap-2 sm:gap-4',
    'text-xs sm:text-sm',
    'text-gray-500 dark:text-gray-400',
    className
  )}>
    {children}
  </div>
);

// =====================================
// CARD ACTIONS - ✅ Responsive
// =====================================
export const CardActions = ({ 
  children, 
  className,
}) => (
  <div className={clsx(
    'flex flex-wrap items-center gap-1.5 sm:gap-2',
    'pt-3 sm:pt-4',
    'border-t border-gray-100 dark:border-gray-800',
    className
  )}>
    {children}
  </div>
);

// =====================================
// CARD FOOTER - ✅ Responsive
// =====================================
export const CardFooter = ({ 
  children, 
  className,
}) => (
  <div className={clsx(
    'bg-gray-50 dark:bg-gray-800/50',
    'px-4 py-3 sm:px-6 sm:py-4',
    className
  )}>
    {children}
  </div>
);

// =====================================
// CARD GROUP - ✅ Responsive grid
// =====================================
export const CardGroup = ({ 
  children, 
  className,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
}) => {
  // Responsive grid columns
  const gridCols = {
    xs: cols.xs || 1,
    sm: cols.sm || 1,
    md: cols.md || 2,
    lg: cols.lg || 3,
    xl: cols.xl || 4,
  };

  return (
    <div className={clsx(
      'grid gap-3 sm:gap-4 md:gap-6',
      `grid-cols-${gridCols.xs}`,
      `sm:grid-cols-${gridCols.sm}`,
      `md:grid-cols-${gridCols.md}`,
      `lg:grid-cols-${gridCols.lg}`,
      gridCols.xl && `xl:grid-cols-${gridCols.xl}`,
      className
    )}>
      {children}
    </div>
  );
};

// =====================================
// TOUR CARD - ✅ Responsive
// =====================================
const getStatusBadgeVariant = (status) => {
  const styles = {
    approved: 'success',
    pending: 'warning',
    rejected: 'danger',
    active: 'success',
    inactive: 'default',
  };
  return styles[status?.toLowerCase()] || 'default';
};

export const TourCard = ({ 
  tour, 
  onView,
  onEdit,
  onDelete,
  onShare,
}) => {
  const { 
    _id, 
    title, 
    location, 
    price, 
    images, 
    coverImage, 
    coverMedia,
    coverMediaType,
    videos,
    duration, 
    travelers, 
    views, 
    rating,
    status,
    bookings 
  } = tour || {};

  // Get image/video source
  const getMediaSrc = () => {
    if (coverMedia && coverMediaType === 'video') return coverMedia;
    if (coverImage) return coverImage;
    if (images?.length > 0) return images[0];
    return null;
  };

  const mediaSrc = getMediaSrc();
  const mediaType = coverMediaType === 'video' ? 'video' : 'image';

  const badgeVariant = getStatusBadgeVariant(status);

  return (
    <Card variant="default" hover={true} padding={false}>
      <CardImage 
        src={mediaSrc} 
        alt={title || 'Tour'}
        height="h-48 sm:h-56 md:h-64"
        seed={_id}
        videoPoster={coverImage || (images?.length > 0 ? images[0] : null)}
      >
        {status && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
            <CardBadge variant={badgeVariant}>
              {status}
            </CardBadge>
          </div>
        )}
        {bookings > 0 && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
            <CardBadge variant="info">
              📊 {bookings}
            </CardBadge>
          </div>
        )}
        {mediaType === 'video' && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1">
            <Play className="w-2 h-2 sm:w-3 sm:h-3" />
            <span className="hidden xs:inline">Video</span>
          </div>
        )}
      </CardImage>

      <CardContent>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="flex-1 min-w-0 break-words">
            {title || 'Untitled Tour'}
          </CardTitle>
          <CardPrice price={price || 0} />
        </div>

        <CardSubtitle icon={MapPin}>
          {location || 'Location not specified'}
        </CardSubtitle>

        {/* Responsive stats grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3">
            <div className="text-[#0D9488] text-[10px] sm:text-sm">Duration</div>
            <div className="font-bold text-xs sm:text-sm dark:text-white">{duration || 'N/A'}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3">
            <div className="text-[#F59E0B] text-[10px] sm:text-sm">Travelers</div>
            <div className="font-bold text-xs sm:text-sm dark:text-white">{travelers || 0}</div>
          </div>
        </div>

        <CardStats>
          <span className="flex items-center gap-1">
            <span className="text-base">👁️</span> {views || 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-base">⭐</span> {rating || 0}
          </span>
        </CardStats>

        {/* Responsive action buttons */}
        <CardActions>
          <button
            onClick={() => onView?.(_id)}
            className="flex-1 bg-[#0D9488] hover:bg-[#0D9488]/90 text-white font-bold text-xs sm:text-sm py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition min-h-[36px] sm:min-h-[44px]"
          >
            View
          </button>
          <button
            onClick={() => onEdit?.(_id)}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-[#374151] hover:bg-[#374151]/80 text-white rounded-lg sm:rounded-xl transition flex items-center justify-center text-xs sm:text-base"
          >
            ✏️
          </button>
          <button
            onClick={() => onShare?.(tour)}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-white rounded-lg sm:rounded-xl transition flex items-center justify-center text-xs sm:text-base"
          >
            📤
          </button>
          <button
            onClick={() => onDelete?.(tour)}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg sm:rounded-xl transition flex items-center justify-center text-xs sm:text-base"
          >
            🗑️
          </button>
        </CardActions>
      </CardContent>
    </Card>
  );
};

// =====================================
// EXPORTS ✅
// =====================================
export default Card;