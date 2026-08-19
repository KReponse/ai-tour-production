// frontend/src/services/providerService.js
// ✅ COMPLETE FIXED - Correct endpoints, response handling, and 404 handling
// ✅ ADDED: Response data extraction helper
// ✅ ADDED: Retry logic for critical mutations
// ✅ FIXED: Uses API client instead of axios directly
// ✅ FIXED: Correct endpoint paths for public profile and listings

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

// ===============================
// ✅ CREATE PROVIDER REQUEST - WITH RETRY
// ===============================
export const createProviderRequest = async (formData) => {
  return withRetry(async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.post('/requests/provider', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return extractData(response);
  }, 3, 3000);
};

// ===============================
// ✅ GET MY PROVIDER REQUEST
// ===============================
export const getMyProviderRequest = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📌 Fetching provider request from: /provider-request/my');
    
    const response = await API.get('/provider-request/my');
    
    console.log('✅ Provider request response:', response.data);
    
    const data = extractData(response);
    
    // ✅ Handle both response formats (legacy and new)
    if (data.success) {
      return {
        success: true,
        request: data.data || data.request || null
      };
    }
    
    return data;
  } catch (error) {
    // ✅ 404 is expected when user hasn't applied - this is normal
    if (error.response?.status === 404) {
      console.log('ℹ️ No provider request found (this is normal for new users)');
      return { success: true, request: null };
    }
    
    console.error('❌ Get my provider request error:', error);
    return { success: false, request: null, error: error.message };
  }
};

// ===============================
// ✅ UPDATE PROVIDER REQUEST - WITH RETRY
// ===============================
export const updateProviderRequest = async (id, data) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.put(`/provider-request/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return extractData(response);
  }, 3, 3000);
};

// ===============================
// ✅ GET MY PROVIDER PROFILE
// ===============================
export const getMyProviderProfile = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('📌 Fetching provider profile from: /provider-profiles/me');
    
    const response = await API.get('/provider-profiles/me');
    
    console.log('✅ Provider profile response:', response.data);
    
    const data = extractData(response);
    
    if (data.success && data.profile) {
      return data.profile;
    }
    
    return data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️ No provider profile found');
      return null;
    }
    
    console.error('❌ Get my provider profile error:', error);
    throw error;
  }
};

// ===============================
// ✅ UPDATE PROVIDER PROFILE - WITH RETRY
// ===============================
export const updateProviderProfile = async (data) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.put('/provider-profiles/me', data, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return extractData(response);
  }, 3, 3000);
};

// ===============================
// ✅ GET PROVIDER STATS
// ===============================
export const getProviderStats = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/requests/provider/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider stats error:', error);
    throw error;
  }
};

// ===============================
// ✅ GET RECENT REQUESTS
// ===============================
export const getRecentRequests = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/requests/provider/recent', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get recent requests error:', error);
    throw error;
  }
};

// ===============================
// ✅ GET PUBLIC PROVIDER PROFILE
// ✅ FIXED: Uses correct endpoint /provider-profiles/public/:providerId
// ===============================
export const getPublicProviderProfile = async (providerId) => {
  try {
    if (!providerId) {
      throw new Error('Provider ID is required');
    }

    console.log('📌 Fetching public provider profile from: /provider-profiles/public/' + providerId);
    
    const response = await API.get(`/provider-profiles/public/${providerId}`);
    
    const data = extractData(response);
    
    // ✅ Handle different response formats
    if (data.success && data.profile) {
      return { success: true, provider: data.profile };
    }
    if (data.success && data.provider) {
      return { success: true, provider: data.provider };
    }
    if (data.provider) {
      return { success: true, provider: data.provider };
    }
    
    return { success: false, provider: null, error: 'Provider not found' };
  } catch (error) {
    console.error('❌ Get public provider profile error:', error);
    
    if (error.response?.status === 404) {
      return { success: false, provider: null, error: 'Provider not found' };
    }
    
    throw error;
  }
};

// ===============================
// ✅ GET PROVIDER LISTINGS (Public)
// ✅ FIXED: Uses correct endpoint /listings/provider/:providerId
// ===============================
export const getPublicProviderListings = async (providerId, page = 1, limit = 10) => {
  try {
    if (!providerId) {
      throw new Error('Provider ID is required');
    }

    console.log('📌 Fetching public provider listings from: /listings/provider/' + providerId);
    
    const response = await API.get(`/listings/provider/${providerId}`, {
      params: { page, limit },
    });
    
    const data = extractData(response);
    
    // ✅ Handle different response formats
    const listings = data.listings || data.data || [];
    
    return {
      success: true,
      listings,
      pagination: data.pagination || {
        page: 1,
        limit: limit,
        total: listings.length,
        totalPages: 1,
      },
    };
  } catch (error) {
    console.error('❌ Get public provider listings error:', error);
    
    if (error.response?.status === 404) {
      return { success: true, listings: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
    }
    
    throw error;
  }
};

// ===============================
// ✅ GET PROVIDER TOURS (Public) - LEGACY ALIAS
// ===============================
export const getPublicProviderTours = async (providerId, page = 1, limit = 10) => {
  console.warn('⚠️ getPublicProviderTours is deprecated. Use getPublicProviderListings instead.');
  return getPublicProviderListings(providerId, page, limit);
};

// ===============================
// ✅ GET PROVIDER REVIEWS (Public)
// ===============================
export const getPublicProviderReviews = async (providerId, page = 1, limit = 10) => {
  try {
    if (!providerId) {
      throw new Error('Provider ID is required');
    }

    console.log('📌 Fetching public provider reviews from: /public/providers/' + providerId + '/reviews');
    
    const response = await API.get(`/public/providers/${providerId}/reviews`, {
      params: { page, limit },
    });
    
    const data = extractData(response);
    
    const reviews = data.reviews || data.data || [];
    
    return {
      success: true,
      reviews,
      pagination: data.pagination || {
        page: 1,
        limit: limit,
        total: reviews.length,
        totalPages: 1,
      },
    };
  } catch (error) {
    console.error('❌ Get public provider reviews error:', error);
    
    if (error.response?.status === 404) {
      return { success: true, reviews: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
    }
    
    throw error;
  }
};

// ===============================
// ✅ GET PROVIDER EARNINGS
// ===============================
export const getProviderEarnings = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/earnings/provider', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider earnings error:', error);
    throw error;
  }
};

// ===============================
// ✅ GET PROVIDER BOOKINGS
// ===============================
export const getProviderBookings = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/bookings/provider', {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider bookings error:', error);
    throw error;
  }
};

// ===============================
// ✅ GET PROVIDER ANALYTICS
// ===============================
export const getProviderAnalytics = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/analytics/provider', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider analytics error:', error);
    throw error;
  }
};

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default {
  createProviderRequest,
  getMyProviderRequest,
  updateProviderRequest,
  getMyProviderProfile,
  updateProviderProfile,
  getProviderStats,
  getRecentRequests,
  getPublicProviderProfile,
  getPublicProviderListings,
  getPublicProviderTours,
  getPublicProviderReviews,
  getProviderEarnings,
  getProviderBookings,
  getProviderAnalytics,
};