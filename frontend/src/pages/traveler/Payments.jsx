// frontend/src/pages/traveler/Payments.jsx
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
  Globe,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { getMyPayments, getPaymentStats, downloadReceipt } from '../../services/paymentService';
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
    paid: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]', icon: CheckCircle, label: 'Paid' },
    pending: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', icon: Clock, label: 'Pending' },
    failed: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle, label: 'Failed' },
    refunded: { bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle, label: 'Refunded' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-600', icon: Clock, label: 'Processing' },
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
const TravelerPayments = () => {
  const navigate = useNavigate();
  const { formatAmount, selectedCurrency, convert, getSymbol } = useCurrency();
  const [stats, setStats] = useState(null);
  const [convertedStats, setConvertedStats] = useState(null);
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
    fetchFn: getMyPayments,
    initialParams: {
      status: 'all',
      limit: PAGINATION.DEFAULT_LIMIT,
      sort: '-createdAt',
    },
    dataKey: 'payments',
  });

  // Fetch payment stats
  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getPaymentStats();
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

  // Convert stats to selected currency
  useEffect(() => {
    const convertStats = async () => {
      if (!stats || !selectedCurrency) return;

      try {
        const totalAmount = await convert(stats.totalAmount || 0, 'USD', selectedCurrency);
        setConvertedStats({
          ...stats,
          convertedTotalAmount: totalAmount.success ? totalAmount.convertedAmount : stats.totalAmount || 0,
          totalAmount: stats.totalAmount || 0,
          currency: selectedCurrency,
        });
      } catch (error) {
        console.error('Error converting stats:', error);
        setConvertedStats({
          ...stats,
          convertedTotalAmount: stats.totalAmount || 0,
          currency: 'USD',
        });
      }
    };

    convertStats();
  }, [stats, selectedCurrency, convert]);

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

  // Handle download receipt
  const handleDownloadReceipt = async (paymentId) => {
    try {
      await downloadReceipt(paymentId);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  // Format amount with currency
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse">
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
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
            <h1 className="text-3xl font-black text-[#374151] dark:text-white">My Payments</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {meta.total} {meta.total === 1 ? 'payment' : 'payments'} found
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CurrencySelector variant="compact" showRefresh={true} align="right" />
          <button onClick={refresh} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-black text-[#374151] dark:text-white">{stats.total || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
            <p className="text-2xl font-black text-[#0D9488]">{stats.paid || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-black text-[#F59E0B]">{stats.pending || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Refunded</p>
            <p className="text-2xl font-black text-gray-500">{stats.refunded || 0}</p>
          </div>
        </div>
      )}

      {/* Total Amount in Selected Currency */}
      {convertedStats && (
        <div className="bg-gradient-to-r from-[#0D9488]/10 to-[#F59E0B]/10 rounded-2xl p-4 border border-[#0D9488]/20 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#0D9488]" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Total Spent</span>
          </div>
          <div className="flex items-center gap-3">
            <CurrencyBadge 
              currency={convertedStats.currency || 'USD'} 
              amount={convertedStats.convertedTotalAmount} 
              size="lg" 
            />
            {convertedStats.currency !== 'USD' && (
              <span className="text-xs text-gray-400">
                ≈ {formatAmount(convertedStats.totalAmount || 0, 'USD')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by booking code or transaction ID..."
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
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {payments.map((payment) => {
                    const paymentCurrency = payment.currency || 'USD';
                    const displayAmount = payment.currency 
                      ? formatAmount(payment.amount, payment.currency)
                      : formatAmount(payment.amount, selectedCurrency);

                    return (
                      <tr key={payment._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-[#374151] dark:text-white">{payment.listing?.title || 'N/A'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500 font-mono">{payment.transactionId || payment.stripePaymentId || 'N/A'}</p>
                            <CurrencyBadge currency={paymentCurrency} size="xs" variant="light" />
                          </div>
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
                        <td className="px-6 py-4"><PaymentStatusBadge status={payment.status} /></td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500">
                            {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => navigate(`/traveler/payments/${payment._id}`)} className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition group" title="View Details">
                              <Eye className="w-4 h-4 text-gray-400 group-hover:text-[#0D9488]" />
                            </button>
                            {payment.status === 'paid' && (
                              <button onClick={() => handleDownloadReceipt(payment._id)} className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition group" title="Download Receipt">
                                <Download className="w-4 h-4 text-gray-400 group-hover:text-[#0D9488]" />
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
      </div>

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
};

export default TravelerPayments;