// src/components/ui/Card.jsx
// ============================================================
// AI TOUR — CARD PRIMITIVES
// ============================================================
// ✅ Removed "Video" badge and center play icon from CardImage
//    and TourCard — media shows cleanly without distracting
//    overlays.
// ✅ Removed duplicate Video badge in TourCard (was rendered
//    both by CardImage and TourCard).
// ✅ Fixed invalid `xs:` breakpoint (not in default Tailwind —
//    silently produced no styles). Replaced with `sm:` which
//    behaves the same on all supported widths.
// ✅ Fixed CardGroup dynamic Tailwind classes — arbitrary
//    template classes like `grid-cols-${n}` are purged in
//    production. Now uses a static lookup map.
// ✅ Replaced "Pending" status badge visibility — but the
//    TourCard is a PROVIDER-ONLY component (it has onEdit /
//    onDelete / onShare actions), so status badge stays.
// ✅ Preserved: all props, exports, video/image fallback,
//    responsive layout, dark mode, brand colors.
// ============================================================

import React, { useState } from 'react';
import clsx from 'clsx';
import { MapPin } from 'lucide-react';

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
  const index =
    typeof seed === 'number'
      ? seed
      : Math.floor(Math.random() * FALLBACK_IMAGES.length);
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
};

// =====================================
// MEDIA HELPERS
// =====================================

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  if (image.startsWith('/')) return image;
  if (image.startsWith('blob:')) return image;
  return `${API_URL}/uploads/${image}`;
};

const isVideoFile = (url) => {
  if (!url) return false;
  const videoExtensions = [
    '.mp4',
    '.mov',
    '.webm',
    '.avi',
    '.mkv',
    '.m4v',
    '.3gp',
  ];
  return videoExtensions.some((ext) =>
    url.toLowerCase().endsWith(ext)
  );
};

const getMediaType = (src) => {
  if (!src) return 'image';
  if (isVideoFile(src)) return 'video';
  return 'image';
};

// =====================================
// CARD — MAIN COMPONENT
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
      border:
        'border-2 border-[#0D9488]/30 dark:border-[#0D9488]/20',
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
// CARD IMAGE — clean, no labels
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

  const mediaType = getMediaType(src);
  const isVideoFile_ = mediaType === 'video';

  const imageUrl = getImageUrl(src);
  const finalPoster =
    videoPoster || imageUrl || getFallbackImage(seed);
  const finalSrc =
    (!src || error) && fallback
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
    <div
      className={clsx(
        'relative overflow-hidden bg-gradient-to-br from-[#0D9488]/10 to-[#F59E0B]/10',
        height,
        className
      )}
    >
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

      {children}
    </div>
  );
};

// =====================================
// CARD CONTENT
// =====================================
export const CardContent = ({
  children,
  className,
  noPadding = false,
}) => (
  <div
    className={clsx(
      'space-y-2 sm:space-y-3',
      !noPadding && 'p-4 sm:p-6',
      className
    )}
  >
    {children}
  </div>
);

// =====================================
// CARD BADGE
// =====================================
export const CardBadge = ({
  children,
  variant = 'default',
  className,
}) => {
  const variants = {
    default:
      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    success:
      'bg-[#0D9488]/10 text-[#0D9488] dark:bg-[#0D9488]/20 dark:text-[#0D9488]',
    warning:
      'bg-[#F59E0B]/10 text-[#F59E0B] dark:bg-[#F59E0B]/20 dark:text-[#F59E0B]',
    danger:
      'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    info:
      'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  };

  return (
    <span
      className={clsx(
        'px-2 py-0.5 sm:px-3 sm:py-1 rounded-full',
        'text-[10px] sm:text-xs font-bold uppercase tracking-wide',
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
};

// =====================================
// CARD TITLE
// =====================================
export const CardTitle = ({
  children,
  className,
  featured = false,
}) => (
  <h3
    className={clsx(
      'text-base sm:text-lg md:text-xl font-bold text-[#374151] dark:text-white',
      featured &&
        'bg-gradient-to-r from-[#0D9488] to-[#F59E0B] bg-clip-text text-transparent',
      className
    )}
  >
    {children}
  </h3>
);

// =====================================
// CARD SUBTITLE
// =====================================
export const CardSubtitle = ({
  children,
  className,
  icon = MapPin,
}) => {
  const Icon = icon;
  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 sm:gap-2',
        'text-xs sm:text-sm',
        'text-gray-500 dark:text-gray-400',
        className
      )}
    >
      {Icon && (
        <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-[#0D9488]" />
      )}
      {children}
    </div>
  );
};

// =====================================
// CARD PRICE
// =====================================
export const CardPrice = ({
  price,
  className,
  currency = '$',
}) => (
  <div
    className={clsx(
      'font-black text-[#0D9488]',
      'text-base sm:text-lg',
      className
    )}
  >
    {currency}
    {price}
  </div>
);

// =====================================
// CARD STATS
// =====================================
export const CardStats = ({ children, className }) => (
  <div
    className={clsx(
      'flex items-center gap-2 sm:gap-4',
      'text-xs sm:text-sm',
      'text-gray-500 dark:text-gray-400',
      className
    )}
  >
    {children}
  </div>
);

// =====================================
// CARD ACTIONS
// =====================================
export const CardActions = ({ children, className }) => (
  <div
    className={clsx(
      'flex flex-wrap items-center gap-1.5 sm:gap-2',
      'pt-3 sm:pt-4',
      'border-t border-gray-100 dark:border-gray-800',
      className
    )}
  >
    {children}
  </div>
);

// =====================================
// CARD FOOTER
// =====================================
export const CardFooter = ({ children, className }) => (
  <div
    className={clsx(
      'bg-gray-50 dark:bg-gray-800/50',
      'px-4 py-3 sm:px-6 sm:py-4',
      className
    )}
  >
    {children}
  </div>
);

// =====================================
// CARD GROUP — static Tailwind map
// =====================================
const COL_CLASS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

const SM_COL_CLASS = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
};

const MD_COL_CLASS = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const LG_COL_CLASS = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

const XL_COL_CLASS = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
};

