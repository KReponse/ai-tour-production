// frontend/src/services/request.service.js
import axios from 'axios';

const API = 'http://localhost:5000/api/requests';

// =========================
// CREATE REQUEST
// =========================

export const createRequest = async (data, token) => {
  try {
    const res = await axios.post(
      API,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      }
    );
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// CREATE TRIP PLANNING REQUEST
// =========================

export const createTripRequest = async (tripData, token) => {
  const data = {
    type: 'planning',
    ...tripData
  };
  return createRequest(data, token);
};

// =========================
// CREATE SUPPORT REQUEST
// =========================

export const createSupportRequest = async (subject, message, token) => {
  const data = {
    type: 'support',
    subject,
    message
  };
  return createRequest(data, token);
};

// =========================
// GET MY REQUESTS
// =========================

export const getMyRequests = async (token) => {
  try {
    const res = await axios.get(
      `${API}/my`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// GET ALL REQUESTS (ADMIN)
// =========================

export const getAllRequests = async (token, params = {}) => {
  try {
    const res = await axios.get(
      API,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params
      }
    );
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// GET REQUEST BY ID
// =========================

export const getRequestById = async (id, token) => {
  try {
    const res = await axios.get(
      `${API}/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// UPDATE REQUEST STATUS (ADMIN)
// =========================

export const updateRequestStatus = async (id, status, adminNote, token) => {
  try {
    const res = await axios.put(
      `${API}/${id}/status`,
      {
        status,
        adminNote
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      }
    );
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// DELETE REQUEST
// =========================

export const deleteRequest = async (id, token) => {
  try {
    const res = await axios.delete(
      `${API}/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};

// =========================
// LEGACY: GET REQUESTS (Deprecated)
// =========================

export const getRequests = async (token) => {
  console.warn('getRequests is deprecated, use getMyRequests or getAllRequests');
  try {
    const res = await axios.get(
      API,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};