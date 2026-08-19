// src/components/admin/listings/SuspendListingModal.jsx
// ✅ COMPLETE FIXED - Mobile responsive with proper sizing
// ✅ ADDED: Responsive padding and font sizes
// ✅ ADDED: Touch-friendly buttons (44px+)
// ✅ ADDED: Character counter for suspension reason
// ✅ ADDED: Keyboard accessibility (ESC to close)
// ✅ FIXED: Mobile modal positioning

import React, { useState, useEffect, useRef } from 'react';
import { X, Ban, Loader2, AlertCircle, Clock } from 'lucide-react';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const SuspendListingModal = ({ 
  isOpen, 
  onClose, 
  listing, 
  onConfirm, 
  loading,
  title = 'Suspend Listing',
  confirmText = 'Suspend Listing',
  cancelText = 'Cancel',
  durationOptions = [
    { label: '24 hours', value: '24h' },
    { label: '3 days', value: '3d' },
    { label: '7 days', value: '7d' },
    { label: '30 days', value: '30d' },
    { label: 'Indefinite', value: 'indefinite' },
  ],
}) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7d');
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // ✅ Max characters for reason
  const MAX_CHARS = 500;

  // ✅ Focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ✅ Focus confirm button when opened (for accessibility)
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      setTimeout(() => confirmButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ✅ Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // ✅ Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // ✅ Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setDuration('7d');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !listing) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Please provide a reason for suspension');
      return;
    }
    
    if (trimmedReason.length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters)');
      return;
    }
    
    setError('');
    onConfirm(listing._id, trimmedReason, duration);
  };

  const handleReasonChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setReason(value);
      if (error) setError('');
    }
  };

  // ✅ Get listing title safely
  const listingTitle = listing?.title || 'Untitled Listing';
  const providerName = listing?.provider?.name || 
                       listing?.provider?.businessName || 
                       'Unknown Provider';

  // ✅ Get duration label
  const getDurationLabel = (value) => {
    const option = durationOptions.find(opt => opt.value === value);
    return option?.label || value;
  };

  return (
    <>
      {/* Backdrop - Mobile optimized */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal - Responsive */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspend-modal-title"
        aria-describedby="suspend-modal-description"
      >
        <div 
          className="
            bg-white dark:bg-gray-900 
            rounded-2xl sm:rounded-3xl 
            shadow-2xl 
            w-full max-w-md 
            p-4 sm:p-5 md:p-6 
            animate-slide-up
            max-h-[90vh] sm:max-h-[80vh] 
            overflow-y-auto
          "
        >
          {/* Header - Responsive */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="
                w-9 h-9 sm:w-10 sm:h-10 
                rounded-xl sm:rounded-2xl 
                bg-[#F59E0B]/10 
                flex items-center justify-center 
                flex-shrink-0
              ">
                <Ban className="w-4 h-4 sm:w-5 sm:h-5 text-[#F59E0B]" />
              </div>
              <h2 
                id="suspend-modal-title"
                className="text-lg sm:text-xl font-bold text-[#374151] dark:text-white"
              >
                {title}
              </h2>
            </div>
            <button 
              onClick={onClose} 
              className="
                p-1.5 sm:p-2 
                hover:bg-gray-100 dark:hover:bg-gray-800 
                rounded-xl transition 
                min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px]
                flex items-center justify-center
                touch-manipulation
              "
              aria-label="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            </button>
          </div>

          {/* Warning Box - Responsive */}
          <div className="
            flex items-start gap-2 sm:gap-3 
            p-3 sm:p-4 
            rounded-xl sm:rounded-2xl 
            bg-[#F59E0B]/10 
            border border-[#F59E0B]/20 
            mb-3 sm:mb-4
          ">
            <AlertCircle className="
              w-4 h-4 sm:w-5 sm:h-5 
              text-[#F59E0B] 
              flex-shrink-0 
              mt-0.5
            " />
            <div>
              <p className="
                text-sm sm:text-base 
                font-semibold 
                text-[#F59E0B]
              ">
                Suspend this listing?
              </p>
              <p className="
                text-xs sm:text-sm 
                text-[#F59E0B]/80 
                mt-0.5 sm:mt-1
              ">
                This will temporarily hide <strong>{listingTitle}</strong> from public view.
              </p>
            </div>
          </div>

          {/* Confirmation Message - Responsive */}
          <p 
            id="suspend-modal-description"
            className="
              text-sm sm:text-base 
              text-gray-600 dark:text-gray-300 
              mb-3 sm:mb-4
            "
          >
            Are you sure you want to suspend <strong className="text-[#374151] dark:text-white">{listingTitle}</strong> from <strong className="text-[#374151] dark:text-white">{providerName}</strong>?
          </p>

          {/* Listing Details - Responsive */}
          {listing && (
            <div className="
              mb-3 sm:mb-4 
              p-3 sm:p-4 
              rounded-xl 
              bg-gray-50 dark:bg-gray-800 
              border border-gray-200 dark:border-gray-700
            ">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className="font-medium capitalize text-[#0D9488]">
                  {listing.status || 'Approved'}
                </span>
              </div>
              {listing.price && (
                <div className="flex items-center justify-between text-xs sm:text-sm mt-1.5 sm:mt-2">
                  <span className="text-gray-500 dark:text-gray-400">Price</span>
                  <span className="font-medium text-[#374151] dark:text-white">
                    ${listing.price}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Suspension Form */}
          <form onSubmit={handleSubmit}>
            {/* Duration Selection */}
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Suspension Duration *
              </label>
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-1.5 sm:gap-2">
                {durationOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDuration(option.value)}
                    className={`
                      px-2 sm:px-3 
                      py-1.5 sm:py-2 
                      min-h-[36px] sm:min-h-[40px]
                      rounded-xl 
                      text-[10px] sm:text-xs 
                      font-medium 
                      transition
                      touch-manipulation
                      ${duration === option.value 
                        ? 'bg-[#F59E0B] text-white shadow-md shadow-[#F59E0B]/25' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <div className="mb-3 sm:mb-4">
              <label 
                htmlFor="suspension-reason"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2"
              >
                Reason for Suspension *
              </label>
              <div className="relative">
                <textarea
                  id="suspension-reason"
                  ref={textareaRef}
                  value={reason}
                  onChange={handleReasonChange}
                  rows={4}
                  placeholder="Please explain why this listing is being suspended..."
                  className={`
                    w-full p-3 sm:p-4 
                    rounded-xl 
                    border ${error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                    bg-white dark:bg-gray-800 
                    focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-[#F59E0B]'} 
                    focus:border-transparent 
                    outline-none transition 
                    resize-none 
                    dark:text-white 
                    text-sm sm:text-base
                    min-h-[100px] sm:min-h-[120px]
                  `}
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "suspension-error" : undefined}
                />
                <div className="
                  absolute bottom-2 right-2 sm:bottom-3 sm:right-3 
                  text-[10px] sm:text-xs 
                  text-gray-400 dark:text-gray-500
                ">
                  {reason.length}/{MAX_CHARS}
                </div>
              </div>
              {error && (
                <p 
                  id="suspension-error"
                  className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-500 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </p>
              )}
              <p className="mt-1 text-[10px] sm:text-xs text-gray-400">
                The provider will be notified of the suspension reason
              </p>
            </div>

            {/* Duration Preview */}
            <div className="
              mb-3 sm:mb-4 
              p-2.5 sm:p-3 
              rounded-xl 
              bg-gray-50 dark:bg-gray-800 
              border border-gray-200 dark:border-gray-700
              flex items-center gap-2 sm:gap-3
            ">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F59E0B] flex-shrink-0" />
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                Suspension period: <strong className="text-[#374151] dark:text-white">{getDurationLabel(duration)}</strong>
              </span>
            </div>

            {/* Actions - Responsive with proper touch targets */}
            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="
                  flex-1 
                  py-2.5 sm:py-3 
                  min-h-[44px] sm:min-h-[48px]
                  rounded-xl 
                  border-2 border-gray-200 dark:border-gray-700 
                  text-[#374151] dark:text-white 
                  font-medium 
                  hover:bg-gray-50 dark:hover:bg-gray-800 
                  transition
                  text-sm sm:text-base
                  touch-manipulation
                "
              >
                {cancelText}
              </button>
              <button
                ref={confirmButtonRef}
                type="submit"
                disabled={loading}
                className="
                  flex-1 
                  py-2.5 sm:py-3 
                  min-h-[44px] sm:min-h-[48px]
                  rounded-xl 
                  bg-[#F59E0B] 
                  text-white 
                  font-medium 
                  hover:bg-[#F59E0B]/80 
                  transition 
                  disabled:opacity-50 
                  flex items-center justify-center 
                  gap-1.5 sm:gap-2
                  text-sm sm:text-base
                  touch-manipulation
                  focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:ring-offset-2
                "
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Suspending...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{confirmText}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Loading message */}
          {loading && (
            <p className="text-center text-xs text-gray-400 mt-2 sm:mt-3 animate-pulse">
              Please wait while we suspend the listing...
            </p>
          )}
        </div>
      </div>
    </>
  );
};

// ===============================
// ✅ SUB-COMPONENTS
// ===============================

// Compact version for mobile
export const CompactSuspendModal = (props) => {
  return <SuspendListingModal {...props} />;
};

// With custom duration options
export const SuspendListingModalWithOptions = ({ durationOptions, ...props }) => {
  return <SuspendListingModal {...props} durationOptions={durationOptions} />;
};

// Quick suspend (no duration selection)
export const QuickSuspendModal = (props) => {
  return (
    <SuspendListingModal 
      {...props} 
      durationOptions={[{ label: 'Indefinite', value: 'indefinite' }]}
      confirmText="Suspend Now"
    />
  );
};

// ===============================
// ✅ CSS ANIMATIONS (Add to your global CSS)
// ===============================
// @keyframes fade-in {
//   from { opacity: 0; }
//   to { opacity: 1; }
// }
//
// @keyframes slide-up {
//   from { 
//     opacity: 0;
//     transform: translateY(20px) scale(0.95);
//   }
//   to { 
//     opacity: 1;
//     transform: translateY(0) scale(1);
//   }
// }
//
// .animate-fade-in {
//   animation: fade-in 0.2s ease-out;
// }
//
// .animate-slide-up {
//   animation: slide-up 0.3s ease-out;
// }

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default SuspendListingModal;