// src/services/footerService.js
// ✅ NEW - Footer Service

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Get footer content
 */
export const getFooterContent = async () => {
  try {
    const response = await axios.get(`${API_URL}/footer`);
    return response.data;
  } catch (error) {
    console.error("❌ Get footer content error:", error);
    // Return null so component can use fallback
    return null;
  }
};

/**
 * Update footer content (admin only)
 */
export const updateFooterContent = async (data, token) => {
  try {
    const response = await axios.put(`${API_URL}/footer`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update footer content error:", error);
    throw error;
  }
};

/**
 * Reset footer content (admin only)
 */
export const resetFooterContent = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/footer/reset`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Reset footer content error:", error);
    throw error;
  }
};