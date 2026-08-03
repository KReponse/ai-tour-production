// backend/src/routes/reviewRoutes.js
// ✅ PRODUCTION READY - Review Routes with Moderation Workflow
// ✅ FIXED: Added /helpful route
// ✅ FIXED: Route order - specific routes BEFORE wildcard routes
// ✅ FIXED: All action routes before wildcard /:id
// ✅ FIXED: Added /my-reviews alias for backward compatibility

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import {
  createReview,
  editReview,
  deleteReview,
  reportReview,
  addProviderReply,
  editProviderReply,
  getMyReviews,
  getReviewById,
  getReviewByBooking,
  getProviderReviews,
  getProviderReviewStats,
  toggleHelpful,
} from "../controllers/reviewController.js";

const router = express.Router();

// ============================================================
// ✅ AUTHENTICATED ROUTES - ORDER MATTERS!
// ============================================================

// ─── Provider Routes (Specific first) ──────────────────────────

// Get provider reviews
router.get(
  "/provider",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderReviews
);

// Get provider review stats
router.get(
  "/provider/stats",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderReviewStats
);

// ─── Traveler Routes (Specific first) ──────────────────────────

// ✅ Get my reviews - Primary route
router.get(
  "/my",
  AuthMiddleware.authenticate,
  getMyReviews
);

// ✅ ADDED: Alias for backward compatibility with frontend
// This ensures both /my and /my-reviews work
router.get(
  "/my-reviews",
  AuthMiddleware.authenticate,
  getMyReviews
);

// Get review by booking ID
router.get(
  "/booking/:bookingId",
  AuthMiddleware.authenticate,
  getReviewByBooking
);

// ─── Action Routes (Must come before /:id) ─────────────────────

// Toggle helpful
router.post(
  "/:id/helpful",
  AuthMiddleware.authenticate,
  toggleHelpful
);

// Report review
router.post(
  "/:id/report",
  AuthMiddleware.authenticate,
  reportReview
);

// Add provider reply
router.post(
  "/:id/reply",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  addProviderReply
);

// Edit provider reply
router.put(
  "/:id/reply",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  editProviderReply
);

// ─── Create/Update/Delete Routes ───────────────────────────────

// Create review (immediately published)
router.post(
  "/",
  AuthMiddleware.authenticate,
  createReview
);

// Edit review (within window)
router.put(
  "/:id",
  AuthMiddleware.authenticate,
  editReview
);

// Delete review (soft delete, within window)
router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  deleteReview
);

// ─── Generic / ID Routes (MUST BE LAST) ────────────────────────

// Get review by ID - WILDCARD - MUST BE LAST
router.get(
  "/:id",
  AuthMiddleware.authenticate,
  getReviewById
);

export default router;