// frontend/src/services/reviewService.js

import api from "./api";

// ============================================================
// RESPONSE HELPERS
// ============================================================

const normalizeProviderResponse = (response) => {
  const payload = response?.data || {};

  return {
    success: payload.success ?? true,
    reviews: payload.data || payload.reviews || [],
    pagination: payload.pagination || {},
    stats: payload.stats || {},
    filters: payload.filters || {},
  };
};

const normalizeMyReviewsResponse = (response) => {
  const payload = response?.data || {};

  return {
    success: payload.success ?? true,
    reviews: payload.data || payload.reviews || [],
    pagination: payload.pagination || {},
    stats: payload.stats || {},
  };
};

// ============================================================
// RETRY
// ============================================================

const withRetry = async (requestFn, retries = 2, delay = 700) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      const status = error?.response?.status;

      const shouldRetry =
        !status ||
        status === 408 ||
        status === 425 ||
        status === 429 ||
        status >= 500;

      if (!shouldRetry || attempt === retries) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, delay * (attempt + 1))
      );
    }
  }

  throw lastError;
};

// ============================================================
// GENERIC RESPONSE
// ============================================================

const extractData = (response) => {
  const payload = response?.data;

  if (payload && payload.data !== undefined) {
    return payload.data;
  }

  return payload;
};

// ============================================================
// PUBLIC REVIEWS
// ============================================================

const getPublicReviews = async (params = {}) => {
  return withRetry(async () => {
    const response = await api.get("/public/reviews", { params });
    return extractData(response);
  });
};

const getPublicReviewById = async (reviewId) => {
  if (!reviewId) throw new Error("Review ID is required");

  return withRetry(async () => {
    const response = await api.get(`/public/reviews/${reviewId}`);
    return response.data;
  });
};

const getListingReviews = async (listingId, params = {}) => {
  if (!listingId) throw new Error("Listing ID is required");

  return withRetry(async () => {
    const response = await api.get(
      `/public/listings/${listingId}/reviews`,
      { params }
    );
    return extractData(response);
  });
};

const getPublicProviderReviews = async (providerId, params = {}) => {
  if (!providerId) throw new Error("Provider ID is required");

  return withRetry(async () => {
    const response = await api.get(
      `/public/providers/${providerId}/reviews`,
      { params }
    );
    return extractData(response);
  });
};

const getPublicReviewStats = async (entityType, entityId) => {
  if (!entityType || !entityId) {
    throw new Error("Entity type and entity ID are required");
  }

  return withRetry(async () => {
    const response = await api.get(
      `/public/stats/${entityType}/${entityId}`
    );
    return extractData(response);
  });
};

// ============================================================
// ✅ NEW: getProviderPublicReviews
// ============================================================
// Used by PublicProfile.jsx — public (no auth) reviews for a
// provider's public profile page. Routes to the same endpoint
// as getPublicProviderReviews but returns the full response
// body so callers can read .reviews, .stats, .pagination.
// ============================================================

const getProviderPublicReviews = async (providerId, params = {}) => {
  if (!providerId) throw new Error("Provider ID is required");

  return withRetry(async () => {
    const response = await api.get(
      `/public/providers/${providerId}/reviews`,
      { params }
    );

    const payload = response?.data || {};

    return {
      success: payload.success ?? true,
      reviews: payload.reviews || payload.data || [],
      pagination: payload.pagination || {},
      stats: payload.stats || {},
    };
  });
};

// ============================================================
// TRAVELER
// ============================================================

const createReview = async (reviewData) => {
  if (!reviewData) throw new Error("Review data is required");

  return withRetry(async () => {
    const response = await api.post("/reviews", reviewData);
    return response.data;
  });
};

const getMyReviews = async (params = {}) => {
  return withRetry(async () => {
    const response = await api.get("/reviews/my", { params });
    return normalizeMyReviewsResponse(response);
  });
};

const getReviewById = async (reviewId) => {
  if (!reviewId) throw new Error("Review ID is required");

  return withRetry(async () => {
    const response = await api.get(`/reviews/${reviewId}`);
    return response.data;
  });
};

const getReviewByBooking = async (bookingId) => {
  if (!bookingId) throw new Error("Booking ID is required");

  return withRetry(async () => {
    const response = await api.get(`/reviews/booking/${bookingId}`);
    return response.data;
  });
};

const updateReview = async (reviewId, reviewData) => {
  if (!reviewId) throw new Error("Review ID is required");
  if (!reviewData) throw new Error("Review data is required");

  return withRetry(async () => {
    const response = await api.put(`/reviews/${reviewId}`, reviewData);
    return response.data;
  });
};

const deleteReview = async (reviewId) => {
  if (!reviewId) throw new Error("Review ID is required");

  return withRetry(async () => {
    const response = await api.delete(`/reviews/${reviewId}`);
    return response.data;
  });
};

