// src/pages/admin/Requests.jsx

import { useEffect, useState } from "react";
import axios from "axios";
import { 
  Loader2, 
  MapPin, 
  DollarSign, 
  User, 
  Sparkles,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Mail,
  Phone,
} from "lucide-react";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ FIX: Remove /admin from base URL
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const token = localStorage.getItem("token");

  const fetchRequests = async () => {
    try {
      // ✅ FIX: Use correct endpoint
      const res = await axios.get(`${API}/admin/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error("❌ Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  const filterRequests = () => {
    let filtered = [...requests];

    // Search
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.user?.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredRequests(filtered);
  };

  // Status colors with AI Tour colors
  const getStatusBadge = (status) => {
    const styles = {
      pending: {
        bg: "bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20",
        text: "text-[#F59E0B] dark:text-[#F59E0B]",
        icon: Clock,
        label: "Pending",
      },
      accepted: {
        bg: "bg-[#0D9488]/10 dark:bg-[#0D9488]/20",
        text: "text-[#0D9488] dark:text-[#0D9488]",
        icon: CheckCircle,
        label: "Accepted",
      },
      approved: {
        bg: "bg-[#0D9488]/10 dark:bg-[#0D9488]/20",
        text: "text-[#0D9488] dark:text-[#0D9488]",
        icon: CheckCircle,
        label: "Approved",
      },
      rejected: {
        bg: "bg-red-100 dark:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
        icon: XCircle,
        label: "Rejected",
      },
    };
    return styles[status] || styles.pending;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading requests...</p>
      </div>
    );
  }

  const statusCounts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    accepted: requests.filter((r) => r.status === "accepted").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#374151] dark:text-white">
              Travel Requests
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Manage traveler trip requests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{requests.length} total requests</span>
        </div>
      </div>

      {/* SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by traveler name, destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          <option value="all">All ({statusCounts.all})</option>
          <option value="pending">Pending ({statusCounts.pending})</option>
          <option value="accepted">Accepted ({statusCounts.accepted})</option>
          <option value="approved">Approved ({statusCounts.approved})</option>
          <option value="rejected">Rejected ({statusCounts.rejected})</option>
        </select>
      </div>

      {/* EMPTY STATE */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
            No Requests Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Travel requests will appear here once users submit them."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm">
          <table className="w-full">
            {/* HEADER */}
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Traveler
                </th>
                <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Destination
                </th>
                <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Budget
                </th>
                <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Duration
                </th>
                <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Status
                </th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {filteredRequests.map((request) => {
                const statusStyle = getStatusBadge(request.status);
                const StatusIcon = statusStyle.icon;

                return (
                  <tr
                    key={request._id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white text-xs font-bold">
                          {request.user?.name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-medium text-[#374151] dark:text-white">
                            {request.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {request.user?.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-[#374151] dark:text-white">
                      {request.destination || "N/A"}
                    </td>

                    <td className="p-4">
                      <span className="font-semibold text-[#0D9488]">
                        ${request.budget || 0}
                      </span>
                    </td>

                    <td className="p-4 text-gray-600 dark:text-gray-300">
                      {request.duration || "N/A"}
                    </td>

                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusStyle.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>Showing {filteredRequests.length} of {requests.length} requests</span>
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;