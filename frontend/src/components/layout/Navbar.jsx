// src/components/layout/Navbar.jsx
// ✅ COMPLETE FIXED - Removed Search and Language dropdown
// ✅ FIXED: Added token check before fetching notifications
// ✅ FIXED: Graceful 401 error handling

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
  Search,
  User,
  LogOut,
  Settings,
  Globe,
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
  const [loading, setLoading] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  const notificationRef = useRef();
  const userMenuRef = useRef();

  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();
  const { user, logout, refreshUser } = useAuth();

  // ✅ Use refs to track if initial fetches are done
  const hasFetchedRef = useRef(false);
  const hasRefreshedRef = useRef(false);
  
  // ✅ FIXED: Use useMemo to stabilize userId
  const userId = useMemo(() => user?._id, [user?._id]);

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
  }, [user]);

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
  }, [user, refreshUser]);

  /* ================= CLOSE DROPDOWNS ================= */
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

  /* ================= CLOSE MOBILE MENU ================= */
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

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
      navigate('/my-bookings');
    } else if (notification.type === 'payment' || notification.type === 'payment_success') {
      navigate('/my-bookings');
    } else if (notification.type === 'review' || notification.type === 'new_review') {
      navigate('/my-reviews');
    }

    setNotificationOpen(false);
  }, [navigate, markAsRead]);

  /* ================= NAV LINKS ================= */
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Explore', path: '/explore' },
    { name: 'AI Planner', path: '/ai-planner' },
    { name: 'Trips', path: '/trips' },
    { name: 'Reviews', path: '/reviews' },
  ];

  /* ================= LOGOUT ================= */
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  /* ================= GET USER PROFILE IMAGE ================= */
  const getUserProfileImage = useCallback(() => {
    if (!user) return null;
    
    if (user.profileImage) {
      return user.profileImage;
    }
    
    if (user.avatar) {
      return user.avatar;
    }
    
    return null;
  }, [user]);

  const profileImage = getUserProfileImage();

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
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ================= LOGO ================= */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="AI Tour"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="
                text-xl
                font-black
                bg-gradient-to-r
                from-[#0D9488]
                to-[#F59E0B]
                bg-clip-text
                text-transparent
              ">
                AI Tour
              </h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1">
                Rwanda Smart Travel
              </p>
            </div>
          </Link>

          {/* ================= DESKTOP NAV ================= */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link, index) => (
              <Link
                key={index}
                to={link.path}
                className={`
                  font-medium
                  transition
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

          {/* ================= RIGHT SIDE ================= */}
          <div className="flex items-center gap-2">

            {/* AI BUTTON - Updated with AI Tour colors */}
            <Link
              to="/ai-chat"
              className="
                hidden
                md:flex
                items-center
                gap-2
                px-4
                h-10
                rounded-full
                bg-gradient-to-r
                from-[#0D9488]
                to-[#F59E0B]
                text-white
                font-semibold
                shadow-lg
                hover:scale-105
                transition
              "
            >
              <Bot size={18} />
              <span>AI Assistant</span>
            </Link>

            {/* ================= NOTIFICATIONS ================= */}
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
                "
              >
                <Bell size={20} />
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

              <AnimatePresence>
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
                      max-w-[90vw]
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
                      p-4
                      border-b
                      dark:border-gray-800
                    ">
                      <h3 className="font-bold dark:text-white flex items-center gap-2">
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
                          "
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
                                gap-3
                                px-4
                                py-3
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
                                w-10
                                h-10
                                rounded-full
                                flex
                                items-center
                                justify-center
                                bg-gray-100
                                dark:bg-gray-800
                                flex-shrink-0
                              `}>
                                <Icon size={18} className={colorClass} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className={`
                                  text-sm
                                  font-medium
                                  dark:text-white
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
                            text-sm
                            text-[#0D9488]
                            hover:text-[#0D9488]/80
                            font-medium
                            transition
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

            {/* ================= THEME ================= */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* ================= USER ================= */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="
                    flex
                    items-center
                    gap-2
                    px-3
                    h-10
                    rounded-full
                    bg-gray-100
                    dark:bg-gray-800
                    hover:bg-gray-200
                    dark:hover:bg-gray-700
                    transition
                  "
                >
                  {/* Profile Image */}
                  <div className="
                    w-8
                    h-8
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
                  <span className="hidden md:block text-sm font-semibold dark:text-white">
                    {user.fullName?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                <AnimatePresence>
                  {userMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="
                        absolute
                        right-0
                        mt-3
                        w-64
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
                      <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
                        <div className="
                          w-12
                          h-12
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
                            <span className="text-white font-bold text-lg">
                              {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold dark:text-white truncate">
                            {user.fullName}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {user.email}
                          </p>
                          {user.role && (
                            <span className="
                              text-xs
                              bg-[#0D9488]/10
                              text-[#0D9488]
                              px-2
                              py-0.5
                              rounded-full
                              capitalize
                            ">
                              {user.role}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition"
                          onClick={() => setUserMenu(false)}
                        >
                          <User size={18} />
                          Profile
                        </Link>

                        <Link
                          to="/my-bookings"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition"
                          onClick={() => setUserMenu(false)}
                        >
                          <CalendarDays size={18} />
                          My Bookings
                        </Link>

                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition"
                          onClick={() => setUserMenu(false)}
                        >
                          <Settings size={18} />
                          Settings
                        </Link>

                        {/* Role-specific menu items */}
                        {user.role === 'provider' && (
                          <Link
                            to="/provider/dashboard"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition"
                            onClick={() => setUserMenu(false)}
                          >
                            <Bot size={18} className="text-[#F59E0B]" />
                            Provider Dashboard
                          </Link>
                        )}

                        {user.role === 'admin' && (
                          <Link
                            to="/admin/dashboard"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition"
                            onClick={() => setUserMenu(false)}
                          >
                            <Bot size={18} className="text-[#0D9488]" />
                            Admin Dashboard
                          </Link>
                        )}

                        <div className="border-t dark:border-gray-800 my-2" />

                        <button
                          onClick={handleLogout}
                          className="
                            w-full
                            flex
                            items-center
                            gap-3
                            px-4
                            py-3
                            rounded-xl
                            hover:bg-red-100
                            dark:hover:bg-red-900/30
                            text-red-600
                            transition
                          "
                        >
                          <LogOut size={18} />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/login"
                  className="
                    px-5
                    h-10
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
                  "
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="
                    px-5
                    h-10
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
                  "
                >
                  Register
                </Link>
              </div>
            )}

            {/* ================= MOBILE MENU BUTTON ================= */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

          </div>
        </div>
      </div>

      {/* ================= MOBILE MENU ================= */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="
              lg:hidden
              bg-white
              dark:bg-gray-950
              border-t
              border-gray-200
              dark:border-gray-800
              shadow-xl
              max-h-[85vh]
              overflow-y-auto
            "
          >
            <div className="flex flex-col p-5 gap-4">
              {/* Mobile User Profile */}
              {user && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900">
                  <div className="
                    w-10
                    h-10
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
                      <span className="text-white font-bold">
                        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold dark:text-white">{user.fullName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              )}

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
                    ${
                      location.pathname === link.path
                        ? 'text-[#0D9488]'
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
                  px-4 py-3
                  rounded-xl
                  hover:bg-gray-100
                  dark:hover:bg-gray-800
                  text-gray-700
                  dark:text-gray-200
                  transition
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
                "
              >
                <Bot size={18} />
                AI Assistant
              </Link>

              {!user ? (
                <div className="flex flex-col gap-3 pt-4">
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