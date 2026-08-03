// src/services/privacyService.js
// ✅ NEW - Privacy Policy Service

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get privacy content (public)
 */
export const getPrivacyContent = async () => {
  try {
    const response = await axios.get(`${API_URL}/privacy`);
    return response.data;
  } catch (error) {
    console.error('❌ Get privacy content error:', error);
    return null;
  }
};

/**
 * Update privacy content (admin only)
 */
export const updatePrivacyContent = async (data, token) => {
  try {
    const response = await axios.put(`${API_URL}/privacy`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update privacy content error:', error);
    throw error;
  }
};

/**
 * Reset privacy content (admin only)
 */
export const resetPrivacyContent = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/privacy/reset`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Reset privacy content error:', error);
    throw error;
  }
};