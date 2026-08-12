// frontend/src/components/ReviewCard.jsx
// ✅ PRODUCTION READY - Full review card with moderation support
// ✅ FIXED: Replaced process.env with import.meta.env for Vite compatibility
// ✅ OPTIMIZED: Added React.memo for performance
// ✅ OPTIMIZED: Memoized child components

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  ThumbsUp,
  CheckCircle,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Reply,
  Building2,
  Edit2,
  Trash2,
  Flag,
  Shield,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ===============================
// STATUS BADGE COMPONENT - Memoized
// ===============================
const StatusBadge = memo(({ status }) => {
  const configs = {
    published: {
      bg: 'bg-[#0D9488]/10',
      text: 'text-[#0D9488]',
      icon: <CheckCircle className="w-3 h-3" />,
      label: 'Published',
    },
    hidden: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-500 dark:text-gray-400',
      icon: <EyeOff className="w-3 h-3" />,
      label: 'Hidden',
    },
    deleted: {
      bg: 'bg-red-100 dark:bg-red-900/20',
      text: 'text-red-500 dark:text-red-400',
      icon: <Trash2 className="w-3 h-3" />,
      label: 'Deleted',
    },
    reported: {
      bg: 'bg-orange-100 dark:bg-orange-900/20',
      text: 'text-orange-500 dark:text-orange-400',
      icon: <AlertCircle className="w-3 h-3" />,
      label: 'Reported',
    },
  };

  const config = configs[status] || configs.published;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// ===============================
// STARS COMPONENT - Memoized
// ===============================
const Stars = memo(({ rating, size = 'w-4 h-4' }) => {
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
});

Stars.displayName = 'Stars';

// ===============================
// IMAGE GALLERY COMPONENT - Memoized
// ===============================
const ImageGallery = memo(({ images, onImageClick, maxDisplay = 4 }) => {
  if (!images || images.length === 0) return null;

  const displayImages = images.slice(0, maxDisplay);
  const remaining = images.length - maxDisplay;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {displayImages.map((img, index) => (
        <button
          key={index}
          onClick={() => onImageClick(index)}
          className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden hover:opacity-90 transition relative group"
        >
          <img
            src={img.url}
            alt={img.caption || `Review photo ${index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/80x80?text=No+Image';
            }}
          />
          {index === maxDisplay - 1 && remaining > 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-bold">
              +{remaining}
            </div>
          )}
        </button>
      ))}
    </div>
  );
});

ImageGallery.displayName = 'ImageGallery';

// ===============================
// PROVIDER REPLY COMPONENT - Memoized
// ===============================
const ProviderReply = memo(({ reply, providerName, replyAt, updatedAt, onEdit }) => {
  const formatDate = (date) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-2">
        <Reply className="w-4 h-4 text-[#0D9488] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#0D9488]">
              {providerName} (Provider)
            </p>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-xs text-gray-400 hover:text-[#0D9488] transition"
              >
                Edit Reply
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
            {reply}
          </p>
          <div className="flex gap-2 text-xs text-gray-400 mt-1">
            <span>Responded on {formatDate(replyAt)}</span>
            {updatedAt && (
              <span>(updated {formatDate(updatedAt)})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ProviderReply.displayName = 'ProviderReply';

// ===============================
// MAIN REVIEW CARD COMPONENT
// ===============================
const ReviewCard = memo(({
  review,
  onEdit,
  onDelete,
  onHelpfulToggle,
  onReply,
  onReport,
  showActions = false,
  showTourInfo = false,
  showUserInfo = true,
  showProviderReply = true,
  compact = false,
  className = '',
  isAdmin = false,
  isProvider = false,
  permissions = {},
}) => {
  // ============================================================
  // ✅ ALL HOOKS AT THE TOP
  // ============================================================
  
  const { user } = useAuth();
  
  const [imageLightbox, setImageLightbox] = useState({ open: false, index: 0 });
  const [isHelpful, setIsHelpful] = useState(review?.isHelpful || false);
  const [helpfulCount, setHelpfulCount] = useState(review?.helpfulCount || 0);
  const [showFullComment, setShowFullComment] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // ✅ FIXED: Use import.meta.env instead of process.env
  const EDIT_WINDOW_HOURS = parseInt(import.meta.env.VITE_REVIEW_EDIT_WINDOW_HOURS) || 168;
  const DELETE_WINDOW_HOURS = parseInt(import.meta.env.VITE_REVIEW_DELETE_WINDOW_HOURS) || 168;

  // ============================================================
  // ✅ useMemo hooks
  // ============================================================
  
  const images = useMemo(() => {
    if (!review?.images || review.images.length === 0) return [];
    return review.images.map(img => {
      if (typeof img === 'string') return { url: img };
      return img;
    });
  }, [review?.images]);

  const hasImages = useMemo(() => images.length > 0, [images]);

  const reviewerName = useMemo(() => {
    if (review?.traveler?.name) return review.traveler.name;
    if (review?.user?.name) return review.user.name;
    return 'Anonymous Traveler';
  }, [review?.traveler?.name, review?.user?.name]);

  const reviewerAvatar = useMemo(() => {
    if (review?.traveler?.profileImage) return review.traveler.profileImage;
    if (review?.user?.profileImage) return review.user.profileImage;
    if (review?.traveler?.avatar) return review.traveler.avatar;
    return null;
  }, [review?.traveler?.profileImage, review?.user?.profileImage, review?.traveler?.avatar]);

  const entity = useMemo(() => review?.listing || review?.tour || null, [review?.listing, review?.tour]);
  const entityTitle = useMemo(() => entity?.title || 'Experience', [entity?.title]);
  const entityLink = useMemo(() => {
    if (!entity) return '#';
    if (review?.listing) return `/listing/${entity._id || entity}`;
    if (review?.tour) return `/tour/${entity._id || entity}`;
    return '#';
  }, [entity, review?.listing, review?.tour]);

  const providerName = useMemo(() => {
    if (review?.provider?.businessName) return review.provider.businessName;
    if (review?.provider?.name) return review.provider.name;
    return 'Provider';
  }, [review?.provider?.businessName, review?.provider?.name]);

  const isVerified = useMemo(() => review?.isVerifiedBooking || review?.paymentStatus === 'paid', 
    [review?.isVerifiedBooking, review?.paymentStatus]);

  // ✅ Edit/Delete window checks using VITE env vars
  const canEdit = useMemo(() => {
    if (!user) return false;
    if (review?.status === 'deleted') return false;
    if (review?.status === 'hidden' && !isAdmin) return false;
    
    const isOwner = review?.traveler?._id === user._id || review?.traveler === user._id;
    if (!isOwner) return false;
    
    const createdAt = new Date(review?.createdAt);
    const now = new Date();
    const diff = (now - createdAt) / (1000 * 60 * 60);
    return diff < EDIT_WINDOW_HOURS;
  }, [review, user, isAdmin, EDIT_WINDOW_HOURS]);

  const canDelete = useMemo(() => {
    if (!user) return false;
    if (review?.status === 'deleted') return false;
    
    const isOwner = review?.traveler?._id === user._id || review?.traveler === user._id;
    if (!isOwner) return false;
    
    const createdAt = new Date(review?.createdAt);
    const now = new Date();
    const diff = (now - createdAt) / (1000 * 60 * 60);
    return diff < DELETE_WINDOW_HOURS;
  }, [review, user, DELETE_WINDOW_HOURS]);

  const canReport = useMemo(() => {
    if (!user) return false;
    if (review?.status === 'deleted') return false;
    if (review?.status === 'hidden') return false;
    
    const isOwner = review?.traveler?._id === user._id || review?.traveler === user._id;
    if (isOwner) return false;
    
    return true;
  }, [review, user]);

  const canReply = useMemo(() => {
    if (!user) return false;
    if (review?.status === 'deleted') return false;
    if (review?.status === 'hidden' && !isAdmin) return false;
    
    const isProvider = review?.provider?._id === user._id || review?.provider === user._id;
    return isProvider && !review?.providerReply;
  }, [review, user, isAdmin]);

  const canEditReply = useMemo(() => {
    if (!user) return false;
    if (review?.status === 'deleted') return false;
    
    const isProvider = review?.provider?._id === user._id || review?.provider === user._id;
    return isProvider && review?.providerReply;
  }, [review, user]);

  // ============================================================
  // ✅ useEffect hooks
  // ============================================================
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!imageLightbox.open) return;
      if (e.key === 'Escape') {
        setImageLightbox({ open: false, index: 0 });
        document.body.style.overflow = '';
      }
      if (e.key === 'ArrowLeft') {
        const newIndex = (imageLightbox.index - 1 + images.length) % images.length;
        setImageLightbox({ ...imageLightbox, index: newIndex });
      }
      if (e.key === 'ArrowRight') {
        const newIndex = (imageLightbox.index + 1) % images.length;
        setImageLightbox({ ...imageLightbox, index: newIndex });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageLightbox.open, imageLightbox.index, images.length]);

  useEffect(() => {
    if (imageLightbox.open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [imageLightbox.open]);

  // ============================================================
  // ✅ useCallback hooks
  // ============================================================
  
  const handleHelpfulToggle = useCallback(async () => {
    if (onHelpfulToggle) {
      const result = await onHelpfulToggle(review?._id);
      if (result) {
        setIsHelpful(!isHelpful);
        setHelpfulCount(prev => isHelpful ? prev - 1 : prev + 1);
      }
    }
  }, [onHelpfulToggle, review?._id, isHelpful]);

  const handleReplySubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (onReply) {
      await onReply(review?._id, replyText);
      setReplyText('');
      setIsReplying(false);
    }
  }, [onReply, review?._id, replyText]);

  const handleReportSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    
    setIsSubmittingReport(true);
    try {
      if (onReport) {
        await onReport(review?._id, reportReason);
        setShowReportModal(false);
        setReportReason('');
      }
    } catch (error) {
      console.error('Error reporting review:', error);
    } finally {
      setIsSubmittingReport(false);
    }
  }, [onReport, review?._id, reportReason]);

  const openLightbox = useCallback((index) => {
    setImageLightbox({ open: true, index });
  }, []);

  const closeLightbox = useCallback(() => {
    setImageLightbox({ open: false, index: 0 });
  }, []);

  const navigateLightbox = useCallback((direction) => {
    const newIndex = (imageLightbox.index + direction + images.length) % images.length;
    setImageLightbox({ ...imageLightbox, index: newIndex });
  }, [imageLightbox.index, images.length]);

  const toggleShowFullComment = useCallback(() => {
    setShowFullComment(prev => !prev);
  }, []);

  // ============================================================
  // ✅ Memoized render helpers
  // ============================================================
  
  const formatDate = useCallback((date) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }, []);

  // ============================================================
  // ✅ EARLY RETURN - AFTER ALL HOOKS
  // ============================================================
  
  if (!review) return null;

  // If deleted, only show to owner or admin
  if (review.status === 'deleted' && !isAdmin && !permissions.isOwner) {
    return null;
  }

  // If hidden, only show to admin or provider
  if (review.status === 'hidden' && !isAdmin && !isProvider) {
    return null;
  }

  // ============================================================
  // ✅ Computed values
  // ============================================================
  
  const shouldTruncate = !compact && review.comment?.length > 300;
  const displayComment = compact 
    ? (review.comment?.substring(0, 120) + (review.comment?.length > 120 ? '...' : ''))
    : showFullComment || !shouldTruncate
      ? review.comment
      : review.comment?.substring(0, 300) + '...';

  const hasProviderReply = review.providerReply && review.providerReply.trim();

  // ============================================================
  // ✅ RENDER
  // ============================================================
  
  return (
    <>
      <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300 ${className}`}>
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {showUserInfo && (
              <div className="flex-shrink-0">
                {reviewerAvatar ? (
                  <img
                    src={reviewerAvatar}
                    alt={reviewerName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#0D9488]"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white font-bold text-sm">
                    {reviewerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
            
            <div>
              {showUserInfo && (
                <h4 className="font-semibold text-[#374151] dark:text-white">
                  {reviewerName}
                </h4>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Stars rating={review.rating} />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {review.rating}.0
                </span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                )}
                {review.isEdited && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    <Edit2 className="w-3 h-3" />
                    Edited
                  </span>
                )}
                {(isAdmin || isProvider || permissions.isOwner) && (
                  <StatusBadge status={review.status} />
                )}
                {review.reportedCount > 0 && isAdmin && (
                  <span className="inline-flex items-center gap-1 text-xs text-orange-500 bg-orange-100 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    {review.reportedCount} reports
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(review.createdAt)}</span>
            {review.editedAt && review.isEdited && (
              <span className="text-gray-400 text-[10px]">
                (edited {formatDate(review.editedAt)})
              </span>
            )}
          </div>
        </div>

        {/* TITLE */}
        {review.title && (
          <h3 className="text-lg font-semibold text-[#374151] dark:text-white mt-3">
            {review.title}
          </h3>
        )}

        {/* COMMENT */}
        <div className="mt-2">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {displayComment}
          </p>
          {shouldTruncate && !compact && (
            <button
              onClick={toggleShowFullComment}
              className="text-sm text-[#0D9488] hover:underline font-medium mt-1"
            >
              {showFullComment ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* IMAGES GALLERY - Using memoized component */}
        {hasImages && !compact && (
          <div className="mt-3">
            <ImageGallery 
              images={images} 
              onImageClick={openLightbox} 
              maxDisplay={4}
            />
          </div>
        )}

        {/* EXPERIENCE INFO */}
        {showTourInfo && entity && (
          <Link
            to={entityLink}
            className="inline-flex items-center gap-1 mt-3 text-sm text-[#0D9488] hover:underline"
          >
            <Building2 className="w-3 h-3" />
            <span>{entityTitle}</span>
          </Link>
        )}

        {/* PROVIDER REPLY - Using memoized component */}
        {showProviderReply && hasProviderReply && (
          <ProviderReply
            reply={review.providerReply}
            providerName={providerName}
            replyAt={review.providerReplyAt}
            updatedAt={review.providerReplyUpdatedAt}
            onEdit={canEditReply && onReply ? () => {
              setReplyText(review.providerReply);
              setIsReplying(true);
            } : null}
          />
        )}

        {/* REPLY INPUT */}
        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your response..."
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-sm font-medium hover:bg-[#0D9488]/80 transition disabled:opacity-50"
              >
                Send
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReplying(false);
                  setReplyText('');
                }}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ACTIONS */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleHelpfulToggle}
            className={`flex items-center gap-1.5 text-sm transition ${
              isHelpful ? 'text-[#0D9488]' : 'text-gray-400 hover:text-[#0D9488]'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${isHelpful ? 'fill-[#0D9488]' : ''}`} />
            <span>Helpful ({helpfulCount})</span>
          </button>

          {showActions && canEdit && onEdit && (
            <button
              onClick={() => onEdit(review)}
              className="text-sm text-gray-400 hover:text-[#0D9488] transition flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          )}

          {showActions && canDelete && onDelete && (
            <button
              onClick={() => onDelete(review._id)}
              className="text-sm text-gray-400 hover:text-red-500 transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}

          {canReply && onReply && (
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-sm text-[#0D9488] hover:underline transition flex items-center gap-1"
            >
              <Reply className="w-3 h-3" />
              {isReplying ? 'Cancel' : 'Reply'}
            </button>
          )}

          {canReport && onReport && (
            <button
              onClick={() => setShowReportModal(true)}
              className="text-sm text-gray-400 hover:text-orange-500 transition flex items-center gap-1"
            >
              <Flag className="w-3 h-3" />
              Report
            </button>
          )}

          {compact && review.comment?.length > 120 && (
            <Link
              to={`/reviews/${review._id}`}
              className="text-sm text-[#0D9488] hover:underline ml-auto"
            >
              Read Full Review →
            </Link>
          )}
        </div>

        {/* Moderation History */}
        {isAdmin && (review.moderatedAt || review.hiddenAt || review.deletedAt) && (
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Moderation History:
              {review.moderatedAt && (
                <span>Moderated {formatDate(review.moderatedAt)}</span>
              )}
              {review.hiddenAt && (
                <span className="ml-2">Hidden {formatDate(review.hiddenAt)}</span>
              )}
              {review.deletedAt && (
                <span className="ml-2">Deleted {formatDate(review.deletedAt)}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* IMAGE LIGHTBOX */}
      {imageLightbox.open && hasImages && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition z-10"
          >
            <X className="w-6 h-6" />
          </button>
          
          {images.length > 1 && (
            <>
              <button
                onClick={() => navigateLightbox(-1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 hover:bg-white/20 rounded-full transition"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={() => navigateLightbox(1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 hover:bg-white/20 rounded-full transition"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          <div className="max-w-4xl max-h-[80vh] mx-4">
            <img
              src={images[imageLightbox.index]?.url}
              alt={images[imageLightbox.index]?.caption || `Review photo ${imageLightbox.index + 1}`}
              className="w-full h-full object-contain max-h-[80vh]"
              loading="lazy"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/800x600?text=No+Image';
              }}
            />
            <p className="text-center text-white/60 text-sm mt-4">
              {imageLightbox.index + 1} / {images.length}
            </p>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#374151] dark:text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-500" />
                Report Review
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  Why are you reporting this review?
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Please describe the issue..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none resize-none h-24"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || !reportReason.trim()}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Report Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

// ✅ Memoize the entire component
ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;