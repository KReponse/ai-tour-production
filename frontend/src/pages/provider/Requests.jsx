// src/pages/provider/Requests.jsx

import React, { useEffect, useState } from 'react';
import {
  Loader2,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Bed,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Filter,
  Search,
  ChevronDown,
} from 'lucide-react';
// ✅ FIX: Use getMyRequests instead of getRequests
import { getMyRequests, updateRequestStatus } from '../../services/requestService';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // ✅ FIXED: Use getMyRequests instead of getRequests
      const data = await getMyRequests(token);
      setRequests(data.requests || []);
    } catch (error) {
      console.error('❌ Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    // Search
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.specialRequests?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredRequests(filtered);
  };

  const handleStatus = async (id, status) => {
    try {
      setActionLoading(id);
      const token = localStorage.getItem('token');
      await updateRequestStatus(id, status, token);
      await fetchRequests();
    } catch (error) {
      console.error('❌ Error updating request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: {
        bg: 'bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20',
        text: 'text-[#F59E0B] dark:text-[#F59E0B]',
        icon: Clock,
        label: 'Pending',
      },
      accepted: {
        bg: 'bg-[#0D9488]/10 dark:bg-[#0D9488]/20',
        text: 'text-[#0D9488] dark:text-[#0D9488]',
        icon: CheckCircle,
        label: 'Accepted',
      },
      rejected: {
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-600 dark:text-red-400',
        icon: XCircle,
        label: 'Rejected',
      },
    };
    return styles[status] || styles.pending;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading requests...</p>
      </div>
    );
  }

  const statusCounts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    accepted: requests.filter((r) => r.status === 'accepted').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#374151] dark:text-white">
                Trip Requests
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Custom requests from travelers
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{requests.length} total requests</span>
        </div>
      </div>

      {/* SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by destination, traveler email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          <option value="all">All ({statusCounts.all})</option>
          <option value="pending">Pending ({statusCounts.pending})</option>
          <option value="accepted">Accepted ({statusCounts.accepted})</option>
          <option value="rejected">Rejected ({statusCounts.rejected})</option>
        </select>
      </div>

      {/* REQUESTS LIST */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
            No Requests Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Trip requests will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredRequests.map((request) => {
            const statusStyle = getStatusBadge(request.status);
            const StatusIcon = statusStyle.icon;

            return (
              <div
                key={request._id}
                className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* TOP */}
                <div className="flex justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-[#0D9488]" />
                      <h2 className="text-xl font-bold text-[#374151] dark:text-white">
                        {request.destination || 'Unknown Destination'}
                      </h2>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      From: {request.user?.email || 'Unknown traveler'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusStyle.label}
                  </div>
                </div>

                {/* DETAILS */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Travelers</p>
                    <p className="font-semibold text-[#374151] dark:text-white flex items-center gap-1">
                      <Users className="w-4 h-4 text-[#0D9488]" />
                      {request.travelers || 1}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                    <p className="font-semibold text-[#374151] dark:text-white flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-[#F59E0B]" />
                      {request.budget || 'N/A'}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Accommodation</p>
                    <p className="font-semibold text-[#374151] dark:text-white flex items-center gap-1">
                      <Bed className="w-4 h-4 text-[#0D9488]" />
                      {request.accommodation || 'Standard'}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                    <p className="font-semibold text-[#374151] dark:text-white flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-[#F59E0B]" />
                      {request.duration || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* SPECIAL REQUESTS */}
                {request.specialRequests && (
                  <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                      "{request.specialRequests}"
                    </p>
                  </div>
                )}

                {/* ACTIONS */}
                {request.status === 'pending' && (
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => handleStatus(request._id, 'accepted')}
                      disabled={actionLoading === request._id}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#0f766e] text-white font-semibold shadow-md shadow-[#0D9488]/25 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
                    >
                      {actionLoading === request._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Accept
                    </button>
                    <button
                      onClick={() => handleStatus(request._id, 'rejected')}
                      disabled={actionLoading === request._id}
                      className="px-6 py-2.5 rounded-xl border-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 font-semibold disabled:opacity-50 flex items-center gap-2"
                    >
                      {actionLoading === request._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Requests;