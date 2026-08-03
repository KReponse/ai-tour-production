// frontend/src/services/bookingService.js
// ✅ FIXED - Using centralized api client with correct endpoints
// ✅ FIXED: getMyBookings now accepts params for pagination, filtering, sorting

import api from './api';

// =========================
// ✅ CREATE BOOKING
// =========================
export const createBooking = async (bookingData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    console.log('📤 Creating booking:', bookingData);

    const response = await api.post('/bookings', bookingData);
    
    console.log('✅ Booking created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Create booking error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    console.error('  - Data:', error.response?.data);
    throw error;
  }
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

    const url = `/bookings/my-bookings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    console.log('📤 Fetching my bookings with params:', params);
    console.log('📤 URL:', url);

    const response = await api.get(url);
    
    console.log('✅ My bookings fetched:', response.data);
    return response.data;
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
    return response.data;
  } catch (error) {
    console.error('❌ Get booking by id error:');
    console.error('  - ID:', id);
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ CANCEL BOOKING
// =========================
export const cancelBooking = async (id, reason) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Cancelling booking:', id);

    const response = await api.put(`/bookings/${id}/cancel`, {
      reason: reason || 'User requested cancellation'
    });
    
    console.log('✅ Booking cancelled:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Cancel booking error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
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
    return response.data;
  } catch (error) {
    console.error('❌ Get provider bookings error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ CONFIRM BOOKING
// =========================
export const confirmBooking = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Confirming booking:', id);

    const response = await api.put(`/bookings/${id}/confirm`);
    
    console.log('✅ Booking confirmed:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Confirm booking error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    console.error('  - Data:', error.response?.data);
    throw error;
  }
};

// =========================
// ✅ REJECT BOOKING
// =========================
export const rejectBooking = async (id, reason) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Rejecting booking:', id, 'Reason:', reason);

    const response = await api.put(`/bookings/${id}/reject`, {
      reason: reason || 'No reason provided'
    });
    
    console.log('✅ Booking rejected:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Reject booking error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    console.error('  - Data:', error.response?.data);
    throw error;
  }
};

// =========================
// ✅ COMPLETE BOOKING
// =========================
export const completeBooking = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Completing booking:', id);

    const response = await api.put(`/bookings/${id}/complete`);
    
    console.log('✅ Booking completed:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Complete booking error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    console.error('  - Data:', error.response?.data);
    throw error;
  }
};

// =========================
// ✅ MARK IN PROGRESS
// =========================
export const markInProgress = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Marking booking in progress:', id);

    const response = await api.put(`/bookings/${id}/mark-in-progress`);
    
    console.log('✅ Booking marked in progress:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Mark in progress error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    console.error('  - Data:', error.response?.data);
    throw error;
  }
};

// =========================
// ✅ GET PROVIDER ANALYTICS (FIXED)
// =========================
export const getProviderAnalytics = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    // ✅ FIXED: Correct endpoint is /analytics/provider
    const response = await api.get('/analytics/provider');
    return response.data;
  } catch (error) {
    console.error('❌ Get provider analytics error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ GET PROVIDER EARNINGS (FIXED)
// =========================
export const getProviderEarnings = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    // ✅ FIXED: Correct endpoint is /earnings/provider
    const response = await api.get('/earnings/provider');
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
  } catch (error) {
    console.error('❌ Get all bookings error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
};

// =========================
// ✅ UPDATE BOOKING STATUS (Admin)
// =========================
export const updateBookingStatus = async (id, status) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is required');
    }

    console.log('📤 Updating booking status:', id, 'to', status);

    const response = await api.put(`/bookings/admin/${id}/status`, { status });
    
    console.log('✅ Booking status updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Update booking status error:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.response?.data?.message);
    throw error;
  }
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data.bookings || [];
  } catch (error) {
    console.error('❌ Get my bookings for listing error:', error);
    return [];
  }
};