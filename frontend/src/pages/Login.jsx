// frontend/src/pages/Login.jsx
// ✅ COMPLETE FIXED - Handles nested and flat response structures

import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, Sparkles, ArrowRight, AlertCircle, Clock } from "lucide-react";
import { loginUser } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import logo from "../assets/images/logo.png";

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

  const isSubmitting = useRef(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting.current || loading) {
      return;
    }

    try {
      isSubmitting.current = true;
      setLoading(true);
      setError(null);

      const response = await loginUser(formData);
      
      console.log("🔐 Full login response:", JSON.stringify(response, null, 2));

      // ✅ Handle multiple response structures
      let accessToken = null;
      let refreshToken = null;
      let user = null;

      // Case 1: Flat structure { accessToken, refreshToken, user }
      if (response.accessToken && response.user) {
        accessToken = response.accessToken;
        refreshToken = response.refreshToken;
        user = response.user;
        console.log("📦 Case 1: Flat structure");
      }
      // Case 2: Nested in data { data: { accessToken, refreshToken, user } }
      else if (response.data?.accessToken && response.data?.user) {
        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;
        user = response.data.user;
        console.log("📦 Case 2: Nested in data");
      }
      // Case 3: Nested in userData { userData: { accessToken, refreshToken, user } }
      else if (response.userData?.accessToken && response.userData?.user) {
        accessToken = response.userData.accessToken;
        refreshToken = response.userData.refreshToken;
        user = response.userData.user;
        console.log("📦 Case 3: Nested in userData");
      }
      // Case 4: Nested in result { result: { accessToken, refreshToken, user } }
      else if (response.result?.accessToken && response.result?.user) {
        accessToken = response.result.accessToken;
        refreshToken = response.result.refreshToken;
        user = response.result.user;
        console.log("📦 Case 4: Nested in result");
      }
      // Case 5: Token in token field
      else if (response.token && response.user) {
        accessToken = response.token;
        refreshToken = response.refreshToken;
        user = response.user;
        console.log("📦 Case 5: token field");
      }
      // Case 6: Check if response itself is the data from ResponseUtils.success
      else if (response.data?.data?.accessToken) {
        accessToken = response.data.data.accessToken;
        refreshToken = response.data.data.refreshToken;
        user = response.data.data.user;
        console.log("📦 Case 6: Deep nested in data.data");
      }
      // Case 7: Check if response is wrapped in success
      else if (response.success && response.data?.accessToken) {
        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;
        user = response.data.user;
        console.log("📦 Case 7: success wrapper");
      }

      console.log("📦 Extracted - Token:", !!accessToken, "User:", !!user);

      if (accessToken && user) {
        // ✅ Login successful
        const loggedIn = login(user, accessToken, refreshToken);
        
        if (loggedIn) {
          toast.success(`Welcome back, ${user.name || 'Traveler'}! 🎉`);
          
          // ✅ Navigate based on role
          if (user?.role === "admin") {
            navigate("/admin");
          } else if (user?.role === "provider") {
            navigate("/provider/dashboard");
          } else {
            navigate("/");
          }
          return;
        }
      }

      // ✅ If we have token but no user, try to get user from /auth/me
      if (accessToken && !user) {
        try {
          console.log("🔄 Token exists, fetching user from /auth/me...");
          const { getCurrentUser } = await import('../services/authService');
          const fetchedUser = await getCurrentUser();
          
          if (fetchedUser) {
            login(fetchedUser, accessToken, refreshToken);
            toast.success(`Welcome back, ${fetchedUser.name || 'Traveler'}! 🎉`);
            
            if (fetchedUser?.role === "admin") {
              navigate("/admin");
            } else if (fetchedUser?.role === "provider") {
              navigate("/provider/dashboard");
            } else {
              navigate("/");
            }
            return;
          }
        } catch (userError) {
          console.error("❌ Failed to fetch user:", userError);
        }
      }

      // ✅ If we reached here, something went wrong
      console.error("❌ Could not extract user data from response:", response);
      setError({
        type: "error",
        message: "Login successful but could not retrieve user data. Please try again."
      });

    } catch (error) {
      console.error("❌ Login error:", error);
      
      const errorData = error?.data || error?.response?.data || error;
      
      // ✅ Handle structured error responses
      if (errorData) {
        if (errorData.code === 'ACCOUNT_LOCKED') {
          const lockedUntil = errorData.lockedUntil 
            ? new Date(errorData.lockedUntil).toLocaleTimeString()
            : 'a few minutes';
          
          setError({
            type: 'locked',
            message: errorData.message || 'Account temporarily locked.',
            lockedUntil: lockedUntil,
            canResetPassword: errorData.canResetPassword || true,
          });
          return;
        }
        
        if (errorData.code === 'INVALID_CREDENTIALS' || errorData.remainingAttempts !== undefined) {
          const remaining = errorData.remainingAttempts || 0;
          
          setError({
            type: 'attempts',
            message: errorData.message || 'Invalid credentials.',
            remainingAttempts: remaining,
            maxAttempts: errorData.maxAttempts || 5,
            suggestResetPassword: errorData.suggestResetPassword || false,
          });
          return;
        }
      }
      
      // ✅ Fallback error
      setError({
        type: 'error',
        message: error?.message || errorData?.message || "Login failed"
      });
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  // ─── Render Error Message ──────────────────────────────────────

  const renderError = () => {
    if (!error) return null;

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
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (error.type === 'attempts') {
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
                <span className="text-sm font-medium text-[#374151] dark:text-white">
                  Attempts remaining: <span className="font-bold">{error.remainingAttempts} / {error.maxAttempts}</span>
                </span>
              </div>
              {error.suggestResetPassword && (
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
          <h1 className="text-4xl font-black text-[#374151] dark:text-white">AI Tour</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0D9488]" />
            Discover. Plan. Travel Smarter.
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/20 dark:border-gray-800 p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-black text-[#374151] dark:text-white">Welcome Back</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to continue your journey</p>
          </div>

          {renderError()}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#374151] dark:text-white">Email Address</label>
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
              <label className="block text-sm font-medium mb-2 text-[#374151] dark:text-white">Password</label>
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
              <Link to="/forgot-password" className="text-[#0D9488] font-semibold hover:text-[#0D9488]/80 transition">
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
                  Login <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Don't have an account?</p>
            <Link to="/register" className="inline-block mt-2 font-bold text-[#0D9488] hover:text-[#0D9488]/80 transition">
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