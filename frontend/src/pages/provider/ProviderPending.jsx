// src/pages/ProviderPending.jsx
// ✅ COMPLETE FIXED - Prevent infinite redirect loop with useRef and proper role checks

import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle,
  Home,
  LogOut,
  Building2,
  ShieldCheck,
  Sparkles,
  Loader2,
} from "lucide-react";

import logo from "../../assets/images/logo.png";
import { useAuth } from "../../contexts/AuthContext";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const ProviderPending = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // ✅ Use ref to prevent infinite redirect loop
  const hasRedirectedRef = useRef(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /* =========================
  ✅ FIXED: AUTO REDIRECT IF APPROVED - Only once
  ========================= */
  useEffect(() => {
    // ✅ Only redirect once to prevent infinite loop
    if (!hasRedirectedRef.current) {
      const userRole = user?.role?.toLowerCase();
      const verificationStatus = user?.verificationStatus?.toLowerCase();
      
      console.log('📌 ProviderPending - User role:', userRole);
      console.log('📌 ProviderPending - Verification status:', verificationStatus);
      
      // ✅ Check if user is approved provider
      if (userRole === "provider" && verificationStatus === "approved") {
        hasRedirectedRef.current = true;
        console.log('✅ Provider approved, redirecting to dashboard...');
        navigate("/provider/dashboard");
      }
    }
  }, [user, navigate]);

  // If user is already approved, show loading briefly before redirect
  const userRole = user?.role?.toLowerCase();
  const verificationStatus = user?.verificationStatus?.toLowerCase();
  
  if (userRole === "provider" && verificationStatus === "approved") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0D9488]/5 via-white to-[#F59E0B]/5 dark:from-gray-950 dark:via-gray-900 dark:to-black">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-[#0D9488]/5 via-white to-[#F59E0B]/5 dark:from-gray-950 dark:via-gray-900 dark:to-black">

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/20 dark:border-gray-800 p-8 md:p-10 text-center"
      >

        {/* LOGO */}
        <div className="w-24 h-24 mx-auto rounded-[30px] bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-xl shadow-[#0D9488]/30 mb-6">
          <img src={logo} alt="AI Tour Logo" className="w-14 h-14 object-contain" />
        </div>

        <h1 className="text-4xl font-black text-[#374151] dark:text-white">
          AI Tour
        </h1>

        <p className="mt-2 text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0D9488]" />
          Smart Travel Powered by AI
        </p>

        {/* STATUS ICON */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mt-8 w-20 h-20 mx-auto rounded-full bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20 flex items-center justify-center border border-[#F59E0B]/20"
        >
          <Clock className="w-10 h-10 text-[#F59E0B]" />
        </motion.div>

        <h2 className="mt-6 text-2xl font-black text-[#374151] dark:text-white">
          Provider Account Pending
        </h2>

        <p className="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          Thank you for joining AI Tour. Your tourism business profile is currently under review by our admin team.
        </p>

        {/* STATUS CARD */}
        <div className="mt-8 p-5 rounded-2xl bg-[#F59E0B]/5 dark:bg-[#F59E0B]/10 border border-[#F59E0B]/20 dark:border-[#F59E0B]/30 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="font-bold text-[#374151] dark:text-white">
                Business Verification
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Waiting for admin approval
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Pending Review</span>
              <span>50%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "50%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-[#0D9488] to-[#F59E0B] rounded-full"
              />
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <div className="mt-6 space-y-3 text-left">
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <CheckCircle className="w-5 h-5 text-[#0D9488]" />
            Account created successfully
          </div>

          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <ShieldCheck className="w-5 h-5 text-[#0D9488]" />
            Secure provider verification
          </div>

          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <Clock className="w-5 h-5 text-[#F59E0B]" />
            Usually takes 24-48 hours
          </div>
        </div>

        {/* BUTTONS */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <Link
            to="/"
            className="h-14 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#0D9488]/30"
          >
            <Home size={20} />
            Home
          </Link>

          <button
            onClick={handleLogout}
            className="h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-bold text-[#374151] dark:text-white flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>

        {/* Support */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Need help?{' '}
            <a
              href="mailto:support@aitour.rw"
              className="text-[#0D9488] hover:underline font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ProviderPending;