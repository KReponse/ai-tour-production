// backend/src/routes/bookingRoutes.js
// ✅ PRODUCTION FIX
// - Authentication remains required for bookings
// - Email verification is NOT required for booking creation
// - Role protection remains enabled for provider/admin routes
// - Keeps booking available while email verification system is being fixed

import express from "express";

import {
  createBooking,
  getBookings,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getProviderBookings,
  getProviderTravelers,
  getProviderAnalytics,
  getProviderEarnings,
  confirmBooking,
  rejectBooking,
  completeBooking,
  markInProgress,
  getAllBookings,
  updateBookingStatus,
  checkDuplicateBooking,
} from "../controllers/bookingController.js";

import { AuthMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

console.log("✅ Booking routes loading...");

// ============================================================
// STATIC ROUTES
// ============================================================

// ────────────────────────────────────────────────────────────
// PROVIDER ROUTES
// ────────────────────────────────────────────────────────────

router.get(
  "/provider",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderBookings
);

console.log("✅ GET /provider registered");

router.get(
  "/provider/travelers",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderTravelers
);

console.log("✅ GET /provider/travelers registered");

router.get(
  "/provider/analytics",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderAnalytics
);

console.log("✅ GET /provider/analytics registered");

router.get(
  "/provider/earnings",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderEarnings
);

console.log("✅ GET /provider/earnings registered");

// ────────────────────────────────────────────────────────────
// USER ROUTES
// ────────────────────────────────────────────────────────────

router.get(
  "/my-bookings",
  AuthMiddleware.authenticate,
  getMyBookings
);

console.log("✅ GET /my-bookings registered");

// ────────────────────────────────────────────────────────────
// CHECK DUPLICATE BOOKING
// ────────────────────────────────────────────────────────────

router.get(
  "/check-duplicate/:entityId",
  AuthMiddleware.authenticate,
  checkDuplicateBooking
);

console.log("✅ GET /check-duplicate/:entityId registered");

// ────────────────────────────────────────────────────────────
// CREATE BOOKING
// ────────────────────────────────────────────────────────────
//
// IMPORTANT:
// Do NOT use requireVerified here.
//
// Authentication is still required, so only logged-in users
// can create bookings.
//
// Email verification is temporarily NOT a booking requirement
// because the email-verification flow is currently being fixed.
//
// This removes the current:
// 403 "Please verify your email address first"
// ────────────────────────────────────────────────────────────

router.post(
  "/",
  AuthMiddleware.authenticate,
  createBooking
);

console.log(
  "✅ POST / registered (authenticated users can create bookings)"
);

// ============================================================
// ADMIN ROUTES
// ============================================================

router.get(
  "/admin/all",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  getAllBookings
);

console.log("✅ GET /admin/all registered");

router.put(
  "/admin/:id/status",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  updateBookingStatus
);

console.log("✅ PUT /admin/:id/status registered");

router.get(
  "/admin/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  getBookingById
);

console.log("✅ GET /admin/:id registered");

// ============================================================
// DYNAMIC ROUTES
// ⚠️ Keep these after static routes.
// ============================================================

// ────────────────────────────────────────────────────────────
// GET SINGLE BOOKING
// ────────────────────────────────────────────────────────────

router.get(
  "/:id",
  AuthMiddleware.authenticate,
  getBookingById
);

console.log("✅ GET /:id registered");

// ============================================================
// BOOKING ACTIONS
// ============================================================

// ────────────────────────────────────────────────────────────
// CANCEL BOOKING
// ────────────────────────────────────────────────────────────
//
// Authentication is enough.
// We intentionally do NOT require email verification here
// while the verification system is being fixed.
// ────────────────────────────────────────────────────────────

router.put(
  "/:id/cancel",
  AuthMiddleware.authenticate,
  cancelBooking
);

console.log(
  "✅ PUT /:id/cancel registered"
);

// ────────────────────────────────────────────────────────────
// PROVIDER CONFIRM BOOKING
// ────────────────────────────────────────────────────────────

router.put(
  "/:id/confirm",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  confirmBooking
);

console.log(
  "✅ PUT /:id/confirm registered"
);

// ────────────────────────────────────────────────────────────
// PROVIDER REJECT BOOKING
// ────────────────────────────────────────────────────────────

router.put(
  "/:id/reject",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  rejectBooking
);

console.log(
  "✅ PUT /:id/reject registered"
);

// ────────────────────────────────────────────────────────────
// PROVIDER COMPLETE BOOKING
// ────────────────────────────────────────────────────────────

router.put(
  "/:id/complete",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  completeBooking
);

console.log(
  "✅ PUT /:id/complete registered"
);

// ────────────────────────────────────────────────────────────
// PROVIDER MARK IN PROGRESS
// ────────────────────────────────────────────────────────────

router.put(
  "/:id/mark-in-progress",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  markInProgress
);

console.log(
  "✅ PUT /:id/mark-in-progress registered"
);

// ============================================================
// COMPLETE
// ============================================================

console.log("✅ All booking routes registered");

export default router;