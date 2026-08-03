// frontend/src/components/admin/PaymentAnalytics.jsx

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Users,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BarChart3,
  PieChart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  Package
} from 'lucide-react';
import API from '../../services/api';

const PaymentAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await API.get('/admin/payments/analytics');
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      setError(error.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-6 py-2.5 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#0D9488]/80 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const stats = [
    {
      title: 'Total Revenue',
      value: `$${analytics.totalRevenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      change: analytics.revenueGrowth || 0,
      color: 'text-[#0D9488]',
      bg: 'bg-[#0D9488]/10',
      border: 'border-[#0D9488]/20'
    },
    {
      title: 'Total Payments',
      value: analytics.totalPayments || 0,
      icon: CreditCard,
      change: analytics.paymentGrowth || 0,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/20'
    },
    {
      title: 'Platform Fees',
      value: `$${analytics.totalFees?.toLocaleString() || 0}`,
      icon: Wallet,
      change: analytics.feeGrowth || 0,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20'
    },
    {
      title: 'Active Users',
      value: analytics.activeUsers || 0,
      icon: Users,
      change: analytics.userGrowth || 0,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      title: 'Total Providers',
      value: analytics.totalProviders || 0,
      icon: UserCheck,
      change: 0,
      color: 'text-[#0D9488]',
      bg: 'bg-[#0D9488]/10',
      border: 'border-[#0D9488]/20'
    },
    {
      title: 'Total Bookings',
      value: analytics.totalBookings || 0,
      icon: Package,
      change: 0,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/20'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
            Payment Analytics
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of all payment activity on the platform
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;
          
          return (
            <div
              key={index}
              className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border ${stat.border} shadow-sm hover:shadow-md transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-[#374151] dark:text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              {stat.change !== 0 && (
                <div className="mt-4 flex items-center gap-2">
                  {isPositive ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(stat.change)}%
                  </span>
                  <span className="text-sm text-gray-400">vs last month</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Monthly Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-[#374151] dark:text-white mb-4">
            Monthly Revenue
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">Current Month</span>
              <span className="text-lg font-bold text-[#0D9488]">
                ${analytics.monthlyRevenue?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">Last Month</span>
              <span className="text-lg font-bold text-[#374151] dark:text-white">
                ${analytics.lastMonthRevenue?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-[#0D9488]/5 border border-[#0D9488]/20">
              <span className="text-sm font-semibold text-[#0D9488]">Growth</span>
              <span className={`text-lg font-bold ${analytics.revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {analytics.revenueGrowth >= 0 ? '+' : ''}{analytics.revenueGrowth}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-[#374151] dark:text-white mb-4">
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Successful Payments</span>
              <span className="ml-auto font-bold text-green-600 dark:text-green-400">
                {analytics.totalPayments || 0}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Failed Payments</span>
              <span className="ml-auto font-bold text-red-600 dark:text-red-400">
                {0}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Active Users</span>
              <span className="ml-auto font-bold text-blue-600 dark:text-blue-400">
                {analytics.activeUsers || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#374151] dark:text-white">
            Recent Payments
          </h3>
          <span className="text-sm text-gray-400">
            {analytics.recentPayments?.length || 0} transactions
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Booking</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentPayments?.length > 0 ? (
                analytics.recentPayments.map((payment) => (
                  <tr key={payment._id} className="border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="py-3 text-sm text-[#374151] dark:text-white">
                      {payment.user?.name || 'Unknown'}
                    </td>
                    <td className="py-3 text-sm text-gray-500 dark:text-gray-400">
                      {payment.booking?.bookingCode || 'N/A'}
                    </td>
                    <td className="py-3 text-sm font-medium text-[#0D9488]">
                      ${payment.amount}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        payment.status === 'paid' ? 'bg-[#0D9488]/10 text-[#0D9488]' :
                        payment.status === 'pending' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                        payment.status === 'refunded' ? 'bg-gray-100 text-gray-500' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No recent payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentAnalytics;