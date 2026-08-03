// src/pages/admin/AdminNotifications.jsx

import { useEffect, useState } from "react";
import axios from "axios";
import { 
  Bell, 
  CheckCircle, 
  Loader2, 
  XCircle,
  Mail,
  Sparkles,
  Calendar,
  Users,
  MapPin,
} from "lucide-react";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(null);

  const token = localStorage.getItem("token");

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(data.notifications || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      setMarkingRead(id);
      await axios.patch(
        `${API}/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchNotifications();
    } catch (err) {
      console.log(err);
    } finally {
      setMarkingRead(null);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch(
        `${API}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchNotifications();
    } catch (err) {
      console.log(err);
    }
  };

  // Get icon based on notification type
  const getIcon = (type) => {
    const icons = {
      user: Users,
      tour: MapPin,
      booking: Calendar,
      system: Bell,
      mail: Mail,
    };
    return icons[type] || Bell;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* HEADER - Updated with AI Tour colors */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#374151] dark:text-white">
              Notifications
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {notifications.length} notifications • {unreadCount} unread
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[#0D9488]/10 text-[#0D9488] hover:bg-[#0D9488]/20 transition-all duration-300"
          >
            <CheckCircle className="w-4 h-4 inline mr-2" />
            Mark all read
          </button>
        )}
      </div>

      {/* NOTIFICATIONS LIST - Updated with AI Tour colors */}
      {notifications.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            No Notifications
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            You're all caught up! Check back later for updates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = getIcon(n.type);
            const isUnread = !n.isRead;

            return (
              <div
                key={n._id}
                className={`p-5 rounded-2xl border transition-all duration-300 ${
                  isUnread
                    ? 'bg-[#0D9488]/5 dark:bg-[#0D9488]/10 border-[#0D9488]/20 dark:border-[#0D9488]/30 shadow-sm'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-80'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isUnread
                      ? 'bg-[#0D9488]/10 dark:bg-[#0D9488]/20'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isUnread ? 'text-[#0D9488]' : 'text-gray-400 dark:text-gray-500'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold text-sm ${
                        isUnread ? 'text-[#374151] dark:text-white' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {n.title}
                      </h3>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 ${
                      isUnread ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Action */}
                  {isUnread && (
                    <button
                      onClick={() => markAsRead(n._id)}
                      disabled={markingRead === n._id}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-[#0D9488] text-white hover:bg-[#0D9488]/80 transition-all duration-300 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                    >
                      {markingRead === n._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Mark read
                        </>
                      )}
                    </button>
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

export default AdminNotifications;