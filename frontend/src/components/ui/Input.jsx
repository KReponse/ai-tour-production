// src/components/ui/Input.jsx
// ✅ COMPLETE FIXED - Mobile responsive with proper sizing
// ✅ ADDED: Responsive padding, font sizes, and heights
// ✅ ADDED: Label support with proper spacing
// ✅ ADDED: Helper text support
// ✅ ADDED: Required indicator
// ✅ FIXED: Touch targets for mobile

import React, { forwardRef } from 'react';
import clsx from 'clsx';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Input = forwardRef(({ 
  className, 
  variant = 'default',
  size = 'md',
  error,
  helper,
  label,
  required = false,
  icon: Icon,
  iconPosition = 'left',
  iconClassName,
  id,
  ...props 
}, ref) => {
  // ✅ Generate unique ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  // ✅ RESPONSIVE SIZES - Mobile-first with proper scaling
  const sizes = {
    // Small - Compact inputs
    sm: 'px-3 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm h-9 sm:h-10',
    
    // Medium - Default, works on all devices
    md: 'px-3.5 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-base h-10 sm:h-12',
    
    // Large - Primary inputs
    lg: 'px-4 py-2.5 text-base sm:px-5 sm:py-3 sm:text-lg h-12 sm:h-14',
    
    // Extra Large - Hero/CTA inputs
    xl: 'px-5 py-3 text-lg sm:px-6 sm:py-3.5 sm:text-xl h-14 sm:h-16',
  };

  // Variant styles
  const variants = {
    default: `
      border-gray-300 dark:border-gray-600 
      bg-white dark:bg-gray-800 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488] focus:border-transparent
      hover:border-gray-400 dark:hover:border-gray-500
    `,
    filled: `
      border-transparent
      bg-gray-100 dark:bg-gray-700 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488] focus:bg-white dark:focus:bg-gray-800
      hover:bg-gray-200 dark:hover:bg-gray-600
    `,
    outline: `
      border-2 border-[#0D9488] 
      bg-transparent 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488]/50
      hover:bg-[#0D9488]/5
    `,
    ghost: `
      border-transparent
      bg-transparent 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488]
      hover:bg-gray-100 dark:hover:bg-gray-800/50
    `,
  };

  // Error state
  const errorStyles = error ? `
    border-red-500 dark:border-red-500
    focus:ring-red-500 focus:border-red-500
    bg-red-50 dark:bg-red-900/10
    hover:border-red-600 dark:hover:border-red-600
  ` : '';

  // ✅ Responsive icon spacing
  const iconSpacing = {
    left: Icon ? 'pl-8 sm:pl-10' : '',
    right: Icon ? 'pr-8 sm:pr-10' : '',
  };

  // ✅ Responsive icon sizes
  const iconSizes = {
    sm: 'w-4 h-4 sm:w-4.5 sm:h-4.5',
    md: 'w-4.5 h-4.5 sm:w-5 sm:h-5',
    lg: 'w-5 h-5 sm:w-5.5 sm:h-5.5',
    xl: 'w-5.5 h-5.5 sm:w-6 sm:h-6',
  };

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={clsx(
            'block mb-1.5 sm:mb-2',
            'text-sm sm:text-base',
            'font-medium',
            'text-gray-700 dark:text-gray-300',
            error && 'text-red-500 dark:text-red-400'
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500 dark:text-red-400" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative w-full">
        {/* Left Icon */}
        {Icon && iconPosition === 'left' && (
          <div className={clsx(
            'absolute left-2.5 sm:left-3',
            'top-1/2 -translate-y-1/2',
            'text-gray-400 dark:text-gray-500',
            'pointer-events-none',
            'flex items-center justify-center',
            iconSizes[size] || iconSizes.md,
            iconClassName
          )}>
            <Icon className="w-full h-full" />
          </div>
        )}

        {/* Input */}
        <input
          id={inputId}
          ref={ref}
          className={clsx(
            // Base styles
            'w-full rounded-xl transition-all duration-200',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none',
            // Touch-friendly for mobile
            'min-h-[44px] sm:min-h-[48px]',
            // Sizes (responsive)
            sizes[size] || sizes.md,
            // Variants
            variants[variant] || variants.default,
            // Error
            errorStyles,
            // Icon spacing
            iconSpacing[iconPosition],
            // Custom
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          {...props}
        />

        {/* Right Icon */}
        {Icon && iconPosition === 'right' && (
          <div className={clsx(
            'absolute right-2.5 sm:right-3',
            'top-1/2 -translate-y-1/2',
            'text-gray-400 dark:text-gray-500',
            'pointer-events-none',
            'flex items-center justify-center',
            iconSizes[size] || iconSizes.md,
            iconClassName
          )}>
            <Icon className="w-full h-full" />
          </div>
        )}

        {/* Clear button (if value and onClear provided) */}
        {props.value && props.onClear && (
          <button
            type="button"
            onClick={props.onClear}
            className={clsx(
              'absolute right-2.5 sm:right-3',
              'top-1/2 -translate-y-1/2',
              'p-1 rounded-full',
              'text-gray-400 hover:text-gray-600',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'transition-colors duration-200'
            )}
            aria-label="Clear input"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && typeof error === 'string' && (
        <p
          id={`${inputId}-error`}
          className={clsx(
            'mt-1.5 sm:mt-2',
            'text-xs sm:text-sm',
            'text-red-500 dark:text-red-400',
            'flex items-start gap-1.5'
          )}
          role="alert"
        >
          <span className="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
          {error}
        </p>
      )}

      {/* Helper text */}
      {helper && !error && (
        <p
          id={`${inputId}-helper`}
          className={clsx(
            'mt-1.5 sm:mt-2',
            'text-xs sm:text-sm',
            'text-gray-500 dark:text-gray-400'
          )}
        >
          {helper}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// ✅ Textarea component (for multi-line inputs)
export const Textarea = forwardRef(({ 
  className,
  variant = 'default',
  size = 'md',
  error,
  helper,
  label,
  required = false,
  rows = 4,
  id,
  ...props 
}, ref) => {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  // ✅ Responsive sizes for textarea
  const sizes = {
    sm: 'px-3 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm',
    md: 'px-3.5 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-base',
    lg: 'px-4 py-2.5 text-base sm:px-5 sm:py-3 sm:text-lg',
    xl: 'px-5 py-3 text-lg sm:px-6 sm:py-3.5 sm:text-xl',
  };

  const variants = {
    default: `
      border-gray-300 dark:border-gray-600 
      bg-white dark:bg-gray-800 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488] focus:border-transparent
    `,
    filled: `
      border-transparent
      bg-gray-100 dark:bg-gray-700 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488] focus:bg-white dark:focus:bg-gray-800
    `,
    outline: `
      border-2 border-[#0D9488] 
      bg-transparent 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488]/50
    `,
    ghost: `
      border-transparent
      bg-transparent 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488]
    `,
  };

  const errorStyles = error ? `
    border-red-500 dark:border-red-500
    focus:ring-red-500 focus:border-red-500
    bg-red-50 dark:bg-red-900/10
  ` : '';

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={clsx(
            'block mb-1.5 sm:mb-2',
            'text-sm sm:text-base font-medium',
            'text-gray-700 dark:text-gray-300',
            error && 'text-red-500 dark:text-red-400'
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500 dark:text-red-400" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <textarea
        id={inputId}
        ref={ref}
        rows={rows}
        className={clsx(
          'w-full rounded-xl transition-all duration-200',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none resize-y',
          'min-h-[80px]',
          sizes[size] || sizes.md,
          variants[variant] || variants.default,
          errorStyles,
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
        {...props}
      />

      {error && typeof error === 'string' && (
        <p
          id={`${inputId}-error`}
          className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-500 dark:text-red-400 flex items-start gap-1.5"
          role="alert"
        >
          <span className="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
          {error}
        </p>
      )}

      {helper && !error && (
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {helper}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Input;