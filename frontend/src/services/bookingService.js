// frontend/src/services/bookingService.js
// ✅ COMPLETE FIXED - Using centralized api client with correct endpoints
// ✅ ADDED: Response data extraction helper
// ✅ ADDED: Retry logic for critical mutations
// ✅ FIXED: getMyBookings now accepts params for pagination, filtering, sorting

import api from './api';

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
// ✅ CREATE BOOKING - WITH RETRY
// =========================
export const createBooking = async (bookingData) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    console.log('📤 Creating booking:', bookingData);

    const response = await api.post('/bookings', bookingData);
    
    console.log('✅ Booking created:', response.data);
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ GET MY BOOKINGS - WITH PARAMS SUPPORT
// =========================
export const getMyBookings = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    // ✅ Build query parameters
    const queryParams = new URLSearchParams();
    
    // Pagination
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    // Filtering
    if (params.status && params.status !== 'all') {
      queryParams.append('status', params.status);
    }
    
    // Search
    if (params.search) {
      queryParams.append('search', params.search);
    }
    
    // Sorting
    if (params.sort) {
      queryParams.append('sort', params.sort);
    }
    
    // Date range
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }

    // Listing filter
    if (params.listingId) {
      queryParams.append('listingId', params.listingId);
    }

    const url = `/bookings/my-bookings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    console.log('📤 Fetching my bookings with params:', params);
    console.log('📤 URL:', url);

    const response = await api.get(url);
    
    console.log('✅ My bookings fetched:', response.data);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get my bookings error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ GET BOOKING BY ID
// =========================
export const getBookingById = async (id) => {
  try {
    // ✅ Validate ID - MUST be a valid MongoDB ObjectId (24 hex characters)
    if (!id || id === 'undefined' || id === 'null' || id === ':id') {
      console.error('❌ getBookingById: Invalid ID provided:', id);
      throw new Error('Invalid booking ID. Please go back and try again.');
    }

    // ✅ Check if ID is a valid MongoDB ObjectId format (24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      console.error('❌ getBookingById: ID is not a valid ObjectId:', id);
      throw new Error('Invalid booking ID format. Please go back and try again.');
    }

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Fetching booking with ID:', id);

    const response = await api.get(`/bookings/${id}`);
    
    console.log('✅ Booking fetched:', response.data);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get booking by id error:');
    console.error('  - ID:', id);
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ CANCEL BOOKING - WITH RETRY
// =========================
export const cancelBooking = async (id, reason) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Cancelling booking:', id);

    const response = await api.put(`/bookings/${id}/cancel`, {
      reason: reason || 'User requested cancellation'
    });
    
    console.log('✅ Booking cancelled:', response.data);
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ GET PROVIDER BOOKINGS
// =========================
export const getProviderBookings = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const response = await api.get('/bookings/provider');
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider bookings error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ CONFIRM BOOKING - WITH RETRY
// =========================
export const confirmBooking = async (id) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Confirming booking:', id);

    const response = await api.put(`/bookings/${id}/confirm`);
    
    console.log('✅ Booking confirmed:', response.data);
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ REJECT BOOKING - WITH RETRY
// =========================
export const rejectBooking = async (id, reason) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Rejecting booking:', id, 'Reason:', reason);

    const response = await api.put(`/bookings/${id}/reject`, {
      reason: reason || 'No reason provided'
    });
    
    console.log('✅ Booking rejected:', response.data);
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ COMPLETE BOOKING - WITH RETRY
// =========================
export const completeBooking = async (id) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Completing booking:', id);

    const response = await api.put(`/bookings/${id}/complete`);
    
    console.log('✅ Booking completed:', response.data);
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ MARK IN PROGRESS - WITH RETRY
// =========================
export const markInProgress = async (id) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Marking booking in progress:', id);

    const response = await api.put(`/bookings/${id}/mark-in-progress`);
    
    console.log('✅ Booking marked in progress:', response.data);
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ GET PROVIDER ANALYTICS
// =========================
export const getProviderAnalytics = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const response = await api.get('/analytics/provider');
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider analytics error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ GET PROVIDER EARNINGS
// =========================
export const getProviderEarnings = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const response = await api.get('/earnings/provider');
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider earnings error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ GET PROVIDER TRAVELERS
// =========================
export const getProviderTravelers = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const response = await api.get('/bookings/provider/travelers');
    return extractData(response);
  } catch (error) {
    console.error('❌ Get provider travelers error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ CHECK DUPLICATE BOOKING
// =========================
export const checkDuplicateBooking = async (entityId, entityType = 'listing') => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    const response = await api.get(`/bookings/check-duplicate/${entityId}?entityType=${entityType}`);
    return extractData(response);
  } catch (error) {
    console.error('❌ Check duplicate booking error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ GET ALL BOOKINGS (Admin)
// =========================
export const getAllBookings = async (status = null, page = 1, limit = 20) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    let url = `/bookings/admin/all?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }

    const response = await api.get(url);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get all bookings error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ UPDATE BOOKING STATUS (Admin) - WITH RETRY
// =========================
export const updateBookingStatus = async (id, status) => {
  return withRetry(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Updating booking status:', id, 'to', status);

    const response = await api.put(`/bookings/admin/${id}/status`, { status });
    
    console.log('✅ Booking status updated:', response.data);
    return extractData(response);
  }, 3, 3000);
};

// =========================
// ✅ GET BOOKING BY BOOKING CODE
// =========================
export const getBookingByCode = async (bookingCode) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const response = await api.get(`/bookings/code/${bookingCode}`);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get booking by code error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ GET BOOKING STATS (Provider Dashboard)
// =========================
export const getBookingStats = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const response = await api.get('/bookings/stats');
    return extractData(response);
  } catch (error) {
    console.error('❌ Get booking stats error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ GET RECENT BOOKINGS (Provider Dashboard)
// =========================
export const getRecentBookings = async (limit = 5) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const response = await api.get(`/bookings/recent?limit=${limit}`);
    return extractData(response);
  } catch (error) {
    console.error('❌ Get recent bookings error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ GET USER BOOKINGS FOR LISTING (Helper for 409 handling)
// =========================
export const getMyBookingsForListing = async (listingId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await api.get(`/bookings/my-bookings?listingId=${listingId}`);
    const data = extractData(response);
    return data.bookings || data || [];
  } catch (error) {
    console.error('❌ Get my bookings for listing error:', error);
    return [];
  }
};