// frontend/src/pages/Register.jsx
// ✅ COMPLETE FIXED - Same response handling as login

import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  Globe,
  Sparkles,
  ShieldCheck,
  Loader2,
  Building2,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { registerUser } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/images/logo.png";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "Rwanda",
    password: "",
    role: "traveler",
  });

  // ✅ Prevent duplicate submissions
  const isSubmitting = useRef(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Prevent duplicate submissions
    if (isSubmitting.current || loading) {
      console.log("⏳ Submission already in progress");
      return;
    }

    // Validation
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      isSubmitting.current = true;
      setLoading(true);

      const response = await registerUser(formData);
      
      console.log("📝 Full registration response:", JSON.stringify(response, null, 2));

      // ✅ Handle multiple response structures (same as login)
      let accessToken = null;
      let refreshToken = null;
      let user = null;
      let requiresVerification = false;

      // Case 1: Flat structure { accessToken, refreshToken, user }
      if (response.accessToken && response.user) {
        accessToken = response.accessToken;
        refreshToken = response.refreshToken;
        user = response.user;
        requiresVerification = response.requiresVerification || false;
        console.log("📦 Case 1: Flat structure");
      }
      // Case 2: Nested in data { data: { accessToken, refreshToken, user } }
      else if (response.data?.accessToken && response.data?.user) {
        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;
        user = response.data.user;
        requiresVerification = response.data.requiresVerification || false;
        console.log("📦 Case 2: Nested in data");
      }
      // Case 3: Nested in userData
      else if (response.userData?.accessToken && response.userData?.user) {
        accessToken = response.userData.accessToken;
        refreshToken = response.userData.refreshToken;
        user = response.userData.user;
        requiresVerification = response.userData.requiresVerification || false;
        console.log("📦 Case 3: Nested in userData");
      }
      // Case 4: Token in token field
      else if (response.token && response.user) {
        accessToken = response.token;
        refreshToken = response.refreshToken;
        user = response.user;
        requiresVerification = response.requiresVerification || false;
        console.log("📦 Case 4: token field");
      }
      // Case 5: Response from ResponseUtils.created
      else if (response.data?.data?.accessToken) {
        accessToken = response.data.data.accessToken;
        refreshToken = response.data.data.refreshToken;
        user = response.data.data.user;
        requiresVerification = response.data.data.requiresVerification || false;
        console.log("📦 Case 5: Deep nested in data.data");
      }
      // Case 6: Success wrapper
      else if (response.success && response.data?.accessToken) {
        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;
        user = response.data.user;
        requiresVerification = response.data.requiresVerification || false;
        console.log("📦 Case 6: success wrapper");
      }

      console.log("📦 Extracted - Token:", !!accessToken, "User:", !!user);

      if (accessToken && user) {
        // ✅ Store tokens
        localStorage.setItem("token", accessToken);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        
        // ✅ Login user
        const loggedIn = login(user, accessToken, refreshToken);
        
        if (loggedIn) {
          // ✅ Show appropriate message
          if (requiresVerification) {
            toast.success("Account created! Please verify your email. 📧");
          } else {
            toast.success(`Welcome, ${user.name || 'Traveler'}! 🎉`);
          }

          // ✅ Navigate based on role
          if (user?.role === "admin") {
            navigate("/admin");
          } else if (user?.role === "provider") {
            toast("Provider account waiting for admin approval", {
              icon: "⏳",
            });
            navigate("/provider/dashboard");
          } else {
            navigate("/");
          }
          return;
        }
      }

      // ✅ If we have token but no user, try to get user
      if (accessToken && !user) {
        try {
          console.log("🔄 Token exists, fetching user from /auth/me...");
          const { getCurrentUser } = await import('../services/authService');
          const fetchedUser = await getCurrentUser();
          
          if (fetchedUser) {
            login(fetchedUser, accessToken, refreshToken);
            toast.success(`Welcome, ${fetchedUser.name || 'Traveler'}! 🎉`);
            
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

      // ✅ If registration succeeded but no token/user, show success message
      if (response.success || response.message) {
        toast.success(response.message || "Registration successful! Please login.");
        navigate("/login");
        return;
      }

      // ✅ If we reached here, something went wrong
      console.error("❌ Could not extract user data from response:", response);
      toast.error("Registration successful but could not retrieve user data. Please login.");

    } catch (error) {
      console.error("❌ Registration error:", error);
      
      const errorData = error?.response?.data || error?.data || error;
      
      // ✅ Handle specific error responses
      if (errorData?.message?.includes("already registered") || 
          errorData?.message?.includes("already exists") ||
          errorData?.message?.includes("duplicate")) {
        toast.error("This email is already registered. Please login instead.");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }
      
      toast.error(errorData?.message || error?.message || "Registration failed");
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-[#0D9488]/5 via-white to-[#F59E0B]/5 dark:from-gray-950 dark:via-gray-900 dark:to-black">

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-6xl grid lg:grid-cols-2 overflow-hidden rounded-[32px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl border border-white/30 dark:border-gray-800"
      >

        {/* LEFT BRAND */}
        <div className="hidden lg:flex relative p-10 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0D9488] to-[#F59E0B] text-white">
          <div className="absolute w-80 h-80 rounded-full bg-white/10 top-[-80px] right-[-80px]" />
          <div className="absolute w-64 h-64 rounded-full bg-white/10 bottom-0 left-20" />

          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center">
                <img
                  src={logo}
                  alt="AI Tour Logo"
                  className="w-14 h-14 object-contain drop-shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-3xl font-black">AI Tour</h1>
                <p className="text-white/80">Rwanda Smart Tourism</p>
              </div>
            </div>

            <h2 className="text-5xl font-black leading-tight">
              Discover.
              <br />
              Plan.
              <br />
              Travel Smarter.
            </h2>

            <p className="mt-6 text-lg text-white/90 leading-relaxed">
              AI-powered tourism platform connecting travelers,
              tours and experiences across Africa.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
              <ShieldCheck className="w-5 h-5" />
              <span>Secure JWT Authentication</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
              <Sparkles className="w-5 h-5" />
              <span>AI Powered Travel</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
              <Globe className="w-5 h-5" />
              <span>Discover Rwanda</span>
            </div>
          </div>
        </div>

        {/* FORM SIDE */}
        <div className="p-6 md:p-10">
          <h2 className="text-4xl font-black text-gray-900 dark:text-white">
            Create Account
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Join AI Tour ecosystem
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* NAME */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  disabled={loading}
                  className="w-full h-14 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-white outline-none focus:ring-2 focus:ring-[#0D9488] transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@gmail.com"
                  required
                  disabled={loading}
                  className="w-full h-14 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-white outline-none focus:ring-2 focus:ring-[#0D9488] transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* PHONE COUNTRY */}
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">
                  Phone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+250..."
                    required
                    disabled={loading}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-white outline-none focus:ring-2 focus:ring-[#0D9488] transition disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">
                  Country
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="Rwanda"
                    disabled={loading}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-white outline-none focus:ring-2 focus:ring-[#0D9488] transition disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* ROLE */}
            <div>
              <label className="block text-sm font-semibold mb-3 dark:text-white">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => !loading && setFormData({ ...formData, role: "traveler" })}
                  disabled={loading}
                  className={`
                    p-5 rounded-2xl border-2 transition-all duration-300
                    ${
                      formData.role === "traveler"
                        ? "border-[#0D9488] bg-[#0D9488]/10 dark:bg-[#0D9488]/20 shadow-lg shadow-[#0D9488]/20 scale-[1.02]"
                        : "border-gray-200 dark:border-gray-700 hover:border-[#0D9488]/50"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <User className={`mx-auto mb-2 w-6 h-6 ${formData.role === "traveler" ? "text-[#0D9488]" : "text-gray-400"}`} />
                  <p className={`font-bold ${formData.role === "traveler" ? "text-[#0D9488]" : "dark:text-white"}`}>
                    Traveler
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => !loading && setFormData({ ...formData, role: "provider" })}
                  disabled={loading}
                  className={`
                    p-5 rounded-2xl border-2 transition-all duration-300
                    ${
                      formData.role === "provider"
                        ? "border-[#F59E0B] bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20 shadow-lg shadow-[#F59E0B]/20 scale-[1.02]"
                        : "border-gray-200 dark:border-gray-700 hover:border-[#F59E0B]/50"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <Building2 className={`mx-auto mb-2 w-6 h-6 ${formData.role === "provider" ? "text-[#F59E0B]" : "text-gray-400"}`} />
                  <p className={`font-bold ${formData.role === "provider" ? "text-[#F59E0B]" : "dark:text-white"}`}>
                    Provider
                  </p>
                </button>
              </div>

              {formData.role === "provider" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 p-4 rounded-2xl bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20 border border-[#F59E0B]/20 text-sm text-[#F59E0B] flex gap-2"
                >
                  <CheckCircle size={18} className="flex-shrink-0" />
                  <span>
                    Provider accounts require admin approval before publishing tours.
                  </span>
                </motion.div>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-semibold mb-2 dark:text-white">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create strong password"
                  required
                  minLength="8"
                  disabled={loading}
                  className="w-full h-14 pl-12 pr-14 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-white outline-none focus:ring-2 focus:ring-[#0D9488] transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-400">Minimum 8 characters</p>
            </div>

            {/* SUBMIT */}
            <button
              disabled={loading}
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-xl shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* LOGIN */}
          <div className="mt-8 text-center text-gray-600 dark:text-gray-400">
            Already have an account?
            <Link to="/login" className="ml-2 font-bold text-[#0D9488] hover:underline transition">
              Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;