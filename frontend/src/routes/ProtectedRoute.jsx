// frontend/src/routes/ProtectedRoute.jsx
// ============================================================
// AI TOUR — PROTECTED ROUTE
// ============================================================
// ✅ Preserves the intended destination when redirecting to /login
//    by passing `state.from` (with pathname + search + hash).
//    After login, `Login.jsx` reads it and sends the user back
//    to the exact original URL.
// ✅ Waits for `loading` (AuthContext session restore) before
//    deciding, so refreshing a protected page while logged in
//    does NOT bounce to /login.
// ✅ Prevents redirect loops: an already-on-/login request is
//    never redirected to /login again.
// ✅ Uses `replace: true` on redirects (via <Navigate replace />)
//    so history isn't polluted with dead entries.
// ✅ Preserves all existing role checks:
//    - admin → /admin/dashboard
//    - provider → /provider/dashboard
//    - traveler → /
// ✅ Preserves provider verification flow:
//    - pending  → /provider/pending
//    - rejected → /provider/request
//    - unverified → /provider/pending (with /provider/request allowed)
//    - approved → all provider pages allowed
// ✅ Preserves "traveler trying provider area" behavior.
// ============================================================

import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// ===============================
// ROLE MAPPING
// ===============================
const ROLE_MAP = {
  user: "traveler",
  provider: "provider",
  admin: "admin",
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
  const currentPath = useMemo(
    () => location.pathname,
    [location.pathname]
  );

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
  // ✅ Destination-preserving redirect:
  //    - Never redirect /login → /login (would loop).
  //    - Pass the full location (pathname + search + hash) via
  //      state.from so Login.jsx can return the user here.
  //    - Use `replace` so the browser back button doesn't get
  //      stuck bouncing between /login and the protected route.
  if (!user) {
    if (
      currentPath === "/login" ||
      currentPath.startsWith("/login/")
    ) {
      // Already on /login — render nothing; the /login route
      // itself will handle rendering. Returning <></> avoids a
      // self-redirect loop.
      return <></>;
    }

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // =========================
  // ROLE CHECK
  // =========================
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(userRole)
  ) {
    // Redirect based on role
    if (userRole === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (userRole === "provider") {
      return <Navigate to="/provider/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // =========================
  // PROVIDER VERIFICATION CHECK
  // =========================
  if (
    allowedRoles.includes("provider") &&
    userRole === "provider"
  ) {
    // If verification status is explicitly "pending"
    if (verificationStatus === "pending") {
      if (
        currentPath !== "/provider/pending" &&
        currentPath !== "/provider/request"
      ) {
        return <Navigate to="/provider/pending" replace />;
      }
    }

    // If verification status is "rejected"
    if (verificationStatus === "rejected") {
      if (currentPath !== "/provider/request") {
        return <Navigate to="/provider/request" replace />;
      }
    }

    // If no verification status (new provider)
    if (!verificationStatus) {
      const allowedPaths = [
        "/provider/pending",
        "/provider/request",
      ];
      if (!allowedPaths.includes(currentPath)) {
        return <Navigate to="/provider/pending" replace />;
      }
    }

    // If verification status is "approved" — allow all access
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