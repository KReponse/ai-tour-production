// frontend/src/utils/pagination.js
// ✅ Pagination Helpers

/**
 * Generate page numbers for pagination
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {number} siblingCount - Number of sibling pages to show
 * @returns {Array} Array of page numbers with ellipsis placeholders
 */
export const generatePaginationPages = (currentPage, totalPages, siblingCount = 1) => {
  const totalPageNumbers = siblingCount * 2 + 5;
  
  if (totalPageNumbers >= totalPages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
  
  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;
  
  const firstPageIndex = 1;
  const lastPageIndex = totalPages;
  
  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, '...', totalPages];
  }
  
  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [1, '...', ...rightRange];
  }
  
  if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [1, '...', ...middleRange, '...', totalPages];
  }
  
  return Array.from({ length: totalPages }, (_, i) => i + 1);
};

/**
 * Build pagination query parameters
 * @param {Object} params - Pagination parameters
 * @returns {string} Query string
 */
export const buildPaginationQuery = (params) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    search = '',
    filters = {},
  } = params;
  
  const query = new URLSearchParams();
  query.set('page', page);
  query.set('limit', limit);
  query.set('sort', sort);
  
  if (search) query.set('search', search);
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all' && value !== '') {
      query.set(key, value);
    }
  });
  
  return query.toString();
};

/**
 * Get pagination metadata from API response
 * @param {Object} response - API response
 * @returns {Object} Pagination metadata
 */
export const getPaginationMeta = (response) => {
  const pagination = response?.pagination || {};
  
  return {
    total: pagination.total || 0,
    page: pagination.page || 1,
    limit: pagination.limit || 20,
    totalPages: pagination.totalPages || 0,
    hasNext: pagination.hasNext || false,
    hasPrev: pagination.hasPrev || false,
  };
};

/**
 * Get data from API response
 * @param {Object} response - API response
 * @param {string} dataKey - Key for data array
 * @returns {Array} Data array
 */
export const getDataFromResponse = (response, dataKey = 'data') => {
  if (Array.isArray(response)) return response;
  if (response?.[dataKey] && Array.isArray(response[dataKey])) return response[dataKey];
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.listings && Array.isArray(response.listings)) return response.listings;
  if (response?.bookings && Array.isArray(response.bookings)) return response.bookings;
  if (response?.payments && Array.isArray(response.payments)) return response.payments;
  if (response?.reviews && Array.isArray(response.reviews)) return response.reviews;
  return [];
};

/**
 * Format pagination display text
 * @param {Object} meta - Pagination metadata
 * @returns {string} Display text
 */
export const formatPaginationDisplay = (meta) => {
  const { total, page, limit } = meta;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  
  if (total === 0) return 'Showing 0 results';
  return `Showing ${start}–${end} of ${total}`;
};

export default {
  generatePaginationPages,
  buildPaginationQuery,
  getPaginationMeta,
  getDataFromResponse,
  formatPaginationDisplay,
};