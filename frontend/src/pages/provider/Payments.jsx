// frontend/src/pages/provider/Payments.jsx
// ✅ COMPLETE FIXED - Server-Side Pagination (Strategy B)
// ✅ Added: usePagination hook for pagination controls
// ✅ Added: Pagination component with page numbers, First/Last
// ✅ Added: Search, filters, sorting
// ✅ Multi-Currency Support with Currency Display

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Search,
  Loader2,
  Sparkles,
  Eye,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { getProviderPayments, getProviderPaymentStats, exportPaymentsCSV } from '../../services/paymentService';
import { useCurrency } from '../../contexts/CurrencyContext';
import CurrencyBadge from '../../components/ui/CurrencyBadge';
import usePagination from '../../hooks/usePagination';
import Pagination from '../../components/ui/Pagination';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import BackToTop from '../../components/ui/BackToTop';
import { PAGINATION } from '../../utils/constants';
import toast from 'react-hot-toast';

// ===============================
// STATUS BADGE
// ===============================
const PaymentStatusBadge = ({ status }) => {
  const configs = {
    paid: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]', label: 'Paid' },
    pending: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Pending' },
    failed: { bg: 'bg-red-100', text: 'text-red-600', label: 'Failed' },
    refunded: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Refunded' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Processing' },
  };
  const config = configs[status] || configs.pending;
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>{config.label}</span>;
};

// ===============================
// MAIN COMPONENT
// ===============================
const ProviderPayments = () => {
  const navigate = useNavigate();
  const { formatAmount, selectedCurrency } = useCurrency();
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ✅ usePagination hook for server-side pagination
  const {
    data: payments,
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
    fetchFn: getProviderPayments,
    initialParams: {
      status: 'all',
      limit: PAGINATION.DEFAULT_LIMIT,
      sort: '-createdAt',
    },
    dataKey: 'payments',
  });

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getProviderPaymentStats();
      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle search
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPaginationSearch(value);
  }, [setPaginationSearch]);

  // Handle status filter
  const handleStatusFilter = useCallback((status) => {
    setStatusFilter(status);
    applyFilter('status', status);
  }, [applyFilter]);

  // Handle sort change
  const handleSortChange = useCallback((e) => {
    const value = e.target.value;
    applyFilter('sort', value);
  }, [applyFilter]);

  // Handle export CSV
  const handleExportCSV = async () => {
    try {
      await exportPaymentsCSV({ status: statusFilter !== 'all' ? statusFilter : undefined });
      toast.success('Payments exported successfully');
    } catch (error) {
      toast.error('Failed to export payments');
    }
  };

  // Format amount
  const formatPaymentAmount = (amount, currency) => {
    if (!currency) return formatAmount(amount, selectedCurrency);
    return formatAmount(amount, currency);
  };

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
            </div>
          ))}
        </div>
        <LoadingSkeleton count={3} type="list" />
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
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to Load Payments</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
        <button onClick={refresh} className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition">Retry</button>
      </div>
    );
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#374151] dark:text-white">Provider Payments</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {meta.total} {meta.total === 1 ? 'payment' : 'payments'} found
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={refresh} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-lg font-black text-[#0D9488]">{formatPaymentAmount(stats.totalRevenue || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
            <p className="text-lg font-black text-[#0D9488]">{formatPaymentAmount(stats.todayRevenue || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
            <p className="text-lg font-black text-[#F59E0B]">{formatPaymentAmount(stats.monthlyRevenue || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Payout</p>
            <p className="text-lg font-black text-[#F59E0B]">{formatPaymentAmount(stats.pendingPayout || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
            <p className="text-lg font-black text-[#0D9488]">{stats.completedPayments || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Refunds</p>
            <p className="text-lg font-black text-red-500">{stats.refunds || 0}</p>
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by traveler, booking, or transaction ID..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['all', 'paid', 'pending', 'failed', 'refunded'].map((status) => (
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
          <option value="-amount">Highest Amount</option>
          <option value="amount">Lowest Amount</option>
        </select>
      </div>

      {/* PAYMENTS TABLE */}
      {payments.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800">
          <CreditCard className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">No Payments Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Your payment history will appear here'}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
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
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traveler</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#0D9488]">{payment.booking?.bookingCode || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#374151] dark:text-white">{payment.user?.name || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-[#0D9488]">
                          {formatPaymentAmount(payment.amount, payment.currency || 'USD')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-[#374151] dark:text-white">
                          {formatPaymentAmount((payment.amount - (payment.platformFee || 0)), payment.currency || 'USD')}
                        </p>
                      </td>
                      <td className="px-6 py-4"><PaymentStatusBadge status={payment.status} /></td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">
                          {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => navigate(`/provider/payments/${payment._id}`)} className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition group" title="View Details">
                          <Eye className="w-4 h-4 text-gray-400 group-hover:text-[#0D9488]" />
                        </button>
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

      {/* Currency Info */}
      <div className="text-center text-xs text-gray-400">
        <span>All amounts displayed in </span>
        <CurrencyBadge currency={selectedCurrency} size="xs" variant="light" />
        <span className="mx-1">•</span>
        <span>Exchange rates updated daily</span>
      </div>

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
};

export default ProviderPayments;