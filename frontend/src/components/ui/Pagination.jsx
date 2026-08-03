// frontend/src/components/ui/Pagination.jsx
// ✅ Server-side pagination component (Strategy B)

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { generatePaginationPages, formatPaginationDisplay } from '../../utils/pagination';
import { PAGINATION } from '../../utils/constants';

const Pagination = ({
  meta,
  onPageChange,
  onLimitChange,
  showLimitSelector = true,
  showFirstLast = true,
  siblingCount = 1,
  className = '',
}) => {
  const { page, limit, total, totalPages, hasNext, hasPrev } = meta;

  // Generate page numbers
  const pages = useMemo(() => {
    if (totalPages <= 1) return [];
    return generatePaginationPages(page, totalPages, siblingCount);
  }, [page, totalPages, siblingCount]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage === page) return;
    if (newPage < 1 || newPage > totalPages) return;
    onPageChange(newPage);
  };

  // Handle limit change
  const handleLimitChange = (e) => {
    onLimitChange(parseInt(e.target.value, 10));
  };

  // If no data or only one page, show minimal info
  if (total === 0) {
    return (
      <div className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        No results found
      </div>
    );
  }

  if (totalPages <= 1) {
    return (
      <div className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        {formatPaginationDisplay({ total, page, limit })}
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Info */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {formatPaginationDisplay({ total, page, limit })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Limit selector */}
        {showLimitSelector && (
          <select
            value={limit}
            onChange={handleLimitChange}
            className="h-9 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
          >
            {PAGINATION.LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} per page
              </option>
            ))}
          </select>
        )}

        {/* First button */}
        {showFirstLast && (
          <button
            onClick={() => handlePageChange(1)}
            disabled={!hasPrev}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        {/* Previous button */}
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={!hasPrev}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, index) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                  …
                </span>
              );
            }
            return (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition ${
                  p === page
                    ? 'bg-[#0D9488] text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={!hasNext}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last button */}
        {showFirstLast && (
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={!hasNext}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Pagination;