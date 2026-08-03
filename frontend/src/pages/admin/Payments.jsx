// frontend/src/pages/admin/Payments.jsx
// ✅ COMPLETE FIXED - Server-Side Pagination (Strategy B)
// ✅ Added: usePagination hook for pagination controls
// ✅ Added: Pagination component with page numbers, First/Last
// ✅ Added: Search, filters, sorting, date range
// ✅ Multi-Currency Support with Currency Display
// ✅ FIXED: Ultimate response handling for ALL possible API response formats

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Search,
  Loader2,
  Sparkles,
  Calendar,
  DollarSign,
  Eye,
  RefreshCw,
  TrendingUp,
  Users,
  Building2,
  AlertCircle,
  Download,
  Filter,
  Shield,
  ChevronDown,
  Globe,
  Clock,
  XCircle,
} from 'lucide-react';
import {
  getAllPayments,
  getAdminPaymentStats,
  exportPaymentsCSV,
  processRefund,
} from '../../services/paymentService';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import CurrencySelector from '../../components/ui/CurrencySelector';
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
    pending_refund: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Refund Requested' },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// ===============================
// MAIN COMPONENT
// ===============================
const AdminPayments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount, selectedCurrency, convert, getSymbol } = useCurrency();
  const [stats, setStats] = useState(null);
  const [convertedStats, setConvertedStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [processingRefund, setProcessingRefund] = useState(null);

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
    fetchFn: async (params) => {
      console.log('📤 [AdminPayments] Fetching payments with params:', params);
      
      let response;
      try {
        response = await getAllPayments(params);
      } catch (err) {
        console.error('❌ [AdminPayments] API call failed:', err);
        return { payments: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      }
      
      console.log('📥 [AdminPayments] Raw response:', JSON.stringify(response, null, 2));
      console.log('📥 [AdminPayments] Response type:', typeof response);
      
      // ✅ ULTIMATE RESPONSE HANDLING - Handle EVERY possible format
      let paymentsData = [];
      let paginationData = { total: 0, page: 1, limit: 20, totalPages: 0 };
      
      // If response is null or undefined
      if (!response) {
        console.warn('⚠️ [AdminPayments] Response is null or undefined');
        return { payments: [], pagination: paginationData };
      }
      
      // If response is an array directly
      if (Array.isArray(response)) {
        paymentsData = response;
        paginationData = { total: response.length, page: 1, limit: 20, totalPages: 1 };
        console.log('✅ [AdminPayments] Response is an array, length:', response.length);
        return { payments: paymentsData, pagination: paginationData };
      }
      
      // If response has a data property that is an array
      if (response.data && Array.isArray(response.data)) {
        paymentsData = response.data;
        paginationData = response.pagination || { total: paymentsData.length, page: 1, limit: 20, totalPages: 1 };
        console.log('✅ [AdminPayments] Response has data array, length:', paymentsData.length);
        return { payments: paymentsData, pagination: paginationData };
      }
      
      // If response has a payments property that is an array
      if (response.payments && Array.isArray(response.payments)) {
        paymentsData = response.payments;
        paginationData = response.pagination || { total: paymentsData.length, page: 1, limit: 20, totalPages: 1 };
        console.log('✅ [AdminPayments] Response has payments array, length:', paymentsData.length);
        return { payments: paymentsData, pagination: paginationData };
      }
      
      // If response has a success property and a data property
      if (response.success && response.data && Array.isArray(response.data)) {
        paymentsData = response.data;
        paginationData = response.pagination || { total: paymentsData.length, page: 1, limit: 20, totalPages: 1 };
        console.log('✅ [AdminPayments] Response has success + data, length:', paymentsData.length);
        return { payments: paymentsData, pagination: paginationData };
      }
      
      // If response has a results property (common in some APIs)
      if (response.results && Array.isArray(response.results)) {
        paymentsData = response.results;
        paginationData = response.pagination || { total: paymentsData.length, page: 1, limit: 20, totalPages: 1 };
        console.log('✅ [AdminPayments] Response has results array, length:', paymentsData.length);
        return { payments: paymentsData, pagination: paginationData };
      }
      
      // If response has a items property
      if (response.items && Array.isArray(response.items)) {
        paymentsData = response.items;
        paginationData = response.pagination || { total: paymentsData.length, page: 1, limit: 20, totalPages: 1 };
        console.log('✅ [AdminPayments] Response has items array, length:', paymentsData.length);
        return { payments: paymentsData, pagination: paginationData };
      }
      
      // If response has a docs property (Mongoose pagination)
      if (response.docs && Array.isArray(response.docs)) {
        paymentsData = response.docs;
        paginationData = {
          total: response.totalDocs || response.total || paymentsData.length,
          page: response.page || 1,
          limit: response.limit || 20,
          totalPages: response.totalPages || 1,
        };
        console.log('✅ [AdminPayments] Response has docs array, length:', paymentsData.length);
        return { payments: paymentsData, pagination: paginationData };
      }
      
      // If response is an object, try to find any array property
      if (typeof response === 'object' && !Array.isArray(response)) {
        for (const key of Object.keys(response)) {
          if (Array.isArray(response[key]) && response[key].length > 0) {
            paymentsData = response[key];
            paginationData = response.pagination || { total: paymentsData.length, page: 1, limit: 20, totalPages: 1 };
            console.log(`✅ [AdminPayments] Found array in property "${key}", length:`, paymentsData.length);
            return { payments: paymentsData, pagination: paginationData };
          }
        }
      }
      
      // No payments found in any format
      console.warn('⚠️ [AdminPayments] No payments array found in response');
      console.log('📥 [AdminPayments] Response keys:', Object.keys(response));
      
      return { payments: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    },
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
      const statsData = await getAdminPaymentStats();
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

  // ✅ Convert stats to selected currency
  useEffect(() => {
    const convertStats = async () => {
      if (!stats || !selectedCurrency) return;

      try {
        const totalRevenue = await convert(stats.totalRevenue || 0, 'USD', selectedCurrency);
        const todayRevenue = await convert(stats.todayRevenue || 0, 'USD', selectedCurrency);
        const monthlyRevenue = await convert(stats.monthlyRevenue || 0, 'USD', selectedCurrency);
        const platformFees = await convert(stats.platformFees || 0, 'USD', selectedCurrency);
        const netRevenue = await convert(stats.netRevenue || 0, 'USD', selectedCurrency);

        setConvertedStats({
          ...stats,
          convertedTotalRevenue: totalRevenue.success ? totalRevenue.convertedAmount : stats.totalRevenue || 0,
          convertedTodayRevenue: todayRevenue.success ? todayRevenue.convertedAmount : stats.todayRevenue || 0,
          convertedMonthlyRevenue: monthlyRevenue.success ? monthlyRevenue.convertedAmount : stats.monthlyRevenue || 0,
          convertedPlatformFees: platformFees.success ? platformFees.convertedAmount : stats.platformFees || 0,
          convertedNetRevenue: netRevenue.success ? netRevenue.convertedAmount : stats.netRevenue || 0,
          currency: selectedCurrency,
        });
      } catch (error) {
        console.error('Error converting stats:', error);
        setConvertedStats({
          ...stats,
          convertedTotalRevenue: stats.totalRevenue || 0,
          convertedTodayRevenue: stats.todayRevenue || 0,
          convertedMonthlyRevenue: stats.monthlyRevenue || 0,
          convertedPlatformFees: stats.platformFees || 0,
          convertedNetRevenue: stats.netRevenue || 0,
          currency: 'USD',
        });
      }
    };

    convertStats();
  }, [stats, selectedCurrency, convert]);

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

  const handleExportCSV = async () => {
    try {
      await exportPaymentsCSV({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      toast.success('Payments exported successfully');
    } catch (error) {
      toast.error('Failed to export payments');
    }
  };

  const handleProcessRefund = async (paymentId) => {
    const amount = window.prompt('Enter refund amount (leave empty for full refund):');
    if (amount === null) return;
    
    const refundAmount = amount ? parseFloat(amount) : undefined;
    if (refundAmount !== undefined && (isNaN(refundAmount) || refundAmount <= 0)) {
      toast.error('Please enter a valid amount');
      return;
    }

    const reason = window.prompt('Reason for refund:');
    if (reason === null) return;

    try {
      setProcessingRefund(paymentId);
      await processRefund(paymentId, { amount: refundAmount, reason });
      toast.success('Refund processed successfully');
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(null);
    }
  };

  // ✅ Stats cards
  const statsCards = useMemo(() => {
    if (!convertedStats) return [];
    
    const displayCurrency = convertedStats.currency || selectedCurrency || 'USD';
    
    return [
      { 
        label: 'Total Revenue', 
        value: formatAmount(convertedStats.convertedTotalRevenue || 0, displayCurrency),
        icon: DollarSign, 
        color: 'text-[#0D9488]' 
      },
      { 
        label: 'Today', 
        value: formatAmount(convertedStats.convertedTodayRevenue || 0, displayCurrency),
        icon: Calendar, 
        color: 'text-[#0D9488]' 
      },
      { 
        label: 'This Month', 
        value: formatAmount(convertedStats.convertedMonthlyRevenue || 0, displayCurrency),
        icon: TrendingUp, 
        color: 'text-[#F59E0B]' 
      },
      { 
        label: 'Platform Fees', 
        value: formatAmount(convertedStats.convertedPlatformFees || 0, displayCurrency),
        icon: Shield, 
        color: 'text-[#0D9488]' 
      },
      { 
        label: 'Net Revenue', 
        value: formatAmount(convertedStats.convertedNetRevenue || 0, displayCurrency),
        icon: TrendingUp, 
        color: 'text-[#0D9488]' 
      },
      { 
        label: 'Pending', 
        value: convertedStats.pendingPayments || 0, 
        icon: Clock, 
        color: 'text-[#F59E0B]' 
      },
      { 
        label: 'Refunds', 
        value: convertedStats.refunds || 0, 
        icon: XCircle, 
        color: 'text-red-500' 
      },
    ];
  }, [convertedStats, selectedCurrency, formatAmount]);

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
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 py-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#374151] dark:text-white">Payment Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {meta.total} payments • Manage all platform payments and transactions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CurrencySelector variant="compact" showRefresh={true} align="right" />
          <button onClick={handleExportCSV} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
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
            placeholder="Search by traveler, provider, booking, or transaction ID..."
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

      {/* PAYMENTS TABLE */}
      {payments.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800">
          <CreditCard className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">No Payments Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end
              ? 'Try adjusting your search or filters'
              : 'Payments will appear here as they are processed'}
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
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traveler</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {payments.map((payment) => {
                    const paymentCurrency = payment.currency || 'USD';
                    const displayAmount = formatAmount(payment.amount, paymentCurrency);
                    const displayFee = formatAmount(payment.platformFee || 0, paymentCurrency);
                    const displayNet = formatAmount(payment.amount - (payment.platformFee || 0), paymentCurrency);

                    return (
                      <tr key={payment._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-[#374151] dark:text-white">
                            {payment.user?.name || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-[#374151] dark:text-white">
                            {payment.provider?.businessName || payment.provider?.name || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-[#0D9488]">
                            {payment.booking?.bookingCode || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-[#0D9488]">
                            {displayAmount}
                          </p>
                          {payment.currency && payment.currency !== selectedCurrency && (
                            <p className="text-xs text-gray-400">
                              {formatAmount(payment.amount, selectedCurrency)}
                            </p>
                          )}
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
                          <CurrencyBadge currency={paymentCurrency} size="xs" variant="light" />
                        </td>
                        <td className="px-6 py-4">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500">
                            {payment.paidAt
                              ? new Date(payment.paidAt).toLocaleDateString()
                              : new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/admin/payments/${payment._id}`)}
                              className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition group"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4 text-gray-400 group-hover:text-[#0D9488]" />
                            </button>
                            {payment.status === 'paid' && (
                              <button
                                onClick={() => handleProcessRefund(payment._id)}
                                disabled={processingRefund === payment._id}
                                className="p-2 rounded-xl hover:bg-red-50 transition group"
                                title="Process Refund"
                              >
                                {processingRefund === payment._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400 group-hover:text-red-500" />
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

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
};

export default AdminPayments;