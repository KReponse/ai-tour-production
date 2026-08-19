// frontend/src/services/requestService.js
// ✅ COMPLETE FIXED - Correct endpoints, response handling
// ✅ ADDED: Response data extraction helper
// ✅ ADDED: Retry logic for critical mutations
// ✅ FIXED: Uses API client instead of axios directly
// ✅ FIXED: Consistent error handling

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

// =========================
// ✅ CREATE REQUEST - WITH RETRY
// =========================
export const createRequest = async (data, token) => {
  return withRetry(async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.post('/requests', data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ CREATE TRIP PLANNING REQUEST - WITH RETRY
// =========================
export const createTripRequest = async (tripData, token) => {
  return withRetry(async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const data = {
      type: 'planning',
      ...tripData
    };
    
    const response = await API.post('/requests', data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ CREATE SUPPORT REQUEST - WITH RETRY
// =========================
export const createSupportRequest = async (subject, message, token) => {
  return withRetry(async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const data = {
      type: 'support',
      subject,
      message
    };
    
    const response = await API.post('/requests', data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ GET MY REQUESTS
// =========================
export const getMyRequests = async (token) => {
  try {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/requests/my', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get my requests error:', error);
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// ✅ GET ALL REQUESTS (ADMIN)
// =========================
export const getAllRequests = async (token, params = {}) => {
  try {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/requests', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get all requests error:', error);
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// ✅ GET REQUEST BY ID
// =========================
export const getRequestById = async (id, token) => {
  try {
    if (!token) {
      throw new Error('Authentication required');
    }

    if (!id) {
      throw new Error('Request ID is required');
    }

    const response = await API.get(`/requests/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get request by id error:', error);
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// ✅ UPDATE REQUEST STATUS (ADMIN) - WITH RETRY
// =========================
export const updateRequestStatus = async (id, status, adminNote, token) => {
  return withRetry(async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    if (!id) {
      throw new Error('Request ID is required');
    }

    const response = await API.put(
      `/requests/${id}/status`,
      {
        status,
        adminNote: adminNote || ''
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      }
    );
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ DELETE REQUEST - WITH RETRY
// =========================
export const deleteRequest = async (id, token) => {
  return withRetry(async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    if (!id) {
      throw new Error('Request ID is required');
    }

    const response = await API.delete(`/requests/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ GET REQUEST STATS (ADMIN)
// =========================
export const getRequestStats = async (token) => {
  try {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/requests/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get request stats error:', error);
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// ✅ GET REQUESTS BY TYPE
// =========================
export const getRequestsByType = async (type, token, params = {}) => {
  try {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get(`/requests/type/${type}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get requests by type error:', error);
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// ✅ BULK UPDATE REQUEST STATUS (ADMIN) - WITH RETRY
// =========================
export const bulkUpdateRequestStatus = async (ids, status, token) => {
  return withRetry(async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    if (!ids || ids.length === 0) {
      throw new Error('Request IDs are required');
    }

    const response = await API.put(
      '/requests/bulk/status',
      {
        ids,
        status
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      }
    );
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ GET REQUESTS FOR PROVIDER
// =========================
export const getProviderRequests = async (token, params = {}) => {
  try {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/requests/provider', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider requests error:', error);
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// ✅ LEGACY: GET REQUESTS (Deprecated)
// =========================
export const getRequests = async (token) => {
  console.warn('⚠️ getRequests is deprecated, use getMyRequests or getAllRequests');
  try {
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/requests', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return extractData(response);
  } catch (error) {
    console.error('❌ Get requests error:', error);
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// ✅ DEFAULT EXPORT
// =========================
export default {
  createRequest,
  createTripRequest,
  createSupportRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  deleteRequest,
  getRequestStats,
  getRequestsByType,
  bulkUpdateRequestStatus,
  getProviderRequests,
  getRequests, // Legacy
};