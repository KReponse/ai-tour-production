// frontend/src/pages/admin/Settlements.jsx
// ✅ FIXED - Changed API endpoint from /admin/settlements to /settlements

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Search,
  Loader2,
  Sparkles,
  Calendar,
  Eye,
  RefreshCw,
  TrendingUp,
  Building2,
  AlertCircle,
  Download,
  Filter,
  Shield,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Play,
  Pause,
  RotateCw,
  Users,
  Wallet,
} from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import CurrencyBadge from '../../components/ui/CurrencyBadge';
import usePagination from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import BackToTop from '../../components/ui/BackToTop';
import { PAGINATION } from '../../utils/constants';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ===============================
// STATUS BADGE
// ===============================
const SettlementStatusBadge = ({ status }) => {
  const configs = {
    pending: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Pending', icon: Clock },
    processing: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Processing', icon: Loader2 },
    completed: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]', label: 'Completed', icon: CheckCircle },
    failed: { bg: 'bg-red-100', text: 'text-red-600', label: 'Failed', icon: XCircle },
    held: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'On Hold', icon: Pause },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled', icon: Ban },
    retry: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Retry', icon: RotateCw },
  };
  const config = configs[status] || configs.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// ===============================
// MAIN COMPONENT
// ===============================
const AdminSettlements = () => {
  const navigate = useNavigate();
  const { formatAmount, selectedCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const token = localStorage.getItem('token');

  // ✅ usePagination hook for server-side pagination
  const {
    data: settlements,
    loading,
    error,
    meta,
    goToPage,
    setLimit,
    applyFilter,
    clearFilters,
    refresh,
    setSearchTerm: setPaginationSearch,
    searchTerm: paginationSearch,
  } = usePagination({
    // ✅ FIXED: Changed from /admin/settlements to /settlements
    fetchFn: async (params) => {
      const response = await axios.get(`${API_URL}/settlements`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    initialParams: {
      status: 'all',
      limit: PAGINATION.DEFAULT_LIMIT,
      sort: '-createdAt',
    },
    dataKey: 'settlements',
  });

  // ── Analytics ──
  const analytics = useMemo(() => {
    const total = settlements.length;
    const pending = settlements.filter(s => s.status === 'pending').length;
    const processing = settlements.filter(s => s.status === 'processing').length;
    const completed = settlements.filter(s => s.status === 'completed').length;
    const failed = settlements.filter(s => s.status === 'failed').length;
    const held = settlements.filter(s => s.status === 'held').length;
    const totalAmount = settlements.reduce((sum, s) => sum + (s.amount || 0), 0);

    return { total, pending, processing, completed, failed, held, totalAmount };
  }, [settlements]);

  // ── Handlers ──
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPaginationSearch(value);
  }, [setPaginationSearch]);

  const handleStatusFilter = useCallback((status) => {
    setStatusFilter(status);
    applyFilter('status', status);
  }, [applyFilter]);

  const handleSortChange = useCallback((e) => {
    const value = e.target.value;
    applyFilter('sort', value);
  }, [applyFilter]);

  const handleDateFilter = useCallback(() => {
    if (dateRange.start) applyFilter('startDate', dateRange.start);
    if (dateRange.end) applyFilter('endDate', dateRange.end);
  }, [dateRange, applyFilter]);

  // ── Actions ──
  const handleProcess = async (id) => {
    try {
      setActionLoading(id);
      await axios.post(
        `${API_URL}/settlements/${id}/process`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Settlement processed successfully');
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process settlement');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (id) => {
    try {
      setActionLoading(id);
      await axios.post(
        `${API_URL}/settlements/${id}/retry`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Settlement retry scheduled');
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to retry settlement');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this settlement?')) return;
    try {
      setActionLoading(id);
      await axios.post(
        `${API_URL}/settlements/${id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Settlement cancelled');
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel settlement');
    } finally {
      setActionLoading(null);
    }
  };

  const handleHold = async (id) => {
    const reason = window.prompt('Reason for holding this settlement:');
    if (reason === null) return;
    try {
      setActionLoading(id);
      await axios.post(
        `${API_URL}/settlements/${id}/hold`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Settlement placed on hold');
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to hold settlement');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async (id) => {
    try {
      setActionLoading(id);
      await axios.post(
        `${API_URL}/settlements/${id}/release`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Settlement released from hold');
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to release settlement');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Stats cards ──
  const statsCards = useMemo(() => {
    const displayCurrency = selectedCurrency || 'USD';
    
    return [
      { 
        label: 'Total Settlements', 
        value: analytics.total, 
        icon: Wallet, 
        color: 'text-[#374151]' 
      },
      { 
        label: 'Total Amount', 
        value: formatAmount(analytics.totalAmount, displayCurrency),
        icon: DollarSign, 
        color: 'text-[#0D9488]' 
      },
      { 
        label: 'Pending', 
        value: analytics.pending, 
        icon: Clock, 
        color: 'text-[#F59E0B]' 
      },
      { 
        label: 'Processing', 
        value: analytics.processing, 
        icon: Loader2, 
        color: 'text-blue-600' 
      },
      { 
        label: 'Completed', 
        value: analytics.completed, 
        icon: CheckCircle, 
        color: 'text-[#0D9488]' 
      },
      { 
        label: 'Failed', 
        value: analytics.failed, 
        icon: XCircle, 
        color: 'text-red-500' 
      },
      { 
        label: 'On Hold', 
        value: analytics.held, 
        icon: Pause, 
        color: 'text-gray-500' 
      },
    ];
  }, [analytics, selectedCurrency, formatAmount]);

  // ===============================
  // LOADING STATE
  // ===============================
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
            </div>
          ))}
        </div>
        <LoadingSkeleton count={5} type="list" />
      </div>
    );
  }

  // ===============================
  // ERROR STATE
  // ===============================
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center max-w-7xl mx-auto px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to Load Settlements</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
        <button onClick={refresh} className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition">Retry</button>
      </div>
    );
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 py-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#374151] dark:text-white">Settlement Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {meta.total} settlements • Manage provider payouts and settlements
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={refresh} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Currency Info */}
      <div className="flex items-center justify-end gap-2 text-sm">
        <span className="text-gray-400">Displaying in</span>
        <CurrencyBadge currency={selectedCurrency} size="sm" variant="light" />
      </div>

      {/* STATS CARDS */}
      {statsCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
                <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by provider, settlement ID, or booking..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['all', 'pending', 'processing', 'completed', 'failed', 'held', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                statusFilter === status
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range & Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
          />
          <button
            onClick={handleDateFilter}
            className="h-10 px-4 rounded-xl bg-[#0D9488] text-white text-sm font-medium hover:bg-[#0D9488]/80 transition"
          >
            Apply
          </button>
          {(dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setDateRange({ start: '', end: '' });
                applyFilter('startDate', undefined);
                applyFilter('endDate', undefined);
              }}
              className="text-sm text-gray-400 hover:text-gray-600 transition"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex-1 flex justify-end">
          <select
            onChange={handleSortChange}
            className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
          >
            <option value="-createdAt">Newest First</option>
            <option value="createdAt">Oldest First</option>
            <option value="-amount">Highest Amount</option>
            <option value="amount">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* SETTLEMENTS TABLE */}
      {settlements.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800">
          <DollarSign className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">No Settlements Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end
              ? 'Try adjusting your search or filters'
              : 'Settlements will appear here as they are processed'}
          </p>
          {(searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateRange({ start: '', end: '' });
                clearFilters();
              }}
              className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Settlement ID</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {settlements.map((settlement) => {
                    const displayAmount = formatAmount(settlement.amount || 0, settlement.currency || 'USD');
                    const displayFee = formatAmount(settlement.fee || 0, settlement.currency || 'USD');
                    const displayNet = formatAmount(settlement.netAmount || settlement.amount || 0, settlement.currency || 'USD');

                    return (
                      <tr key={settlement._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                        <td className="px-6 py-4">
                          <p className="text-sm font-mono font-medium text-[#0D9488]">
                            {settlement.settlementId || settlement._id?.slice(0, 8) || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-[#374151] dark:text-white">
                            {settlement.provider?.businessName || settlement.provider?.name || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-[#0D9488]">
                            {settlement.booking?.bookingCode || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-[#0D9488]">
                            {displayAmount}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500">
                            {displayFee}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#374151] dark:text-white">
                            {displayNet}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <SettlementStatusBadge status={settlement.status} />
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500">
                            {settlement.createdAt
                              ? new Date(settlement.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* View */}
                            <button
                              onClick={() => {
                                setSelectedSettlement(settlement);
                                setShowDetails(true);
                              }}
                              className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition text-gray-400 hover:text-[#0D9488]"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Process - Pending only */}
                            {settlement.status === 'pending' && (
                              <button
                                onClick={() => handleProcess(settlement._id)}
                                disabled={actionLoading === settlement._id}
                                className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition text-gray-400 hover:text-[#0D9488] disabled:opacity-50"
                                title="Process"
                              >
                                {actionLoading === settlement._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Retry - Failed only */}
                            {settlement.status === 'failed' && (
                              <button
                                onClick={() => handleRetry(settlement._id)}
                                disabled={actionLoading === settlement._id}
                                className="p-2 rounded-xl hover:bg-[#F59E0B]/10 transition text-gray-400 hover:text-[#F59E0B] disabled:opacity-50"
                                title="Retry"
                              >
                                {actionLoading === settlement._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCw className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Hold - Pending or Processing only */}
                            {(settlement.status === 'pending' || settlement.status === 'processing') && (
                              <button
                                onClick={() => handleHold(settlement._id)}
                                disabled={actionLoading === settlement._id}
                                className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                title="Hold"
                              >
                                {actionLoading === settlement._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Pause className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Release - Held only */}
                            {settlement.status === 'held' && (
                              <button
                                onClick={() => handleRelease(settlement._id)}
                                disabled={actionLoading === settlement._id}
                                className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition text-gray-400 hover:text-[#0D9488] disabled:opacity-50"
                                title="Release from Hold"
                              >
                                {actionLoading === settlement._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Cancel - Pending or Processing only */}
                            {(settlement.status === 'pending' || settlement.status === 'processing') && (
                              <button
                                onClick={() => handleCancel(settlement._id)}
                                disabled={actionLoading === settlement._id}
                                className="p-2 rounded-xl hover:bg-red-100 transition text-gray-400 hover:text-red-500 disabled:opacity-50"
                                title="Cancel"
                              >
                                {actionLoading === settlement._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Ban className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION */}
          {meta.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                meta={meta}
                onPageChange={goToPage}
                onLimitChange={setLimit}
              />
            </div>
          )}
        </>
      )}

      {/* Currency Info */}
      <div className="text-center text-xs text-gray-400">
        <span>All amounts displayed in </span>
        <CurrencyBadge currency={selectedCurrency} size="xs" variant="light" />
        <span className="mx-1">•</span>
        <span>Exchange rates updated daily</span>
        <span className="mx-1">•</span>
        <span>Original currency shown in table</span>
      </div>

      {/* Details Modal */}
      {showDetails && selectedSettlement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
                  Settlement Details
                </h2>
                <p className="text-sm text-gray-500 font-mono">
                  ID: {selectedSettlement.settlementId || selectedSettlement._id}
                </p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {selectedSettlement.provider?.businessName || selectedSettlement.provider?.name || 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Booking</p>
                  <p className="font-semibold text-[#0D9488]">
                    {selectedSettlement.booking?.bookingCode || 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-semibold text-[#0D9488]">
                    {formatAmount(selectedSettlement.amount || 0, selectedSettlement.currency || 'USD')}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Status</p>
                  <SettlementStatusBadge status={selectedSettlement.status} />
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {selectedSettlement.createdAt ? new Date(selectedSettlement.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                {selectedSettlement.processedDate && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm text-gray-500">Processed</p>
                    <p className="font-semibold text-[#0D9488]">
                      {new Date(selectedSettlement.processedDate).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedSettlement.completedDate && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="font-semibold text-[#0D9488]">
                      {new Date(selectedSettlement.completedDate).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedSettlement.errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 col-span-2">
                    <p className="text-sm text-gray-500">Error</p>
                    <p className="font-semibold text-red-600 dark:text-red-400">
                      {selectedSettlement.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
};

export default AdminSettlements;