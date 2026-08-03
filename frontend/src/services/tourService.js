// src/services/tourService.js

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    return response.data;
  } catch (error) {
    // If 401, try again without auth (public access)
    if (error.response?.status === 401) {
      try {
        const response = await axios.get(`${API_URL}/tours`);
        return response.data;
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
    return response.data;
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
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      try {
        const response = await axios.get(`${API_URL}/tours/featured`);
        return response.data;
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
    return response.data;
  } catch (error) {
    console.error('❌ Get my tours error:', error);
    throw error;
  }
};

// ===============================
// ✅ CREATE TOUR (Provider - Requires Auth)
// ===============================
export const createTour = async (data, token, onProgress) => {
  try {
    const response = await axios.post(`${API_URL}/tours`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progress) => {
        if (onProgress) {
          const percent = Math.round((progress.loaded * 100) / progress.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Create tour error:', error);
    throw error;
  }
};

// ===============================
// ✅ UPDATE TOUR (Provider - Requires Auth)
// ===============================
export const updateTour = async (id, data, token, onProgress) => {
  try {
    const response = await axios.put(`${API_URL}/tours/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progress) => {
        if (onProgress) {
          const percent = Math.round((progress.loaded * 100) / progress.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update tour error:', error);
    throw error;
  }
};

// ===============================
// ✅ DELETE TOUR (Provider - Requires Auth)
// ===============================
export const deleteTour = async (id, token) => {
  try {
    const response = await axios.delete(`${API_URL}/tours/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Delete tour error:', error);
    throw error;
  }
};

// ===============================
// ✅ TOGGLE TOUR STATUS (Provider - Requires Auth)
// ===============================
export const toggleTourStatus = async (id, token) => {
  try {
    const response = await axios.patch(
      `${API_URL}/tours/${id}/status`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Toggle tour status error:', error);
    throw error;
  }
};

// ===============================
// ✅ TOGGLE LIKE (NEW - For TourDetails)
// ===============================
export const toggleLike = async (id) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/tours/${id}/like`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Toggle like error:', error);
    throw error;
  }
};

// ===============================
// ✅ GET TOUR LIKES (NEW)
// ===============================
export const getTourLikes = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/tours/${id}/likes`);
    return response.data;
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
    const response = await axios.get(`${API_URL}/tours/${id}/likes/check`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Check like status error:', error);
    throw error;
  }
};