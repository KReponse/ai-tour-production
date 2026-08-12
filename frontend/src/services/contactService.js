// frontend/src/services/contactService.js
// ✅ COMPLETE FIXED - Added submitContactForm

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
 * Get all contact messages (admin only)
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
 * Get single contact message (admin only)
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