// src/components/layout/Navbar.jsx
// ✅ COMPLETE FIXED - Fixed framer-motion ref warning
// ✅ Fixed: AnimatePresence ref forwarding with mode="wait"
// ✅ ADDED: Messages icon with unread badge
// ✅ KEPT: Heart icon in the design
// ✅ RESPONSIVE: Mobile-optimized with proper touch targets

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

import {
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  Settings,
  Bot,
  ChevronDown,
  CalendarDays,
  CheckCheck,
  Clock,
  MessageCircle,
  Star,
  Calendar,
  CreditCard,
  AlertCircle,
  Heart,
} from 'lucide-react';

import {
  motion,
  AnimatePresence,
} from 'framer-motion';

import {
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import {
  useTheme,
} from '../../contexts/ThemeContext';

import {
  useAuth,
} from '../../contexts/AuthContext';

import notificationService from '../../services/notification.service';
import { getTotalUnreadCount } from '../../services/chatService';
import logo from '../../assets/images/logo.png';

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
    payment: CreditCard,
    review: Star,
    message: MessageCircle,
    system: Bell,
    reminder: Clock,
    alert: AlertCircle,
    booking_created: Calendar,
    booking_confirmed: Calendar,
    booking_cancelled: Calendar,
    booking_rejected: Calendar,
    payment_success: CreditCard,
    payment_failed: CreditCard,
    new_review: Star,
    new_message: MessageCircle,
    system_alert: AlertCircle,
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
  };
  return colors[type] || 'text-gray-500';
};

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  const notificationRef = useRef();
  const userMenuRef = useRef();
  const mobileMenuRef = useRef();

  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();
  const { user, logout, refreshUser } = useAuth();

  const hasFetchedRef = useRef(false);
  const hasRefreshedRef = useRef(false);
  
  const userId = useMemo(() => user?._id, [user?._id]);

  // Close mobile menu on route change
  useEffect(() => {
    if (menuOpen) {
      setMenuOpen(false);
      document.body.style.overflow = 'auto';
    }
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [menuOpen]);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoading(true);
      const response = await notificationService.getNotifications();
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      if (error.response?.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch Chat Unread Count
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
  }, [user]);

  useEffect(() => {
    if (user && !hasFetchedRef.current) {
      fetchNotifications();
      fetchChatUnreadCount();
      hasFetchedRef.current = true;
    }
  }, [user, fetchNotifications, fetchChatUnreadCount]);

  useEffect(() => {
    if (notificationOpen && user) {
      fetchNotifications();
    }
  }, [notificationOpen, user, fetchNotifications]);

  useEffect(() => {
    if (user && !hasRefreshedRef.current) {
      refreshUser();
      hasRefreshedRef.current = true;
    }
  }, [user, refreshUser]);

  // Close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark notification as read
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
      if (error.response?.status === 401) return;
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      if (error.response?.status === 401) return;
      console.error('Error marking all as read:', error);
    }
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }

    if (notification.link) {
      navigate(notification.link);
    } else if (notification.type === 'booking' || notification.type === 'booking_created' || notification.type === 'booking_confirmed') {
      navigate('/my-bookings');
    } else if (notification.type === 'payment' || notification.type === 'payment_success') {
      navigate('/my-bookings');
    } else if (notification.type === 'review' || notification.type === 'new_review') {
      navigate('/my-reviews');
    }

    setNotificationOpen(false);
  }, [navigate, markAsRead]);

  // Nav links
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Explore', path: '/explore' },
    { name: 'AI Planner', path: '/ai-planner' },
    { name: 'Trips', path: '/trips' },
    { name: 'Reviews', path: '/reviews' },
  ];

  // Logout
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Get user profile image
  const getUserProfileImage = useCallback(() => {
    if (!user) return null;
    return user.profileImage || user.avatar || null;
  }, [user]);

  const profileImage = getUserProfileImage();

  // Format time ago
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

  // Get chat link based on user role
  const getChatLink = useCallback(() => {
    if (!user) return '/chat';
    if (user.role === 'provider') return '/provider/chat';
    if (user.role === 'admin') return '/admin/chat';
    return '/chat';
  }, [user]);

  return (
    <nav className="
      fixed
      top-0
      left-0
      w-full
      z-50
      backdrop-blur-xl
      bg-white/80
      dark:bg-gray-950/80
      border-b
      border-gray-200
      dark:border-gray-800
      shadow-sm
    ">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <img
              src={logo}
              alt="AI Tour"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
            />
            <div>
              <h1 className="
                text-base sm:text-xl
                font-black
                bg-gradient-to-r
                from-[#0D9488]
                to-[#F59E0B]
                bg-clip-text
                text-transparent
              ">
                AI Tour
              </h1>
              <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 -mt-0.5 sm:-mt-1 hidden xs:block">
                Rwanda Smart Travel
              </p>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navLinks.map((link, index) => (
              <Link
                key={index}
                to={link.path}
                className={`
                  font-medium
                  transition
                  text-sm
                  ${
                    location.pathname === link.path
                      ? 'text-[#0D9488]'
                      : 'text-gray-700 dark:text-gray-200 hover:text-[#0D9488]'
                  }
                `}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* AI BUTTON */}
            <Link
              to="/ai-chat"
              className="
                hidden
                md:flex
                items-center
                gap-1.5 sm:gap-2
                px-3 sm:px-4
                h-9 sm:h-10
                rounded-full
                bg-gradient-to-r
                from-[#0D9488]
                to-[#F59E0B]
                text-white
                font-semibold
                shadow-lg
                hover:scale-105
                transition
                text-xs sm:text-sm
              "
            >
              <Bot size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden xs:inline">AI Assistant</span>
              <span className="inline xs:hidden">AI</span>
            </Link>

            {/* ✅ MESSAGES ICON - With unread badge */}
            <Link
              to={getChatLink()}
              className="
                relative
                p-2
                rounded-full
                hover:bg-gray-200
                dark:hover:bg-gray-800
                transition
                min-h-[44px]
                min-w-[44px]
                flex
                items-center
                justify-center
              "
              aria-label="Messages"
            >
              <MessageCircle size={20} className="sm:w-[20px] sm:h-[20px] text-gray-700 dark:text-gray-200" />
              {chatUnreadCount > 0 && (
                <span className="
                  absolute
                  -top-0.5
                  -right-0.5
                  min-w-[18px]
                  h-[18px]
                  px-1
                  flex
                  items-center
                  justify-center
                  bg-red-500
                  text-white
                  text-[10px]
                  font-bold
                  rounded-full
                  animate-pulse
                ">
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </span>
              )}
            </Link>

            {/* NOTIFICATIONS */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="
                  relative
                  p-2
                  rounded-full
                  hover:bg-gray-200
                  dark:hover:bg-gray-800
                  transition
                  min-h-[44px]
                  min-w-[44px]
                  flex
                  items-center
                  justify-center
                "
                aria-label="Notifications"
              >
                <Bell size={20} className="sm:w-[20px] sm:h-[20px]" />
                {unreadCount > 0 && (
                  <span className="
                    absolute
                    -top-0.5
                    -right-0.5
                    min-w-[18px]
                    h-[18px]
                    px-1
                    flex
                    items-center
                    justify-center
                    bg-red-500
                    text-white
                    text-[10px]
                    font-bold
                    rounded-full
                    animate-pulse
                  ">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence mode="wait">
                {notificationOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="
                      absolute
                      right-0
                      mt-3
                      w-80
                      max-w-[calc(100vw-2rem)]
                      sm:max-w-[90vw]
                      bg-white
                      dark:bg-gray-900
                      border
                      border-gray-200
                      dark:border-gray-800
                      rounded-2xl
                      shadow-2xl
                      overflow-hidden
                      z-50
                    "
                  >
                    {/* Header */}
                    <div className="
                      flex
                      items-center
                      justify-between
                      p-3 sm:p-4
                      border-b
                      dark:border-gray-800
                    ">
                      <h3 className="font-bold dark:text-white flex items-center gap-2 text-sm sm:text-base">
                        <Bell size={16} className="text-[#0D9488]" />
                        Notifications
                        {unreadCount > 0 && (
                          <span className="
                            text-xs
                            bg-[#0D9488]
                            text-white
                            px-2
                            py-0.5
                            rounded-full
                          ">
                            {unreadCount} new
                          </span>
                        )}
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="
                            text-xs
                            text-[#0D9488]
                            hover:text-[#0D9488]/80
                            font-medium
                            flex
                            items-center
                            gap-1
                            transition
                            min-h-[32px]
                            min-w-[32px]
                          "
                        >
                          <CheckCheck size={14} />
                          <span className="hidden xs:inline">Mark all read</span>
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
                            We'll notify you when something happens
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const Icon = getNotificationIcon(notification.type);
                          const colorClass = getNotificationColor(notification.type);
                          
                          return (
                            <motion.div
                              key={notification._id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={() => handleNotificationClick(notification)}
                              className={`
                                flex
                                items-start
                                gap-2 sm:gap-3
                                px-3 sm:px-4
                                py-2.5 sm:py-3
                                border-b
                                border-gray-100
                                dark:border-gray-800
                                cursor-pointer
                                transition
                                hover:bg-gray-50
                                dark:hover:bg-gray-800/50
                                ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
                              `}
                            >
                              <div className={`
                                w-8 h-8 sm:w-10 sm:h-10
                                rounded-full
                                flex
                                items-center
                                justify-center
                                bg-gray-100
                                dark:bg-gray-800
                                flex-shrink-0
                              `}>
                                <Icon size={16} className={`sm:w-[18px] sm:h-[18px] ${colorClass}`} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className={`
                                  text-xs sm:text-sm
                                  font-medium
                                  dark:text-white
                                  ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}
                                `}>
                                  {notification.title}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  {timeAgo(notification.createdAt)}
                                </p>
                              </div>
                              
                              {!notification.read && (
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0D9488] flex-shrink-0 mt-1.5" />
                              )}
                            </motion.div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t dark:border-gray-800 text-center">
                        <Link
                          to="/notifications"
                          className="
                            text-xs sm:text-sm
                            text-[#0D9488]
                            hover:text-[#0D9488]/80
                            font-medium
                            transition
                            min-h-[44px]
                            inline-flex
                            items-center
                          "
                          onClick={() => setNotificationOpen(false)}
                        >
                          View All Notifications
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* THEME */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="
                p-2
                rounded-full
                hover:bg-gray-200
                dark:hover:bg-gray-800
                transition
                min-h-[44px]
                min-w-[44px]
                flex
                items-center
                justify-center
              "
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* USER */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="
                    flex
                    items-center
                    gap-1.5 sm:gap-2
                    px-2 sm:px-3
                    h-9 sm:h-10
                    rounded-full
                    bg-gray-100
                    dark:bg-gray-800
                    hover:bg-gray-200
                    dark:hover:bg-gray-700
                    transition
                    min-h-[44px]
                  "
                >
                  <div className="
                    w-7 h-7 sm:w-8 sm:h-8
                    rounded-full
                    overflow-hidden
                    flex-shrink-0
                    bg-gradient-to-r
                    from-[#0D9488]
                    to-[#F59E0B]
                    flex
                    items-center
                    justify-center
                  ">
                    {profileImage && !profileImageError ? (
                      <img
                        src={profileImage}
                        alt={user.fullName || 'User'}
                        className="w-full h-full object-cover"
                        onError={() => setProfileImageError(true)}
                      />
                    ) : (
                      <span className="text-white font-bold text-xs sm:text-sm">
                        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="hidden md:block text-xs sm:text-sm font-semibold dark:text-white truncate max-w-[80px]">
                    {user.fullName?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown size={14} className="sm:w-[16px] sm:h-[16px] text-gray-500 hidden md:block" />
                </button>

                <AnimatePresence mode="wait">
                  {userMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="
                        absolute
                        right-0
                        mt-3
                        w-56 sm:w-64
                        bg-white
                        dark:bg-gray-900
                        border
                        border-gray-200
                        dark:border-gray-800
                        rounded-2xl
                        shadow-2xl
                        overflow-hidden
                        z-50
                      "
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b dark:border-gray-800">
                        <div className="
                          w-10 h-10 sm:w-12 sm:h-12
                          rounded-full
                          overflow-hidden
                          flex-shrink-0
                          bg-gradient-to-r
                          from-[#0D9488]
                          to-[#F59E0B]
                          flex
                          items-center
                          justify-center
                        ">
                          {profileImage && !profileImageError ? (
                            <img
                              src={profileImage}
                              alt={user.fullName || 'User'}
                              className="w-full h-full object-cover"
                              onError={() => setProfileImageError(true)}
                            />
                          ) : (
                            <span className="text-white font-bold text-base sm:text-lg">
                              {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold dark:text-white text-sm sm:text-base truncate">
                            {user.fullName}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {user.email}
                          </p>
                          {user.role && (
                            <span className="
                              text-[10px] sm:text-xs
                              bg-[#0D9488]/10
                              text-[#0D9488]
                              px-1.5 sm:px-2
                              py-0.5
                              rounded-full
                              capitalize
                              inline-block
                              mt-0.5
                            ">
                              {user.role}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-1.5 sm:p-2">
                        <Link
                          to="/profile"
                          className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition text-sm sm:text-base min-h-[44px]"
                          onClick={() => setUserMenu(false)}
                        >
                          <User size={16} className="sm:w-[18px] sm:h-[18px]" />
                          Profile
                        </Link>

                        <Link
                          to="/my-bookings"
                          className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition text-sm sm:text-base min-h-[44px]"
                          onClick={() => setUserMenu(false)}
                        >
                          <CalendarDays size={16} className="sm:w-[18px] sm:h-[18px]" />
                          My Bookings
                        </Link>

                        <Link
                          to="/settings"
                          className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition text-sm sm:text-base min-h-[44px]"
                          onClick={() => setUserMenu(false)}
                        >
                          <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
                          Settings
                        </Link>

                        {user.role === 'provider' && (
                          <Link
                            to="/provider/dashboard"
                            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition text-sm sm:text-base min-h-[44px]"
                            onClick={() => setUserMenu(false)}
                          >
                            <Bot size={16} className="sm:w-[18px] sm:h-[18px] text-[#F59E0B]" />
                            Provider Dashboard
                          </Link>
                        )}

                        {user.role === 'admin' && (
                          <Link
                            to="/admin/dashboard"
                            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition text-sm sm:text-base min-h-[44px]"
                            onClick={() => setUserMenu(false)}
                          >
                            <Bot size={16} className="sm:w-[18px] sm:h-[18px] text-[#0D9488]" />
                            Admin Dashboard
                          </Link>
                        )}

                        <div className="border-t dark:border-gray-800 my-1.5 sm:my-2" />

                        <button
                          onClick={handleLogout}
                          className="
                            w-full
                            flex
                            items-center
                            gap-2 sm:gap-3
                            px-3 sm:px-4
                            py-2.5 sm:py-3
                            rounded-xl
                            hover:bg-red-100
                            dark:hover:bg-red-900/30
                            text-red-600
                            transition
                            text-sm sm:text-base
                            min-h-[44px]
                          "
                        >
                          <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className="
                    px-3 sm:px-5
                    h-9 sm:h-10
                    flex
                    items-center
                    rounded-full
                    border
                    border-gray-300
                    dark:border-gray-700
                    dark:text-white
                    hover:bg-gray-100
                    dark:hover:bg-gray-800
                    transition
                    text-xs sm:text-sm
                    min-h-[44px]
                  "
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="
                    px-3 sm:px-5
                    h-9 sm:h-10
                    flex
                    items-center
                    rounded-full
                    bg-gradient-to-r
                    from-[#0D9488]
                    to-[#F59E0B]
                    text-white
                    font-semibold
                    shadow-lg
                    hover:scale-105
                    transition
                    text-xs sm:text-sm
                    min-h-[44px]
                  "
                >
                  Register
                </Link>
              </div>
            )}

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="
                lg:hidden
                p-2
                rounded-full
                hover:bg-gray-200
                dark:hover:bg-gray-800
                transition
                min-h-[44px]
                min-w-[44px]
                flex
                items-center
                justify-center
              "
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence mode="wait">
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="
              lg:hidden
              bg-white
              dark:bg-gray-950
              border-t
              border-gray-200
              dark:border-gray-800
              shadow-xl
              overflow-y-auto
              max-h-[calc(100vh-56px)]
            "
            ref={mobileMenuRef}
          >
            <div className="flex flex-col p-4 sm:p-5 gap-3 sm:gap-4">
              {/* Mobile User Profile */}
              {user && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900">
                  <div className="
                    w-10 h-10
                    rounded-full
                    overflow-hidden
                    flex-shrink-0
                    bg-gradient-to-r
                    from-[#0D9488]
                    to-[#F59E0B]
                    flex
                    items-center
                    justify-center
                  ">
                    {profileImage && !profileImageError ? (
                      <img
                        src={profileImage}
                        alt={user.fullName || 'User'}
                        className="w-full h-full object-cover"
                        onError={() => setProfileImageError(true)}
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold dark:text-white text-sm truncate">{user.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              {navLinks.map((link, index) => (
                <Link
                  key={index}
                  to={link.path}
                  className={`
                    text-gray-700
                    dark:text-gray-200
                    hover:text-[#0D9488]
                    transition
                    font-medium
                    py-2.5
                    px-3
                    rounded-xl
                    hover:bg-gray-100
                    dark:hover:bg-gray-800
                    min-h-[44px]
                    flex
                    items-center
                    ${
                      location.pathname === link.path
                        ? 'text-[#0D9488] bg-[#0D9488]/5'
                        : ''
                    }
                  `}
                >
                  {link.name}
                </Link>
              ))}

              <Link
                to="/my-bookings"
                className="
                  flex items-center
                  gap-3
                  px-3
                  py-2.5
                  rounded-xl
                  hover:bg-gray-100
                  dark:hover:bg-gray-800
                  text-gray-700
                  dark:text-gray-200
                  transition
                  min-h-[44px]
                "
              >
                <CalendarDays size={18} className="text-[#0D9488]" />
                My Bookings
              </Link>

              <Link
                to="/ai-chat"
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  w-full
                  h-12
                  rounded-2xl
                  bg-gradient-to-r
                  from-[#0D9488]
                  to-[#F59E0B]
                  text-white
                  font-semibold
                  shadow-lg
                  hover:scale-[1.02]
                  transition
                  min-h-[44px]
                "
              >
                <Bot size={18} />
                AI Assistant
              </Link>

              {!user ? (
                <div className="flex flex-col gap-3 pt-2">
                  <Link
                    to="/login"
                    className="
                      w-full
                      h-12
                      rounded-2xl
                      border
                      border-gray-300
                      dark:border-gray-700
                      flex
                      items-center
                      justify-center
                      dark:text-white
                      hover:bg-gray-50
                      dark:hover:bg-gray-800
                      transition
                      min-h-[44px]
                    "
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    className="
                      w-full
                      h-12
                      rounded-2xl
                      bg-gradient-to-r
                      from-[#0D9488]
                      to-[#F59E0B]
                      text-white
                      flex
                      items-center
                      justify-center
                      font-semibold
                      shadow-lg
                      hover:scale-[1.02]
                      transition
                      min-h-[44px]
                    "
                  >
                    Create Account
                  </Link>
                </div>
              ) : (
                <>
                  {user.role === 'provider' && (
                    <Link
                      to="/provider/dashboard"
                      className="
                        w-full
                        h-12
                        rounded-2xl
                        bg-gradient-to-r
                        from-[#0D9488]
                        to-[#F59E0B]
                        text-white
                        flex
                        items-center
                        justify-center
                        font-semibold
                        shadow-lg
                        hover:scale-[1.02]
                        transition
                        min-h-[44px]
                      "
                    >
                      Provider Dashboard
                    </Link>
                  )}
                  
                  {user.role === 'admin' && (
                    <Link
                      to="/admin/dashboard"
                      className="
                        w-full
                        h-12
                        rounded-2xl
                        bg-gradient-to-r
                        from-[#0D9488]
                        to-[#F59E0B]
                        text-white
                        flex
                        items-center
                        justify-center
                        font-semibold
                        shadow-lg
                        hover:scale-[1.02]
                        transition
                        min-h-[44px]
                      "
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="
                      w-full
                      h-12
                      rounded-2xl
                      bg-red-500
                      text-white
                      font-semibold
                      hover:bg-red-600
                      transition
                      min-h-[44px]
                    "
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;