const toggleHelpful = async (reviewId) => {
  if (!reviewId) throw new Error("Review ID is required");

  return withRetry(async () => {
    const response = await api.post(`/reviews/${reviewId}/helpful`);
    return response.data;
  });
};

const reportReview = async (reviewId, reason) => {
  if (!reviewId) throw new Error("Review ID is required");

  return withRetry(async () => {
    const response = await api.post(`/reviews/${reviewId}/report`, {
      reason,
    });
    return response.data;
  });
};

// ============================================================
// PROVIDER
// ============================================================

const getProviderReviews = async (params = {}) => {
  return withRetry(async () => {
    const response = await api.get("/reviews/provider", { params });
    const normalized = normalizeProviderResponse(response);
    console.log("📦 [reviewService] Provider reviews:", response.data);
    console.log("📊 [reviewService] Review count:", normalized.reviews.length);
    return normalized;
  });
};

const getProviderReviewStats = async (params = {}) => {
  return withRetry(async () => {
    const response = await api.get("/reviews/provider/stats", { params });
    console.log("📊 [reviewService] Provider stats:", response.data);
    return response.data;
  });
};

const respondToReview = async (reviewId, comment) => {
  if (!reviewId) throw new Error("Review ID is required");
  if (!comment || !comment.trim()) {
    throw new Error("Reply comment is required");
  }

  return withRetry(async () => {
    const response = await api.post(`/reviews/${reviewId}/reply`, {
      comment: comment.trim(),
    });
    return response.data;
  });
};

const editProviderReply = async (reviewId, comment) => {
  if (!reviewId) throw new Error("Review ID is required");
  if (!comment || !comment.trim()) {
    throw new Error("Reply comment is required");
  }

  return withRetry(async () => {
    const response = await api.put(`/reviews/${reviewId}/reply`, {
      comment: comment.trim(),
    });
    return response.data;
  });
};

// ============================================================
// ✅ NEW: ADMIN REVIEWS
// ============================================================
// Used by admin/Reviews.jsx — list and moderate reviews.
// These call `/admin/reviews/*` endpoints that must exist on
// the backend (added in the corrected reviewRoutes.js below).
// ============================================================

const getAdminReviews = async (params = {}) => {
  return withRetry(async () => {
    const response = await api.get("/admin/reviews", { params });

    const payload = response?.data || {};

    return {
      success: payload.success ?? true,
      reviews: payload.reviews || payload.data || [],
      pagination: payload.pagination || {},
      stats: payload.stats || {},
      filters: payload.filters || {},
    };
  });
};

const updateReviewStatus = async (reviewId, status, moderationNote = "") => {
  if (!reviewId) throw new Error("Review ID is required");
  if (!status) throw new Error("Status is required");

  return withRetry(async () => {
    const response = await api.put(`/admin/reviews/${reviewId}/status`, {
      status,
      moderationNote,
    });
    return response.data;
  });
};

// ============================================================
// LEGACY COMPATIBILITY
// ============================================================

const replyToReview = async (reviewId, comment) => {
  return respondToReview(reviewId, comment);
};

const fetchProviderReviews = async (filters = {}) => {
  return getProviderReviews(filters);
};

const fetchProviderReviewStats = async (params = {}) => {
  return getProviderReviewStats(params);
};

// ============================================================
// ERROR HELPER
// ============================================================

const getErrorMessage = (error) => {
  if (!error) return "Something went wrong.";

  const status = error?.response?.status;
  const data = error?.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;

  switch (status) {
    case 400:
      return "Invalid review request.";
    case 401:
      return "Please log in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "Review or endpoint was not found.";
    case 409:
      return "This review action conflicts with the current review.";
    case 429:
      return "Too many requests. Please try again shortly.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "The server is temporarily unavailable.";
    default:
      return error?.message || "Something went wrong. Please try again.";
  }
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

const reviewService = {
  // Public
  getPublicReviews,
  getPublicReviewById,
  getListingReviews,
  getPublicProviderReviews,
  getProviderPublicReviews,     // ✅ NEW
  getPublicReviewStats,

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
  getAdminReviews,              // ✅ NEW
  updateReviewStatus,           // ✅ NEW

  // Legacy
  replyToReview,
  fetchProviderReviews,
  fetchProviderReviewStats,

  // Error
  getErrorMessage,
};

export default reviewService;

// ============================================================
// NAMED EXPORTS
// ============================================================

export {
  // Public
  getPublicReviews,
  getPublicReviewById,
  getListingReviews,
  getPublicProviderReviews,
  getProviderPublicReviews,     // ✅ NEW
  getPublicReviewStats,

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
  getAdminReviews,              // ✅ NEW
  updateReviewStatus,           // ✅ NEW

  // Legacy
  replyToReview,
  fetchProviderReviews,
  fetchProviderReviewStats,

  // Error
  getErrorMessage,
};