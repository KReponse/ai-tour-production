// src/components/admin/AdminNavbar.jsx
// ✅ COMPLETE FIXED - Added notification fetching with token check
// ✅ Added dynamic role display
// ✅ Added 401 error handling
// ✅ ADDED: Messages icon with unread badge for admin support chat
// ✅ RESPONSIVE: Mobile-optimized with proper touch targets
// ✅ FIXED: Touch targets for mobile (44px minimum)

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Bell,
  UserCircle,
  PanelLeft,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  Settings,
  Sparkles,
  Shield,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import { useAuth } from "../../contexts/AuthContext";
import notificationService from "../../services/notification.service";
import { getTotalUnreadCount } from "../../services/chatService";
import toast from "react-hot-toast";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

export default function AdminNavbar({
  collapsed,
  setCollapsed,
  onMobileMenu,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [dark, setDark] = useState(
    localStorage.getItem("adminTheme") === "dark"
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const profileRef = useRef();
  const notificationRef = useRef();

  // ✅ Fetch unread count on mount
  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('ℹ️ No token found, skipping unread count');
      return;
    }

    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('ℹ️ User not authenticated, skipping unread count');
        return;
      }
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // ✅ Fetch chat unread count
  const fetchChatUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('ℹ️ No token found, skipping chat unread count');
      return;
    }

    try {
      const response = await getTotalUnreadCount();
      if (response.success) {
        setChatUnreadCount(response.data?.count || 0);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('ℹ️ User not authenticated, skipping chat unread count');
        return;
      }
      console.error('Error fetching chat unread count:', error);
    }
  }, []);

  // ✅ Fetch notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('ℹ️ No token found, skipping notifications');
      return;
    }

    try {
      setLoadingNotifications(true);
      const response = await notificationService.getNotifications(1, 5);
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('ℹ️ User not authenticated, skipping notifications');
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // ✅ Initial fetch
  useEffect(() => {
    fetchUnreadCount();
    fetchChatUnreadCount();
  }, [fetchUnreadCount, fetchChatUnreadCount]);

  // ✅ Fetch notifications when dropdown opens
  useEffect(() => {
    if (notificationOpen) {
      fetchNotifications();
    }
  }, [notificationOpen, fetchNotifications]);

  // ✅ Dark mode effect
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("adminTheme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("adminTheme", "light");
    }
  }, [dark]);

  // ✅ Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    toast.success("Logged out successfully");
  };

  // ✅ Get user display name
  const getDisplayName = () => {
    return user?.name || user?.fullName || user?.email?.split('@')[0] || "Admin";
  };

  // ✅ Get user role display
  const getRoleDisplay = () => {
    const role = user?.role || 'admin';
    if (role === 'admin') return 'Administrator';
    if (role === 'super_admin') return 'Super Admin';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // ✅ Format time ago
  const timeAgo = (date) => {
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

  // ✅ Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 transition-all duration-300 shadow-sm">
      <div className="h-full px-3 sm:px-4 lg:px-6 flex items-center justify-between">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* MENU - Responsive touch target */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                onMobileMenu();
              } else {
                setCollapsed(!collapsed);
              }}
            }
            className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-all duration-300 hover:scale-105 touch-manipulation"
            aria-label="Toggle sidebar"
          >
            <PanelLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>

          {/* LOGO - Responsive */}
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src={logo}
              alt="logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <h1 className="font-black bg-gradient-to-r from-[#0D9488] to-[#F59E0B] bg-clip-text text-transparent text-sm sm:text-base">
                  AI Tour Rwanda
                </h1>
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0D9488]" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                Admin Portal
              </p>
            </div>
          </div>

          {/* SEARCH - Responsive */}
          <form 
            onSubmit={handleSearch}
            className="hidden md:flex ml-2 sm:ml-5 items-center gap-2 sm:gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 sm:px-4 h-10 sm:h-11 w-48 sm:w-64 lg:w-80 xl:w-96 transition-all duration-300 focus-within:ring-2 focus-within:ring-[#0D9488] focus-within:bg-white dark:focus-within:bg-gray-900"
          >
            <Search size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500 flex-shrink-0" />
            <input
              placeholder="Search dashboard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-sm dark:text-white placeholder:text-gray-400"
            />
          </form>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
          {/* THEME - Responsive touch target */}
          <button
            onClick={() => setDark(!dark)}
            className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-all duration-300 hover:scale-105 touch-manipulation"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? (
              <Sun size={18} className="sm:w-[19px] sm:h-[19px] text-[#F59E0B]" />
            ) : (
              <Moon size={18} className="sm:w-[19px] sm:h-[19px] text-gray-700 dark:text-gray-300" />
            )}
          </button>

          {/* ✅ MESSAGES - Admin Support Chat - Responsive touch target */}
          <button
            onClick={() => navigate('/admin/chat')}
            className="relative min-w-[44px] min-h-[44px] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-all duration-300 hover:scale-105 touch-manipulation"
            aria-label="Support Messages"
          >
            <MessageCircle size={19} className="sm:w-[20px] sm:h-[20px] text-gray-700 dark:text-gray-300" />
            {chatUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-gray-900 animate-pulse">
                {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATIONS - Responsive touch target */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative min-w-[44px] min-h-[44px] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-all duration-300 hover:scale-105 touch-manipulation"
              aria-label="Notifications"
            >
              <Bell size={19} className="sm:w-[20px] sm:h-[20px] text-gray-700 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-gray-900 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown - Responsive */}
            {notificationOpen && (
              <div className="absolute right-0 mt-3 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50">
                <div className="flex items-center justify-between p-3 sm:p-4 border-b dark:border-gray-800">
                  <h3 className="font-bold text-[#374151] dark:text-white flex items-center gap-2 text-sm sm:text-base">
                    <Bell size={15} className="sm:w-[16px] sm:h-[16px] text-[#0D9488]" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="text-xs bg-[#0D9488] text-white px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          await notificationService.markAllAsRead();
                          setUnreadCount(0);
                          setNotifications(prev => 
                            prev.map(n => ({ ...n, read: true }))
                          );
                          toast.success('All notifications marked as read');
                        } catch (error) {
                          console.error('Error marking all as read:', error);
                          toast.error('Failed to mark all as read');
                        }
                      }}
                      className="text-xs text-[#0D9488] hover:text-[#0D9488]/80 font-medium transition min-h-[32px] min-w-[32px]"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <Bell size={36} className="sm:w-[40px] sm:h-[40px] text-gray-300 dark:text-gray-600 mb-2 sm:mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No notifications yet
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        We'll notify you about important updates
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => {
                          if (!notification.read) {
                            notificationService.markAsRead(notification._id);
                            setUnreadCount(prev => Math.max(0, prev - 1));
                          }
                          if (notification.link) {
                            navigate(notification.link);
                          }
                          setNotificationOpen(false);
                        }}
                        className={`
                          flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition
                          hover:bg-gray-50 dark:hover:bg-gray-800/50
                          ${!notification.read ? 'bg-teal-50 dark:bg-teal-900/10' : ''}
                        `}
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <Bell size={16} className="sm:w-[18px] sm:h-[18px] text-[#0D9488]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-medium dark:text-white ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                            {notification.message}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 sm:mt-1">
                            {timeAgo(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0D9488] flex-shrink-0 mt-1.5 sm:mt-2" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-2.5 sm:p-3 border-t dark:border-gray-800 text-center">
                    <button
                      onClick={() => {
                        navigate('/admin/notifications');
                        setNotificationOpen(false);
                      }}
                      className="text-xs sm:text-sm text-[#0D9488] hover:text-[#0D9488]/80 font-medium transition min-h-[36px] px-3"
                    >
                      View All Notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PROFILE - Responsive */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 min-h-[44px] touch-manipulation"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] text-white flex items-center justify-center shadow-md shadow-[#0D9488]/25">
                <UserCircle size={18} className="sm:w-[22px] sm:h-[22px]" />
              </div>

              <div className="hidden sm:block text-left">
                <p className="text-xs sm:text-sm font-bold text-[#374151] dark:text-white truncate max-w-[80px] lg:max-w-[120px]">
                  {getDisplayName()}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                  {getRoleDisplay()}
                </p>
              </div>

              <ChevronDown size={14} className={`sm:w-[16px] sm:h-[16px] text-gray-500 transition-transform duration-300 flex-shrink-0 ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-56 sm:w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-1.5 sm:p-2 z-50">
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 dark:border-gray-800 mb-1.5 sm:mb-2">
                  <p className="font-bold text-[#374151] dark:text-white text-sm sm:text-base truncate">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || "admin@aitour.rw"}
                  </p>
                  <span className="inline-block mt-1 text-[10px] sm:text-xs bg-[#0D9488]/10 text-[#0D9488] px-2 py-0.5 rounded-full">
                    {getRoleDisplay()}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/admin/settings");
                  }}
                  className="w-full flex gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-[#374151] dark:text-white text-sm sm:text-base min-h-[44px]"
                >
                  <Settings size={16} className="sm:w-[18px] sm:h-[18px] text-[#0D9488]" />
                  Settings
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-sm sm:text-base min-h-[44px]"
                >
                  <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}