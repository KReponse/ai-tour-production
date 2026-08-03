// frontend/src/pages/admin/Ledger.jsx
// ✅ CREATED - Admin Ledger Management with Server-Side Pagination (Strategy B)
// ✅ Multi-Currency Support with Currency Display
// ✅ Full audit trail viewing with filters

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
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
  DollarSign,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
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
// LEDGER ENTRY TYPE BADGE
// ===============================
const LedgerTypeBadge = ({ type }) => {
  const configs = {
    debit: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', icon: ArrowUpRight, label: 'Debit' },
    credit: { bg: 'bg-[#0D9488]/10 dark:bg-[#0D9488]/20', text: 'text-[#0D9488] dark:text-[#0D9488]', icon: ArrowDownLeft, label: 'Credit' },
    payment: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', icon: CreditCard, label: 'Payment' },
    settlement: { bg: 'bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20', text: 'text-[#F59E0B] dark:text-[#F59E0B]', icon: Wallet, label: 'Settlement' },
    refund: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', icon: ArrowUpRight, label: 'Refund' },
    fee: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', icon: DollarSign, label: 'Fee' },
    adjustment: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', icon: TrendingUp, label: 'Adjustment' },
  };
  const config = configs[type] || configs.payment;
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
const AdminLedger = () => {
  const navigate = useNavigate();
  const { formatAmount, selectedCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const token = localStorage.getItem('token');

  // ✅ usePagination hook for server-side pagination
  const {
    data: entries,
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
      const response = await axios.get(`${API_URL}/admin/ledger`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    initialParams: {
      type: 'all',
      limit: PAGINATION.DEFAULT_LIMIT,
      sort: '-createdAt',
    },
    dataKey: 'entries',
  });

  // ── Analytics ──
  const analytics = useMemo(() => {
    const total = entries.length;
    const debits = entries.filter(e => e.type === 'debit' || e.type === 'payment' || e.type === 'refund').length;
    const credits = entries.filter(e => e.type === 'credit' || e.type === 'settlement').length;
    const totalDebit = entries.filter(e => e.type === 'debit' || e.type === 'payment').reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalCredit = entries.filter(e => e.type === 'credit' || e.type === 'settlement').reduce((sum, e) => sum + (e.amount || 0), 0);
    const fees = entries.filter(e => e.type === 'fee').reduce((sum, e) => sum + (e.amount || 0), 0);

    return { total, debits, credits, totalDebit, totalCredit, fees, netBalance: totalCredit - totalDebit };
  }, [entries]);

  // ── Handlers ──
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPaginationSearch(value);
  }, [setPaginationSearch]);

  const handleTypeFilter = useCallback((type) => {
    setTypeFilter(type);
    applyFilter('type', type);
  }, [applyFilter]);

  const handleSortChange = useCallback((e) => {
    const value = e.target.value;
    applyFilter('sort', value);
  }, [applyFilter]);

  const handleDateFilter = useCallback(() => {
    if (dateRange.start) applyFilter('startDate', dateRange.start);
    if (dateRange.end) applyFilter('endDate', dateRange.end);
  }, [dateRange, applyFilter]);

  // ── Stats cards ──
  const statsCards = useMemo(() => {
    const displayCurrency = selectedCurrency || 'USD';
    
    return [
      { 
        label: 'Total Entries', 
        value: analytics.total, 
        icon: BookOpen, 
        color: 'text-[#374151]' 
      },
      { 
        label: 'Total Debit', 
        value: formatAmount(analytics.totalDebit, displayCurrency),
        icon: ArrowUpRight, 
        color: 'text-red-500' 
      },
      { 
        label: 'Total Credit', 
        value: formatAmount(analytics.totalCredit, displayCurrency),
        icon: ArrowDownLeft, 
        color: 'text-[#0D9488]' 
      },
      { 
        label: 'Net Balance', 
        value: formatAmount(analytics.netBalance, displayCurrency),
        icon: Wallet, 
        color: analytics.netBalance >= 0 ? 'text-[#0D9488]' : 'text-red-500' 
      },
      { 
        label: 'Fees Collected', 
        value: formatAmount(analytics.fees, displayCurrency),
        icon: DollarSign, 
        color: 'text-[#F59E0B]' 
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
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
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to Load Ledger</h2>
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
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#374151] dark:text-white">Ledger</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {meta.total} entries • Complete financial audit trail
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
            placeholder="Search by reference, account, or description..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['all', 'payment', 'settlement', 'refund', 'fee', 'adjustment'].map((type) => (
            <button
              key={type}
              onClick={() => handleTypeFilter(type)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                typeFilter === type
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
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

      {/* LEDGER TABLE */}
      {entries.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800">
          <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">No Ledger Entries Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchTerm || typeFilter !== 'all' || dateRange.start || dateRange.end
              ? 'Try adjusting your search or filters'
              : 'Ledger entries will appear here as transactions are processed'}
          </p>
          {(searchTerm || typeFilter !== 'all' || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
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
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {entries.map((entry) => {
                    const displayAmount = formatAmount(entry.amount || 0, entry.currency || 'USD');

                    return (
                      <tr key={entry._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                        <td className="px-6 py-4">
                          <p className="text-sm font-mono font-medium text-[#0D9488]">
                            {entry.reference || entry._id?.slice(0, 8) || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-[#374151] dark:text-white line-clamp-1">
                            {entry.description || 'No description'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {entry.account || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-sm font-bold ${
                            entry.type === 'debit' || entry.type === 'payment' || entry.type === 'refund'
                              ? 'text-red-500'
                              : 'text-[#0D9488]'
                          }`}>
                            {entry.type === 'debit' || entry.type === 'payment' || entry.type === 'refund' ? '-' : '+'}
                            {displayAmount}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <LedgerTypeBadge type={entry.type} />
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedEntry(entry);
                              setShowDetails(true);
                            }}
                            className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition text-gray-400 hover:text-[#0D9488]"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
        <span>Double-entry accounting ledger</span>
      </div>

      {/* Details Modal */}
      {showDetails && selectedEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
                  Ledger Entry Details
                </h2>
                <p className="text-sm text-gray-500 font-mono">
                  Reference: {selectedEntry.reference || selectedEntry._id}
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
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {selectedEntry.description || 'No description'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Type</p>
                  <LedgerTypeBadge type={selectedEntry.type} />
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className={`font-bold ${
                    selectedEntry.type === 'debit' || selectedEntry.type === 'payment' || selectedEntry.type === 'refund'
                      ? 'text-red-500'
                      : 'text-[#0D9488]'
                  }`}>
                    {selectedEntry.type === 'debit' || selectedEntry.type === 'payment' || selectedEntry.type === 'refund' ? '-' : '+'}
                    {formatAmount(selectedEntry.amount || 0, selectedEntry.currency || 'USD')}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Currency</p>
                  <CurrencyBadge currency={selectedEntry.currency || 'USD'} size="sm" />
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Account</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {selectedEntry.account || 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-semibold text-[#374151] dark:text-white">
                    {selectedEntry.createdAt ? new Date(selectedEntry.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                {selectedEntry.relatedTo && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 col-span-2">
                    <p className="text-sm text-gray-500">Related To</p>
                    <p className="font-semibold text-[#0D9488]">
                      {selectedEntry.relatedTo}
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

export default AdminLedger;