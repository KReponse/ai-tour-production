// src/services/contactService.js
// ✅ NEW - Contact Service

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get contact content (public)
 */
export const getContactContent = async () => {
  try {
    const response = await axios.get(`${API_URL}/contact`);
    return response.data;
  } catch (error) {
    console.error('❌ Get contact content error:', error);
    return null;
  }
};

/**
 * Update contact content (admin only)
 */
export const updateContactContent = async (data, token) => {
  try {
    const response = await axios.put(`${API_URL}/contact`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update contact content error:', error);
    throw error;
  }
};

/**
 * Reset contact content (admin only)
 */
export const resetContactContent = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/contact/reset`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Reset contact content error:', error);
    throw error;
  }
};