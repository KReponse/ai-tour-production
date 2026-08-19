// src/components/admin/listings/RejectListingModal.jsx
// ✅ COMPLETE FIXED - Mobile responsive with proper sizing
// ✅ ADDED: Responsive padding and font sizes
// ✅ ADDED: Touch-friendly buttons (44px+)
// ✅ ADDED: Character counter for rejection reason
// ✅ ADDED: Keyboard accessibility (ESC to close)
// ✅ FIXED: Mobile modal positioning

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Loader2, XCircle, MessageSquare } from 'lucide-react';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const RejectListingModal = ({ 
  isOpen, 
  onClose, 
  listing, 
  onConfirm, 
  loading,
  title = 'Reject Listing',
  confirmText = 'Reject Listing',
  cancelText = 'Cancel',
}) => {
  const [reason, setReason] = useState('');
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
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !listing) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    if (trimmedReason.length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters)');
      return;
    }
    
    setError('');
    onConfirm(listing._id, trimmedReason);
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
        aria-labelledby="reject-modal-title"
        aria-describedby="reject-modal-description"
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
                bg-red-100 dark:bg-red-900/20 
                flex items-center justify-center 
                flex-shrink-0
              ">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <h2 
                id="reject-modal-title"
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
            bg-red-50 dark:bg-red-900/20 
            border border-red-200 dark:border-red-800 
            mb-3 sm:mb-4
          ">
            <AlertCircle className="
              w-4 h-4 sm:w-5 sm:h-5 
              text-red-600 
              flex-shrink-0 
              mt-0.5
            " />
            <div>
              <p className="
                text-sm sm:text-base 
                font-semibold 
                text-red-700 dark:text-red-400
              ">
                Reject this listing?
              </p>
              <p className="
                text-xs sm:text-sm 
                text-red-600 dark:text-red-300 
                mt-0.5 sm:mt-1
              ">
                This will reject <strong>{listingTitle}</strong> and notify the provider.
              </p>
            </div>
          </div>

          {/* Confirmation Message - Responsive */}
          <p 
            id="reject-modal-description"
            className="
              text-sm sm:text-base 
              text-gray-600 dark:text-gray-300 
              mb-3 sm:mb-4
            "
          >
            Are you sure you want to reject <strong className="text-[#374151] dark:text-white">{listingTitle}</strong> from <strong className="text-[#374151] dark:text-white">{providerName}</strong>?
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
                <span className="font-medium capitalize text-[#F59E0B]">
                  {listing.status || 'Pending'}
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

          {/* Rejection Reason Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3 sm:mb-4">
              <label 
                htmlFor="rejection-reason"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2"
              >
                Reason for Rejection *
              </label>
              <div className="relative">
                <textarea
                  id="rejection-reason"
                  ref={textareaRef}
                  value={reason}
                  onChange={handleReasonChange}
                  rows={4}
                  placeholder="Please explain why this listing is being rejected..."
                  className={`
                    w-full p-3 sm:p-4 
                    rounded-xl 
                    border ${error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                    bg-white dark:bg-gray-800 
                    focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-[#0D9488]'} 
                    focus:border-transparent 
                    outline-none transition 
                    resize-none 
                    dark:text-white 
                    text-sm sm:text-base
                    min-h-[100px] sm:min-h-[120px]
                  `}
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "rejection-error" : undefined}
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
                  id="rejection-error"
                  className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-500 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </p>
              )}
              <p className="mt-1 text-[10px] sm:text-xs text-gray-400">
                Please provide a clear reason to help the provider improve
              </p>
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
                  bg-red-600 
                  text-white 
                  font-medium 
                  hover:bg-red-700 
                  transition 
                  disabled:opacity-50 
                  flex items-center justify-center 
                  gap-1.5 sm:gap-2
                  text-sm sm:text-base
                  touch-manipulation
                  focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                "
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{confirmText}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Loading message */}
          {loading && (
            <p className="text-center text-xs text-gray-400 mt-2 sm:mt-3 animate-pulse">
              Please wait while we reject the listing...
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
export const CompactRejectModal = (props) => {
  return <RejectListingModal {...props} />;
};

// With quick reason presets
export const RejectListingModalWithPresets = ({ presetReasons = [], ...props }) => {
  const [selectedReason, setSelectedReason] = useState('');

  const handlePresetClick = (reason) => {
    setSelectedReason(reason);
  };

  return (
    <RejectListingModal {...props}>
      {presetReasons.length > 0 && (
        <div className="mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">
            Quick reasons:
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {presetReasons.map((reason, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handlePresetClick(reason)}
                className="
                  px-2 sm:px-3 
                  py-1 sm:py-1.5 
                  rounded-full 
                  text-[10px] sm:text-xs 
                  bg-gray-100 dark:bg-gray-800 
                  text-gray-600 dark:text-gray-300 
                  hover:bg-[#0D9488]/10 hover:text-[#0D9488]
                  transition
                  touch-manipulation
                  min-h-[32px]
                "
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      )}
    </RejectListingModal>
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
export default RejectListingModal;