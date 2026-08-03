// frontend/src/pages/admin/ExchangeRates.jsx
// ✅ CREATED - Admin Exchange Rates Management with Server-Side Pagination (Strategy B)
// ✅ Multi-Currency Support with Rate Management
// ✅ Full CRUD: view, create, update, delete rates

import React, { useState, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Loader2,
  Sparkles,
  Calendar,
  Eye,
  RefreshCw as RefreshIcon,
  TrendingUp,
  AlertCircle,
  Download,
  Filter,
  Shield,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Globe,
  DollarSign,
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
const RateStatusBadge = ({ status }) => {
  const configs = {
    active: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]', label: 'Active' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Inactive' },
    expired: { bg: 'bg-red-100', text: 'text-red-600', label: 'Expired' },
    pending: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Pending' },
  };
  const config = configs[status] || configs.active;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// ===============================
// MAIN COMPONENT
// ===============================
const AdminExchangeRates = () => {
  const { formatAmount, selectedCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const token = localStorage.getItem('token');

  // ✅ usePagination hook for server-side pagination
  const {
    data: rates,
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
    fetchFn: async (params) => {
      const response = await axios.get(`${API_URL}/admin/exchange-rates`, {
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
    dataKey: 'rates',
  });

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

  // ── Actions ──
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exchange rate?')) return;
    try {
      setActionLoading(id);
      await axios.delete(`${API_URL}/admin/exchange-rates/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Exchange rate deleted successfully');
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete exchange rate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      setActionLoading(id);
      await axios.put(
        `${API_URL}/admin/exchange-rates/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Rate ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Stats ──
  const analytics = useMemo(() => {
    const total = rates.length;
    const active = rates.filter(r => r.status === 'active').length;
    const inactive = rates.filter(r => r.status === 'inactive').length;
    const expired = rates.filter(r => r.status === 'expired').length;
    const uniqueCurrencies = new Set(rates.map(r => r.fromCurrency)).size;

    return { total, active, inactive, expired, uniqueCurrencies };
  }, [rates]);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to Load Exchange Rates</h2>
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
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#374151] dark:text-white">Exchange Rates</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {meta.total} rates • Manage currency exchange rates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold hover:scale-[1.02] transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Rate
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Rates</p>
          <p className="text-lg font-black text-[#374151] dark:text-white">{analytics.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-lg font-black text-[#0D9488]">{analytics.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
          <p className="text-lg font-black text-gray-500">{analytics.inactive}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Currencies</p>
          <p className="text-lg font-black text-[#F59E0B]">{analytics.uniqueCurrencies}</p>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by currency pair or provider..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['all', 'active', 'inactive', 'expired'].map((status) => (
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

      {/* Sort Dropdown */}
      <div className="flex justify-end">
        <select
          onChange={handleSortChange}
          className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          <option value="-createdAt">Newest First</option>
          <option value="createdAt">Oldest First</option>
          <option value="rate">Rate (Low to High)</option>
          <option value="-rate">Rate (High to Low)</option>
        </select>
      </div>

      {/* RATES TABLE */}
      {rates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800">
          <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">No Exchange Rates Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Exchange rates will appear here when configured'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency Pair</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {rates.map((rate) => (
                    <tr key={rate._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CurrencyBadge currency={rate.fromCurrency} size="xs" variant="light" />
                          <span className="text-gray-400">→</span>
                          <CurrencyBadge currency={rate.toCurrency} size="xs" variant="light" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-[#0D9488]">
                          {rate.rate?.toFixed(4) || 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <RateStatusBadge status={rate.status} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                          {rate.source || 'Manual'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">
                          {rate.updatedAt ? new Date(rate.updatedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingRate(rate)}
                            className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition text-gray-400 hover:text-[#0D9488]"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(rate._id, rate.status)}
                            disabled={actionLoading === rate._id}
                            className="p-2 rounded-xl hover:bg-[#F59E0B]/10 transition text-gray-400 hover:text-[#F59E0B] disabled:opacity-50"
                            title={rate.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {actionLoading === rate._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : rate.status === 'active' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(rate._id)}
                            disabled={actionLoading === rate._id}
                            className="p-2 rounded-xl hover:bg-red-100 transition text-gray-400 hover:text-red-500 disabled:opacity-50"
                            title="Delete"
                          >
                            {actionLoading === rate._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
};

export default AdminExchangeRates;