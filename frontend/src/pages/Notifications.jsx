// frontend/src/pages/Notifications.jsx

import { useEffect, useState } from "react";
import axios from "axios";
import { 
  Bell, 
  Calendar, 
  Star, 
  Gift, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Mail,
  Users,
  TrendingUp,
  AlertCircle,
  Check,
  CreditCard,
  Compass,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import Card, { CardContent } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ✅ Socket connection with better handling
let socket = null;
let socketInitialized = false;

const initSocket = () => {
  if (typeof window !== 'undefined' && !socketInitialized) {
    import('socket.io-client').then((module) => {
      const io = module.default;
      socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
      });
      socketInitialized = true;
      
      socket.on('connect', () => {
        console.log('🔌 Socket connected');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user?._id) {
          socket.emit('join', user._id);
        }
      });

      socket.on('connect_error', (error) => {
        console.warn('⚠️ Socket connection error:', error);
      });
    });
  }
  return socket;
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read

  const token = localStorage.getItem("token");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('❌ Fetch notifications error:', err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // ✅ Initialize socket for real-time notifications
    const socketInstance = initSocket();
    
    if (socketInstance) {
      socketInstance.on("notification", (data) => {
        console.log('🔔 New notification:', data);
        setNotifications((prev) => [data, ...prev]);
        toast.success(data.title || 'New notification');
      });
    }

    return () => {
      if (socket) {
        socket.off("notification");
      }
    };
  }, []);

  // ✅ FIXED: Use PUT instead of PATCH
  const markRead = async (id) => {
    try {
      setMarkingRead(id);
      await axios.put(
        `${API}/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // ✅ FIXED: Use 'read' instead of 'isRead'
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, read: true } : n
        )
      );
      toast.success('Marked as read');
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error(error.response?.data?.message || 'Failed to mark as read');
    } finally {
      setMarkingRead(null);
    }
  };

  // ✅ FIXED: Use PUT instead of PATCH
  const markAllRead = async () => {
    try {
      await axios.put(
        `${API}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // ✅ FIXED: Use 'read' instead of 'isRead'
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error(error.response?.data?.message || 'Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      setDeleting(id);
      await axios.delete(
        `${API}/notifications/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error(error.response?.data?.message || 'Failed to delete notification');
    } finally {
      setDeleting(null);
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    const icons = {
      booking: Calendar,
      booking_created: Calendar,
      booking_confirmed: CheckCircle,
      booking_rejected: XCircle,
      booking_cancelled: XCircle,
      payment: CreditCard,
      payment_success: CreditCard,
      review: Star,
      tour: Compass,
      provider: Users,
      promotion: Gift,
      system: Bell,
      alert: AlertCircle,
      listing_created: Compass,
      listing_approved: CheckCircle,
      listing_rejected: XCircle,
      listing_suspended: AlertCircle,
      new_message: Mail,
    };
    return icons[type] || Bell;
  };

  const getIconColor = (type) => {
    const colors = {
      booking: 'text-[#0D9488]',
      booking_created: 'text-[#0D9488]',
      booking_confirmed: 'text-[#0D9488]',
      booking_rejected: 'text-red-500',
      booking_cancelled: 'text-red-500',
      payment: 'text-[#0D9488]',
      payment_success: 'text-[#0D9488]',
      review: 'text-[#F59E0B]',
      tour: 'text-[#0D9488]',
      provider: 'text-[#0D9488]',
      promotion: 'text-[#F59E0B]',
      system: 'text-gray-500',
      alert: 'text-red-500',
      listing_created: 'text-[#0D9488]',
      listing_approved: 'text-[#0D9488]',
      listing_rejected: 'text-red-500',
      listing_suspended: 'text-[#F59E0B]',
      new_message: 'text-[#0D9488]',
    };
    return colors[type] || 'text-gray-500';
  };

  const getFilteredNotifications = () => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    if (filter === 'read') {
      return notifications.filter(n => n.read);
    }
    return notifications;
  };

  const filteredNotifications = getFilteredNotifications();
  // ✅ FIXED: Use 'read' instead of 'isRead'
  const unreadCount = notifications.filter(n => !n.read).length;

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

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#374151] dark:text-white">
                Notifications
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Real-time updates from system
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-bold">
              {unreadCount} unread
            </span>
          )}
          {notifications.some(n => !n.read) && (
            <button
              onClick={markAllRead}
              className="text-sm text-[#0D9488] hover:text-[#0D9488]/80 font-medium transition flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-[#0D9488] text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            filter === 'unread'
              ? 'bg-[#0D9488] text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
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
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            {filter === 'all' ? (
              <Bell className="w-10 h-10 text-[#0D9488]" />
            ) : filter === 'unread' ? (
              <Bell className="w-10 h-10 text-[#F59E0B]" />
            ) : (
              <CheckCircle className="w-10 h-10 text-[#0D9488]" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            {filter === 'all' && 'No Notifications'}
            {filter === 'unread' && 'No Unread Notifications'}
            {filter === 'read' && 'No Read Notifications'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all' && "You're all caught up! Check back later for updates."}
            {filter === 'unread' && 'You have no unread notifications.'}
            {filter === 'read' && 'You have no read notifications.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            const Icon = getNotificationIcon(n.type);
            const iconColor = getIconColor(n.type);
            // ✅ FIXED: Use 'read' instead of 'isRead'
            const isUnread = !n.read;

            return (
              <Card
                key={n._id}
                className={`transition-all duration-300 hover:shadow-md ${
                  isUnread ? 'border-l-[3px] border-l-[#0D9488]' : 'opacity-75'
                }`}
              >
                <CardContent className="p-4 flex gap-4 items-start">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isUnread 
                      ? 'bg-[#0D9488]/10 dark:bg-[#0D9488]/20' 
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Icon className={`w-5 h-5 ${isUnread ? iconColor : 'text-gray-400 dark:text-gray-500'}`} />
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    {isUnread && (
                      <button
                        onClick={() => markRead(n._id)}
                        disabled={markingRead === n._id}
                        className="p-1.5 rounded-lg hover:bg-[#0D9488]/10 transition text-[#0D9488] disabled:opacity-50"
                        title="Mark as read"
                      >
                        {markingRead === n._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(n._id)}
                      disabled={deleting === n._id}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-gray-400 hover:text-red-500 disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting === n._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;