// src/services/blogService.js
// ✅ NEW - Blog Service

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get blog content (public)
 */
export const getBlogContent = async () => {
  try {
    const response = await axios.get(`${API_URL}/blog`);
    return response.data;
  } catch (error) {
    console.error('❌ Get blog content error:', error);
    return null;
  }
};

/**
 * Get published posts (public)
 */
export const getPublishedPosts = async () => {
  try {
    const response = await axios.get(`${API_URL}/blog/posts`);
    return response.data;
  } catch (error) {
    console.error('❌ Get published posts error:', error);
    return null;
  }
};

/**
 * Get post by slug (public)
 */
export const getPostBySlug = async (slug) => {
  try {
    const response = await axios.get(`${API_URL}/blog/post/${slug}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get post error:', error);
    return null;
  }
};

/**
 * Update blog content (admin only)
 */
export const updateBlogContent = async (data, token) => {
  try {
    const response = await axios.put(`${API_URL}/blog`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update blog content error:', error);
    throw error;
  }
};

/**
 * Reset blog content (admin only)
 */
export const resetBlogContent = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/blog/reset`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Reset blog content error:', error);
    throw error;
  }
};