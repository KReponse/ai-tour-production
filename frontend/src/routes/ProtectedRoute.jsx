// src/routes/ProtectedRoute.jsx
// ✅ COMPLETE FIXED - Prevent infinite redirect loops with proper provider verification

import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// ===============================
// ROLE MAPPING
// ===============================
const ROLE_MAP = {
  'user': 'traveler',
  'provider': 'provider',
  'admin': 'admin',
};

const mapRole = (role) => ROLE_MAP[role] || role;

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requireApproval = false,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // ✅ Memoize user role for stability
  const userRole = useMemo(() => {
    if (!user) return null;
    const role = user.role;
    return mapRole(role);
  }, [user]);

  // ✅ Memoize verification status
  const verificationStatus = useMemo(() => {
    return user?.verificationStatus || null;
  }, [user?.verificationStatus]);

  // ✅ Memoize current path
  const currentPath = useMemo(() => location.pathname, [location.pathname]);

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  // =========================
  // NOT LOGGED IN
  // =========================
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // =========================
  // ROLE CHECK
  // =========================
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect based on role
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (userRole === 'provider') {
      return <Navigate to="/provider/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // =========================
  // ✅ FIXED: PROVIDER VERIFICATION CHECK
  // =========================
  if (allowedRoles.includes("provider") && userRole === "provider") {
    
    // ✅ If verification status is explicitly "pending"
    if (verificationStatus === "pending") {
      // Allow access to pending page only
      if (currentPath !== "/provider/pending" && currentPath !== "/provider/request") {
        return <Navigate to="/provider/pending" replace />;
      }
    }
    
    // ✅ If verification status is "rejected"
    if (verificationStatus === "rejected") {
      // Allow access to request page only
      if (currentPath !== "/provider/request") {
        return <Navigate to="/provider/request" replace />;
      }
    }
    
    // ✅ If no verification status (new provider)
    if (!verificationStatus) {
      // Allow access to pending and request pages
      const allowedPaths = ["/provider/pending", "/provider/request"];
      if (!allowedPaths.includes(currentPath)) {
        return <Navigate to="/provider/pending" replace />;
      }
    }
    
    // ✅ If verification status is "approved" - allow all access
    if (verificationStatus === "approved") {
      // Allow access to all pages
    }
  }

  // =========================
  // TRAVELER TRYING PROVIDER AREA
  // =========================
  if (
    allowedRoles.includes("provider") &&
    userRole !== "provider"
  ) {
    return <Navigate to="/provider/request" replace />;
  }

  return children;
};

export default ProtectedRoute;