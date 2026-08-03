// src/components/common/LoadingSpinner.jsx

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

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'teal',
  fullScreen = false,
  text = '',
  className = '',
}) => {
  // Size variants
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-[3px]',
    lg: 'h-14 w-14 border-4',
    xl: 'h-20 w-20 border-4',
  };

  // Color variants
  const colors = {
    teal: 'border-[#0D9488]',
    gold: 'border-[#F59E0B]',
    white: 'border-white',
    slate: 'border-[#374151]',
  };

  // Full screen loading
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        <div className={clsx(
          'animate-spin rounded-full border-t-transparent',
          sizes[size] || sizes.md,
          colors[color] || colors.teal
        )} />
        {text && (
          <p className="mt-4 text-sm font-medium text-[#374151] dark:text-white animate-pulse">
            {text}
          </p>
        )}
      </div>
    );
  }

  // Inline spinner
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center gap-3',
      className
    )}>
      <div className={clsx(
        'animate-spin rounded-full border-t-transparent transition-all duration-300',
        sizes[size] || sizes.md,
        colors[color] || colors.teal
      )} />
      {text && (
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

// ===============================
// SIZES WITH TEXT
// ===============================
export const LoadingSpinnerWithText = ({ text = 'Loading...', size = 'md' }) => (
  <LoadingSpinner size={size} text={text} />
);

// ===============================
// FULL SCREEN LOADING
// ===============================
export const FullScreenLoading = ({ text = 'Loading...' }) => (
  <LoadingSpinner fullScreen text={text} size="lg" />
);

// ===============================
// BUTTON LOADING SPINNER
// ===============================
export const ButtonSpinner = ({ size = 'sm' }) => (
  <div className="flex items-center justify-center">
    <div className={clsx(
      'animate-spin rounded-full border-t-transparent',
      size === 'sm' ? 'h-4 w-4 border-2' : 'h-5 w-5 border-2',
      'border-white'
    )} />
  </div>
);

// ===============================
// PAGE LOADING SPINNER
// ===============================
export const PageLoadingSpinner = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#0D9488]/20 border-t-[#0D9488]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full bg-[#0D9488]/10 animate-pulse" />
      </div>
    </div>
    <p className="mt-6 text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
      Loading...
    </p>
  </div>
);

export default LoadingSpinner;