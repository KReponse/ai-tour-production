// src/components/ui/Button.jsx
// ✅ COMPLETE FIXED - Mobile responsive with Tailwind classes
// ✅ ADDED: Responsive padding, font sizes, and widths
// ✅ ADDED: Loading state support
// ✅ ADDED: Full width option for mobile
// ✅ ADDED: Icon support with proper spacing

import React from 'react';
import clsx from 'clsx';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  ...props 
}) => {
  const variants = {
    // Primary: Teal to Gold gradient
    primary: 'bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white hover:scale-105 hover:shadow-xl shadow-md shadow-[#0D9488]/25',
    
    // Secondary: Gray
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600',
    
    // Outline: Teal border
    outline: 'border-2 border-[#0D9488] text-[#0D9488] dark:text-[#0D9488] hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 transition',
    
    // Ghost: No background, Teal text
    ghost: 'text-[#0D9488] hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 transition',
    
    // Danger: Red
    danger: 'bg-red-500 text-white hover:bg-red-600 hover:shadow-lg shadow-md shadow-red-500/25 transition',
    
    // Success: Teal
    success: 'bg-[#0D9488] text-white hover:bg-[#0D9488]/80 hover:shadow-lg shadow-md shadow-[#0D9488]/25 transition',
    
    // Gold: Gold background
    gold: 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]/80 hover:shadow-lg shadow-md shadow-[#F59E0B]/25 transition',
    
    // Dark: Slate
    dark: 'bg-[#374151] text-white hover:bg-[#374151]/80 hover:shadow-lg transition',
    
    // White: Clean white button
    white: 'bg-white text-[#374151] hover:bg-gray-50 shadow-md hover:shadow-lg transition',
  };

  // ✅ RESPONSIVE SIZES - Mobile-first with proper scaling
  const sizes = {
    // Extra Small - Good for icons or tight spaces
    xs: 'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-xs',
    
    // Small - Good for compact buttons
    sm: 'px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm',
    
    // Medium - Default, works on all devices
    md: 'px-4 py-2 text-sm sm:px-6 sm:py-2.5 sm:text-base',
    
    // Large - Primary action buttons
    lg: 'px-6 py-3 text-base sm:px-8 sm:py-3.5 sm:text-lg',
    
    // Extra Large - Hero/CTA buttons
    xl: 'px-8 py-4 text-lg sm:px-10 sm:py-4.5 sm:text-xl',
    
    // Icon only - Square buttons with icons
    icon: 'p-2 text-sm sm:p-2.5 sm:text-base w-9 h-9 sm:w-11 sm:h-11',
  };

  // ✅ Full width on mobile, auto on desktop
  const widthClass = fullWidth ? 'w-full sm:w-auto' : '';

  // ✅ Loading state
  const loadingClass = loading ? 'opacity-75 cursor-wait' : '';

  // ✅ Disabled state
  const disabledClass = (disabled || loading) ? 'opacity-50 cursor-not-allowed hover:scale-100' : '';

  // ✅ Spinner for loading state
  const Spinner = () => (
    <svg 
      className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      className={clsx(
        // Base styles
        'inline-flex items-center justify-center font-semibold',
        'rounded-full transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-[#0D9488]/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        // Variant
        variants[variant] || variants.primary,
        // Size (responsive)
        sizes[size] || sizes.md,
        // Width
        widthClass,
        // Loading & Disabled
        loadingClass,
        disabledClass,
        // Custom classes
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {/* Left Icon */}
      {leftIcon && !loading && (
        <span className="mr-1.5 sm:mr-2 flex-shrink-0">
          {leftIcon}
        </span>
      )}
      
      {/* Loading Spinner */}
      {loading && <Spinner />}
      
      {/* Children */}
      {children}
      
      {/* Right Icon */}
      {rightIcon && !loading && (
        <span className="ml-1.5 sm:ml-2 flex-shrink-0">
          {rightIcon}
        </span>
      )}
    </button>
  );
};

// ✅ Export with display name for debugging
Button.displayName = 'Button';

export default Button;