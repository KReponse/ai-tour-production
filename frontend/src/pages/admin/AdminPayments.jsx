// src/pages/admin/AdminPayments.jsx
// ============================================================
// AI TOUR — ADMIN PAYMENTS (FINAL)
// ============================================================
// ✅ Fixed infinite refetch loop (useEffect no longer fires on
//    every render because fetchPayments identity changes).
// ✅ Removed duplicate fetch effects for search + filter.
// ✅ Page change now explicitly triggers a refetch.
// ✅ Auto-refreshes when any payment domain is invalidated
//    elsewhere (webhook from PaymentSuccess, refund from
//    admin, etc.).
// ✅ All UI preserved: stats cards, search, filter, table,
//    pagination, export CSV, view details.
// ============================================================

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Eye,
  Loader2,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from 'lucide-react';
import API from '../../services/api';
import useRefreshOn from '../../hooks/useRefreshOn';
import toast from 'react-hot-toast';

const AdminPayments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // ✅ Guard against the mount effect firing repeatedly
  const didMountRef = useRef(false);

  const getStatusBadge = (status) => {
    const configs = {
      paid: {
        bg: 'bg-[#0D9488]/10',
        text: 'text-[#0D9488]',
        icon: CheckCircle,
        label: 'Paid',
      },
      pending: {
        bg: 'bg-[#F59E0B]/10',
        text: 'text-[#F59E0B]',
        icon: Clock,
        label: 'Pending',
      },
      failed: {
        bg: 'bg-red-100',
        text: 'text-red-600',
        icon: XCircle,
        label: 'Failed',
      },
      refunded: {
        bg: 'bg-gray-100',
        text: 'text-gray-500',
        icon: XCircle,
        label: 'Refunded',
      },
      processing: {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        icon: Clock,
        label: 'Processing',
      },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // ✅ Fetch payments — takes params explicitly, no dependency
  //    on pagination identity (avoids the render loop).
  const fetchPayments = useCallback(
    async (
      { page = 1, limit = 20, statusFilter = 'all', searchTerm = '' } = {},
      showRefresh = false
    ) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        const params = new URLSearchParams({
          page,
          limit,
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(searchTerm && { search: searchTerm }),
        });

        const response = await API.get(
          `/payments/admin/payments?${params}`
        );

        if (response.data.success) {
          setPayments(response.data.payments || []);
          if (response.data.pagination) {
            setPagination({
              page: response.data.pagination.page || page,
              limit:
                response.data.pagination.limit || limit,
              total: response.data.pagination.total || 0,
              totalPages:
                response.data.pagination.totalPages || 0,
            });
          }
          if (response.data.stats) {
            setStats(response.data.stats);
          }
        } else {
          toast.error(
            response.data.message || 'Failed to load payments'
          );
        }
      } catch (err) {
        toast.error(
          err.response?.data?.message ||
            'Failed to load payments'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await API.get(
        '/payments/admin/payments/stats'
      );
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch {
      // Silent — stats are supplementary
    }
  }, []);

  // ✅ Refetch with current params
  const refetch = useCallback(
    (showRefresh = false) => {
      fetchPayments(
        {
          page: pagination.page,
          limit: pagination.limit,
          statusFilter: filter,
          searchTerm: search,
        },
        showRefresh
      );
    },
    [fetchPayments, pagination.page, pagination.limit, filter, search]
  );

  // ✅ Initial fetch — mount only
  useEffect(() => {
    if (didMountRef.current) return;
    didMountRef.current = true;
    fetchPayments({ page: 1, limit: 20 });
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Auto-refresh when payments are invalidated elsewhere
  useRefreshOn(['payments:admin'], () => {
    refetch(false);
    fetchStats();
  });

  // ✅ Refetch when filter changes
  useEffect(() => {
    if (!didMountRef.current) return;
    setPagination((p) => ({ ...p, page: 1 }));
    fetchPayments({
      page: 1,
      limit: pagination.limit,
      statusFilter: filter,
      searchTerm: search,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ✅ Debounced search → reset to page 1
  useEffect(() => {
    if (!didMountRef.current) return;
    const timer = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchPayments({
        page: 1,
        limit: pagination.limit,
        statusFilter: filter,
        searchTerm: search,
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ✅ Explicit page change → refetch
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((p) => ({ ...p, page: newPage }));
    fetchPayments({
      page: newPage,
      limit: pagination.limit,
      statusFilter: filter,
      searchTerm: search,
    });
  };

  const handleRefresh = () => {
    refetch(true);
    fetchStats();
  };

  const handleExportCSV = async () => {
    try {
      const response = await API.get(
        '/payments/admin/payments/export',
        {
          params: {
            ...(filter !== 'all' && { status: filter }),
            ...(search && { search }),
          },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `payments-${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Payments exported successfully');
    } catch {
      toast.error('Failed to export payments');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#374151] dark:text-white">
              All Payments
            </h1>
            <p className="text-sm text-gray-500">
              Manage all payments on the platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Revenue
            </p>
            <p className="text-2xl font-bold text-[#0D9488]">
              ${stats.totalRevenue?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pending
            </p>
            <p className="text-2xl font-bold text-[#F59E0B]">
              {stats.pendingPayments || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Refunded
            </p>
            <p className="text-2xl font-bold text-gray-500">
              {stats.refunds || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Platform Fees
            </p>
            <p className="text-2xl font-bold text-[#0D9488]">
              ${stats.platformFees?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
      )}

      {/* SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by traveler, provider, booking, or transaction ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Traveler
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      <p>No payments found</p>
                      <p className="text-sm">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono text-[#0D9488] font-medium">
                        #
                        {payment.booking?.bookingCode ||
                          payment._id?.slice(-8) ||
                          'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-[#374151] dark:text-white">
                        {payment.user?.name || 'Unknown'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-[#374151] dark:text-white">
                        {payment.provider?.businessName ||
                          payment.provider?.name ||
                          'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-[#0D9488]">
                        $
                        {payment.amount?.toFixed(2) ||
                          '0.00'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">
                        {payment.paidAt
                          ? new Date(
                              payment.paidAt
                            ).toLocaleDateString()
                          : new Date(
                              payment.createdAt
                            ).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          navigate(
                            `/admin/payments/${payment._id}`
                          )
                        }
                        className="p-2 hover:bg-[#0D9488]/10 rounded-lg transition group"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-[#0D9488] group-hover:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500">
              Showing{' '}
              {(pagination.page - 1) * pagination.limit + 1}{' '}
              to{' '}
              {Math.min(
                pagination.page * pagination.limit,
                pagination.total
              )}{' '}
              of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  handlePageChange(pagination.page - 1)
                }
                disabled={pagination.page <= 1}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Previous
              </button>
              <span className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-sm font-medium">
                {pagination.page}
              </span>
              <button
                onClick={() =>
                  handlePageChange(pagination.page + 1)
                }
                disabled={
                  pagination.page >= pagination.totalPages
                }
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPayments;