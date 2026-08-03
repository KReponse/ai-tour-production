// src/services/newsletterService.js
// ✅ NEW - Newsletter Subscription Service

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Subscribe to newsletter
 * @param {string} email - User's email address
 * @param {Object} metadata - Optional metadata (name, source, etc.)
 * @returns {Promise} - API response
 */
export const subscribeToNewsletter = async (email, metadata = {}) => {
  try {
    const response = await axios.post(`${API_URL}/newsletter/subscribe`, {
      email,
      ...metadata,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Newsletter subscription error:', error);
    throw error;
  }
};

/**
 * Unsubscribe from newsletter
 * @param {string} email - User's email address
 * @returns {Promise} - API response
 */
export const unsubscribeFromNewsletter = async (email) => {
  try {
    const response = await axios.post(`${API_URL}/newsletter/unsubscribe`, {
      email,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Newsletter unsubscribe error:', error);
    throw error;
  }
};

/**
 * Get newsletter subscribers (admin only)
 * @param {string} token - Admin auth token
 * @param {Object} params - Query params (page, limit, status)
 * @returns {Promise} - API response
 */
export const getSubscribers = async (token, params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/newsletter/subscribers`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Get subscribers error:', error);
    throw error;
  }
};

/**
 * Export subscribers to CSV (admin only)
 * @param {string} token - Admin auth token
 * @returns {Promise} - Blob response
 */
export const exportSubscribers = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/newsletter/export`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('❌ Export subscribers error:', error);
    throw error;
  }
};