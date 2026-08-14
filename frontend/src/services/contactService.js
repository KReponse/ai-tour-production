// frontend/src/services/contactService.js
// ✅ COMPLETE FIXED

import API from './api';

/**
 * Get contact page content from CMS
 */
export const getContactContent = async () => {
  try {
    const response = await API.get('/contact');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching contact content:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Update contact page content
 * Admin only
 */
export const updateContactContent = async (contentData) => {
  try {
    const response = await API.put('/contact', contentData);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating contact content:', error);
    throw error;
  }
};

/**
 * Reset contact page content to defaults
 * Admin only
 */
export const resetContactContent = async () => {
  try {
    const response = await API.post('/contact/reset');
    return response.data;
  } catch (error) {
    console.error('❌ Error resetting contact content:', error);
    throw error;
  }
};

/**
 * Submit contact form
 */
export const submitContactForm = async (formData) => {
  try {
    const response = await API.post('/contact/submit', formData);
    return response.data;
  } catch (error) {
    console.error('❌ Error submitting contact form:', error);
    throw error;
  }
};

/**
 * Get all contact messages
 * Admin only
 */
export const getContactMessages = async () => {
  try {
    const response = await API.get('/contact/messages');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching contact messages:', error);
    throw error;
  }
};

/**
 * Get single contact message
 * Admin only
 */
export const getContactMessage = async (id) => {
  try {
    const response = await API.get(`/contact/messages/${id}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching contact message:', error);
    throw error;
  }
};

export default {
  getContactContent,
  updateContactContent,
  resetContactContent,
  submitContactForm,
  getContactMessages,
  getContactMessage,
};