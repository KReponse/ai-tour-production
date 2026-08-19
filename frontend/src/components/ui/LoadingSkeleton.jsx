// frontend/src/components/ui/LoadingSkeleton.jsx
// ✅ COMPLETE FIXED - Responsive skeleton heights and widths
// ✅ ADDED: Mobile-first responsive grid
// ✅ ADDED: Multiple skeleton variants
// ✅ ADDED: Wave animation option
// ✅ FIXED: Skeleton heights match actual card heights
// ✅ FIXED: Consistent min-heights for info sections

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

const LoadingSkeleton = ({ 
  count = 6, 
  type = 'card', // 'card', 'list', 'grid', 'detail', 'text', 'avatar', 'profile'
  className = '',
  variant = 'default', // 'default', 'wave', 'shimmer'
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  height = 'auto',
  withAnimation = true,
}) => {
  // ✅ Animation variants
  const animationClasses = {
    default: 'animate-pulse',
    wave: 'animate-wave',
    shimmer: 'animate-shimmer',
  };

  const animationClass = withAnimation ? (animationClasses[variant] || animationClasses.default) : '';

  // ✅ Responsive grid columns
  const gridClasses = {
    xs: columns.xs || 1,
    sm: columns.sm || columns.xs || 1,
    md: columns.md || columns.sm || columns.xs || 2,
    lg: columns.lg || columns.md || columns.sm || 3,
    xl: columns.xl || columns.lg || columns.md || 4,
  };

  // ✅ Base skeleton class
  const baseSkeletonClass = clsx(
    'bg-gray-200 dark:bg-gray-700',
    'rounded-xl',
    animationClass
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'grid':
        // ✅ Matches MediaCard aspect-[4/3] + p-3 + min-h-[76px]
        return (
          <div className={clsx(
            'bg-white dark:bg-gray-900',
            'rounded-xl',
            'border border-gray-200 dark:border-gray-800',
            'overflow-hidden',
            'shadow-sm',
            animationClass,
            height !== 'auto' && height
          )}>
            <div className={clsx(
              'aspect-[4/3]',
              'bg-gray-200 dark:bg-gray-700',
              animationClass
            )} />
            <div className="p-3 sm:p-4 min-h-[76px] space-y-2 sm:space-y-3">
              <div className={clsx(
                'h-3 sm:h-4',
                'bg-gray-200 dark:bg-gray-700',
                'rounded',
                'w-3/4',
                animationClass
              )} />
              <div className={clsx(
                'h-2.5 sm:h-3',
                'bg-gray-200 dark:bg-gray-700',
                'rounded',
                'w-1/2',
                animationClass
              )} />
              <div className="flex items-center justify-between">
                <div className={clsx(
                  'h-2.5 sm:h-3',
                  'bg-gray-200 dark:bg-gray-700',
                  'rounded',
                  'w-1/3',
                  animationClass
                )} />
                <div className={clsx(
                  'h-2.5 sm:h-3',
                  'bg-gray-200 dark:bg-gray-700',
                  'rounded',
                  'w-1/4',
                  animationClass
                )} />
              </div>
            </div>
          </div>
        );

      case 'card':
        // ✅ Matches MediaCard exact structure
        return (
          <div className={clsx(
            'bg-white dark:bg-gray-900',
            'rounded-xl',
            'border border-gray-200 dark:border-gray-800',
            'overflow-hidden',
            'shadow-sm',
            animationClass,
            height !== 'auto' && height
          )}>
            <div className={clsx(
              'aspect-[4/3]',
              'bg-gray-200 dark:bg-gray-700',
              animationClass
            )} />
            <div className="p-3 sm:p-4 min-h-[76px] space-y-2 sm:space-y-3">
              <div className={clsx(
                'h-3 sm:h-4',
                'bg-gray-200 dark:bg-gray-700',
                'rounded',
                'w-3/4',
                animationClass
              )} />
              <div className={clsx(
                'h-2.5 sm:h-3',
                'bg-gray-200 dark:bg-gray-700',
                'rounded',
                'w-1/2',
                animationClass
              )} />
              <div className="flex items-center justify-between">
                <div className={clsx(
                  'h-2.5 sm:h-3',
                  'bg-gray-200 dark:bg-gray-700',
                  'rounded',
                  'w-1/3',
                  animationClass
                )} />
                <div className={clsx(
                  'h-2.5 sm:h-3',
                  'bg-gray-200 dark:bg-gray-700',
                  'rounded',
                  'w-1/4',
                  animationClass
                )} />
              </div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className={clsx(
            'bg-white dark:bg-gray-900',
            'rounded-xl sm:rounded-2xl',
            'border border-gray-200 dark:border-gray-800',
            'p-3 sm:p-4',
            'flex flex-col sm:flex-row gap-3 sm:gap-4',
            animationClass,
            height !== 'auto' && height
          )}>
            <div className={clsx(
              'w-full sm:w-24 h-48 sm:h-24',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-lg sm:rounded-xl',
              'flex-shrink-0',
              animationClass
            )} />
            <div className="flex-1 space-y-2 sm:space-y-3">
              <div className={clsx(
                'h-4 sm:h-5',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg',
                'w-3/4',
                animationClass
              )} />
              <div className={clsx(
                'h-3 sm:h-4',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg',
                'w-1/2',
                animationClass
              )} />
              <div className={clsx(
                'h-3 sm:h-4',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg',
                'w-2/3',
                animationClass
              )} />
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <div className={clsx(
                  'h-5 sm:h-6',
                  'bg-gray-200 dark:bg-gray-700',
                  'rounded-full',
                  'w-14 sm:w-16',
                  animationClass
                )} />
                <div className={clsx(
                  'h-5 sm:h-6',
                  'bg-gray-200 dark:bg-gray-700',
                  'rounded-full',
                  'w-16 sm:w-20',
                  animationClass
                )} />
              </div>
            </div>
          </div>
        );

      case 'detail':
        return (
          <div className={clsx(
            'bg-white dark:bg-gray-900',
            'rounded-2xl sm:rounded-3xl',
            'border border-gray-200 dark:border-gray-800',
            'p-4 sm:p-6',
            'space-y-3 sm:space-y-4',
            animationClass,
            height !== 'auto' && height
          )}>
            <div className={clsx(
              'aspect-[16/9]',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-xl sm:rounded-2xl',
              animationClass
            )} />
            <div className={clsx(
              'h-6 sm:h-8',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-lg',
              'w-2/3',
              animationClass
            )} />
            <div className="space-y-1.5 sm:space-y-2">
              <div className={clsx(
                'h-3 sm:h-4',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg',
                'w-full',
                animationClass
              )} />
              <div className={clsx(
                'h-3 sm:h-4',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg',
                'w-full',
                animationClass
              )} />
              <div className={clsx(
                'h-3 sm:h-4',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg',
                'w-3/4',
                animationClass
              )} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className={clsx(
                'h-9 sm:h-10',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg sm:rounded-xl',
                'w-full sm:w-1/3',
                animationClass
              )} />
              <div className={clsx(
                'h-9 sm:h-10',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg sm:rounded-xl',
                'w-full sm:w-1/3',
                animationClass
              )} />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className={clsx(
            'space-y-2 sm:space-y-3',
            animationClass,
            height !== 'auto' && height
          )}>
            <div className={clsx(
              'h-4 sm:h-6',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-lg',
              'w-full',
              animationClass
            )} />
            <div className={clsx(
              'h-3 sm:h-4',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-lg',
              'w-5/6',
              animationClass
            )} />
            <div className={clsx(
              'h-3 sm:h-4',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-lg',
              'w-2/3',
              animationClass
            )} />
          </div>
        );

      case 'avatar':
        return (
          <div className={clsx(
            'flex items-center gap-3 sm:gap-4',
            animationClass,
            height !== 'auto' && height
          )}>
            <div className={clsx(
              'w-10 h-10 sm:w-12 sm:h-12',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-full',
              animationClass
            )} />
            <div className="flex-1 space-y-2">
              <div className={clsx(
                'h-3 sm:h-4',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg',
                'w-1/2',
                animationClass
              )} />
              <div className={clsx(
                'h-2.5 sm:h-3',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg',
                'w-1/3',
                animationClass
              )} />
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className={clsx(
            'bg-white dark:bg-gray-900',
            'rounded-2xl sm:rounded-3xl',
            'border border-gray-200 dark:border-gray-800',
            'p-4 sm:p-6',
            'space-y-4 sm:space-y-6',
            'text-center',
            animationClass,
            height !== 'auto' && height
          )}>
            <div className={clsx(
              'w-16 h-16 sm:w-24 sm:h-24',
              'mx-auto',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-full',
              animationClass
            )} />
            <div className="space-y-2">
              <div className={clsx(
                'h-4 sm:h-6',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg',
                'w-1/2 mx-auto',
                animationClass
              )} />
              <div className={clsx(
                'h-3 sm:h-4',
                'bg-gray-200 dark:bg-gray-700',
                'rounded-lg',
                'w-1/3 mx-auto',
                animationClass
              )} />
            </div>
            <div className="flex justify-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className={clsx(
                  'h-5 sm:h-7',
                  'bg-gray-200 dark:bg-gray-700',
                  'rounded-lg',
                  'w-12 sm:w-16 mx-auto',
                  animationClass
                )} />
                <div className={clsx(
                  'h-2.5 sm:h-3',
                  'bg-gray-200 dark:bg-gray-700',
                  'rounded-lg',
                  'w-10 sm:w-14 mx-auto mt-1',
                  animationClass
                )} />
              </div>
              <div className="text-center">
                <div className={clsx(
                  'h-5 sm:h-7',
                  'bg-gray-200 dark:bg-gray-700',
                  'rounded-lg',
                  'w-12 sm:w-16 mx-auto',
                  animationClass
                )} />
                <div className={clsx(
                  'h-2.5 sm:h-3',
                  'bg-gray-200 dark:bg-gray-700',
                  'rounded-lg',
                  'w-10 sm:w-14 mx-auto mt-1',
                  animationClass
                )} />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={clsx(
            'bg-white dark:bg-gray-900',
            'rounded-2xl',
            'border border-gray-200 dark:border-gray-800',
            'p-3 sm:p-4',
            'space-y-2 sm:space-y-3',
            animationClass,
            height !== 'auto' && height
          )}>
            <div className={clsx(
              'h-5 sm:h-6',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-lg',
              'w-2/3',
              animationClass
            )} />
            <div className={clsx(
              'h-3 sm:h-4',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-lg',
              'w-full',
              animationClass
            )} />
            <div className={clsx(
              'h-3 sm:h-4',
              'bg-gray-200 dark:bg-gray-700',
              'rounded-lg',
              'w-3/4',
              animationClass
            )} />
          </div>
        );
    }
  };

  return (
    <div className={clsx(
      'grid gap-3 sm:gap-4 md:gap-6',
      `grid-cols-${gridClasses.xs}`,
      `sm:grid-cols-${gridClasses.sm}`,
      `md:grid-cols-${gridClasses.md}`,
      `lg:grid-cols-${gridClasses.lg}`,
      gridClasses.xl && `xl:grid-cols-${gridClasses.xl}`,
      className
    )}>
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={`skeleton-${index}`} 
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

// ===============================
// ✅ SUB-COMPONENTS
// ===============================

// Card skeleton (alias)
export const CardSkeleton = (props) => {
  return <LoadingSkeleton {...props} type="card" />;
};

// Grid skeleton (alias)
export const GridSkeleton = (props) => {
  return <LoadingSkeleton {...props} type="grid" />;
};

// List skeleton (alias)
export const ListSkeleton = (props) => {
  return <LoadingSkeleton {...props} type="list" />;
};

// Detail skeleton (alias)
export const DetailSkeleton = (props) => {
  return <LoadingSkeleton {...props} type="detail" />;
};

// Profile skeleton (alias)
export const ProfileSkeleton = (props) => {
  return <LoadingSkeleton {...props} type="profile" />;
};

// Text skeleton (alias)
export const TextSkeleton = (props) => {
  return <LoadingSkeleton {...props} type="text" />;
};

// ===============================
// ✅ CSS ANIMATIONS (Add to your global CSS)
// ===============================
// Add these keyframes to your global CSS or tailwind.config.js:
//
// @keyframes wave {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// 
// .animate-wave {
//   animation: wave 2s ease-in-out infinite;
//   background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
//   background-size: 200% 100%;
// }
//
// .animate-shimmer {
//   animation: shimmer 2s ease-in-out infinite;
//   background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
//   background-size: 200% 100%;
// }
//
// @keyframes shimmer {
//   0% { background-position: 200% 0; }
//   100% { background-position: -200% 0; }
// }

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default LoadingSkeleton;