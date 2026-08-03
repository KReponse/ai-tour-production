// src/pages/admin/Providers.jsx
// ✅ COMPLETE FIXED - Added image support for logos with mediaHelpers

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Ban,
  Eye,
  Search,
  Sparkles,
  Users,
  Mail,
  Shield,
  Clock,
} from "lucide-react";

// ✅ FIXED: Import media helper for images
import { getImageUrl } from '../../utils/mediaHelpers';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Providers = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const token = localStorage.getItem("token");

  const fetchProviders = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/provider-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const requests = data.requests || [];
      
      const transformedProviders = requests.map((req) => ({
        _id: req._id,
        name: req.businessName || req.fullName || req.user?.name || "Unnamed",
        email: req.businessEmail || req.user?.email || "",
        phone: req.businessPhone || req.phone || "",
        verificationStatus: req.status || "pending",
        businessName: req.businessName,
        businessType: req.businessType,
        fullName: req.fullName,
        country: req.country,
        city: req.city,
        price: req.price,
        currency: req.currency,
        description: req.description,
        logo: req.logo,
        coverImage: req.coverImage,
        user: req.user,
        reviewedBy: req.reviewedBy,
        adminNotes: req.adminNotes,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        reviewedAt: req.reviewedAt,
        languages: req.languages || [],
        specializations: req.specializations || [],
        yearsOfExperience: req.yearsOfExperience,
        website: req.website,
        facebook: req.facebook,
        instagram: req.instagram,
        twitter: req.twitter,
        linkedin: req.linkedin,
        youtube: req.youtube,
        tiktok: req.tiktok,
        paymentMethod: req.paymentMethod,
        bankName: req.bankName,
        accountName: req.accountName,
        accountNumber: req.accountNumber,
        mobileMoney: req.mobileMoney,
      }));
      
      setProviders(transformedProviders);
    } catch (err) {
      console.error("❌ Error fetching provider requests:", err);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const updateStatus = async (id, action, reason = "") => {
    try {
      setActionLoading(id);
      
      const statusMap = {
        approve: "approved",
        reject: "rejected",
        suspend: "rejected",
      };
      
      const status = statusMap[action] || action;
      
      await axios.patch(
        `${API}/admin/provider-requests/${id}`,
        { 
          status,
          adminNotes: reason || (action === "suspend" ? "Account suspended by admin" : "")
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await fetchProviders();
    } catch (err) {
      console.error("❌ Error updating provider status:", err);
      alert(err.response?.data?.message || "Failed to update provider status");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = providers.filter((p) => {
    const name = p?.name || p?.businessName || "";
    const email = p?.email || "";
    const status = p?.verificationStatus || p?.status || "";

    const matchStatus = filter === "all" ? true : status === filter;
    const matchSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());

    return matchStatus && matchSearch;
  });

  const statusBadge = (status) => {
    const styles = {
      pending: {
        bg: "bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20",
        text: "text-[#F59E0B] dark:text-[#F59E0B]",
        icon: Clock,
      },
      approved: {
        bg: "bg-[#0D9488]/10 dark:bg-[#0D9488]/20",
        text: "text-[#0D9488] dark:text-[#0D9488]",
        icon: CheckCircle,
      },
      rejected: {
        bg: "bg-red-100 dark:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
        icon: XCircle,
      },
      suspended: {
        bg: "bg-gray-200 dark:bg-gray-700",
        text: "text-gray-700 dark:text-gray-300",
        icon: Ban,
      },
      under_review: {
        bg: "bg-[#0D9488]/10 dark:bg-[#0D9488]/20",
        text: "text-[#0D9488] dark:text-[#0D9488]",
        icon: Clock,
      },
      needs_information: {
        bg: "bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20",
        text: "text-[#F59E0B] dark:text-[#F59E0B]",
        icon: Clock,
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
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading providers...</p>
      </div>
    );
  }

  const statusCounts = {
    all: providers.length,
    pending: providers.filter(p => p.verificationStatus === 'pending').length,
    approved: providers.filter(p => p.verificationStatus === 'approved').length,
    rejected: providers.filter(p => p.verificationStatus === 'rejected').length,
    suspended: providers.filter(p => p.verificationStatus === 'suspended').length,
    needs_information: providers.filter(p => p.verificationStatus === 'needs_information').length,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#374151] dark:text-white">
              Providers Approval
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Super admin verification & control panel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Sparkles className="w-4 h-4 text-[#0D9488]" />
          <span>{providers.length} total provider requests</span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "rejected", "suspended", "needs_information"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 capitalize ${
                filter === s
                  ? "bg-[#0D9488] text-white shadow-lg shadow-[#0D9488]/30"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {s === "needs_information" ? "Needs Info" : s} ({statusCounts[s] || 0})
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-[#0D9488] transition">
          <Search size={16} className="text-gray-400" />
          <input
            placeholder="Search providers..."
            className="outline-none bg-transparent text-sm dark:text-white placeholder:text-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Provider/Business</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p>No provider requests found</p>
                  <p className="text-sm">Try adjusting your filters or search</p>
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const badge = statusBadge(p.verificationStatus);
                const StatusIcon = badge.icon;

                // ✅ Get logo URL using media helper
                const logoUrl = p.logo ? getImageUrl(p.logo) : null;

                return (
                  <tr key={p._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* ✅ Logo with image support */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                          {logoUrl ? (
                            <img 
                              src={logoUrl} 
                              alt={p.businessName || p.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const parent = e.target.parentElement;
                                if (parent) {
                                  const initial = (p.businessName || p.name || 'B').charAt(0);
                                  parent.textContent = initial;
                                  parent.className = 'w-8 h-8 rounded-full bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white text-xs font-bold flex-shrink-0';
                                }
                              }}
                            />
                          ) : (
                            (p.businessName || p.name || 'B').charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-[#374151] dark:text-white block">
                            {p.businessName || p.name || "Unnamed"}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 block">
                            {p.fullName || ""}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{p.email}</td>
                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {p.businessType?.replace(/_/g, " ") || "—"}
                    </td>

                    {/* STATUS */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {p.verificationStatus === "needs_information" ? "Needs Info" : p.verificationStatus}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => updateStatus(p._id, "approve")}
                        disabled={actionLoading === p._id}
                        className="bg-[#0D9488] hover:bg-[#0D9488]/80 text-white px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-300 text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === p._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>

                      <button
                        onClick={() => {
                          const reason = prompt("Rejection reason:");
                          if (reason !== null) updateStatus(p._id, "reject", reason || "No reason provided");
                        }}
                        disabled={actionLoading === p._id}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-300 text-sm font-medium disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>

                      <button
                        onClick={() => {
                          const reason = prompt("Reason for requesting more information:");
                          if (reason !== null) updateStatus(p._id, "needs_information", reason || "More information required");
                        }}
                        disabled={actionLoading === p._id}
                        className="bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-white px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-300 text-sm font-medium disabled:opacity-50"
                      >
                        <Clock className="w-4 h-4" />
                        Need Info
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <span>Showing {filtered.length} of {providers.length} provider requests</span>
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default Providers;