// src/components/provider/ProviderMobileNavbar.jsx
// ✅ COMPLETE FIXED - Notification click navigates to notifications page
// ✅ Added proper navigation for notifications
// ✅ ADDED: Messages icon with unread badge for provider chat

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Menu,
  Bell,
  BellDot,
  UserCircle,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import notificationService from "../../services/notification.service";
import { getTotalUnreadCount } from "../../services/chatService";
import logo from "../../assets/images/logo.png";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Helper for image URL
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/uploads/')) return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${path}`;
  if (path.startsWith('data:image')) return path;
  return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${path}`;
};

const ProviderMobileNavbar = ({
  onMenuClick,
  onNotificationClick,
}) => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [profileImageError, setProfileImageError] = useState(false);
  
  // ✅ Use ref to track if initial fetch is done
  const hasFetchedRef = useRef(false);
  const hasRefreshedRef = useRef(false);

  // ✅ Get user avatar URL - prioritizes profileImage then avatar
  const getAvatarUrl = useCallback(() => {
    if (user?.profileImage) {
      return getImageUrl(user.profileImage);
    }
    if (user?.avatar) {
      return getImageUrl(user.avatar);
    }
    return null;
  }, [user?.profileImage, user?.avatar]);

  const avatarUrl = getAvatarUrl();

  /* ================= FETCH UNREAD COUNT ================= */
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user?._id]);

  /* ================= FETCH CHAT UNREAD COUNT ================= */
  const fetchChatUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await getTotalUnreadCount();
      if (response.success) {
        setChatUnreadCount(response.data?.count || 0);
      }
    } catch (error) {
      console.error('Error fetching chat unread count:', error);
    }
  }, [user?._id]);

  // ✅ Fetch unread counts only once on mount and when user changes
  useEffect(() => {
    if (user && !hasFetchedRef.current) {
      fetchUnreadCount();
      fetchChatUnreadCount();
      hasFetchedRef.current = true;
    }
  }, [user?._id, fetchUnreadCount, fetchChatUnreadCount]);

  // ✅ Refresh user data only once on mount
  useEffect(() => {
    if (user && !hasRefreshedRef.current) {
      refreshUser();
      hasRefreshedRef.current = true;
    }
  }, [user?._id, refreshUser]);

  /* ================= GET USER DISPLAY NAME ================= */
  const getDisplayName = useCallback(() => {
    if (!user) return 'Provider';
    return user.fullName || user.name || user.businessName || 'Provider';
  }, [user?.fullName, user?.name, user?.businessName]);

  /* ================= GET USER INITIALS ================= */
  const getInitials = useCallback(() => {
    const name = getDisplayName();
    if (name === 'Provider') return 'P';
    return name.charAt(0).toUpperCase();
  }, [getDisplayName]);

  // =========================
  // ✅ HANDLE NOTIFICATION CLICK
  // =========================
  const handleNotificationClick = useCallback(() => {
    if (onNotificationClick) {
      onNotificationClick();
    }
    navigate('/provider/notifications');
  }, [navigate, onNotificationClick]);

  // =========================
  // ✅ HANDLE MESSAGES CLICK
  // =========================
  const handleMessagesClick = useCallback(() => {
    navigate('/provider/chat');
  }, [navigate]);

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-16 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="h-full px-4 flex items-center justify-between">
        
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-white" />
          </button>

          {/* LOGO */}
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="AI Tour"
              className="w-10 h-10 object-contain"
            />

            <div>
              <h1 className="text-lg font-black bg-gradient-to-r from-[#0D9488] to-[#F59E0B] bg-clip-text text-transparent leading-none">
                AI Tour
              </h1>

              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                Provider Center
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* ✅ MESSAGES - Provider Chat */}
          <button
            onClick={handleMessagesClick}
            className="relative w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
            aria-label="Messages"
          >
            <MessageCircle className="w-5 h-5 text-gray-700 dark:text-white" />
            {chatUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-gray-950 px-1 animate-pulse">
                {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION */}
          <button
            onClick={handleNotificationClick}
            className="relative w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
            aria-label="Notifications"
          >
            {unreadCount > 0 ? (
              <BellDot className="w-5 h-5 text-[#0D9488] dark:text-[#0D9488]" />
            ) : (
              <Bell className="w-5 h-5 text-gray-700 dark:text-white" />
            )}
            
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-gray-950 px-1 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* PROFILE */}
          {user ? (
            <button
              onClick={() => navigate("/provider/profile")}
              className="relative group"
              aria-label="Profile"
            >
              {avatarUrl && !profileImageError ? (
                <img
                  src={avatarUrl}
                  alt={getDisplayName()}
                  className="w-11 h-11 rounded-2xl object-cover border-2 border-[#0D9488] group-hover:border-[#F59E0B] transition-all duration-300 group-hover:scale-105"
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white text-lg font-bold border-2 border-[#0D9488] group-hover:border-[#F59E0B] transition-all duration-300 group-hover:scale-105">
                  {getInitials()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-950">
                <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
              </span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white shadow-lg shadow-[#0D9488]/30 hover:scale-105 transition-all duration-300"
              aria-label="Login"
            >
              <UserCircle size={25} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default ProviderMobileNavbar;