// src/services/adminService.js

import axios from 'axios';

// ===============================
// API URL CONFIGURATION
// ===============================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ===============================
// GET PROVIDER REQUESTS (ADMIN)
// ===============================
export const getProviderRequests = async (page = 1, limit = 20, status = '', search = '') => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);

    const response = await axios.get(`${API_URL}/requests/provider-requests?${params.toString()}`, {
      headers: { 
        Authorization: `Bearer ${token}` 
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Get provider requests error:', error);
    throw error;
  }
};

// ===============================
// GET PROVIDER REQUEST BY ID (ADMIN)
// ===============================
export const getProviderRequestById = async (id) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/requests/provider-requests/${id}`, {
      headers: { 
        Authorization: `Bearer ${token}` 
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Get provider request by id error:', error);
    throw error;
  }
};

// ===============================
// UPDATE PROVIDER REQUEST (ADMIN)
// ===============================
export const updateProviderRequest = async (id, status, adminNotes = '') => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(
      `${API_URL}/requests/provider-requests/${id}`,
      { status, adminNotes },
      {
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Update provider request error:', error);
    throw error;
  }
};

// ================================================================
// ✅ ADMIN LISTING MANAGEMENT FUNCTIONS
// ================================================================

// ===============================
// GET ALL LISTINGS (ADMIN)
// ===============================
export const getAdminListings = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.businessType) queryParams.append('businessType', params.businessType);
    if (params.listingType) queryParams.append('listingType', params.listingType);
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);

    const response = await axios.get(`${API_URL}/listings/admin/all?${queryParams.toString()}`, {
      headers: { 
        Authorization: `Bearer ${token}` 
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Get admin listings error:', error);
    throw error;
  }
};

// ===============================
// GET PENDING LISTINGS (ADMIN)
// ===============================
export const getPendingListings = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await axios.get(`${API_URL}/listings/admin/pending?${queryParams.toString()}`, {
      headers: { 
        Authorization: `Bearer ${token}` 
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Get pending listings error:', error);
    throw error;
  }
};

// ===============================
// APPROVE LISTING (ADMIN)
// ===============================
export const approveListing = async (id) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(
      `${API_URL}/listings/admin/${id}/approve`,
      {},
      {
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Approve listing error:', error);
    throw error;
  }
};

// ===============================
// REJECT LISTING (ADMIN)
// ===============================
export const rejectListing = async (id, reason = '') => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(
      `${API_URL}/listings/admin/${id}/reject`,
      { reason },
      {
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Reject listing error:', error);
    throw error;
  }
};

// ===============================
// SUSPEND LISTING (ADMIN)
// ===============================
export const suspendListing = async (id, reason = '') => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(
      `${API_URL}/listings/admin/${id}/suspend`,
      { reason },
      {
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Suspend listing error:', error);
    throw error;
  }
};

// ===============================
// DELETE LISTING (ADMIN)
// ===============================
export const deleteListingAdmin = async (id) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.delete(
      `${API_URL}/listings/admin/${id}`,
      {
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Delete listing admin error:', error);
    throw error;
  }
};