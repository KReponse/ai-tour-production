// frontend/src/utils/constants.js
// ✅ Production Constants for Pagination

export const PAGINATION = {
  // Default values
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  DEFAULT_SORT: '-createdAt',
  
  // Limits
  LIMIT_OPTIONS: [10, 20, 50, 100],
  MAX_LIMIT: 100,
  
  // Infinite Scroll
  INFINITE_SCROLL_THRESHOLD: 200, // px before bottom
  LOAD_MORE_PAGES_BEFORE_BUTTON: 5, // Show "Load More" after 5 pages of infinite scroll
  
  // Debounce
  SEARCH_DEBOUNCE_MS: 300,
  
  // Skeleton
  SKELETON_COUNT: 6,
  
  // Back to Top
  BACK_TO_TOP_THRESHOLD: 500, // px
};

export const STRATEGY = {
  INFINITE_SCROLL: 'infinite_scroll',
  SERVER_SIDE: 'server_side',
  LOAD_MORE: 'load_more',
};

export default {
  PAGINATION,
  STRATEGY,
};