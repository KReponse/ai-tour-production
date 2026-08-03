// frontend/src/contexts/AuthContext.jsx
// ✅ COMPLETE FIXED - Added axios interceptor and fixed refresh endpoint

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";

import axios from "axios";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ROLE_MAP = {
  'traveler': 'traveler',
  'user': 'traveler',
  'provider': 'provider',
  'admin': 'admin',
};

const mapRole = (role) => {
  return ROLE_MAP[role] || role;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ Prevent multiple refresh attempts
  const isRefreshing = useRef(false);
  // ✅ Queue for pending requests during refresh
  const pendingRequests = useRef([]);
  // ✅ Track if session has been restored
  const hasRestoredRef = useRef(false);

  /*
  =========================
  CLEAR SESSION
  =========================
  */
  const clearSession = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setToken(null);
    setRefreshToken(null);
  }, []);

  /*
  =========================
  REFRESH USER
  =========================
  */
  const refreshUser = useCallback(async () => {
    try {
      const savedToken = localStorage.getItem("token");
      if (!savedToken) return false;

      const response = await axios.get(
        `${API_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        }
      );

      if (response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        console.log("✅ User refreshed:", userData.email);
        return true;
      }
      return false;
    } catch (error) {
      console.log("❌ Refresh user failed:", error.response?.status, error.message);
      if (error.response?.status === 401) {
        clearSession();
      }
      return false;
    }
  }, [clearSession]);

  /*
  =========================
  RESTORE SESSION
  =========================
  */
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const restoreSession = async () => {
      try {
        const savedUser = localStorage.getItem("user");
        const savedToken = localStorage.getItem("token");
        const savedRefreshToken = localStorage.getItem("refreshToken");

        if (savedUser && savedToken) {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
          if (savedRefreshToken) {
            setRefreshToken(savedRefreshToken);
          }
          await refreshUser();
        }
      } catch (error) {
        console.log("❌ Auth restore error:", error);
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [refreshUser, clearSession]);

  /*
  =========================
  LOGIN
  =========================
  */
  const login = useCallback((userData, accessToken, refreshTokenData = null) => {
    if (!userData || !accessToken) {
      return false;
    }

    setUser(userData);
    setToken(accessToken);
    if (refreshTokenData) {
      setRefreshToken(refreshTokenData);
    }

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", accessToken);
    if (refreshTokenData) {
      localStorage.setItem("refreshToken", refreshTokenData);
    }

    console.log("✅ User logged in:", userData.email);
    return true;
  }, []);

  /*
  =========================
  LOGOUT
  =========================
  */
  const logout = useCallback(() => {
    clearSession();
    console.log("👋 User logged out");
  }, [clearSession]);

  /*
  =========================
  UPDATE USER
  =========================
  */
  const updateUser = useCallback((userData) => {
    if (!userData) return;
    
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    console.log("✅ User updated:", userData.email);
  }, []);

  /*
  =========================
  REFRESH TOKEN - FIXED ENDPOINT
  =========================
  */
  const refreshAccessToken = useCallback(async () => {
    // ✅ If refresh is already in progress, queue this request
    if (isRefreshing.current) {
      console.log("⏳ Token refresh already in progress, waiting...");
      return new Promise((resolve, reject) => {
        pendingRequests.current.push({ resolve, reject });
      });
    }

    isRefreshing.current = true;
    
    try {
      const savedRefreshToken = localStorage.getItem("refreshToken");
      if (!savedRefreshToken) {
        console.warn("⚠️ No refresh token available");
        clearSession();
        return null;
      }

      console.log("🔄 Refreshing access token...");
      
      // ✅ FIXED: Correct endpoint is /auth/refresh
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken: savedRefreshToken }
      );

      if (response.data.accessToken) {
        const newToken = response.data.accessToken;
        setToken(newToken);
        localStorage.setItem("token", newToken);
        
        if (response.data.refreshToken) {
          setRefreshToken(response.data.refreshToken);
          localStorage.setItem("refreshToken", response.data.refreshToken);
        }
        
        console.log("✅ Token refreshed successfully");
        
        // ✅ Resolve all queued requests with the new token
        pendingRequests.current.forEach(({ resolve }) => resolve(newToken));
        pendingRequests.current = [];
        
        return newToken;
      }
      
      clearSession();
      return null;
    } catch (error) {
      console.error("❌ Token refresh failed:", error.message);
      
      // ✅ Reject all queued requests
      pendingRequests.current.forEach(({ reject }) => reject(error));
      pendingRequests.current = [];
      
      clearSession();
      return null;
    } finally {
      isRefreshing.current = false;
    }
  }, [clearSession]);

  /*
  =========================
  ROLE HELPERS
  =========================
  */

  const getUserRole = useCallback(() => {
    if (!user) return null;
    return mapRole(user.role);
  }, [user]);

  const hasRole = useCallback((role) => {
    if (!user) return false;
    const userRole = user.role;
    
    const roleMap = {
      'traveler': ['traveler', 'user'],
      'provider': ['provider'],
      'admin': ['admin'],
    };
    
    const backendRoles = roleMap[role] || [role];
    return backendRoles.includes(userRole);
  }, [user]);

  // ✅ Memoized role checks
  const isAdmin = useMemo(() => hasRole('admin'), [hasRole]);
  const isProvider = useMemo(() => hasRole('provider'), [hasRole]);
  const isTraveler = useMemo(() => hasRole('traveler'), [hasRole]);
  const isApprovedProvider = useMemo(() => 
    isProvider && user?.verificationStatus === "approved", 
    [isProvider, user?.verificationStatus]
  );
  const isPendingProvider = useMemo(() => 
    isProvider && user?.verificationStatus === "pending", 
    [isProvider, user?.verificationStatus]
  );
  const isRejectedProvider = useMemo(() => 
    isProvider && user?.verificationStatus === "rejected", 
    [isProvider, user?.verificationStatus]
  );

  const displayRole = useMemo(() => getUserRole(), [getUserRole]);

  // ✅ Memoized value object
  const value = useMemo(() => ({
    user,
    token,
    refreshToken,
    loading,

    login,
    logout,
    refreshUser,
    updateUser,
    refreshAccessToken,

    isAuthenticated: Boolean(token),

    // Role checks
    isAdmin,
    isProvider,
    isTraveler,

    isApprovedProvider,
    isPendingProvider,
    isRejectedProvider,

    // Helpers
    hasRole,
    getUserRole,
    displayRole,
  }), [
    user,
    token,
    refreshToken,
    loading,
    login,
    logout,
    refreshUser,
    updateUser,
    refreshAccessToken,
    isAdmin,
    isProvider,
    isTraveler,
    isApprovedProvider,
    isPendingProvider,
    isRejectedProvider,
    hasRole,
    getUserRole,
    displayRole,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};

// ✅ NEW: Create an axios interceptor for automatic token refresh
export const setupAuthInterceptor = (getToken, refreshTokenFn, logoutFn) => {
  // Request interceptor to add token
  const requestInterceptor = axios.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor to handle 401 errors
  const responseInterceptor = axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If error is 401 and we haven't tried to refresh yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const newToken = await refreshTokenFn();
          if (newToken) {
            // Update the Authorization header and retry
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, logout
          logoutFn();
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );

  // Return cleanup function
  return () => {
    axios.interceptors.request.eject(requestInterceptor);
    axios.interceptors.response.eject(responseInterceptor);
  };
};