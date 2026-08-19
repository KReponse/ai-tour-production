// frontend/src/services/tourService.js
// ✅ COMPLETE FIXED - Added response data extraction
// ✅ ADDED: Retry logic with exponential backoff
// ✅ ADDED: Consistent error handling
// ✅ FIXED: All functions use extractData helper

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
// ✅ GET ALL TOURS (Public - with optional auth)
// ===============================
export const getTours = async () => {
  try {
    const token = localStorage.getItem('token');
    const config = {};
    
    // If token exists, include it; otherwise make public request
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    
    const response = await axios.get(`${API_URL}/tours`, config);
    return extractData(response);
  } catch (error) {
    // If 401, try again without auth (public access)
    if (error.response?.status === 401) {
      try {
        const response = await axios.get(`${API_URL}/tours`);
        return extractData(response);
      } catch (retryError) {
        console.error('❌ Get tours error (public fallback):', retryError);
        throw retryError;
      }
    }
    console.error('❌ Get tours error:', error);
    throw error;
  }
};

// ===============================
// ✅ GET TOUR BY ID (Public)
// ===============================
export const getTourById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/tours/${id}`);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get tour by id error:', error);
    throw error;
  }
};

// ===============================
// ✅ GET FEATURED TOURS (Public - with optional auth)
// ===============================
export const getFeaturedTours = async () => {
  try {
    const token = localStorage.getItem('token');
    const config = {};
    
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    
    const response = await axios.get(`${API_URL}/tours/featured`, config);
    return extractData(response);
  } catch (error) {
    if (error.response?.status === 401) {
      try {
        const response = await axios.get(`${API_URL}/tours/featured`);
        return extractData(response);
      } catch (retryError) {
        console.error('❌ Get featured tours error (public fallback):', retryError);
        throw retryError;
      }
    }
    console.error('❌ Get featured tours error:', error);
    throw error;
  }
};

// ===============================
// ✅ GET MY TOURS (Provider - Requires Auth)
// ===============================
export const getMyTours = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/tours/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get my tours error:', error);
    throw error;
  }
};

// ===============================
// ✅ CREATE TOUR (Provider - Requires Auth) - WITH RETRY
// ===============================
export const createTour = async (data, token, onProgress) => {
  return withRetry(async () => {
    const response = await axios.post(`${API_URL}/tours`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // ✅ 5 minutes
      onUploadProgress: (progress) => {
        if (onProgress) {
          const percent = Math.round((progress.loaded * 100) / progress.total);
          onProgress(percent);
        }
      },
    });
    return extractData(response);
  }, 3, 3000);
};

// ===============================
// ✅ UPDATE TOUR (Provider - Requires Auth) - WITH RETRY
// ===============================
export const updateTour = async (id, data, token, onProgress) => {
  return withRetry(async () => {
    const response = await axios.put(`${API_URL}/tours/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // ✅ 5 minutes
      onUploadProgress: (progress) => {
        if (onProgress) {
          const percent = Math.round((progress.loaded * 100) / progress.total);
          onProgress(percent);
        }
      },
    });
    return extractData(response);
  }, 3, 3000);
};

// ===============================
// ✅ DELETE TOUR (Provider - Requires Auth) - WITH RETRY
// ===============================
export const deleteTour = async (id, token) => {
  return withRetry(async () => {
    const response = await axios.delete(`${API_URL}/tours/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractData(response);
  }, 3, 3000);
};

// ===============================
// ✅ TOGGLE TOUR STATUS (Provider - Requires Auth) - WITH RETRY
// ===============================
export const toggleTourStatus = async (id, token) => {
  return withRetry(async () => {
    const response = await axios.patch(
      `${API_URL}/tours/${id}/status`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return extractData(response);
  }, 3, 3000);
};

// ===============================
// ✅ TOGGLE LIKE (NEW - For TourDetails) - WITH RETRY
// ===============================
export const toggleLike = async (id) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await axios.post(
      `${API_URL}/tours/${id}/like`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return extractData(response);
  }, 3, 3000);
};

// ===============================
// ✅ GET TOUR LIKES (NEW)
// ===============================
export const getTourLikes = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/tours/${id}/likes`);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get tour likes error:', error);
    throw error;
  }
};

// ===============================
// ✅ CHECK IF USER LIKED (NEW)
// ===============================
export const checkLikeStatus = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { liked: false };
    }
    
    const response = await axios.get(`${API_URL}/tours/${id}/likes/check`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Check like status error:', error);
    // Return false instead of throwing for better UX
    return { liked: false };
  }
};

// ===============================
// ✅ GET PROVIDER TOURS (Alias for getMyTours)
// ===============================
export const getProviderTours = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/tours/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider tours error:', error);
    throw error;
  }
};

// ===============================
// ✅ GET TOUR STATS (Provider Dashboard)
// ===============================
export const getTourStats = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/tours/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get tour stats error:', error);
    throw error;
  }
};

// ===============================
// ✅ BULK DELETE TOURS (Provider - Requires Auth) - WITH RETRY
// ===============================
export const bulkDeleteTours = async (ids, token) => {
  return withRetry(async () => {
    const response = await axios.delete(`${API_URL}/tours/bulk`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ids },
    });
    return extractData(response);
  }, 3, 3000);
};

// ===============================
// ✅ BULK UPDATE TOUR STATUS (Provider - Requires Auth) - WITH RETRY
// ===============================
export const bulkUpdateTourStatus = async (ids, status, token) => {
  return withRetry(async () => {
    const response = await axios.patch(
      `${API_URL}/tours/bulk/status`,
      { ids, status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return extractData(response);
  }, 3, 3000);
};

// ===============================
// ✅ GET TOUR AVAILABILITY (Public)
// ===============================
export const getTourAvailability = async (id, params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/tours/${id}/availability`, { params });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get tour availability error:', error);
    throw error;
  }
};

// ===============================
// ✅ HELPER: Build FormData for Tour
// ===============================
export const buildTourFormData = (formData, coverImage, galleryImages = [], videos = []) => {
  const data = new FormData();

  // Add all form fields
  Object.keys(formData).forEach((key) => {
    if (key !== 'coverImage' && key !== 'galleryImages' && key !== 'videos') {
      if (formData[key] !== null && formData[key] !== undefined) {
        data.append(key, formData[key]);
      }
    }
  });

  // Add cover image
  if (coverImage) {
    data.append('coverImage', coverImage);
  }

  // Add gallery images
  if (galleryImages && galleryImages.length > 0) {
    galleryImages.forEach((file) => {
      data.append('galleryImages', file);
    });
  }

  // Add videos
  if (videos && videos.length > 0) {
    videos.forEach((file) => {
      data.append('videos', file);
    });
  }

  return data;
};

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default {
  getTours,
  getTourById,
  getFeaturedTours,
  getMyTours,
  getProviderTours,
  createTour,
  updateTour,
  deleteTour,
  toggleTourStatus,
  toggleLike,
  getTourLikes,
  checkLikeStatus,
  getTourStats,
  bulkDeleteTours,
  bulkUpdateTourStatus,
  getTourAvailability,
  buildTourFormData,
};