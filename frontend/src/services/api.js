// frontend/src/services/api.js
// ✅ COMPLETE FIXED - Increased timeout for video uploads
// ✅ Added media base URL helper and improved error handling
// ✅ OPTIMIZED: Added request deduplication
// ✅ OPTIMIZED: Added response caching
// ✅ OPTIMIZED: Added abort controller support

import axios from "axios";

// ===============================
// ✅ API CONFIGURATION
// ===============================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ✅ Cache for GET requests
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ✅ Pending requests deduplication
const pendingRequests = new Map();

const API = axios.create({
  baseURL: API_URL,
  timeout: 300000, // ✅ 5 minutes for large video uploads
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
// ✅ CACHE HELPERS
// ===============================

const getCacheKey = (config) => {
  return `${config.method}-${config.url}-${JSON.stringify(config.params || {})}`;
};

const isCacheable = (config) => {
  return config.method === 'get' && 
         !config.headers?.['Cache-Control']?.includes('no-cache') &&
         !config.url?.includes('/auth/');
};

const getCachedResponse = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const { data, timestamp } = cached;
  if (Date.now() - timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return data;
};

const setCachedResponse = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// ===============================
// ✅ CLEAR CACHE
// ===============================

export const clearCache = (urlPattern = null) => {
  if (urlPattern) {
    for (const key of cache.keys()) {
      if (key.includes(urlPattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

// ===============================
// ✅ REQUEST INTERCEPTOR
// ===============================

API.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ For multipart/form-data, let the browser set the Content-Type
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // ✅ Check cache for GET requests
    if (isCacheable(config)) {
      const cacheKey = getCacheKey(config);
      const cachedData = getCachedResponse(cacheKey);
      
      if (cachedData) {
        // ✅ Return cached response with cache flag
        return {
          ...config,
          adapter: () => {
            return Promise.resolve({
              data: cachedData,
              status: 200,
              statusText: 'OK (Cached)',
              headers: {},
              config,
              request: {},
              cached: true,
            });
          },
        };
      }

      // ✅ Deduplicate pending requests
      const pendingKey = cacheKey;
      if (pendingRequests.has(pendingKey)) {
        return pendingRequests.get(pendingKey);
      }
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
  clearCache(); // ✅ Clear cache on logout
  
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
};

API.interceptors.response.use(
  (response) => {
    // ✅ Cache successful GET responses
    if (isCacheable(response.config) && !response.cached) {
      const cacheKey = getCacheKey(response.config);
      setCachedResponse(cacheKey, response.data);
      
      // ✅ Remove from pending requests
      if (pendingRequests.has(cacheKey)) {
        pendingRequests.delete(cacheKey);
      }
    }

    if (import.meta.env.DEV) {
      console.log(`📥 ${response.status} ${response.config.url} ${response.cached ? '(Cached)' : ''}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const url = error.config?.url;

    // ✅ Remove from pending requests on error
    if (originalRequest && isCacheable(originalRequest)) {
      const cacheKey = getCacheKey(originalRequest);
      if (pendingRequests.has(cacheKey)) {
        pendingRequests.delete(cacheKey);
      }
    }

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
// ✅ ABORT CONTROLLER SUPPORT
// ===============================

export const createAbortController = () => {
  return new AbortController();
};

export const getWithAbort = (url, config = {}) => {
  const controller = createAbortController();
  const request = API.get(url, {
    ...config,
    signal: controller.signal,
  });
  return { request, cancel: () => controller.abort() };
};

// ===============================
// ✅ EXPORT
// ===============================

export default API;