// src/pages/ProviderStatus.jsx
// ✅ COMPLETE FIXED - Correct API endpoint

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw,
  ShieldCheck,
  Loader2,
  Sparkles,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ FIX: Use correct API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ProviderStatus = () => {
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("token");

  // ✅ Use ref to prevent duplicate fetches
  const hasFetchedRef = useRef(false);

  const fetchStatus = async () => {
    // ✅ Don't fetch if no token
    if (!token) {
      setError("Please login to view your provider status");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // ✅ FIX: Correct endpoint - /provider-request/my
      const endpoint = `${API_URL}/provider-request/my`;
      console.log('📌 Fetching status from:', endpoint);
      
      const { data } = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("✅ Provider status:", data);
      
      if (data && data.request) {
        setRequest(data.request);
      } else if (data && data.success === false) {
        setError(data.message || "Failed to fetch status");
      } else {
        setRequest(null);
      }
    } catch (error) {
      console.error("❌ Error fetching status:", error);
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

  // ✅ Only fetch once on mount
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchStatus();
    }
  }, []);

  // ✅ Auto redirect if approved
  useEffect(() => {
    if (request?.status === "approved") {
      const savedUser = localStorage.getItem('user');
      let userData = null;
      try {
        userData = JSON.parse(savedUser);
      } catch (e) {
        console.warn('⚠️ Could not parse user data');
      }
      
      if (userData?.role === "provider" && userData?.verificationStatus === "approved") {
        console.log('✅ Provider approved, redirecting to dashboard...');
        navigate("/provider/dashboard");
      }
    }
  }, [request, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0D9488]/5 via-white to-[#F59E0B]/5 dark:from-gray-950 dark:via-gray-900 dark:to-black">
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
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0D9488]/5 via-white to-[#F59E0B]/5 dark:from-gray-950 dark:via-gray-900 dark:to-black">
        <div className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 text-center border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Error Loading Status
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={fetchStatus}
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
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0D9488]/5 via-white to-[#F59E0B]/5 dark:from-gray-950 dark:via-gray-900 dark:to-black">
        <div className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 text-center border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#0D9488]/10 flex items-center justify-center mb-4">
            <Building2 className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            No Provider Application
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You haven't submitted a provider application yet.
          </p>
          <button
            onClick={() => navigate("/provider/request")}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition"
          >
            Apply Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0D9488]/5 via-white to-[#F59E0B]/5 dark:from-gray-950 dark:via-gray-900 dark:to-black">
      <div className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 text-center border border-gray-100 dark:border-gray-800">

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-md">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-black text-[#374151] dark:text-white">
            AI Tour Provider
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Application Status
        </p>

        {request.status === "pending" && (
          <div>
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-[#F59E0B]/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                <Clock className="w-10 h-10 text-[#F59E0B]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
              Waiting Approval
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">
              Your tourism business is being reviewed by AI Tour admin team.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-[#F59E0B]/5 dark:bg-[#F59E0B]/10 border border-[#F59E0B]/20">
              <div className="flex items-center gap-2 text-sm text-[#F59E0B]">
                <Clock className="w-4 h-4" />
                <span>Usually takes 24-48 hours</span>
              </div>
            </div>
            {request.businessName && (
              <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-left">
                <p className="text-xs text-gray-400">Business</p>
                <p className="font-semibold text-[#374151] dark:text-white">
                  {request.businessName}
                </p>
              </div>
            )}
          </div>
        )}

        {request.status === "approved" && (
          <div>
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-[#0D9488]/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-[#0D9488]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
              Approved! 🎉
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              Your provider account is active. Start managing tours.
            </p>
            <button
              onClick={() => navigate("/provider/dashboard")}
              className="mt-6 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
            >
              Go Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {request.status === "rejected" && (
          <div>
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-red-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
              Application Rejected
            </h2>
            <div className="mt-5 bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-200 dark:border-red-800 text-left">
              <h3 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Admin Notes
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mt-2">
                {request.adminNotes || "No reason provided"}
              </p>
            </div>
            <button
              onClick={() => navigate("/provider/request")}
              className="mt-6 px-8 py-3.5 rounded-2xl border-2 border-red-500 text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
            >
              Apply Again
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
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