// src/pages/admin/AdminDashboard.jsx
// ✅ COMPLETE FIXED - Improved error handling, loading states, and data fetching

import {
  useEffect,
  useState,
  useCallback,
} from "react";

import axios from "axios";

import {
  Users,
  UserCheck,
  MapPin,
  Calendar,
  Mail,
  TrendingUp,
  DollarSign,
  Loader2,
  Sparkles,
  Shield,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  ClipboardList,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";

// ✅ Import Payment Analytics
import PaymentAnalytics from '../../components/admin/PaymentAnalytics';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    listings: {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      suspended: 0,
    },
    tours: {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
    },
    users: {
      providers: 0,
      travelers: 0,
      admins: 0,
    },
    providerRequests: {
      pending: 0,
      approved: 0,
      rejected: 0,
    },
    bookings: {
      total: 0,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
    },
    revenue: {
      totalRevenue: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const token = localStorage.getItem("token");

  // ===============================
  // FETCH STATS
  // ===============================
  const fetchStats = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // ✅ Check if token exists
      if (!token) {
        setError("Authentication required. Please login.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data } = await axios.get(`${API}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("✅ Admin stats:", data);
      
      // ✅ Safely extract stats with fallbacks
      const statsData = data?.stats || data || {};
      
      setStats({
        listings: {
          total: statsData.listings?.total || statsData.tours?.total || 0,
          approved: statsData.listings?.approved || statsData.tours?.approved || 0,
          pending: statsData.listings?.pending || statsData.tours?.pending || 0,
          rejected: statsData.listings?.rejected || statsData.tours?.rejected || 0,
          suspended: statsData.listings?.suspended || 0,
        },
        tours: {
          total: statsData.tours?.total || statsData.listings?.total || 0,
          approved: statsData.tours?.approved || statsData.listings?.approved || 0,
          pending: statsData.tours?.pending || statsData.listings?.pending || 0,
          rejected: statsData.tours?.rejected || statsData.listings?.rejected || 0,
        },
        users: {
          providers: statsData.users?.providers || 0,
          travelers: statsData.users?.travelers || 0,
          admins: statsData.users?.admins || 0,
        },
        providerRequests: {
          pending: statsData.providerRequests?.pending || 0,
          approved: statsData.providerRequests?.approved || 0,
          rejected: statsData.providerRequests?.rejected || 0,
        },
        bookings: {
          total: statsData.bookings?.total || 0,
          confirmed: statsData.bookings?.confirmed || 0,
          pending: statsData.bookings?.pending || 0,
          cancelled: statsData.bookings?.cancelled || 0,
        },
        revenue: {
          totalRevenue: statsData.revenue?.totalRevenue || statsData.totalRevenue || 0,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching admin stats:", error);
      
      if (error.response?.status === 401) {
        setError("Your session has expired. Please login again.");
        // Optionally redirect to login
        // setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 403) {
        setError("You don't have permission to access the admin dashboard.");
      } else {
        setError(error.response?.data?.message || "Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ===============================
  // CARDS DATA
  // ===============================
  const cards = [
    {
      title: "Total Users",
      value: stats.users?.travelers || 0,
      icon: Users,
      gradient: "from-[#0D9488] to-[#0f766e]",
      textColor: "text-[#0D9488]",
    },
    {
      title: "Providers",
      value: stats.users?.providers || 0,
      icon: UserCheck,
      gradient: "from-[#F59E0B] to-[#d97706]",
      textColor: "text-[#F59E0B]",
    },
    {
      title: "Total Listings",
      value: stats.listings?.total || 0,
      icon: ClipboardList,
      gradient: "from-[#0D9488] to-[#0f766e]",
      textColor: "text-[#0D9488]",
    },
    {
      title: "Total Bookings",
      value: stats.bookings?.total || 0,
      icon: Calendar,
      gradient: "from-[#F59E0B] to-[#d97706]",
      textColor: "text-[#F59E0B]",
    },
    {
      title: "Provider Requests",
      value: stats.providerRequests?.pending || 0,
      icon: Building2,
      gradient: "from-[#374151] to-[#1f2937]",
      textColor: "text-[#374151] dark:text-white",
    },
    {
      title: "Total Revenue",
      value: `$${stats.revenue?.totalRevenue || 0}`,
      icon: DollarSign,
      gradient: "from-[#0D9488] to-[#F59E0B]",
      textColor: "text-[#0D9488]",
    },
  ];

  // ===============================
  // CHART DATA
  // ===============================
  const chartData = [
    { name: "Users", value: stats.users?.travelers || 0 },
    { name: "Providers", value: stats.users?.providers || 0 },
    { name: "Listings", value: stats.listings?.total || 0 },
    { name: "Bookings", value: stats.bookings?.total || 0 },
  ];

  // ===============================
  // LISTING STATUS DATA
  // ===============================
  const listingStatusData = [
    { name: "Approved", value: stats.listings?.approved || 0, color: "#0D9488" },
    { name: "Pending", value: stats.listings?.pending || 0, color: "#F59E0B" },
    { name: "Rejected", value: stats.listings?.rejected || 0, color: "#EF4444" },
    { name: "Suspended", value: stats.listings?.suspended || 0, color: "#6B7280" },
  ];

  // ===============================
  // REFRESH HANDLER
  // ===============================
  const handleRefresh = () => {
    fetchStats(true);
  };

  // ===============================
  // LOADING
  // ===============================
  if (loading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  // ===============================
  // ERROR
  // ===============================
  if (error) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="space-y-8 animate-fade-in">

      {/* HEADER */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#374151] dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                AI Tour Rwanda platform overview
              </p>
            </div>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Loader2 className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {card.title}
                  </p>
                  <h2 className={`text-3xl font-black mt-2 ${card.textColor}`}>
                    {card.value}
                  </h2>
                </div>
                <div
                  className={`p-4 rounded-2xl bg-gradient-to-r ${card.gradient} text-white group-hover:scale-110 transition-all duration-300 shadow-lg`}
                >
                  <Icon size={25} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CHART AREA */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-xl text-[#374151] dark:text-white">
              Platform Growth
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              Overview
            </span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  borderColor: '#e5e7eb',
                  borderRadius: '12px',
                  padding: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0D9488"
                strokeWidth={4}
                dot={{ fill: '#0D9488', r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Revenue Card */}
          <div className="rounded-3xl p-6 text-white bg-gradient-to-br from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30">
            <TrendingUp size={35} className="opacity-80" />
            <h2 className="text-2xl font-black mt-4">Revenue</h2>
            <p className="opacity-80 mt-2 text-sm">Current platform earnings</p>
            <h1 className="text-4xl font-black mt-5">
              ${stats.revenue?.totalRevenue || 0}
            </h1>
          </div>

          {/* Pending Requests */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Pending Provider Requests
                </p>
                <h2 className="text-4xl font-black text-[#F59E0B] mt-3">
                  {stats.providerRequests?.pending || 0}
                </h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#F59E0B]" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
              Awaiting review
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Total Revenue</p>
                <p className="text-lg font-bold text-[#0D9488]">
                  ${stats.revenue?.totalRevenue || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Conversion Rate</p>
                <p className="text-lg font-bold text-[#F59E0B]">
                  {stats.users?.travelers > 0 
                    ? Math.round(((stats.bookings?.total || 0) / (stats.users?.travelers || 1)) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listing Status Chart */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-xl text-[#374151] dark:text-white">
            Listing Status
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            {listingStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1 text-xs">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-500">{item.name}</span>
                <span className="font-bold text-[#374151] dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={listingStatusData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis type="category" dataKey="name" stroke="#9ca3af" width={80} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {listingStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ Payment Analytics Section */}
      <PaymentAnalytics />
    </div>
  );
};

export default AdminDashboard;