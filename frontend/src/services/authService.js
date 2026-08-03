// frontend/src/services/authService.js
// ✅ PRODUCTION-READY - Fixed baseURL, added verifyEmail and resendVerification functions

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
  throw {
    message: error.response?.data?.message || "Something went wrong",
    status: error.response?.status,
    data: error.response?.data,
  };
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
    handleError(error);
  }
};

/* =========================
LOGIN
========================= */

export const loginUser = async (userData) => {
  try {
    const { data } = await API.post("/auth/login", userData);

    if (data.accessToken) {
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
    }

    if (data.email) {
      localStorage.setItem("pendingVerificationEmail", data.email);
    }

    return data;
  } catch (error) {
    // ✅ Handle 403 - Unverified email
    if (error.status === 403 && error.data?.email) {
      localStorage.setItem("pendingVerificationEmail", error.data.email);
    }
    throw error;
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
    handleError(error);
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
    handleError(error);
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
    handleError(error);
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
    handleError(error);
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
REFRESH TOKEN
========================= */

export const refreshAccessToken = async () => {
  try {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken) {
      throw new Error("No refresh token available");
    }

    const { data } = await API.post("/auth/refresh-token", { 
      refreshToken: storedRefreshToken 
    });
    
    if (data.accessToken) {
      localStorage.setItem("token", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
    }
    
    return data;
  } catch (error) {
    logoutUser();
    handleError(error);
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
    handleError(error);
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
    handleError(error);
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