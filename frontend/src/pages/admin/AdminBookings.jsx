// frontend/src/pages/admin/AdminBookings.jsx
// ✅ COMPLETE FIXED - Added booking management actions
// ✅ Added approve, cancel, reject, complete actions
// ✅ Added optimistic updates
// ✅ Added loading states for individual actions

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, 
  Eye, 
  Loader2, 
  Search, 
  Filter, 
  XCircle, 
  CheckCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  User,
  Calendar,
  DollarSign,
  MoreVertical,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import API from '../../services/api';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const AdminBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  
  // ✅ Track action loading states per booking
  const [actionLoading, setActionLoading] = useState({});
  const submittingRef = useRef(new Set());
  
  // ✅ Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // ✅ Fetch bookings with pagination
  const fetchBookings = useCallback(async (page = 1, limit = 20) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await API.get('/bookings/admin/all', {
        params: {
          page,
          limit,
          status: filter !== 'all' ? filter : undefined,
          search: search || undefined,
        }
      });
      
      const bookingsData = response.data.bookings || response.data.data || [];
      setBookings(bookingsData);
      
      if (response.data.pagination) {
        setPagination({
          page: response.data.pagination.page || page,
          limit: response.data.pagination.limit || limit,
          total: response.data.pagination.total || 0,
          totalPages: response.data.pagination.totalPages || 0,
        });
      }
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      setError(error.response?.data?.message || 'Failed to load bookings');
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  // ✅ Initial fetch
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ✅ Handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchBookings(newPage, pagination.limit);
  };

  // ✅ Handle limit change
  const handleLimitChange = (newLimit) => {
    fetchBookings(1, newLimit);
  };

  // ✅ Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        fetchBookings(1, pagination.limit);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [search]);

  // ✅ Handle filter change
  useEffect(() => {
    fetchBookings(1, pagination.limit);
  }, [filter]);

  // ✅ Get status badge
  const getStatusBadge = (status) => {
    const styles = {
      pending_payment: {
        bg: 'bg-[#F59E0B]/10',
        text: 'text-[#F59E0B]',
        icon: Clock,
        label: 'Pending Payment'
      },
      pending: {
        bg: 'bg-[#F59E0B]/10',
        text: 'text-[#F59E0B]',
        icon: Clock,
        label: 'Pending'
      },
      paid: {
        bg: 'bg-[#0D9488]/10',
        text: 'text-[#0D9488]',
        icon: CheckCircle,
        label: 'Paid'
      },
      confirmed: {
        bg: 'bg-[#0D9488]/10',
        text: 'text-[#0D9488]',
        icon: CheckCircle,
        label: 'Confirmed'
      },
      in_progress: {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        icon: RefreshCw,
        label: 'In Progress'
      },
      completed: {
        bg: 'bg-green-100',
        text: 'text-green-600',
        icon: CheckCircle,
        label: 'Completed'
      },
      cancelled: {
        bg: 'bg-red-100',
        text: 'text-red-600',
        icon: XCircle,
        label: 'Cancelled'
      },
      rejected: {
        bg: 'bg-red-100',
        text: 'text-red-600',
        icon: XCircle,
        label: 'Rejected'
      }
    };
    return styles[status] || styles.pending;
  };

  // ============================================================
  // ✅ BOOKING ACTIONS - FIXED
  // ============================================================

  const handleAction = useCallback(async (bookingId, action, actionLabel) => {
    // ✅ Prevent duplicate submissions
    const key = `${bookingId}-${action}`;
    if (submittingRef.current.has(key)) {
      console.log(`⏳ ${action} already in progress for ${bookingId}`);
      return;
    }

    // ✅ Confirm before action
    if (!window.confirm(`Are you sure you want to ${actionLabel} this booking?`)) {
      return;
    }

    try {
      submittingRef.current.add(key);
      setActionLoading(prev => ({ ...prev, [bookingId]: action }));

      // ✅ Make API call
      const response = await API.put(`/bookings/${bookingId}/${action}`);

      if (response.data.success) {
        // ✅ Update local state immediately (optimistic update)
        setBookings(prev => 
          prev.map(b => 
            b._id === bookingId 
              ? { 
                  ...b, 
                  status: action === 'confirm' ? 'confirmed' 
                        : action === 'cancel' ? 'cancelled' 
                        : action === 'reject' ? 'rejected' 
                        : action === 'complete' ? 'completed' 
                        : b.status,
                  updatedAt: new Date().toISOString()
                } 
              : b
          )
        );

        toast.success(`Booking ${actionLabel}ed successfully! 🎉`);

        // ✅ Refresh to get updated data
        setTimeout(() => {
          fetchBookings(pagination.page, pagination.limit);
        }, 1000);
      } else {
        toast.error(response.data.message || `Failed to ${actionLabel} booking`);
      }
    } catch (error) {
      console.error(`❌ Error ${action} booking:`, error);
      toast.error(error.response?.data?.message || `Failed to ${actionLabel} booking`);
    } finally {
      submittingRef.current.delete(key);
      setActionLoading(prev => ({ ...prev, [bookingId]: null }));
    }
  }, [fetchBookings, pagination.page, pagination.limit]);

  // ✅ Get available actions based on booking status
  const getAvailableActions = (status) => {
    const actions = [];
    
    switch(status) {
      case 'pending':
      case 'pending_payment':
        actions.push(
          { action: 'confirm', label: 'Confirm', icon: Check, color: 'text-[#0D9488] hover:bg-[#0D9488]/10' }
        );
        actions.push(
          { action: 'reject', label: 'Reject', icon: X, color: 'text-red-500 hover:bg-red-500/10' }
        );
        break;
      case 'paid':
        actions.push(
          { action: 'confirm', label: 'Confirm', icon: Check, color: 'text-[#0D9488] hover:bg-[#0D9488]/10' }
        );
        actions.push(
          { action: 'cancel', label: 'Cancel', icon: X, color: 'text-red-500 hover:bg-red-500/10' }
        );
        break;
      case 'confirmed':
        actions.push(
          { action: 'complete', label: 'Complete', icon: Check, color: 'text-green-500 hover:bg-green-500/10' }
        );
        actions.push(
          { action: 'cancel', label: 'Cancel', icon: X, color: 'text-red-500 hover:bg-red-500/10' }
        );
        break;
      case 'in_progress':
        actions.push(
          { action: 'complete', label: 'Complete', icon: Check, color: 'text-green-500 hover:bg-green-500/10' }
        );
        break;
      default:
        break;
    }
    
    return actions;
  };

  // ✅ Loading state
  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-[#374151] dark:text-white mb-2">
          Failed to Load Bookings
        </h3>
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={() => fetchBookings(1, pagination.limit)}
          className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#374151] dark:text-white">All Bookings</h1>
            <p className="text-sm text-gray-500">
              {pagination.total} bookings found
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Showing {bookings.length} of {pagination.total}</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by booking code, traveler name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="paid">Paid</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <select
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            value={pagination.limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {bookings.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <CalendarDays className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="font-medium">No bookings found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traveler</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {bookings.map((booking) => {
                  const statusStyle = getStatusBadge(booking.status);
                  const StatusIcon = statusStyle.icon;
                  const availableActions = getAvailableActions(booking.status);
                  const isLoading = actionLoading[booking._id];
                  
                  return (
                    <tr key={booking._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-[#0D9488] font-mono">
                          #{booking.bookingCode || booking._id?.slice(-8).toUpperCase() || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-[#374151] dark:text-white">
                            {booking.user?.name || booking.travelerName || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-[150px]">
                            {booking.user?.email || ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[150px] block">
                          {booking.listing?.title || booking.tour?.title || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-[#0D9488]">
                          ${booking.totalPrice || booking.amount || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {/* ✅ Action Buttons */}
                          {availableActions.map((action) => (
                            <button
                              key={action.action}
                              onClick={() => handleAction(booking._id, action.action, action.label)}
                              disabled={!!isLoading}
                              className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition ${action.color} disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={`${action.label} booking`}
                            >
                              {isLoading === action.action ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <action.icon className="w-4 h-4" />
                              )}
                            </button>
                          ))}
                          
                          {/* View Details */}
                          <button
                            onClick={() => navigate(`/booking-details/${booking._id}`)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
                            title="View Booking Details"
                          >
                            <Eye className="w-4 h-4 text-[#0D9488] group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium px-4">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-sm text-gray-500 flex-wrap gap-2">
        <span>Showing {bookings.length} of {pagination.total} bookings</span>
        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="text-[#0D9488] hover:underline transition"
          >
            Clear filter
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminBookings;