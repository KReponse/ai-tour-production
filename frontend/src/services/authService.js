// frontend/src/services/authService.js
// ✅ PRODUCTION-READY - Fixed login response handling

import axios from "axios";

/* =========================
BASE API INSTANCE
========================= */

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

/* =========================
AUTO ATTACH TOKEN
========================= */

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/* =========================
ERROR HANDLER
========================= */

const handleError = (error) => {
  // ✅ Improved error handling with more details
  const errorResponse = {
    message: error.response?.data?.message || "Something went wrong",
    status: error.response?.status,
    data: error.response?.data,
  };
  
  console.error("❌ API Error:", errorResponse);
  throw errorResponse;
};

/* =========================
REGISTER
========================= */

export const registerUser = async (userData) => {
  try {
    const { data } = await API.post("/auth/register", userData);
    
    // ✅ Store email for verification resend
    if (data.email) {
      localStorage.setItem("pendingVerificationEmail", data.email);
    }
    
    return data;
  } catch (error) {
    throw handleError(error);
  }
};

/* =========================
LOGIN - FIXED
========================= */

export const loginUser = async (userData) => {
  try {
    const response = await API.post("/auth/login", userData);
    
    // ✅ Extract data from response
    const data = response.data;
    
    console.log("🔐 Login response data:", data);
    
    // ✅ Store tokens if present
    if (data.accessToken) {
      localStorage.setItem("token", data.accessToken);
      console.log("✅ Token stored in localStorage");
    }
    
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
      console.log("✅ Refresh token stored in localStorage");
    }
    
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      console.log("✅ User stored in localStorage");
    }

    if (data.email) {
      localStorage.setItem("pendingVerificationEmail", data.email);
    }

    // ✅ Return the data directly (not wrapped)
    return {
      success: true,
      ...data
    };
  } catch (error) {
    console.error("❌ Login error:", error);
    
    // ✅ Handle 403 - Unverified email
    if (error.response?.status === 403 && error.response?.data?.email) {
      localStorage.setItem("pendingVerificationEmail", error.response.data.email);
    }
    
    // ✅ Re-throw the error with better structure
    throw {
      message: error.response?.data?.message || "Login failed",
      status: error.response?.status,
      data: error.response?.data,
      response: error.response
    };
  }
};

/* =========================
VERIFY EMAIL
========================= */

export const verifyEmail = async (token) => {
  try {
    const { data } = await API.get(`/auth/verify-email/${token}`);
    
    if (data.success) {
      localStorage.removeItem("pendingVerificationEmail");
    }
    
    return data;
  } catch (error) {
    throw handleError(error);
  }
};

/* =========================
RESEND VERIFICATION EMAIL
========================= */

export const resendVerificationEmail = async (emailData) => {
  try {
    const { data } = await API.post("/auth/resend-verification", emailData);
    return data;
  } catch (error) {
    throw handleError(error);
  }
};

/* =========================
FORGOT PASSWORD
========================= */

export const forgotPassword = async (email) => {
  try {
    const { data } = await API.post("/auth/forgot-password", { email });
    return data;
  } catch (error) {
    throw handleError(error);
  }
};

/* =========================
RESET PASSWORD
========================= */

export const resetPassword = async (token, password) => {
  try {
    const { data } = await API.post(`/auth/reset-password/${token}`, { password });
    return data;
  } catch (error) {
    throw handleError(error);
  }
};

/* =========================
GET CURRENT USER FROM API
========================= */

export const getCurrentUser = async () => {
  try {
    const { data } = await API.get("/auth/me");
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
  } catch (error) {
    throw {
      message: error.response?.data?.message || "Failed to get current user",
      status: error.response?.status,
    };
  }
};

/* =========================
GET LOCAL USER
========================= */

export const getStoredUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

/* =========================
GET TOKEN
========================= */

export const getToken = () => {
  return localStorage.getItem("token");
};

/* =========================
GET REFRESH TOKEN
========================= */

export const getRefreshToken = () => {
  return localStorage.getItem("refreshToken");
};

/* =========================
LOGOUT
========================= */

export const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("pendingVerificationEmail");
};

/* =========================
REFRESH TOKEN - FIXED ENDPOINT
========================= */

export const refreshAccessToken = async () => {
  try {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken) {
      throw new Error("No refresh token available");
    }

    // ✅ FIXED: Use /auth/refresh (not /auth/refresh-token)
    const { data } = await API.post("/auth/refresh", { 
      refreshToken: storedRefreshToken 
    });
    
    if (data.accessToken) {
      localStorage.setItem("token", data.accessToken);
      console.log("✅ Access token refreshed");
    }
    
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }
    
    return data;
  } catch (error) {
    console.error("❌ Refresh token failed:", error);
    logoutUser();
    throw handleError(error);
  }
};

/* =========================
CHANGE PASSWORD
========================= */

export const changePassword = async (passwordData) => {
  try {
    const { data } = await API.put("/auth/change-password", passwordData);
    return data;
  } catch (error) {
    throw handleError(error);
  }
};

/* =========================
UPDATE PROFILE
========================= */

export const updateProfile = async (profileData) => {
  try {
    const { data } = await API.put("/auth/profile", profileData);
    return data;
  } catch (error) {
    throw handleError(error);
  }
};

/* =========================
CHECK IF USER IS AUTHENTICATED
========================= */

export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  return !!token;
};

export default API;