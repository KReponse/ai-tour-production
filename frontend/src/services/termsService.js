// src/services/termsService.js
// ✅ NEW - Terms & Conditions Service

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get terms content (public)
 */
export const getTermsContent = async () => {
  try {
    const response = await axios.get(`${API_URL}/terms`);
    return response.data;
  } catch (error) {
    console.error('❌ Get terms content error:', error);
    return null;
  }
};

/**
 * Update terms content (admin only)
 */
export const updateTermsContent = async (data, token) => {
  try {
    const response = await axios.put(`${API_URL}/terms`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update terms content error:', error);
    throw error;
  }
};

/**
 * Reset terms content (admin only)
 */
export const resetTermsContent = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/terms/reset`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Reset terms content error:', error);
    throw error;
  }
};