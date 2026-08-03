// src/pages/admin/Tours.jsx

import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  Search,
  Filter,
  AlertCircle,
  CheckCircle as SuccessIcon,
  Eye,
  MapPin,
  DollarSign,
  User,
  Clock,
} from 'lucide-react';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/admin';

const Tours = () => {
  const [tours, setTours] = useState([]);
  const [filteredTours, setFilteredTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);

  const token = localStorage.getItem('token');

  // ============= FETCH TOURS =============
  const fetchTours = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/tours`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('✅ Admin tours:', data);
      setTours(data.tours || []);
      setFilteredTours(data.tours || []);
    } catch (error) {
      console.error('Error fetching tours:', error);
      showNotification('Failed to load tours', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  // ============= SEARCH & FILTER =============
  useEffect(() => {
    let filtered = [...tours];

    if (searchTerm.trim()) {
      filtered = filtered.filter(tour =>
        tour.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tour.provider?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tour.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tour => tour.status === statusFilter);
    }

    setFilteredTours(filtered);
  }, [searchTerm, statusFilter, tours]);

  // ============= NOTIFICATION =============
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ============= APPROVE TOUR =============
  const approveTour = async (id) => {
    if (!window.confirm('Are you sure you want to approve this tour?')) return;

    try {
      setActionLoading(id);
      await axios.put(
        `${API_URL}/tours/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('Tour approved successfully! ✅', 'success');
      await fetchTours();
    } catch (error) {
      console.error('Error approving tour:', error);
      showNotification(error.response?.data?.message || 'Failed to approve tour', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ============= REJECT TOUR =============
  const rejectTour = async (id) => {
    if (!window.confirm('Are you sure you want to reject this tour?')) return;

    try {
      setActionLoading(id);
      await axios.put(
        `${API_URL}/tours/${id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('Tour rejected ❌', 'info');
      await fetchTours();
    } catch (error) {
      console.error('Error rejecting tour:', error);
      showNotification(error.response?.data?.message || 'Failed to reject tour', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ============= DELETE TOUR =============
  const deleteTour = async (id) => {
    if (!window.confirm('⚠️ Delete this tour permanently? This action cannot be undone!')) return;

    try {
      setActionLoading(id);
      await axios.delete(`${API_URL}/tours/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotification('Tour deleted successfully 🗑️', 'success');
      await fetchTours();
    } catch (error) {
      console.error('Error deleting tour:', error);
      showNotification(error.response?.data?.message || 'Failed to delete tour', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ============= GET STATUS BADGE =============
  const getStatusBadge = (status) => {
    const styles = {
      approved: 'bg-[#0D9488]/10 text-[#0D9488] dark:bg-[#0D9488]/20 dark:text-[#0D9488]',
      pending: 'bg-[#F59E0B]/10 text-[#F59E0B] dark:bg-[#F59E0B]/20 dark:text-[#F59E0B]',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[status] || styles.pending;
  };

  // ============= LOADING =============
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px] gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">Loading tours...</p>
      </div>
    );
  }

  // ============= RENDER =============
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6">

      {/* NOTIFICATION */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 ${
          notification.type === 'success'
            ? 'bg-[#0D9488] text-white'
            : notification.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-[#F59E0B] text-white'
        }`}>
          {notification.type === 'success' && <SuccessIcon className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#374151] dark:text-white">
                Tours Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage all tourism provider tours • {filteredTours.length} tours
              </p>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tours by title, provider or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending ({tours.filter(t => t.status === 'pending').length})</option>
            <option value="approved">Approved ({tours.filter(t => t.status === 'approved').length})</option>
            <option value="rejected">Rejected ({tours.filter(t => t.status === 'rejected').length})</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">

          {filteredTours.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">
                No tours found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No tours have been created yet'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Tour
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">
                    Provider
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                    Location
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Price
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTours.map((tour) => (
                  <tr
                    key={tour._id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="p-4 font-medium text-gray-900 dark:text-white">
                      <div>
                        <div className="flex items-center gap-2">
                          {tour.coverImage && (
                            <img
                              src={`${API_URL}/uploads/${tour.coverImage}`}
                              alt={tour.title}
                              className="w-10 h-10 rounded-lg object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          <span>{tour.title}</span>
                        </div>
                        <div className="md:hidden text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {tour.provider?.name || 'Unknown'} • ${tour.price}
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#0D9488]" />
                        {tour.provider?.name || 'Unknown'}
                      </div>
                    </td>

                    <td className="p-4 text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-[#0D9488]" />
                        {tour.location || 'N/A'}
                      </div>
                    </td>

                    <td className="p-4 font-semibold text-[#0D9488]">
                      ${tour.price}
                    </td>

                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(tour.status)}`}>
                        {tour.status}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {tour.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveTour(tour._id)}
                              disabled={actionLoading === tour._id}
                              className="flex items-center gap-1.5 bg-[#0D9488] hover:bg-[#0D9488]/80 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {actionLoading === tour._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Approve
                            </button>

                            <button
                              onClick={() => rejectTour(tour._id)}
                              disabled={actionLoading === tour._id}
                              className="flex items-center gap-1.5 bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {actionLoading === tour._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => deleteTour(tour._id)}
                          disabled={actionLoading === tour._id}
                          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoading === tour._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TABLE FOOTER */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>Showing {filteredTours.length} of {tours.length} tours</span>
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tours;