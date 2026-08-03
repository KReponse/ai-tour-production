// frontend/src/pages/provider/ProviderNotifications.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  MessageCircle,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  CheckCheck,
  AlertCircle,
  Heart,
  Star,
  DollarSign,
  UserPlus,
  CalendarCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getNotificationIcon = (type) => {
  const icons = {
    booking_created: CalendarCheck,
    booking_confirmed: CheckCircle,
    booking_rejected: XCircle,
    booking_cancelled: XCircle,
    booking_completed: CheckCircle,
    listing_created: Building2,
    listing_approved: CheckCircle,
    listing_rejected: XCircle,
    listing_suspended: AlertCircle,
    payment_success: DollarSign,
    new_message: MessageCircle,
    system_alert: Bell,
    tour_approved: CheckCircle,
    tour_rejected: XCircle,
    review_received: Star,
    like_received: Heart,
    user_followed: UserPlus,
  };
  return icons[type] || Bell;
};

const getNotificationColor = (type) => {
  const colors = {
    booking_created: 'text-[#0D9488]',
    booking_confirmed: 'text-[#0D9488]',
    booking_rejected: 'text-red-500',
    booking_cancelled: 'text-red-500',
    booking_completed: 'text-[#0D9488]',
    listing_created: 'text-[#0D9488]',
    listing_approved: 'text-[#0D9488]',
    listing_rejected: 'text-red-500',
    listing_suspended: 'text-[#F59E0B]',
    payment_success: 'text-[#0D9488]',
    new_message: 'text-[#0D9488]',
    system_alert: 'text-[#F59E0B]',
    tour_approved: 'text-[#0D9488]',
    tour_rejected: 'text-red-500',
    review_received: 'text-[#F59E0B]',
    like_received: 'text-red-500',
    user_followed: 'text-[#0D9488]',
  };
  return colors[type] || 'text-gray-500';
};

const getTimeAgo = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const ProviderNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Use PUT instead of PATCH
  const handleMarkAsRead = async (id) => {
    try {
      setActionLoading(id);
      await axios.put(
        `${API}/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, read: true } : n
      ));
      toast.success('Marked as read');
    } catch (error) {
      console.error('❌ Error marking as read:', error);
      toast.error(error.response?.data?.message || 'Failed to mark as read');
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ FIXED: Use PUT instead of PATCH
  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading('all');
      await axios.put(
        `${API}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      toast.error(error.response?.data?.message || 'Failed to mark all as read');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      setActionLoading(id);
      await axios.delete(
        `${API}/notifications/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(notifications.filter(n => n._id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      toast.error(error.response?.data?.message || 'Failed to delete notification');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#374151] dark:text-white">
              Notifications
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={actionLoading === 'all'}
              className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-sm font-medium hover:bg-[#0D9488]/80 transition disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading === 'all' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-[#0D9488] text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            filter === 'unread'
              ? 'bg-[#0D9488] text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            filter === 'read'
              ? 'bg-[#0D9488] text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      {/* NOTIFICATIONS LIST */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            No Notifications
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all' 
              ? "You're all caught up!" 
              : filter === 'unread' 
                ? 'No unread notifications' 
                : 'No read notifications'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const iconColor = getNotificationColor(notification.type);
            const isUnread = !notification.read;

            return (
              <div
                key={notification._id}
                onClick={() => handleClick(notification)}
                className={`
                  group bg-white dark:bg-gray-900 rounded-2xl p-4 border transition-all duration-300 cursor-pointer
                  ${isUnread 
                    ? 'border-[#0D9488]/30 dark:border-[#0D9488]/20 shadow-md shadow-[#0D9488]/5' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-[#0D9488]/30'
                  }
                  hover:shadow-lg hover:-translate-y-0.5
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isUnread ? 'bg-[#0D9488]/10' : 'bg-gray-100 dark:bg-gray-800'}
                  `}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`font-semibold ${isUnread ? 'text-[#374151] dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {getTimeAgo(notification.createdAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-3">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification._id);
                          }}
                          disabled={actionLoading === notification._id}
                          className="text-xs text-[#0D9488] font-medium hover:underline disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoading === notification._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification._id);
                        }}
                        disabled={actionLoading === notification._id}
                        className="text-xs text-gray-400 hover:text-red-500 transition disabled:opacity-50 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-[#0D9488] flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProviderNotifications;