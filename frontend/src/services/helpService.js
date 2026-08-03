// src/services/helpService.js
// ✅ NEW - Help Center Service

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get help content (public)
 */
export const getHelpContent = async () => {
  try {
    const response = await axios.get(`${API_URL}/help`);
    return response.data;
  } catch (error) {
    console.error('❌ Get help content error:', error);
    return null;
  }
};

/**
 * Get article by slug (public)
 */
export const getArticleBySlug = async (slug) => {
  try {
    const response = await axios.get(`${API_URL}/help/article/${slug}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get article error:', error);
    return null;
  }
};

/**
 * Update help content (admin only)
 */
export const updateHelpContent = async (data, token) => {
  try {
    const response = await axios.put(`${API_URL}/help`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update help content error:', error);
    throw error;
  }
};

/**
 * Reset help content (admin only)
 */
export const resetHelpContent = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/help/reset`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Reset help content error:', error);
    throw error;
  }
};