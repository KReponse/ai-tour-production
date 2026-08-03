// src/components/provider/ProviderNavbar.jsx
// ✅ FIXED - Prevent infinite re-fetching with useMemo and proper dependencies
// ✅ FIXED: Added token check and graceful 401 handling for notifications

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

import {
  Bell,
  Search,
  Moon,
  Sun,
  Menu,
  ChevronDown,
  Settings,
  User,
  LogOut,
  PlusCircle,
  LayoutDashboard,
  ClipboardList,
  CheckCheck,
  Clock,
  Star,
  Calendar,
  CreditCard,
  AlertCircle,
  DollarSign,
  Users,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../contexts/AuthContext";

import notificationService from "../../services/notification.service";
import logo from "../../assets/images/logo.png";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ===============================
// NOTIFICATION ICON MAPPER
// ===============================
const getNotificationIcon = (type) => {
  const icons = {
    booking: Calendar,
    booking_created: Calendar,
    booking_confirmed: Calendar,
    booking_cancelled: Calendar,
    booking_rejected: Calendar,
    payment: CreditCard,
    payment_success: CreditCard,
    payment_failed: CreditCard,
    review: Star,
    new_review: Star,
    message: Bell,
    new_message: Bell,
    system: Bell,
    system_alert: AlertCircle,
    reminder: Clock,
    alert: AlertCircle,
    earning: DollarSign,
    earning_credited: DollarSign,
    withdrawal_requested: DollarSign,
    withdrawal_completed: DollarSign,
    traveler: Users,
    listing_created: ClipboardList,
    listing_approved: ClipboardList,
    listing_rejected: ClipboardList,
    listing_suspended: AlertCircle,
  };
  return icons[type] || Bell;
};

const getNotificationColor = (type) => {
  const colors = {
    booking: 'text-blue-500',
    booking_created: 'text-blue-500',
    booking_confirmed: 'text-green-500',
    booking_cancelled: 'text-red-500',
    booking_rejected: 'text-red-500',
    payment: 'text-green-500',
    payment_success: 'text-green-500',
    payment_failed: 'text-red-500',
    review: 'text-yellow-500',
    new_review: 'text-yellow-500',
    message: 'text-purple-500',
    new_message: 'text-purple-500',
    system: 'text-teal-500',
    system_alert: 'text-red-500',
    reminder: 'text-orange-500',
    alert: 'text-red-500',
    earning: 'text-green-500',
    earning_credited: 'text-green-500',
    withdrawal_requested: 'text-orange-500',
    withdrawal_completed: 'text-green-500',
    traveler: 'text-blue-500',
    listing_created: 'text-teal-500',
    listing_approved: 'text-green-500',
    listing_rejected: 'text-red-500',
    listing_suspended: 'text-red-500',
  };
  return colors[type] || 'text-gray-500';
};

// ✅ Helper for image URL
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/uploads/')) return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${path}`;
  if (path.startsWith('data:image')) return path;
  return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${path}`;
};

const ProviderNavbar = ({
  onMenuClick,
}) => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  
  const profileRef = useRef();
  const notificationRef = useRef();
  
  // ✅ Use refs to track if initial fetches are done
  const hasFetchedRef = useRef(false);
  const hasRefreshedRef = useRef(false);
  
  // ✅ FIXED: Use useMemo to stabilize userId and prevent unnecessary re-renders
  const userId = useMemo(() => user?._id, [user?._id]);

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

  /* ================= FETCH NOTIFICATIONS ================= */
  const fetchNotifications = useCallback(async () => {
    // ✅ FIXED: Check if user is authenticated before fetching
    if (!user) {
      console.log('ℹ️ No user, skipping notifications');
      return;
    }

    // ✅ FIXED: Check for token
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('ℹ️ No token found, skipping notifications');
      return;
    }

    try {
      setLoading(true);
      const response = await notificationService.getNotifications();
      
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      // ✅ FIXED: Graceful 401 handling
      if (error.response?.status === 401) {
        console.log('ℹ️ User not authenticated, skipping notifications');
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]); // ✅ Depends on user

  // ✅ FIXED: Fetch notifications only once on mount
  useEffect(() => {
    if (user && !hasFetchedRef.current) {
      fetchNotifications();
      hasFetchedRef.current = true;
    }
  }, [user, fetchNotifications]);

  // ✅ FIXED: Refresh notifications when notification panel opens
  useEffect(() => {
    if (notificationOpen && user) {
      fetchNotifications();
    }
  }, [notificationOpen, user, fetchNotifications]);

  // ✅ FIXED: Refresh user data only once on mount
  useEffect(() => {
    if (user && !hasRefreshedRef.current) {
      refreshUser();
      hasRefreshedRef.current = true;
    }
  }, [user]); // ✅ Only depends on user, NOT refreshUser

  /* ================= DARK MODE ================= */
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  /* ================= CLOSE DROPDOWNS ================= */
  useEffect(() => {
    const closeDropdown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, []);

  /* ================= MARK NOTIFICATION AS READ ================= */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // ✅ FIXED: Graceful 401 handling
      if (error.response?.status === 401) {
        console.log('ℹ️ User not authenticated, cannot mark as read');
        return;
      }
      console.error('Error marking notification as read:', error);
    }
  }, []);

  /* ================= MARK ALL AS READ ================= */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      // ✅ FIXED: Graceful 401 handling
      if (error.response?.status === 401) {
        console.log('ℹ️ User not authenticated, cannot mark all as read');
        return;
      }
      console.error('Error marking all as read:', error);
    }
  }, []);

  /* ================= HANDLE NOTIFICATION CLICK ================= */
  const handleNotificationClick = useCallback((notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }

    if (notification.link) {
      navigate(notification.link);
    } else if (notification.type === 'booking' || notification.type === 'booking_created' || notification.type === 'booking_confirmed') {
      navigate('/provider/bookings');
    } else if (notification.type === 'payment' || notification.type === 'payment_success' || notification.type === 'earning' || notification.type === 'earning_credited') {
      navigate('/provider/earnings');
    } else if (notification.type === 'review' || notification.type === 'new_review') {
      navigate('/provider/reviews');
    } else if (notification.type === 'traveler') {
      navigate('/provider/travelers');
    } else if (notification.type === 'listing_created' || notification.type === 'listing_approved' || notification.type === 'listing_rejected' || notification.type === 'listing_suspended') {
      navigate('/provider/listings');
    } else {
      navigate('/provider/notifications');
    }

    setNotificationOpen(false);
  }, [navigate, markAsRead]);

  /* ================= LOGOUT ================= */
  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  /* ================= FORMAT TIME AGO ================= */
  const timeAgo = useCallback((date) => {
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
  }, []);

  /* ================= GET USER DISPLAY NAME ================= */
  const getDisplayName = useCallback(() => {
    if (!user) return 'Provider';
    return user.fullName || user.name || user.businessName || 'Provider';
  }, [user]);

  /* ================= GET USER INITIALS ================= */
  const getInitials = useCallback(() => {
    const name = getDisplayName();
    if (name === 'Provider') return 'P';
    return name.charAt(0).toUpperCase();
  }, [getDisplayName]);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between">

        {/* ================= LEFT ================= */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
          >
            <Menu className="w-5 h-5 dark:text-white" />
          </button>

          {/* LOGO */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/provider/dashboard")}
          >
            <img
              src={logo}
              alt="AI Tour"
              className="w-11 h-11 object-contain"
            />

            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-[#0D9488] to-[#F59E0B] bg-clip-text text-transparent">
                AI Tour
              </h1>

              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Provider Center
              </p>
            </div>
          </div>
        </div>

        {/* ================= SEARCH ================= */}
        <div className="hidden lg:flex flex-1 max-w-2xl mx-10">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              placeholder="Search listings, bookings, travelers..."
              className="w-full h-12 pl-12 rounded-2xl bg-gray-100 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-[#0D9488] dark:text-white transition placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* ================= RIGHT ================= */}
        <div className="flex items-center gap-2 lg:gap-3">

          {/* DARK MODE */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-[#F59E0B]" />
            ) : (
              <Moon className="w-5 h-5 dark:text-white" />
            )}
          </button>

          {/* ================= NOTIFICATIONS ================= */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
            >
              <Bell className="w-5 h-5 dark:text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-gray-950 px-1 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* NOTIFICATION DROPDOWN */}
            {notificationOpen && (
              <div className="absolute right-0 mt-3 w-80 max-w-[90vw] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
                  <h3 className="font-bold dark:text-white flex items-center gap-2">
                    <Bell size={16} className="text-[#0D9488]" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="text-xs bg-[#0D9488] text-white px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-[#0D9488] hover:text-[#0D9488]/80 font-medium flex items-center gap-1 transition"
                    >
                      <CheckCheck size={14} />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#0D9488] border-t-transparent" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <Bell size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No notifications yet
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        We'll notify you about bookings and earnings
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      const colorClass = getNotificationColor(notification.type);
                      
                      return (
                        <div
                          key={notification._id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`
                            flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition
                            hover:bg-gray-50 dark:hover:bg-gray-800/50
                            ${!notification.read ? 'bg-teal-50 dark:bg-teal-900/10' : ''}
                          `}
                        >
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 flex-shrink-0
                          `}>
                            <Icon size={18} className={colorClass} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`
                              text-sm font-medium dark:text-white
                              ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}
                            `}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {timeAgo(notification.createdAt)}
                            </p>
                          </div>
                          
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-[#0D9488] flex-shrink-0 mt-2" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="p-3 border-t dark:border-gray-800 text-center">
                    <button
                      onClick={() => {
                        navigate('/provider/notifications');
                        setNotificationOpen(false);
                      }}
                      className="text-sm text-[#0D9488] hover:text-[#0D9488]/80 font-medium transition"
                    >
                      View All Notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= PROFILE ================= */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 px-3 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
            >
              <div className="relative">
                {avatarUrl && !profileImageError ? (
                  <img
                    src={avatarUrl}
                    className="w-9 h-9 rounded-xl object-cover border-2 border-[#0D9488]"
                    alt={getDisplayName()}
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white font-bold text-sm border-2 border-[#0D9488]">
                    {getInitials()}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900">
                  <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                </span>
              </div>

              <div className="hidden md:block text-left">
                <h3 className="text-sm font-bold text-[#374151] dark:text-white truncate max-w-[100px]">
                  {getDisplayName()}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Service Provider
                </p>
              </div>

              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* PROFILE DROPDOWN */}
            {profileOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    {avatarUrl && !profileImageError ? (
                      <img
                        src={avatarUrl}
                        className="w-10 h-10 rounded-xl object-cover border-2 border-[#0D9488]"
                        alt={getDisplayName()}
                        onError={() => setProfileImageError(true)}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white font-bold text-lg">
                        {getInitials()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-[#374151] dark:text-white truncate">
                        {getDisplayName()}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      navigate("/provider/dashboard");
                      setProfileOpen(false);
                    }}
                    className="w-full h-12 rounded-2xl flex items-center gap-3 hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 px-4 text-[#374151] dark:text-white transition-all duration-200"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#0D9488]" />
                    Dashboard
                  </button>

                  <button
                    onClick={() => {
                      navigate("/provider/listings");
                      setProfileOpen(false);
                    }}
                    className="w-full h-12 rounded-2xl flex items-center gap-3 hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 px-4 text-[#374151] dark:text-white transition-all duration-200"
                  >
                    <ClipboardList className="w-4 h-4 text-[#0D9488]" />
                    My Listings
                  </button>

                  <button
                    onClick={() => {
                      navigate("/provider/add-listing");
                      setProfileOpen(false);
                    }}
                    className="w-full h-12 rounded-2xl flex items-center gap-3 hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 px-4 text-[#374151] dark:text-white transition-all duration-200"
                  >
                    <PlusCircle className="w-4 h-4 text-[#F59E0B]" />
                    Add Listing
                  </button>

                  <button
                    onClick={() => {
                      navigate("/provider/bookings");
                      setProfileOpen(false);
                    }}
                    className="w-full h-12 rounded-2xl flex items-center gap-3 hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 px-4 text-[#374151] dark:text-white transition-all duration-200"
                  >
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Bookings
                  </button>

                  <button
                    onClick={() => {
                      navigate("/provider/earnings");
                      setProfileOpen(false);
                    }}
                    className="w-full h-12 rounded-2xl flex items-center gap-3 hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 px-4 text-[#374151] dark:text-white transition-all duration-200"
                  >
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Earnings
                  </button>

                  <button
                    onClick={() => {
                      navigate("/provider/profile");
                      setProfileOpen(false);
                    }}
                    className="w-full h-12 rounded-2xl flex items-center gap-3 hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 px-4 text-[#374151] dark:text-white transition-all duration-200"
                  >
                    <User className="w-4 h-4 text-[#0D9488]" />
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      navigate("/provider/settings");
                      setProfileOpen(false);
                    }}
                    className="w-full h-12 rounded-2xl flex items-center gap-3 hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 px-4 text-[#374151] dark:text-white transition-all duration-200"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </button>

                  <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full h-12 rounded-2xl flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ProviderNavbar;