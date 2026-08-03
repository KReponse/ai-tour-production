// backend/src/routes/bookingRoutes.js
// ✅ UPDATED - Added requireVerified to protected booking routes

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
  checkDuplicateBooking
} from "../controllers/bookingController.js";
// ✅ Using v2 middleware
import { AuthMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

console.log('✅ Booking routes loading...');

// ============================================
// ✅ STATIC ROUTES (NO :id parameter)
// ============================================

// ── Provider Routes ──
router.get("/provider", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), getProviderBookings);
console.log('✅ GET /provider registered');

router.get("/provider/travelers", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), getProviderTravelers);
console.log('✅ GET /provider/travelers registered');

router.get("/provider/analytics", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), getProviderAnalytics);
console.log('✅ GET /provider/analytics registered');

router.get("/provider/earnings", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), getProviderEarnings);
console.log('✅ GET /provider/earnings registered');

// ── User Routes ──
router.get("/my-bookings", AuthMiddleware.authenticate, getMyBookings);
console.log('✅ GET /my-bookings registered');

// ── Check Duplicate Booking ──
router.get("/check-duplicate/:entityId", AuthMiddleware.authenticate, checkDuplicateBooking);
console.log('✅ GET /check-duplicate/:entityId registered');

// ── Create Booking ──
// ✅ Added requireVerified - users must verify email to book
router.post("/", AuthMiddleware.authenticate, AuthMiddleware.requireVerified, createBooking);
console.log('✅ POST / registered (requires verified email)');

// ============================================
// ✅ ADMIN ROUTES
// ============================================

router.get("/admin/all", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getAllBookings);
console.log('✅ GET /admin/all registered');

router.put("/admin/:id/status", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updateBookingStatus);
console.log('✅ PUT /admin/:id/status registered');

router.get("/admin/:id", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getBookingById);
console.log('✅ GET /admin/:id registered');

// ============================================
// ✅ DYNAMIC ROUTES (WITH :id parameter)
// ⚠️ MUST BE LAST - they will match ANY path
// ============================================

// ── Get single booking ──
router.get("/:id", AuthMiddleware.authenticate, getBookingById);
console.log('✅ GET /:id registered');

// ── Booking Actions ──
// ✅ Added requireVerified - users must verify email to cancel/modify bookings
router.put("/:id/cancel", AuthMiddleware.authenticate, AuthMiddleware.requireVerified, cancelBooking);
console.log('✅ PUT /:id/cancel registered (requires verified email)');

router.put("/:id/confirm", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), AuthMiddleware.requireVerified, confirmBooking);
console.log('✅ PUT /:id/confirm registered (requires verified email)');

router.put("/:id/reject", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), AuthMiddleware.requireVerified, rejectBooking);
console.log('✅ PUT /:id/reject registered (requires verified email)');

router.put("/:id/complete", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), AuthMiddleware.requireVerified, completeBooking);
console.log('✅ PUT /:id/complete registered (requires verified email)');

router.put("/:id/mark-in-progress", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), AuthMiddleware.requireVerified, markInProgress);
console.log('✅ PUT /:id/mark-in-progress registered (requires verified email)');

console.log('✅ All booking routes registered');

export default router;