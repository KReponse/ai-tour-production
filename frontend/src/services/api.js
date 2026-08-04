// frontend/src/services/api.js
// ✅ COMPLETE FIXED - Increased timeout for video uploads
// ✅ Added media base URL helper and improved error handling

import axios from "axios";

// ===============================
// ✅ API CONFIGURATION
// ===============================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API = axios.create({
  baseURL: API_URL,
  timeout: 120000, // ✅ INCREASED: 2 minutes for video uploads
  headers: {
    "Content-Type": "application/json",
  },
});

// ===============================
// ✅ MEDIA URL HELPERS
// ===============================

/**
 * Get the base URL for uploads (without /api)
 */
export const getUploadBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL || "http://localhost:5000";
  return url.replace(/\/api$/, '');
};

/**
 * Get full URL for an image or video upload
 */
export const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('data:image')) return path;
  if (path.startsWith('blob:')) return path;
  
  const baseUrl = getUploadBaseUrl();
  
  if (path.startsWith('/uploads/')) {
    return `${baseUrl}${path}`;
  }
  
  return `${baseUrl}/uploads/${path}`;
};

// ===============================
// ✅ REQUEST INTERCEPTOR
// ===============================

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ For multipart/form-data, let the browser set the Content-Type
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
      if (config.data && !(config.data instanceof FormData)) {
        const logData = { ...config.data };
        if (logData.password) logData.password = '***';
        if (logData.currentPassword) logData.currentPassword = '***';
        if (logData.newPassword) logData.newPassword = '***';
        console.log(`📦 Data:`, logData);
      }
    }

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// ===============================
// ✅ RESPONSE INTERCEPTOR
// ===============================

let isRefreshing = false;
let refreshSubscribers = [];

const processQueue = (error, token = null) => {
  refreshSubscribers.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  refreshSubscribers = [];
};

const clearAuthAndRedirect = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
};

API.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`📥 ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const url = error.config?.url;

    // ✅ Don't log 404 for review/booking endpoints (expected for new reviews)
    const isReviewCheck = url?.includes('/reviews/booking/');
    const isBookingCheck = url?.includes('/bookings/') && !url?.includes('/bookings/my');

    if (status === 404 && isReviewCheck) {
      console.log('ℹ️ No review found for this booking (expected for new reviews)');
      return Promise.reject(error);
    }

    // ✅ Only log errors if they're not expected
    if (!(status === 404 && isReviewCheck)) {
      console.error(`❌ API Error [${status}]: ${message}`);
      console.error(`📌 URL: ${url}`);
    }

    if (error.response?.data && !(status === 404 && isReviewCheck)) {
      console.error(`📦 Response:`, error.response.data);
    }

    // ✅ Handle 401 - Unauthorized
    if (status === 401) {
      const isTokenExpired = error.response?.data?.code === "TOKEN_EXPIRED" || 
                             message.includes("expired");

      if (isTokenExpired && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = localStorage.getItem("refreshToken");
        
        if (!refreshToken) {
          console.warn("⚠️ No refresh token available. Redirecting to login...");
          clearAuthAndRedirect();
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshSubscribers.push({ resolve, reject });
          })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
        }

        isRefreshing = true;

        try {
          console.log("🔄 Refreshing access token...");
          const response = await axios.post(
            `${API_URL}/auth/refresh-token`,
            { refreshToken }
          );

          if (response.data.accessToken) {
            const newToken = response.data.accessToken;
            localStorage.setItem("token", newToken);
            
            if (response.data.refreshToken) {
              localStorage.setItem("refreshToken", response.data.refreshToken);
            }

            console.log("✅ Token refreshed successfully");

            processQueue(null, newToken);

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return API(originalRequest);
          }

          throw new Error("Token refresh failed");

        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError.message);
          processQueue(refreshError, null);
          clearAuthAndRedirect();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

    // ✅ Handle 403 - Forbidden
    if (status === 403) {
      console.warn("⚠️ Access denied. You don't have permission.");
      
      if (error.response?.data?.message?.includes('Provider account pending')) {
        console.warn("⏳ Provider account pending approval");
      }
      if (error.response?.data?.message?.includes('Admin access')) {
        console.warn("🔒 Admin access required");
      }
    }

    // ✅ Handle 404 - Not Found (skip logging for expected 404s)
    if (status === 404 && !isReviewCheck) {
      console.warn("⚠️ Resource not found:", url);
    }

    // ✅ Handle 409 - Conflict
    if (status === 409) {
      console.warn("⚠️ Conflict:", error.response?.data?.message);
    }

    // ✅ Handle 429 - Too Many Requests
    if (status === 429) {
      console.warn("⏳ Too many requests. Please slow down.");
    }

    // ✅ Handle 500 - Server Error
    if (status >= 500) {
      console.error("⚠️ Server error:", error.response?.data?.message);
    }

    // ✅ Handle Network Errors
    if (error.code === 'ECONNABORTED') {
      console.error("⏰ Request timeout. Please try again.");
    }

    if (error.message === 'Network Error') {
      console.error("🌐 Network error. Please check your connection.");
    }

    return Promise.reject(error);
  }
);

// ===============================
// ✅ EXPORT
// ===============================

export default API;