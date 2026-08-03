// frontend/src/components/ui/LoadingSkeleton.jsx
// ✅ FIXED: Skeleton heights match actual card heights
// ✅ FIXED: Grid skeleton uses aspect-[4/3] to match MediaCard
// ✅ FIXED: Consistent min-heights for info sections

import React from 'react';

const LoadingSkeleton = ({ 
  count = 6, 
  type = 'card', // 'card', 'list', 'grid', 'detail'
  className = '',
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'grid':
        // ✅ Matches MediaCard aspect-[4/3] + p-3 + min-h-[76px]
        return (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm animate-pulse">
            <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700" />
            <div className="p-3 min-h-[76px] space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          </div>
        );

      case 'card':
        // ✅ Matches MediaCard exact structure
        return (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm animate-pulse">
            <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700" />
            <div className="p-3 min-h-[76px] space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="flex items-center justify-between">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex gap-4 animate-pulse">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3" />
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
              </div>
            </div>
          </div>
        );

      case 'detail':
        return (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 animate-pulse">
            <div className="aspect-[16/9] bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/3" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/3" />
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4" />
          </div>
        );
    }
  };

  return (
    <div className={`grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={`skeleton-${index}`} className="animate-fade-in">
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;