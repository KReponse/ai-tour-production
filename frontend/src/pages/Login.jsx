// frontend/src/pages/Login.jsx
// ✅ UPDATED - Enhanced error handling for login attempts and account lock

import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, Sparkles, ArrowRight, AlertCircle, Clock } from "lucide-react";
import { loginUser } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import logo from "../assets/images/logo.png";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // ✅ Prevent duplicate submissions
  const isSubmitting = useRef(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // ✅ Clear error on typing
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting.current || loading) {
      console.log("⏳ Submission already in progress");
      return;
    }

    try {
      isSubmitting.current = true;
      setLoading(true);
      setError(null);

      const data = await loginUser(formData);

      console.log("🔐 Login response:", data);

      if (data.accessToken) {
        localStorage.setItem("token", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
        
        login(data.user, data.accessToken);

        if (data.user?.role === "admin") {
          navigate("/admin");
        } else if (data.user?.role === "provider") {
          navigate("/provider/dashboard");
        } else {
          navigate("/");
        }
      } else {
        if (data.token) {
          login(data.user, data.token);
          navigate("/");
        } else {
          setError({
            type: "error",
            message: "Login successful but no token received"
          });
        }
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      
      const errorData = error.response?.data;
      
      // ✅ Handle structured error responses
      if (errorData) {
        // ✅ Account locked
        if (errorData.code === 'ACCOUNT_LOCKED') {
          const lockedUntil = errorData.lockedUntil 
            ? new Date(errorData.lockedUntil).toLocaleTimeString()
            : 'a few minutes';
          
          setError({
            type: 'locked',
            message: errorData.message || 'Account temporarily locked.',
            lockedUntil: lockedUntil,
            canResetPassword: errorData.canResetPassword || true,
            action: errorData.action
          });
          return;
        }
        
        // ✅ Invalid credentials with remaining attempts
        if (errorData.code === 'INVALID_CREDENTIALS' || errorData.remainingAttempts !== undefined) {
          const remaining = errorData.remainingAttempts || 0;
          const suggestReset = errorData.suggestResetPassword || false;
          
          setError({
            type: 'attempts',
            message: errorData.message || 'Invalid credentials.',
            remainingAttempts: remaining,
            maxAttempts: errorData.maxAttempts || 5,
            suggestResetPassword: suggestReset,
            action: errorData.action
          });
          return;
        }
      }
      
      // ✅ Fallback error
      setError({
        type: 'error',
        message: error.response?.data?.message || error.message || "Login failed"
      });
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  // ─── Render Error Message ──────────────────────────────────────

  const renderError = () => {
    if (!error) return null;

    // ✅ Account Locked
    if (error.type === 'locked') {
      return (
        <div className="mb-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 dark:text-red-400 font-semibold">
                {error.message}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Your account is locked until approximately <strong>{error.lockedUntil}</strong>.
              </p>
              {error.canResetPassword && (
                <div className="mt-3">
                  <Link
                    to="/forgot-password"
                    className="text-[#0D9488] font-semibold hover:underline text-sm"
                  >
                    Forgot Password? Reset it now →
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Password reset works even when your account is locked.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ✅ Attempts remaining
    if (error.type === 'attempts') {
      const showResetSuggestion = error.suggestResetPassword;
      
      return (
        <div className={`mb-5 rounded-2xl border p-4 ${
          error.remainingAttempts <= 1
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              error.remainingAttempts <= 1 ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <div>
              <p className={`${
                error.remainingAttempts <= 1 
                  ? 'text-red-700 dark:text-red-400' 
                  : 'text-yellow-700 dark:text-yellow-400'
              }`}>
                {error.message}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#374151] dark:text-white">
                    Attempts remaining:
                  </span>
                  <span className={`text-sm font-bold ${
                    error.remainingAttempts <= 1 
                      ? 'text-red-500' 
                      : 'text-[#F59E0B]'
                  }`}>
                    {error.remainingAttempts} / {error.maxAttempts}
                  </span>
                </div>
                {error.remainingAttempts <= 3 && (
                  <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        error.remainingAttempts <= 1 ? 'bg-red-500' : 'bg-[#F59E0B]'
                      }`}
                      style={{ width: `${(error.remainingAttempts / error.maxAttempts) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              {showResetSuggestion && (
                <div className="mt-3">
                  <Link
                    to="/forgot-password"
                    className="text-[#0D9488] font-semibold hover:underline text-sm"
                  >
                    Forgot Password? Reset it now →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ✅ Generic error
    return (
      <div className="mb-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
        {error.message}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D9488]/5 via-white to-[#F59E0B]/5 dark:from-gray-950 dark:via-gray-900 dark:to-black px-4 py-10">

      <div className="w-full max-w-md">
        {/* LOGO */}
        <div className="text-center mb-8">
          <div className="w-28 h-28 mx-auto rounded-[32px] bg-white dark:bg-gray-900 flex items-center justify-center shadow-2xl shadow-[#0D9488]/20 mb-5 p-3 border border-gray-100 dark:border-gray-800">
            <img src={logo} alt="AI Tour Logo" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-4xl font-black text-[#374151] dark:text-white">
            AI Tour
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0D9488]" />
            Discover. Plan. Travel Smarter.
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/20 dark:border-gray-800 p-8">

          <div className="mb-6">
            <h2 className="text-3xl font-black text-[#374151] dark:text-white">
              Welcome Back
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Sign in to continue your journey
            </p>
          </div>

          {renderError()}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#374151] dark:text-white">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white focus:border-[#0D9488] focus:ring-4 focus:ring-[#0D9488]/20 outline-none transition disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#374151] dark:text-white">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  required
                  disabled={loading}
                  className="w-full h-14 pl-12 pr-14 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white focus:border-[#0D9488] focus:ring-4 focus:ring-[#0D9488]/20 outline-none transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-[#0D9488] font-semibold hover:text-[#0D9488]/80 transition"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-xl shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing In...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Login
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Don't have an account?</p>
            <Link
              to="/register"
              className="inline-block mt-2 font-bold text-[#0D9488] hover:text-[#0D9488]/80 transition"
            >
              Create Account →
            </Link>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              <span className="font-medium text-[#0D9488]">💡 Demo Credentials</span><br />
              Email: demo@aitour.rw | Password: demo123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;