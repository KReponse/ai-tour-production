// frontend/src/services/notification.service.js
// ✅ FIXED - Better error handling for 401 responses

import api from './api';

class NotificationService {
  // =========================
  // GET NOTIFICATIONS
  // =========================
  async getNotifications(page = 1, limit = 20, read = null) {
    try {
      const params = { page, limit };
      if (read !== null) params.read = read;
      
      // ✅ Check if user is authenticated before making request
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('ℹ️ No token found, skipping notifications fetch');
        return { notifications: [], unreadCount: 0, pagination: { total: 0 } };
      }
      
      const response = await api.get('/notifications', { params });
      return response.data;
    } catch (error) {
      // ✅ Handle 401 gracefully
      if (error.response?.status === 401) {
        console.log('ℹ️ User not authenticated, returning empty notifications');
        return { notifications: [], unreadCount: 0, pagination: { total: 0 } };
      }
      console.error('❌ Get notifications error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // GET UNREAD COUNT
  // =========================
  async getUnreadCount() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { unreadCount: 0 };
      }
      
      const response = await api.get('/notifications/unread-count');
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return { unreadCount: 0 };
      }
      console.error('❌ Get unread count error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // MARK AS READ
  // =========================
  async markAsRead(id) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await api.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      console.error('❌ Mark as read error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // MARK ALL AS READ
  // =========================
  async markAllAsRead() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      console.error('❌ Mark all as read error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // DELETE NOTIFICATION
  // =========================
  async deleteNotification(id) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await api.delete(`/notifications/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      console.error('❌ Delete notification error:', error);
      throw error.response?.data || { message: error.message };
    }
  }

  // =========================
  // DELETE ALL READ
  // =========================
  async deleteAllRead() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await api.delete('/notifications/read/all');
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      console.error('❌ Delete all read error:', error);
      throw error.response?.data || { message: error.message };
    }
  }
}

export default new NotificationService();