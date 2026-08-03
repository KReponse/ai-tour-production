// src/pages/ProviderStatus.jsx
// ✅ COMPLETE FIXED - Uses getMyProviderRequest service with proper error handling

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Building2,
  ArrowRight,
  ShieldCheck,
  User,
} from "lucide-react";
import { getMyProviderRequest } from "../services/providerService";
import { useAuth } from "../contexts/AuthContext";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const ProviderStatus = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Use refs to prevent duplicate fetches and redirects
  const hasFetchedRef = useRef(false);
  const hasRedirectedRef = useRef(false);

  // ✅ FIXED: Load request only once on mount
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      loadRequest();
    }
  }, []);

  const loadRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📌 Fetching provider request...');
      const data = await getMyProviderRequest();
      console.log("✅ Provider request:", data);
      
      if (data && data.request) {
        setRequest(data.request);
        // ✅ Refresh user to update role/status
        await refreshUser();
      } else if (data && data.success === false) {
        setError(data.message || "Failed to fetch status");
        setRequest(null);
      } else {
        setRequest(null);
      }
    } catch (error) {
      console.error("❌ Provider status error:", error);
      console.error("❌ Response status:", error.response?.status);
      console.error("❌ Response data:", error.response?.data);
      
      if (error.response?.status === 401) {
        setError("Your session has expired. Please login again.");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 404) {
        setError("No provider application found. Please apply first.");
      } else {
        setError(error.response?.data?.message || "Failed to fetch status");
      }
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Auto redirect if approved - only once
  useEffect(() => {
    if (
      !hasRedirectedRef.current &&
      user?.role === "provider" &&
      user?.verificationStatus === "approved"
    ) {
      hasRedirectedRef.current = true;
      console.log('✅ Provider approved, redirecting to dashboard...');
      navigate("/provider/dashboard");
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mt-4 mb-2">
            Error Loading Status
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={loadRequest}
              className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
            >
              Try Again
            </button>
            {error.includes("login") && (
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Go to Login
              </button>
            )}
            {error.includes("No provider application") && (
              <button
                onClick={() => navigate("/provider/request")}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition"
              >
                Apply Now
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#0D9488]/10 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h1 className="text-3xl font-black mt-5 text-[#374151] dark:text-white">
            Become AI Tour Provider
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-3">
            You have not submitted a provider application yet.
          </p>
          <button
            onClick={() => navigate("/provider/request")}
            className="mt-6 w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300"
          >
            Apply Now
          </button>
        </div>
      </div>
    );
  }

  // Status configurations
  const statusUI = {
    pending: {
      title: "Application Pending",
      message: "Your provider application is being reviewed by AI Tour Rwanda admin team.",
      icon: <Clock className="w-16 h-16 text-[#F59E0B]" />,
      badgeClass: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20",
      action: null,
    },
    approved: {
      title: "Provider Approved! 🎉",
      message: "Congratulations! You are now an official AI Tour service provider.",
      icon: <CheckCircle className="w-16 h-16 text-[#0D9488]" />,
      badgeClass: "bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20",
      action: {
        text: "Go To Provider Dashboard",
        onClick: () => navigate("/provider/dashboard"),
        gradient: "from-[#0D9488] to-[#F59E0B]",
      },
    },
    rejected: {
      title: "Application Rejected",
      message: request.adminNotes || "Your application was rejected. Please review and try again.",
      icon: <XCircle className="w-16 h-16 text-red-600" />,
      badgeClass: "bg-red-100 text-red-600 border border-red-200",
      action: {
        text: "Submit New Application",
        onClick: () => navigate("/provider/request"),
        gradient: "from-[#0D9488] to-[#F59E0B]",
      },
    },
  };

  const current = statusUI[request.status] || statusUI.pending;

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20 animate-ping" />
            {current.icon}
          </div>
        </div>

        {/* Title */}
        <div className="flex justify-center items-center gap-2 mt-5">
          <Sparkles className="w-5 h-5 text-[#F59E0B]" />
          <h1 className="text-3xl font-black text-[#374151] dark:text-white">
            {current.title}
          </h1>
        </div>

        {/* Message */}
        <p className="text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
          {current.message}
        </p>

        {/* Status Badge */}
        <div className={`mt-6 inline-block px-6 py-3 rounded-full font-bold capitalize ${current.badgeClass}`}>
          {request.status.replace("_", " ")}
        </div>

        {/* Business Info */}
        <div className="mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 text-left space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <Building2 className="w-4 h-4 text-[#0D9488]" />
            <span className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Business:</span> {request.businessName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-[#0D9488]" />
            <span className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Owner:</span> {request.fullName || "N/A"}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {current.action && (
          <button
            onClick={current.action.onClick}
            className={`mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold bg-gradient-to-r ${current.action.gradient} shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300`}
          >
            {current.action.text}
            <ArrowRight size={18} />
          </button>
        )}

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Need help?{' '}
            <a href="mailto:support@aitour.rw" className="text-[#0D9488] hover:underline font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProviderStatus;