// frontend/src/services/providerService.js
// ✅ COMPLETE FIXED - Correct endpoints, response handling, and 404 handling
// ✅ FIXED: Uses API client instead of axios directly
// ✅ FIXED: Correct endpoint paths for public profile and listings

import API from './api';

// ===============================
// ✅ CREATE PROVIDER REQUEST
// ===============================
export const createProviderRequest = async (formData) => {
  const token = localStorage.getItem("token");

  const response = await API.post('/requests/provider', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
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
    return response.data;
  } catch (error) {
    // ✅ 404 is expected when user hasn't applied - this is normal
    if (error.response?.status === 404) {
      console.log('ℹ️ No provider request found (this is normal for new users)');
      return { success: false, request: null };
    }
    
    console.error('❌ Get my provider request error:', error);
    throw error;
  }
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
    
    if (response.data.success && response.data.profile) {
      return response.data.profile;
    }
    
    return response.data;
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
// ✅ GET PROVIDER STATS
// ===============================
export const getProviderStats = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await API.get('/requests/provider/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
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
    const response = await API.get('/requests/provider/recent', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
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
    
    // ✅ Handle different response formats
    if (response.data.success && response.data.profile) {
      return { success: true, provider: response.data.profile };
    }
    if (response.data.success && response.data.provider) {
      return { success: true, provider: response.data.provider };
    }
    if (response.data.provider) {
      return { success: true, provider: response.data.provider };
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
    
    // ✅ Handle different response formats
    const listings = response.data.listings || response.data.data || [];
    
    return {
      success: true,
      listings,
      pagination: response.data.pagination || {
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
    
    const reviews = response.data.reviews || response.data.data || [];
    
    return {
      success: true,
      reviews,
      pagination: response.data.pagination || {
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