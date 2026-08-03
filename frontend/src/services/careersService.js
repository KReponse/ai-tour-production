// src/services/careersService.js
// ✅ NEW - Careers Service

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get careers content (public)
 */
export const getCareersContent = async () => {
  try {
    const response = await axios.get(`${API_URL}/careers`);
    return response.data;
  } catch (error) {
    console.error('❌ Get careers content error:', error);
    return null;
  }
};

/**
 * Update careers content (admin only)
 */
export const updateCareersContent = async (data, token) => {
  try {
    const response = await axios.put(`${API_URL}/careers`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update careers content error:', error);
    throw error;
  }
};

/**
 * Reset careers content (admin only)
 */
export const resetCareersContent = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/careers/reset`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Reset careers content error:', error);
    throw error;
  }
};