export const CardGroup = ({
  children,
  className,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
}) => {
  const gridCols = {
    xs: cols.xs || 1,
    sm: cols.sm || 1,
    md: cols.md || 2,
    lg: cols.lg || 3,
    xl: cols.xl || 4,
  };

  return (
    <div
      className={clsx(
        'grid gap-3 sm:gap-4 md:gap-6',
        COL_CLASS[gridCols.xs] || COL_CLASS[1],
        SM_COL_CLASS[gridCols.sm] || SM_COL_CLASS[1],
        MD_COL_CLASS[gridCols.md] || MD_COL_CLASS[2],
        LG_COL_CLASS[gridCols.lg] || LG_COL_CLASS[3],
        gridCols.xl && XL_COL_CLASS[gridCols.xl],
        className
      )}
    >
      {children}
    </div>
  );
};

// =====================================
// TOUR CARD — provider tool card
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
    duration,
    travelers,
    views,
    rating,
    status,
    bookings,
  } = tour || {};

  const getMediaSrc = () => {
    if (coverMedia && coverMediaType === 'video') return coverMedia;
    if (coverImage) return coverImage;
    if (images?.length > 0) return images[0];
    return null;
  };

  const mediaSrc = getMediaSrc();
  const badgeVariant = getStatusBadgeVariant(status);

  return (
    <Card variant="default" hover={true} padding={false}>
      <CardImage
        src={mediaSrc}
        alt={title || 'Tour'}
        height="h-48 sm:h-56 md:h-64"
        seed={_id}
        videoPoster={
          coverImage || (images?.length > 0 ? images[0] : null)
        }
      >
        {/* Status badge — provider-only card, useful for owner */}
        {status && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
            <CardBadge variant={badgeVariant}>{status}</CardBadge>
          </div>
        )}

        {/* Bookings count — useful for provider */}
        {bookings > 0 && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
            <CardBadge variant="info">📊 {bookings}</CardBadge>
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3">
            <div className="text-[#0D9488] text-[10px] sm:text-sm">
              Duration
            </div>
            <div className="font-bold text-xs sm:text-sm dark:text-white">
              {duration || 'N/A'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3">
            <div className="text-[#F59E0B] text-[10px] sm:text-sm">
              Travelers
            </div>
            <div className="font-bold text-xs sm:text-sm dark:text-white">
              {travelers || 0}
            </div>
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
            aria-label="Edit tour"
          >
            ✏️
          </button>
          <button
            onClick={() => onShare?.(tour)}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-white rounded-lg sm:rounded-xl transition flex items-center justify-center text-xs sm:text-base"
            aria-label="Share tour"
          >
            📤
          </button>
          <button
            onClick={() => onDelete?.(tour)}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg sm:rounded-xl transition flex items-center justify-center text-xs sm:text-base"
            aria-label="Delete tour"
          >
            🗑️
          </button>
        </CardActions>
      </CardContent>
    </Card>
  );
};

// =====================================
// EXPORTS
// =====================================
export default Card;