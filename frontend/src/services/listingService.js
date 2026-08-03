// frontend/src/services/listingService.js
// ✅ COMPLETE FIXED - Added Cover Media support with API client
// ✅ FIXED: Proper onProgress type checking

import API from './api';
// import axios from "axios"; // ✅ REMOVED - Use API client instead

// ===============================
// ✅ GET ALL LISTINGS (Public - with optional auth)
// ===============================
export const getListings = async (params = {}) => {
  try {
    const response = await API.get('/listings', { params });
    return response.data;
  } catch (error) {
    // If 401, try again without auth (public access)
    if (error.response?.status === 401) {
      try {
        // Create a new axios instance without auth
        const { default: axios } = await import('axios');
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const response = await axios.get(`${API_URL}/listings`, { params });
        return response.data;
      } catch (retryError) {
        console.error("❌ Get listings error (public fallback):", retryError);
        throw retryError;
      }
    }
    console.error("❌ Get listings error:", error);
    throw error;
  }
};

// ===============================
// ✅ GET LISTING BY ID (Public)
// ===============================
export const getListingById = async (id) => {
  try {
    const response = await API.get(`/listings/${id}`);
    return response.data;
  } catch (error) {
    console.error("❌ Get listing by id error:", error);
    throw error;
  }
};

// ===============================
// ✅ GET MY LISTINGS (Provider - Requires Auth)
// ===============================
export const getMyListings = async () => {
  try {
    const response = await API.get('/listings/my');
    return response.data;
  } catch (error) {
    console.error("❌ Get my listings error:", error);
    throw error;
  }
};

// ===============================
// ✅ CREATE LISTING (Provider - Requires Auth)
// ✅ Updated: Supports coverMedia and coverMediaType
// ===============================
export const createListing = async (data, onProgress) => {
  try {
    // ✅ If data is FormData, append coverMediaType if not already there
    if (data instanceof FormData) {
      if (!data.has('coverMediaType')) {
        data.append('coverMediaType', 'image');
      }
    }

    const response = await API.post('/listings', data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progress) => {
        const percent = Math.round((progress.loaded * 100) / progress.total);
        // ✅ FIXED: Check if onProgress is a function before calling
        if (typeof onProgress === 'function') {
          onProgress(percent);
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Create listing error:", error);
    throw error;
  }
};

// ===============================
// ✅ UPDATE LISTING (Provider - Requires Auth)
// ✅ Updated: Supports coverMedia and coverMediaType
// ===============================
export const updateListing = async (id, data, onProgress) => {
  try {
    // ✅ If data is FormData, append coverMediaType if not already there
    if (data instanceof FormData) {
      if (!data.has('coverMediaType')) {
        data.append('coverMediaType', 'image');
      }
    }

    const response = await API.put(`/listings/${id}`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progress) => {
        const percent = Math.round((progress.loaded * 100) / progress.total);
        // ✅ FIXED: Check if onProgress is a function before calling
        if (typeof onProgress === 'function') {
          onProgress(percent);
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update listing error:", error);
    throw error;
  }
};

// ===============================
// ✅ DELETE LISTING (Provider - Requires Auth)
// ===============================
export const deleteListing = async (id) => {
  try {
    const response = await API.delete(`/listings/${id}`);
    return response.data;
  } catch (error) {
    console.error("❌ Delete listing error:", error);
    throw error;
  }
};

// ===============================
// ✅ TOGGLE LISTING STATUS (Provider - Requires Auth)
// ===============================
export const toggleListingStatus = async (id) => {
  try {
    const response = await API.patch(`/listings/${id}/status`);
    return response.data;
  } catch (error) {
    console.error("❌ Toggle listing status error:", error);
    throw error;
  }
};

// ===============================
// ✅ TOGGLE LIKE
// ===============================
export const toggleLike = async (id) => {
  try {
    const response = await API.post(`/listings/${id}/like`);
    return response.data;
  } catch (error) {
    console.error("❌ Toggle like error:", error);
    throw error;
  }
};

// ===============================
// ✅ GET LISTING LIKES
// ===============================
export const getListingLikes = async (id) => {
  try {
    const response = await API.get(`/listings/${id}/likes`);
    return response.data;
  } catch (error) {
    console.error("❌ Get listing likes error:", error);
    throw error;
  }
};

// ===============================
// ✅ CHECK IF USER LIKED
// ===============================
export const checkLikeStatus = async (id) => {
  try {
    const response = await API.get(`/listings/${id}/likes/check`);
    return response.data;
  } catch (error) {
    console.error("❌ Check like status error:", error);
    throw error;
  }
};

// ===============================
// ✅ GET PROVIDER LISTINGS (Provider - Requires Auth)
// ===============================
export const getProviderListings = async () => {
  try {
    const response = await API.get('/listings/my');
    return response.data;
  } catch (error) {
    console.error("❌ Get provider listings error:", error);
    throw error;
  }
};

// ===============================
// ✅ HELPER: Build FormData for Listing
// ===============================
export const buildListingFormData = (formData, coverMediaFile, coverMediaType = 'image') => {
  const data = new FormData();

  // Add all form fields
  Object.keys(formData).forEach((key) => {
    if (key !== 'coverMedia' && key !== 'coverMediaType' && key !== 'galleryImages' && key !== 'videos') {
      if (formData[key] !== null && formData[key] !== undefined) {
        data.append(key, formData[key]);
      }
    }
  });

  // ✅ Add Cover Media with type
  if (coverMediaFile) {
    data.append('coverMedia', coverMediaFile);
    data.append('coverMediaType', coverMediaType);
    // Keep for backward compatibility
    data.append('coverImage', coverMediaFile);
  }

  // Add gallery images
  if (formData.galleryImages && formData.galleryImages.length > 0) {
    formData.galleryImages.forEach((file) => {
      data.append('galleryImages', file);
    });
  }

  // Add videos
  if (formData.videos && formData.videos.length > 0) {
    formData.videos.forEach((file) => {
      data.append('videos', file);
    });
  }

  return data;
};