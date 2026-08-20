// src/pages/ResetPassword.jsx
// ✅ FIXED: Use useSearchParams to read token from query string

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle, Loader2, Shield, Sparkles } from "lucide-react";
import axios from "axios";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [checkingToken, setCheckingToken] = useState(true);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ─── Validate Token ──────────────────────────────────────────
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        setCheckingToken(false);
        setError("Invalid or missing reset token");
        return;
      }

      try {
        // Optional: Validate token before showing form
        const response = await axios.get(`${API}/validate-reset-token/${token}`);
        if (response.data.success) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setError("This reset link is invalid or has expired");
        }
      } catch (err) {
        setTokenValid(false);
        setError(err.response?.data?.message || "Invalid or expired reset token");
      } finally {
        setCheckingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!validatePassword(formData.password)) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${API}/reset-password/${token}`,
        {
          password: formData.password,
        }
      );

      setSubmitted(true);

      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Reset failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Checking Token ──────────────────────────────────────────
  if (checkingToken) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#0D9488] animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 mt-4">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // ─── Invalid Token ────────────────────────────────────────────
  if (tokenValid === false) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
            Invalid Reset Link
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {error || "This password reset link is invalid or has expired."}
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="mt-6 px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0f766e] transition"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  /* =========================
  SUCCESS SCREEN
  ========================= */
  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center animate-fade-in max-w-md w-full">
          <div className="relative">
            <div className="w-20 h-20 bg-[#0D9488]/10 dark:bg-[#0D9488]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20 animate-ping" />
              <CheckCircle className="w-10 h-10 text-[#0D9488]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
            Password Reset Successful! 🔐
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Redirecting to login...
          </p>
          <div className="mt-4 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#0D9488] animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#0D9488]/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#374151] dark:text-white">
            Create New Password
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Choose a strong and secure password
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-xl">

          {/* ERROR */}
          {error && (
            <div className="mb-4 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* PASSWORD */}
            <div>
              <label className="text-sm font-medium text-[#374151] dark:text-white">
                New Password
              </label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password: e.target.value,
                    })
                  }
                  className="w-full h-12 pl-10 pr-10 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Minimum 8 characters
              </p>
            </div>

            {/* CONFIRM */}
            <div>
              <label className="text-sm font-medium text-[#374151] dark:text-white">
                Confirm Password
              </label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full h-12 pl-10 pr-10 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Password strength:</span>
                  <span className={`font-semibold ${
                    formData.password.length >= 12 ? 'text-[#0D9488]' :
                    formData.password.length >= 8 ? 'text-[#F59E0B]' :
                    'text-red-500'
                  }`}>
                    {formData.password.length >= 12 ? 'Strong' :
                     formData.password.length >= 8 ? 'Medium' :
                     'Weak'}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition ${
                        formData.password.length >= level * 4
                          ? formData.password.length >= 12
                            ? 'bg-[#0D9488]'
                            : formData.password.length >= 8
                            ? 'bg-[#F59E0B]'
                            : 'bg-red-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Reset Password
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-gray-500 hover:text-[#0D9488] transition"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;