// frontend/src/services/userservice.js

import api from './api';

class UserService {
  // =========================
  // GET CURRENT USER PROFILE
  // =========================
  async getProfile() {
    try {
      const response = await api.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('❌ Get profile error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // UPDATE PROFILE
  // =========================
  async updateProfile(data) {
    try {
      const response = await api.put('/users/me', data);
      
      // Update local storage
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // ✅ Dispatch a custom event to notify other components
        window.dispatchEvent(new CustomEvent('userUpdated', { 
          detail: response.data.user 
        }));
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Update profile error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // GET USER STATS
  // =========================
  async getStats() {
    try {
      const response = await api.get('/users/me/stats');
      return response.data;
    } catch (error) {
      console.error('❌ Get stats error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // UPDATE PASSWORD
  // =========================
  async updatePassword(data) {
    try {
      const response = await api.put('/auth/update-password', data);
      return response.data;
    } catch (error) {
      console.error('❌ Update password error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // UPLOAD AVATAR
  // =========================
  async uploadAvatar(file) {
    try {
      // ✅ Validate file
      if (!file) {
        throw new Error('No file provided');
      }

      // ✅ Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
      }

      // ✅ Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.put('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // ✅ Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('userUpdated', { 
          detail: response.data.user 
        }));
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Upload avatar error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // DELETE ACCOUNT
  // =========================
  async deleteAccount() {
    try {
      const response = await api.delete('/users/me');
      return response.data;
    } catch (error) {
      console.error('❌ Delete account error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // GET USER BY ID (Admin)
  // =========================
  async getUserById(userId) {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Get user by id error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // GET ALL USERS (Admin)
  // =========================
  async getAllUsers(params = {}) {
    try {
      const response = await api.get('/users', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Get all users error:', error);
      throw error.response?.data || { message: error.message };
    }
  }
}

export default new UserService();