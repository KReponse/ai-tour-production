// src/services/faqService.js
// ✅ NEW - FAQ Service

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get FAQ content (public)
 */
export const getFaqContent = async () => {
  try {
    const response = await axios.get(`${API_URL}/faq`);
    return response.data;
  } catch (error) {
    console.error('❌ Get FAQ content error:', error);
    return null;
  }
};

/**
 * Update FAQ content (admin only)
 */
export const updateFaqContent = async (data, token) => {
  try {
    const response = await axios.put(`${API_URL}/faq`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update FAQ content error:', error);
    throw error;
  }
};

/**
 * Reset FAQ content (admin only)
 */
export const resetFaqContent = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/faq/reset`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Reset FAQ content error:', error);
    throw error;
  }
};