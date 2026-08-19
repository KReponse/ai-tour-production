// src/components/common/LoadingSpinner.jsx
// ✅ COMPLETE FIXED - Mobile responsive with proper sizing
// ✅ ADDED: Responsive sizes for mobile
// ✅ ADDED: Multiple spinner variants
// ✅ ADDED: Progress bar variant
// ✅ ADDED: Dots variant
// ✅ FIXED: Touch-friendly for mobile

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
  variant = 'default', // 'default', 'dots', 'pulse', 'progress'
  progress = 0,
}) => {
  // ✅ Responsive size variants
  const sizes = {
    xs: 'h-4 w-4 border-2 sm:h-5 sm:w-5',
    sm: 'h-5 w-5 border-2 sm:h-6 sm:w-6',
    md: 'h-8 w-8 border-[3px] sm:h-10 sm:w-10',
    lg: 'h-12 w-12 border-4 sm:h-14 sm:w-14',
    xl: 'h-16 w-16 border-4 sm:h-20 sm:w-20',
  };

  // ✅ Responsive text sizes
  const textSizes = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    xl: 'text-lg sm:text-xl',
  };

  // Color variants
  const colors = {
    teal: 'border-[#0D9488]',
    gold: 'border-[#F59E0B]',
    white: 'border-white',
    slate: 'border-[#374151]',
    gradient: 'border-[#0D9488]',
  };

  // ✅ Dots variant
  const DotsSpinner = () => (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={clsx(
            'rounded-full bg-[#0D9488]',
            'animate-bounce',
            sizes[size] || sizes.md,
            `animation-delay-${index * 150}`
          )}
          style={{
            animationDelay: `${index * 150}ms`,
            width: size === 'xs' ? '6px' : size === 'sm' ? '8px' : '10px',
            height: size === 'xs' ? '6px' : size === 'sm' ? '8px' : '10px',
          }}
        />
      ))}
    </div>
  );

  // ✅ Pulse variant
  const PulseSpinner = () => (
    <div className="relative">
      <div className={clsx(
        'rounded-full',
        'animate-ping',
        sizes[size] || sizes.md,
        colors[color] || colors.teal,
        'opacity-75'
      )} />
      <div className={clsx(
        'absolute inset-0 rounded-full',
        sizes[size] || sizes.md,
        colors[color] || colors.teal,
        'bg-[#0D9488]',
        'opacity-25'
      )} />
    </div>
  );

  // ✅ Progress variant
  const ProgressSpinner = () => (
    <div className="w-full max-w-xs">
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <span className={clsx(
          'font-medium text-gray-700 dark:text-gray-300',
          textSizes[size] || textSizes.md
        )}>
          {text || 'Loading...'}
        </span>
        <span className={clsx(
          'font-medium text-[#0D9488]',
          textSizes[size] || textSizes.md
        )}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#0D9488] to-[#F59E0B] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );

  // ✅ Full screen loading
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm p-4">
        {variant === 'dots' ? (
          <DotsSpinner />
        ) : variant === 'pulse' ? (
          <PulseSpinner />
        ) : variant === 'progress' ? (
          <ProgressSpinner />
        ) : (
          <div className={clsx(
            'animate-spin rounded-full border-t-transparent',
            sizes[size] || sizes.md,
            colors[color] || colors.teal
          )} />
        )}
        {text && (
          <p className={clsx(
            'mt-3 sm:mt-4 font-medium text-[#374151] dark:text-white animate-pulse text-center',
            textSizes[size] || textSizes.md
          )}>
            {text}
          </p>
        )}
      </div>
    );
  }

  // ✅ Inline spinner
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center gap-2 sm:gap-3',
      className
    )}>
      {variant === 'dots' ? (
        <DotsSpinner />
      ) : variant === 'pulse' ? (
        <PulseSpinner />
      ) : variant === 'progress' ? (
        <ProgressSpinner />
      ) : (
        <div className={clsx(
          'animate-spin rounded-full border-t-transparent transition-all duration-300',
          sizes[size] || sizes.md,
          colors[color] || colors.teal
        )} />
      )}
      {text && variant !== 'progress' && (
        <p className={clsx(
          'font-medium text-gray-600 dark:text-gray-300 animate-pulse text-center',
          textSizes[size] || textSizes.md
        )}>
          {text}
        </p>
      )}
    </div>
  );
};

// ===============================
// ✅ SUB-COMPONENTS
// ===============================

// LoadingSpinner with text
export const LoadingSpinnerWithText = ({ 
  text = 'Loading...', 
  size = 'md',
  variant = 'default',
}) => (
  <LoadingSpinner size={size} text={text} variant={variant} />
);

// Full screen loading
export const FullScreenLoading = ({ 
  text = 'Loading...',
  variant = 'default',
}) => (
  <LoadingSpinner fullScreen text={text} size="lg" variant={variant} />
);

// Button loading spinner
export const ButtonSpinner = ({ size = 'sm' }) => (
  <div className="flex items-center justify-center">
    <div className={clsx(
      'animate-spin rounded-full border-t-transparent',
      size === 'sm' ? 'h-3 w-3 sm:h-4 sm:w-4 border-2' : 'h-4 w-4 sm:h-5 sm:w-5 border-2',
      'border-white'
    )} />
  </div>
);

// Page loading spinner
export const PageLoadingSpinner = ({ variant = 'default' }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
    <div className="relative">
      {variant === 'dots' ? (
        <div className="flex gap-2 sm:gap-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#0D9488] animate-bounce"
              style={{ animationDelay: `${index * 150}ms` }}
            />
          ))}
        </div>
      ) : variant === 'pulse' ? (
        <div className="relative">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#0D9488]/20 animate-ping" />
          <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#0D9488]/40" />
        </div>
      ) : (
        <>
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-[#0D9488]/20 border-t-[#0D9488]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-[#0D9488]/10 animate-pulse" />
          </div>
        </>
      )}
    </div>
    <p className={clsx(
      'mt-4 sm:mt-6 font-medium text-gray-500 dark:text-gray-400 animate-pulse text-center',
      'text-sm sm:text-base'
    )}>
      Loading...
    </p>
  </div>
);

// Skeleton text loader
export const TextLoader = ({ 
  lines = 3,
  className = '',
}) => (
  <div className={clsx('space-y-2 sm:space-y-3 w-full', className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <div
        key={index}
        className={clsx(
          'h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
          index === 0 ? 'w-3/4' : index === lines - 1 ? 'w-1/2' : 'w-full'
        )}
      />
    ))}
  </div>
);

// Card loader
export const CardLoader = ({ count = 1 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
      >
        <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
          <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
          <div className="flex items-center justify-between">
            <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
            <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ===============================
// ✅ CSS ANIMATIONS (Add to your global CSS)
// ===============================
// Add these keyframes to your global CSS or tailwind.config.js:
//
// @keyframes bounce {
//   0%, 100% { transform: translateY(0); }
//   50% { transform: translateY(-10px); }
// }
//
// .animation-delay-0 { animation-delay: 0ms; }
// .animation-delay-150 { animation-delay: 150ms; }
// .animation-delay-300 { animation-delay: 300ms; }

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default LoadingSpinner;