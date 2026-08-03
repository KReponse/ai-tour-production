// frontend/src/pages/admin/Users.jsx
// ✅ COMPLETE FIXED - Server-Side Pagination (Strategy B)
// ✅ Added: usePagination hook for pagination controls
// ✅ Added: Pagination component with page numbers, First/Last
// ✅ Added: Search, filters, sorting
// ✅ Added: Skeleton loader, Back to Top button

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Loader2,
  Shield,
  User,
  Search,
  UserCog,
  Sparkles,
  Mail,
  Users as UsersIcon,
  CheckCircle,
  XCircle,
  Filter,
  ChevronDown,
} from "lucide-react";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/Pagination";
import LoadingSkeleton from "../../components/ui/LoadingSkeleton";
import BackToTop from "../../components/ui/BackToTop";
import { PAGINATION } from "../../utils/constants";
import toast from "react-hot-toast";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ===============================
// MAIN COMPONENT
// ===============================
const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);

  const token = localStorage.getItem("token");

  // ── Notification ──
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ✅ usePagination hook for server-side pagination
  const {
    data: users,
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
      const response = await axios.get(`${API}/admin/users`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    initialParams: {
      role: 'all',
      limit: PAGINATION.DEFAULT_LIMIT,
      sort: '-createdAt',
    },
    dataKey: 'users',
  });

  // ── Handle Search ─────────────────────────────────────────────
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPaginationSearch(value);
  }, [setPaginationSearch]);

  // ── Handle Role Filter ────────────────────────────────────────
  const handleRoleFilter = useCallback((role) => {
    setRoleFilter(role);
    applyFilter('role', role);
  }, [applyFilter]);

  // ── Handle Sort Change ────────────────────────────────────────
  const handleSortChange = useCallback((e) => {
    const value = e.target.value;
    applyFilter('sort', value);
  }, [applyFilter]);

  // ✅ Update role with correct endpoint
  const updateRole = async (id, role) => {
    try {
      setActionLoading(id);
      await axios.put(
        `${API}/admin/users/${id}/role`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await refresh();
      showNotification(`User role updated to ${role}`, 'success');
      toast.success(`User role updated to ${role}`);
    } catch (error) {
      console.log("Role update error:", error);
      const message = error.response?.data?.message || "Failed to update role";
      showNotification(message, "error");
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  // Role colors with AI Tour colors
  const getRoleBadge = (role) => {
    const styles = {
      admin: {
        bg: "bg-[#0D9488]/10 dark:bg-[#0D9488]/20",
        text: "text-[#0D9488] dark:text-[#0D9488]",
        icon: Shield,
      },
      provider: {
        bg: "bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20",
        text: "text-[#F59E0B] dark:text-[#F59E0B]",
        icon: UserCog,
      },
      traveler: {
        bg: "bg-[#374151]/10 dark:bg-[#374151]/20",
        text: "text-[#374151] dark:text-white",
        icon: User,
      },
    };
    return styles[role] || styles.traveler;
  };

  // Role counts
  const roleCounts = {
    all: meta.total || 0,
    admin: users.filter(u => u.role === 'admin').length,
    provider: users.filter(u => u.role === 'provider').length,
    traveler: users.filter(u => u.role === 'traveler').length,
  };

  // ===============================
  // LOADING STATE
  // ===============================
  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-1" />
          </div>
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
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center h-96 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to Load Users</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
        <button onClick={refresh} className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition">Retry</button>
      </div>
    );
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* ── Notification ── */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl text-white flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-[#0D9488]' :
            notification.type === 'error' ? 'bg-red-500' :
            'bg-[#F59E0B]'
          }`}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#374151] dark:text-white">
              Users Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Manage system users and roles • {meta.total} users
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['all', 'admin', 'provider', 'traveler'].map((role) => (
            <button
              key={role}
              onClick={() => handleRoleFilter(role)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                roleFilter === role
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)} ({roleCounts[role] || 0})
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
          <option value="name">Name A-Z</option>
          <option value="-name">Name Z-A</option>
        </select>
      </div>

      {/* EMPTY STATE */}
      {users.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">No Users Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchTerm || roleFilter !== 'all' ? 'Try adjusting your search or filters' : 'Users will appear here once they register'}
          </p>
          {(searchTerm || roleFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
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
          <div className="overflow-x-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm">
            <table className="w-full">
              {/* HEADER */}
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">User</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Role</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>

              {/* BODY */}
              <tbody>
                {users.map((u) => {
                  const roleBadge = getRoleBadge(u?.role);
                  const RoleIcon = roleBadge.icon;
                  const currentRole = u?.role || "traveler";

                  return (
                    <tr
                      key={u?._id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
                    >
                      {/* NAME */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white text-xs font-bold">
                            {u?.name?.charAt(0) || "U"}
                          </div>
                          <span className="font-medium text-[#374151] dark:text-white">
                            {u?.name || "Unknown"}
                          </span>
                        </div>
                      </td>

                      {/* EMAIL */}
                      <td className="p-4 text-gray-600 dark:text-gray-300 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Mail size={14} className="text-[#0D9488]" />
                          {u?.email || "No email"}
                        </div>
                      </td>

                      {/* ROLE */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${roleBadge.bg} ${roleBadge.text}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {currentRole}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4">
                        <div className="flex gap-2 flex-wrap">
                          {/* Traveler Button */}
                          <button
                            onClick={() => updateRole(u._id, "traveler")}
                            disabled={actionLoading === u._id || currentRole === "traveler"}
                            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                              currentRole === "traveler"
                                ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                : "bg-gray-600 hover:bg-gray-700 text-white"
                            }`}
                          >
                            {actionLoading === u._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Traveler"
                            )}
                          </button>

                          {/* Provider Button */}
                          <button
                            onClick={() => updateRole(u._id, "provider")}
                            disabled={actionLoading === u._id || currentRole === "provider"}
                            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                              currentRole === "provider"
                                ? "bg-[#F59E0B]/20 dark:bg-[#F59E0B]/30 text-[#F59E0B] dark:text-[#F59E0B]"
                                : "bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-white"
                            }`}
                          >
                            Provider
                          </button>

                          {/* Admin Button */}
                          <button
                            onClick={() => updateRole(u._id, "admin")}
                            disabled={actionLoading === u._id || currentRole === "admin"}
                            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                              currentRole === "admin"
                                ? "bg-[#0D9488]/20 dark:bg-[#0D9488]/30 text-[#0D9488] dark:text-[#0D9488]"
                                : "bg-[#0D9488] hover:bg-[#0D9488]/80 text-white"
                            }`}
                          >
                            <Shield size={14} />
                            Admin
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

export default Users;