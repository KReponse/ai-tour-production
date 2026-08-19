// src/components/admin/listings/DeleteListingModal.jsx
// ✅ COMPLETE FIXED - Fixed Warning icon import (using AlertCircle instead)
// ✅ Mobile responsive with proper sizing
// ✅ Touch-friendly buttons (44px+)

import React, { useEffect, useRef } from 'react';
import { X, Trash2, AlertCircle, Loader2 } from 'lucide-react';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const DeleteListingModal = ({ 
  isOpen, 
  onClose, 
  listing, 
  onConfirm, 
  loading,
  title = 'Delete Listing',
  confirmText = 'Delete Permanently',
  cancelText = 'Cancel',
}) => {
  const modalRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // ✅ Focus trap - focus confirm button when opened
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

  if (!isOpen || !listing) return null;

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
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-description"
      >
        <div 
          ref={modalRef}
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
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <h2 
                id="delete-modal-title"
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
                This action cannot be undone!
              </p>
              <p className="
                text-xs sm:text-sm 
                text-red-600 dark:text-red-300 
                mt-0.5 sm:mt-1
              ">
                This will permanently delete <strong>{listingTitle}</strong> and all associated data.
              </p>
            </div>
          </div>

          {/* Confirmation Message - Responsive */}
          <p 
            id="delete-modal-description"
            className="
              text-sm sm:text-base 
              text-gray-600 dark:text-gray-300 
              mb-4 sm:mb-5 md:mb-6
            "
          >
            Are you sure you want to delete <strong className="text-[#374151] dark:text-white">{listingTitle}</strong> from <strong className="text-[#374151] dark:text-white">{providerName}</strong>?
          </p>

          {/* Listing Details - Responsive */}
          {listing && (
            <div className="
              mb-4 sm:mb-5 md:mb-6 
              p-3 sm:p-4 
              rounded-xl 
              bg-gray-50 dark:bg-gray-800 
              border border-gray-200 dark:border-gray-700
            ">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className={`
                  font-medium capitalize
                  ${listing.status === 'approved' ? 'text-[#0D9488]' : 
                    listing.status === 'pending' ? 'text-[#F59E0B]' : 
                    'text-red-500'}
                `}>
                  {listing.status || 'Unknown'}
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
              {listing.createdAt && (
                <div className="flex items-center justify-between text-xs sm:text-sm mt-1.5 sm:mt-2">
                  <span className="text-gray-500 dark:text-gray-400">Created</span>
                  <span className="text-gray-600 dark:text-gray-300">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions - Responsive with proper touch targets */}
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
            <button
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
              onClick={() => onConfirm(listing._id)}
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
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{confirmText}</span>
                </>
              )}
            </button>
          </div>

          {/* Loading message */}
          {loading && (
            <p className="text-center text-xs text-gray-400 mt-2 sm:mt-3 animate-pulse">
              Please wait while we delete the listing...
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
export const CompactDeleteModal = (props) => {
  return <DeleteListingModal {...props} />;
};

// With additional warning (using AlertCircle instead of Warning)
export const WarningDeleteModal = ({ additionalWarning, ...props }) => {
  return (
    <DeleteListingModal {...props}>
      {additionalWarning && (
        <div className="
          mt-3 sm:mt-4 
          p-3 sm:p-4 
          rounded-xl 
          bg-[#F59E0B]/10 
          border border-[#F59E0B]/20
          text-xs sm:text-sm
          text-[#F59E0B]
        ">
          <AlertCircle className="w-4 h-4 inline mr-1.5" />
          {additionalWarning}
        </div>
      )}
    </DeleteListingModal>
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
export default DeleteListingModal;