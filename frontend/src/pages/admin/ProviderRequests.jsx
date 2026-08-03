// src/pages/admin/ProviderRequests.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  Users,
  Eye,
  User,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  CreditCard,
  FileText,
  Image,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Clock,
  Clock as ClockIcon,
  MapPin as MapPinIcon,
  BookOpen,
  ExternalLink,
  Download,
  Calendar,
  DollarSign,
  Shield,
  RefreshCw,
} from "lucide-react";
import {
  getProviderRequests,
  updateProviderRequest,
} from "../../services/adminService";

// ===============================
// AI TOUR COLORS
// ===============================
const TEAL = "#0D9488";
const GOLD = "#F59E0B";
const SLATE = "#374151";

// ===============================
// HELPERS
// ===============================
const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ===============================
// SKELETON LOADER
// ===============================
const SkeletonRow = () => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm animate-pulse">
    <div className="flex flex-wrap lg:flex-nowrap justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-48" />
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl w-24" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
    </div>
    <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-28" />
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-24" />
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-24" />
    </div>
  </div>
);

// ===============================
// STATUS BADGE
// ===============================
const StatusBadge = ({ status, size = "default" }) => {
  const styles = {
    approved: {
      bg: "bg-[#0D9488]/10",
      text: "text-[#0D9488]",
      border: "border-[#0D9488]/20",
      darkBg: "dark:bg-[#0D9488]/20",
      darkText: "dark:text-[#0D9488]",
      icon: CheckCircle,
    },
    rejected: {
      bg: "bg-red-100",
      text: "text-red-600",
      border: "border-red-500/20",
      darkBg: "dark:bg-red-500/20",
      darkText: "dark:text-red-400",
      icon: XCircle,
    },
    needs_information: {
      bg: "bg-[#F59E0B]/10",
      text: "text-[#F59E0B]",
      border: "border-[#F59E0B]/20",
      darkBg: "dark:bg-[#F59E0B]/20",
      darkText: "dark:text-[#F59E0B]",
      icon: AlertCircle,
    },
    pending: {
      bg: "bg-gray-100",
      text: "text-gray-600",
      border: "border-gray-300/20",
      darkBg: "dark:bg-gray-800",
      darkText: "dark:text-gray-400",
      icon: Clock,
    },
  };

  const style = styles[status?.toLowerCase()] || styles.pending;
  const Icon = style.icon;
  const sizeClasses = size === "small" ? "px-2 py-1 text-xs" : "px-4 py-2 text-sm";

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-xl font-bold uppercase tracking-wide
        ${sizeClasses} ${style.bg} ${style.text} ${style.border}
        ${style.darkBg} ${style.darkText}
      `}
    >
      <Icon className="w-3.5 h-3.5" />
      {status === "needs_information" ? "Needs Info" : status || "Pending"}
    </span>
  );
};

// ===============================
// MAIN COMPONENT
// ===============================
const ProviderRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // ============= FETCH REQUESTS =============
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProviderRequests();
      const requestsList = data.requests || [];
      setRequests(requestsList);
      setFilteredRequests(requestsList);
    } catch (error) {
      console.error("Error fetching requests:", error);
      showNotification("Failed to load provider requests", "error");
      setRequests([]);
      setFilteredRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============= LOAD DATA ON MOUNT =============
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ============= SEARCH & FILTER =============
  useEffect(() => {
    let filtered = requests;

    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.businessName?.toLowerCase().includes(term) ||
          req.fullName?.toLowerCase().includes(term) ||
          req.email?.toLowerCase().includes(term) ||
          req.businessEmail?.toLowerCase().includes(term) ||
          req.country?.toLowerCase().includes(term) ||
          req.city?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    setFilteredRequests(filtered);
  }, [search, statusFilter, requests]);

  // ============= NOTIFICATION =============
  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ============= NAVIGATE TO DETAILS =============
 const viewDetails = useCallback((requestId) => {
  navigate(`/admin/provider-requests/${requestId}`);
}, [navigate]);
  // ============= HANDLE APPROVE =============
  const handleApprove = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to approve this provider?")) return;

    try {
      setActionLoading(id);
      await updateProviderRequest(id, "approved");
      showNotification("✅ Provider approved successfully!", "success");
      await fetchRequests();
    } catch (error) {
      console.error("Error approving provider:", error);
      showNotification(
        error.response?.data?.message || "Failed to approve provider",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  }, [fetchRequests, showNotification]);

  // ============= OPEN STATUS MODAL =============
  const openStatusModal = useCallback((request, status) => {
    setSelectedRequest(request);
    setSelectedStatus(status);
    setAdminNotes("");
    setShowModal(true);
  }, []);

  // ============= SUBMIT STATUS UPDATE =============
  const submitStatusUpdate = useCallback(async () => {
    if (!adminNotes.trim() && (selectedStatus === "rejected" || selectedStatus === "needs_information")) {
      showNotification("Please provide admin notes", "error");
      return;
    }

    try {
      setActionLoading("modal");
      await updateProviderRequest(
        selectedRequest._id,
        selectedStatus,
        adminNotes
      );
      setShowModal(false);
      showNotification(
        `✅ Provider ${selectedStatus.replace("_", " ")} successfully!`,
        "success"
      );
      await fetchRequests();
    } catch (error) {
      console.error("Error updating status:", error);
      showNotification(
        error.response?.data?.message || "Failed to update status",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  }, [selectedRequest, selectedStatus, adminNotes, fetchRequests, showNotification]);

  // ============= GET STATUS COUNT =============
  const getStatusCount = useCallback((status) => {
    return requests.filter((r) => r.status === status).length;
  }, [requests]);

  // ============= RENDER =============
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mt-2 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
            <div className="h-12 w-40 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6">
      
      {/* NOTIFICATION */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 max-w-md ${
          notification.type === "success"
            ? "bg-[#0D9488] text-white"
            : notification.type === "error"
            ? "bg-red-600 text-white"
            : "bg-[#F59E0B] text-white"
        }`}>
          {notification.type === "success" && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === "error" && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#374151] dark:text-white">
                Provider Verification
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage provider applications • {filteredRequests.length} requests
              </p>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by business name, email, or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none min-w-[160px]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending ({getStatusCount("pending")})</option>
            <option value="approved">Approved ({getStatusCount("approved")})</option>
            <option value="rejected">Rejected ({getStatusCount("rejected")})</option>
            <option value="needs_information">Needs Info ({getStatusCount("needs_information")})</option>
          </select>
        </div>

        {/* REQUESTS GRID */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">
              No provider requests found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "No providers have applied yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredRequests.map((request) => (
              <div
                key={request._id}
                className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-wrap lg:flex-nowrap justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="w-5 h-5 text-[#0D9488] flex-shrink-0" />
                      <h2 className="text-xl font-bold text-[#374151] dark:text-white truncate">
                        {request.businessName}
                      </h2>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 dark:text-gray-300">
                      <p className="flex items-center gap-2 text-sm truncate">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {request.fullName || request.user?.name || "N/A"}
                      </p>
                      <p className="flex items-center gap-2 text-sm truncate">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {request.email || request.user?.email || "N/A"}
                      </p>
                      <p className="flex items-center gap-2 text-sm truncate">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {request.phone || request.user?.phone || "N/A"}
                      </p>
                      <p className="flex items-center gap-2 text-sm truncate">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {[request.city, request.country].filter(Boolean).join(", ") || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <StatusBadge status={request.status} />
                    <span className="text-xs text-gray-400">
                      {formatDate(request.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => viewDetails(request._id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  

                  {request.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(request._id)}
                        disabled={actionLoading === request._id}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0D9488]/80 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === request._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>

                      <button
                        onClick={() => openStatusModal(request, "rejected")}
                        disabled={actionLoading === request._id}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>

                      <button
                        onClick={() => openStatusModal(request, "needs_information")}
                        disabled={actionLoading === request._id}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Need Info
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATUS SUMMARY */}
        {requests.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 text-center">
              <div className="text-2xl font-bold text-gray-700 dark:text-white">
                {requests.length}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 text-center">
              <div className="text-2xl font-bold text-[#F59E0B]">
                {getStatusCount("pending")}
              </div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 text-center">
              <div className="text-2xl font-bold text-[#0D9488]">
                {getStatusCount("approved")}
              </div>
              <div className="text-xs text-gray-500">Approved</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 text-center">
              <div className="text-2xl font-bold text-red-600">
                {getStatusCount("rejected")}
              </div>
              <div className="text-xs text-gray-500">Rejected</div>
            </div>
          </div>
        )}
      </div>

      {/* STATUS UPDATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#374151] dark:text-white">
                Admin Notes
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mt-1">
              Status:{" "}
              <span className="font-semibold text-[#F59E0B]">
                {selectedStatus?.replace("_", " ")}
              </span>
            </p>

            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={5}
              placeholder="Enter admin notes (reason for rejection or additional info)..."
              className="w-full mt-4 p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition resize-none"
            />

            <button
              onClick={submitStatusUpdate}
              disabled={actionLoading === "modal"}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg hover:scale-[1.02] transition disabled:opacity-50"
            >
              {actionLoading === "modal" ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderRequests;