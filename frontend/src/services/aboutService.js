// src/services/aboutService.js
// ✅ NEW - About Service

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get about content (public)
 */
export const getAboutContent = async () => {
  try {
    const response = await axios.get(`${API_URL}/about`);
    return response.data;
  } catch (error) {
    console.error('❌ Get about content error:', error);
    return null;
  }
};

/**
 * Update about content (admin only)
 */
export const updateAboutContent = async (data, token) => {
  try {
    const response = await axios.put(`${API_URL}/about`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update about content error:', error);
    throw error;
  }
};

/**
 * Reset about content (admin only)
 */
export const resetAboutContent = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/about/reset`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Reset about content error:', error);
    throw error;
  }
};