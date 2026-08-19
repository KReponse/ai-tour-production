// frontend/src/services/reviewService.js
// ✅ COMPLETE FIXED - All exports properly defined
// ✅ ADDED: Response data extraction helper
// ✅ ADDED: Retry logic for critical mutations
// ✅ FIXED: Provider endpoints to match backend routes
// ✅ FIXED: getPublicReviews now supports providerId filtering
// ✅ Better error handling, auth, and debugging

import API from './api';

// ===============================
// ✅ HELPER: Extract data from response
// ===============================
const extractData = (response) => {
  // Handle different response structures
  if (response?.data?.data) return response.data.data;
  if (response?.data) return response.data;
  return response;
};

// ===============================
// ✅ HELPER: Retry with exponential backoff
// ===============================
const withRetry = async (fn, maxRetries = 3, delay = 2000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Attempt ${i + 1} failed:`, error.message);
      if (i < maxRetries - 1) {
        const waitTime = delay * (i + 1);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  throw lastError;
};

// ============================================================
// PUBLIC ENDPOINTS (No Auth)
// ============================================================

/**
 * Get public reviews (for homepage, listings, provider profiles, etc.)
 * @param {Object} params - Query parameters
 * @param {string} params.providerId - Filter by provider ID
 * @param {string} params.listingId - Filter by listing ID
 * @param {number} params.limit - Number of results
 * @param {number} params.page - Page number
 * @param {string} params.sort - Sort order
 */
export const getPublicReviews = async (params = {}) => {
  try {
    console.log('📤 [getPublicReviews] Fetching with params:', params);
    const response = await API.get('/public/reviews', { params });
    console.log('✅ [getPublicReviews] Response:', response.data);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get public reviews error:', error);
    throw error;
  }
};

/**
 * Get public review by ID
 */
export const getPublicReviewById = async (id) => {
  try {
    const response = await API.get(`/public/reviews/${id}`);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get public review error:', error);
    throw error;
  }
};

/**
 * Get reviews for a specific listing (public)
 */
export const getListingReviews = async (listingId, params = {}) => {
  try {
    const response = await API.get(`/public/listings/${listingId}/reviews`, { params });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get listing reviews error:', error);
    throw error;
  }
};

/**
 * Get reviews for a specific provider (public)
 */
export const getProviderPublicReviews = async (providerId, params = {}) => {
  try {
    console.log('📤 [getProviderPublicReviews] Fetching for provider:', providerId, params);
    const response = await API.get(`/public/providers/${providerId}/reviews`, { params });
    console.log('✅ [getProviderPublicReviews] Response:', response.data);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider public reviews error:', error);
    throw error;
  }
};

/**
 * Get review statistics for an entity
 */
export const getReviewStats = async (entityType, entityId) => {
  try {
    const response = await API.get(`/public/stats/${entityType}/${entityId}`);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get review stats error:', error);
    throw error;
  }
};

// ============================================================
// TRAVELER ENDPOINTS (Auth Required)
// ============================================================

/**
 * Create a new review (immediately published) - WITH RETRY
 */
export const createReview = async (data) => {
  return withRetry(async () => {
    console.log('========== 📤 CREATE REVIEW ==========');
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No token found - user not authenticated');
      throw new Error('Authentication required. Please login.');
    }

    const userDataString = localStorage.getItem('user');
    if (!userDataString) {
      console.error('❌ No user data found in localStorage');
      throw new Error('User data not found. Please login again.');
    }

    let userData;
    try {
      userData = JSON.parse(userDataString);
    } catch (parseError) {
      console.error('❌ Failed to parse user data:', parseError);
      throw new Error('Invalid user data. Please login again.');
    }

    if (!userData || !userData._id) {
      console.error('❌ No user ID found in user data:', userData);
      throw new Error('User ID not found. Please login again.');
    }

    if (!data.bookingId) {
      console.error('❌ No bookingId provided in request data');
      throw new Error('Booking ID is required');
    }

    console.log('📤 Creating review with data:', {
      bookingId: data.bookingId,
      rating: data.rating,
      title: data.title ? data.title.substring(0, 30) + '...' : 'No title',
      commentLength: data.comment ? data.comment.length : 0,
      userId: userData._id,
      userEmail: userData.email,
      tokenPresent: !!token
    });

    const response = await API.post('/reviews', {
      bookingId: data.bookingId,
      rating: data.rating,
      title: data.title || '',
      comment: data.comment || '',
      images: data.images || []
    });

    console.log('✅ Review created successfully:', {
      reviewId: response.data.review?._id,
      status: response.status,
      message: response.data.message
    });
    console.log('==========================================');

    return extractData(response);
  }, 3, 3000);
};

/**
 * Get my reviews (traveler)
 */
export const getMyReviews = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Fetching my reviews with params:', params);

    const response = await API.get('/reviews/my', { params });
    
    console.log('✅ My reviews fetched:', {
      count: response.data.reviews?.length || 0,
      total: response.data.pagination?.total || 0
    });
    
    return extractData(response);
  } catch (error) {
    console.error('❌ Get my reviews error:', error);
    throw error;
  }
};

/**
 * Get review by ID
 */
export const getReviewById = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Fetching review by ID:', id);

    const response = await API.get(`/reviews/${id}`);
    
    console.log('✅ Review fetched:', {
      reviewId: response.data.review?._id,
      rating: response.data.review?.rating
    });
    
    return extractData(response);
  } catch (error) {
    console.error('❌ Get review error:', error);
    throw error;
  }
};

/**
 * Get review by booking ID
 */
export const getReviewByBooking = async (bookingId) => {
  try {
    if (!bookingId) {
      console.log('ℹ️ No bookingId provided');
      return { review: null };
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('ℹ️ No token found - user not authenticated');
      return { review: null };
    }

    console.log('📤 Fetching review for booking:', bookingId);
    
    const response = await API.get(`/reviews/booking/${bookingId}`);
    
    console.log('✅ Review found for booking:', {
      bookingId,
      reviewId: response.data.review?._id,
      rating: response.data.review?.rating
    });
    
    return extractData(response);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️ No review found for booking:', bookingId);
      return { review: null };
    }
    
    if (error.response?.status === 401) {
      console.log('ℹ️ User not authenticated - skipping review check');
      return { review: null };
    }
    
    if (error.response?.status === 403) {
      console.warn('⚠️ User does not have permission to view review for booking:', bookingId);
      throw new Error('You do not have permission to view this review');
    }
    
    console.error('❌ Get review by booking error:', error);
    throw error;
  }
};

/**
 * Update a review (edit within window) - WITH RETRY
 */
export const updateReview = async (id, data) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Updating review:', id, data);

    const updateData = {
      rating: data.rating,
      title: data.title,
      comment: data.comment,
    };

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    const response = await API.put(`/reviews/${id}`, updateData);
    
    console.log('✅ Review updated:', {
      reviewId: response.data.review?._id,
      rating: response.data.review?.rating
    });
    
    return extractData(response);
  }, 3, 3000);
};

/**
 * Delete a review (soft delete) - WITH RETRY
 */
export const deleteReview = async (id) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Deleting review:', id);

    const response = await API.delete(`/reviews/${id}`);
    
    console.log('✅ Review deleted:', id);
    
    return extractData(response);
  }, 3, 3000);
};

/**
 * Toggle helpful on a review
 */
export const toggleHelpful = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Toggling helpful for review:', id);

    const response = await API.post(`/reviews/${id}/helpful`);
    
    console.log('✅ Helpful toggled:', {
      reviewId: id,
      helpfulCount: response.data.helpfulCount,
      isHelpful: response.data.isHelpful
    });
    
    return extractData(response);
  } catch (error) {
    console.error('❌ Toggle helpful error:', error);
    throw error;
  }
};

/**
 * Report a review
 */
export const reportReview = async (id, reason) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Reporting review:', id);

    const response = await API.post(`/reviews/${id}/report`, { reason });
    
    console.log('✅ Review reported:', id);
    
    return extractData(response);
  } catch (error) {
    console.error('❌ Report review error:', error);
    throw error;
  }
};

// ============================================================
// ✅ PROVIDER ENDPOINTS
// ============================================================

/**
 * Get provider reviews
 * ✅ CORRECT ENDPOINT: /reviews/provider
 */
export const getProviderReviews = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 [getProviderReviews] Fetching with params:', params);
    console.log('📤 [getProviderReviews] Endpoint: /reviews/provider');

    const response = await API.get('/reviews/provider', { params });
    
    console.log('✅ [getProviderReviews] Response:', response.data);
    console.log(`✅ [getProviderReviews] Found ${response.data?.reviews?.length || 0} reviews`);
    
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider reviews error:', error);
    console.error('❌ Error response:', error.response?.data);
    throw error;
  }
};

/**
 * Get provider review stats
 * ✅ CORRECT ENDPOINT: /reviews/provider/stats
 */
export const getProviderReviewStats = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 [getProviderReviewStats] Fetching stats');
    console.log('📤 [getProviderReviewStats] Endpoint: /reviews/provider/stats');

    const response = await API.get('/reviews/provider/stats');
    
    console.log('✅ [getProviderReviewStats] Response:', response.data);
    
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider review stats error:', error);
    console.error('❌ Error response:', error.response?.data);
    throw error;
  }
};

/**
 * Add provider reply to a review - WITH RETRY
 * ✅ CORRECT ENDPOINT: /reviews/:id/reply
 */
export const respondToReview = async (id, comment, token) => {
  return withRetry(async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    if (!comment || !comment.trim()) {
      throw new Error('Reply comment is required');
    }

    console.log('📤 Responding to review:', id);

    const response = await API.post(
      `/reviews/${id}/reply`,
      { reply: comment.trim() },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✅ Response added to review:', id);
    
    return extractData(response);
  }, 3, 3000);
};

/**
 * Edit provider reply - WITH RETRY
 * ✅ CORRECT ENDPOINT: /reviews/:id/reply (PUT)
 */
export const editProviderReply = async (id, comment, token) => {
  return withRetry(async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    if (!comment || !comment.trim()) {
      throw new Error('Reply comment is required');
    }

    console.log('📤 Editing response for review:', id);

    const response = await API.put(
      `/reviews/${id}/reply`,
      { reply: comment.trim() },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✅ Response edited for review:', id);
    
    return extractData(response);
  }, 3, 3000);
};

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

/**
 * Get all reviews (admin)
 */
export const getAdminReviews = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Fetching admin reviews with params:', params);

    const response = await API.get('/admin/reviews', { params });
    
    console.log('✅ Admin reviews fetched:', {
      count: response.data.reviews?.length || 0
    });
    
    return extractData(response);
  } catch (error) {
    console.error('❌ Get admin reviews error:', error);
    throw error;
  }
};

/**
 * Get review stats (admin)
 */
export const getReviewStatsAdmin = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/admin/reviews/stats');
    return extractData(response);
  } catch (error) {
    console.error('❌ Get review stats admin error:', error);
    throw error;
  }
};

/**
 * ✅ UPDATE REVIEW STATUS - WITH RETRY
 */
export const updateReviewStatus = async (id, status, moderationNotes) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Updating review status:', id, 'to', status);

    const response = await API.put(`/admin/reviews/${id}/status`, { 
      status, 
      moderationNotes: moderationNotes || '' 
    });
    
    console.log('✅ Review status updated:', {
      reviewId: id,
      status: status
    });
    
    return extractData(response);
  }, 3, 3000);
};

/**
 * Alias for updateReviewStatus (for consistency)
 */
export const updateReviewStatusAdmin = updateReviewStatus;

/**
 * Hide review (admin) - WITH RETRY
 */
export const hideReviewAdmin = async (id, reason) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Hiding review:', id);

    const response = await API.put(`/admin/reviews/${id}/hide`, { reason });
    
    console.log('✅ Review hidden:', id);
    
    return extractData(response);
  }, 3, 3000);
};

/**
 * Restore review (admin) - WITH RETRY
 */
export const restoreReviewAdmin = async (id) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Restoring review:', id);

    const response = await API.put(`/admin/reviews/${id}/restore`);
    
    console.log('✅ Review restored:', id);
    
    return extractData(response);
  }, 3, 3000);
};

/**
 * Permanent delete review (admin) - WITH RETRY
 */
export const permanentDeleteReviewAdmin = async (id, reason) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📤 Permanently deleting review:', id);

    const response = await API.delete(`/admin/reviews/${id}/permanent`, {
      data: { reason }
    });
    
    console.log('✅ Review permanently deleted:', id);
    
    return extractData(response);
  }, 3, 3000);
};

// ============================================================
// LEGACY FUNCTIONS (Keep for backward compatibility)
// ============================================================

export const getTourReviews = async (tourId) => {
  try {
    console.warn('⚠️ getTourReviews is deprecated. Use getListingReviews instead.');
    const response = await API.get(`/public/listings/${tourId}/reviews`);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get tour reviews error:', error);
    throw error;
  }
};

export const replyToReview = async (id, reply) => {
  try {
    console.warn('⚠️ replyToReview is deprecated. Use respondToReview instead.');
    const response = await API.post(`/reviews/${id}/reply`, { reply });
    return extractData(response);
  } catch (error) {
    console.error('❌ Reply to review error:', error);
    throw error;
  }
};

// ============================================================
// HELPER FUNCTION - Check if user can review a booking
// ============================================================
export const canReviewBooking = async (bookingId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { canReview: false, reason: 'Authentication required' };
    }

    const result = await getReviewByBooking(bookingId);
    
    if (result.review) {
      return { canReview: false, reason: 'Review already exists' };
    }

    return { canReview: true };
  } catch (error) {
    console.error('❌ canReviewBooking error:', error);
    return { canReview: false, reason: error.message };
  }
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  // Public
  getPublicReviews,
  getPublicReviewById,
  getListingReviews,
  getProviderPublicReviews,
  getReviewStats,
  // Traveler
  createReview,
  getMyReviews,
  getReviewById,
  getReviewByBooking,
  updateReview,
  deleteReview,
  toggleHelpful,
  reportReview,
  // Provider
  getProviderReviews,
  getProviderReviewStats,
  respondToReview,
  editProviderReply,
  // Admin
  getAdminReviews,
  getReviewStatsAdmin,
  updateReviewStatus,
  updateReviewStatusAdmin,
  hideReviewAdmin,
  restoreReviewAdmin,
  permanentDeleteReviewAdmin,
  // Legacy
  getTourReviews,
  replyToReview,
  canReviewBooking,
};