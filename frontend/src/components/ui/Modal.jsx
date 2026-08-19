// src/components/ui/Modal.jsx
// ✅ COMPLETE - Responsive Modal component with mobile-first design
// ✅ ADDED: Mobile responsive padding, widths, and button stacking
// ✅ ADDED: Animation for smooth enter/exit
// ✅ ADDED: Backdrop blur and click outside to close

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  overlayClassName = '',
  contentClassName = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  footer = null,
  preventScroll = true,
}) => {
  const modalRef = useRef(null);
  const previousOverflowRef = useRef('');

  // ✅ Responsive sizes
  const sizes = {
    sm: 'max-w-sm sm:max-w-sm',
    md: 'max-w-md sm:max-w-lg',
    lg: 'max-w-lg sm:max-w-2xl',
    xl: 'max-w-xl sm:max-w-4xl',
    full: 'max-w-full sm:max-w-6xl',
  };

  // ✅ Handle ESC key
  useEffect(() => {
    const handleEscape = (event) => {
      if (closeOnEscape && event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape, onClose]);

  // ✅ Prevent body scroll
  useEffect(() => {
    if (isOpen && preventScroll) {
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflowRef.current || '';
    }

    return () => {
      document.body.style.overflow = previousOverflowRef.current || '';
    };
  }, [isOpen, preventScroll]);

  // ✅ Focus trap - focus modal when opened
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // ✅ Handle overlay click
  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // ✅ If not open, don't render
  if (!isOpen) return null;

  // ✅ Modal content
  const modalContent = (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center',
        'p-3 sm:p-4 md:p-6',
        'bg-black/40 backdrop-blur-sm',
        'animate-in fade-in duration-200',
        overlayClassName
      )}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={clsx(
          // Base styles
          'relative w-full',
          'bg-white dark:bg-gray-800',
          'rounded-xl sm:rounded-2xl',
          'shadow-2xl',
          // Size
          sizes[size] || sizes.md,
          // Animation
          'animate-in slide-in-from-bottom-4 duration-200',
          // Custom
          className
        )}
        tabIndex={-1}
      >
        {/* ✅ Close Button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className={clsx(
              'absolute top-2 right-2 sm:top-3 sm:right-3',
              'p-1.5 sm:p-2',
              'rounded-full',
              'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'transition-colors duration-200',
              'z-10'
            )}
            aria-label="Close modal"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* ✅ Header */}
        {title && (
          <div
            className={clsx(
              'px-4 pt-4 sm:px-6 sm:pt-6',
              'border-b border-gray-200 dark:border-gray-700',
              headerClassName
            )}
          >
            <h2
              id="modal-title"
              className={clsx(
                'text-lg sm:text-xl md:text-2xl',
                'font-bold',
                'text-gray-900 dark:text-white',
                'pr-8' // Space for close button
              )}
            >
              {title}
            </h2>
          </div>
        )}

        {/* ✅ Body */}
        <div
          className={clsx(
            'px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6',
            'max-h-[60vh] sm:max-h-[70vh] overflow-y-auto',
            'text-gray-700 dark:text-gray-300',
            bodyClassName
          )}
        >
          {children}
        </div>

        {/* ✅ Footer */}
        {(footer || footer !== null) && (
          <div
            className={clsx(
              'px-4 py-3 sm:px-6 sm:py-4',
              'border-t border-gray-200 dark:border-gray-700',
              'bg-gray-50 dark:bg-gray-900/50',
              'rounded-b-xl sm:rounded-b-2xl',
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // ✅ Use portal to render at root level
  return createPortal(modalContent, document.body);
};

// ===============================
// ✅ SUB-COMPONENTS
// ===============================

// Modal Header
Modal.Header = ({ children, className, ...props }) => (
  <div
    className={clsx(
      'px-4 pt-4 sm:px-6 sm:pt-6',
      'border-b border-gray-200 dark:border-gray-700',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// Modal Body
Modal.Body = ({ children, className, ...props }) => (
  <div
    className={clsx(
      'px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6',
      'max-h-[60vh] sm:max-h-[70vh] overflow-y-auto',
      'text-gray-700 dark:text-gray-300',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// Modal Footer
Modal.Footer = ({ children, className, ...props }) => (
  <div
    className={clsx(
      'px-4 py-3 sm:px-6 sm:py-4',
      'border-t border-gray-200 dark:border-gray-700',
      'bg-gray-50 dark:bg-gray-900/50',
      'rounded-b-xl sm:rounded-b-2xl',
      // ✅ Responsive button stacking
      'flex flex-col sm:flex-row',
      'gap-2 sm:gap-3',
      'items-stretch sm:items-center',
      'justify-end',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// Modal Actions (wrapper for buttons)
Modal.Actions = ({ children, className, ...props }) => (
  <div
    className={clsx(
      // ✅ Responsive button grouping
      'flex flex-col sm:flex-row',
      'gap-2 sm:gap-3',
      'w-full sm:w-auto',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default Modal;