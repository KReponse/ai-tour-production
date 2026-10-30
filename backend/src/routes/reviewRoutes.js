// backend/src/routes/reviewRoutes.js

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
  // ✅ NEW admin handlers
  getAdminReviews,
  updateReviewStatus,
} from "../controllers/reviewController.js";

const router = express.Router();

// ============================================================
// PROVIDER ROUTES (static first)
// ============================================================

router.get(
  "/provider/stats",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderReviewStats
);

router.get(
  "/provider",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderReviews
);

// ============================================================
// ✅ NEW: ADMIN ROUTES (before /:id)
// ============================================================

router.get(
  "/admin/reviews",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  getAdminReviews
);

router.put(
  "/admin/reviews/:id/status",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  updateReviewStatus
);

// ============================================================
// TRAVELER ROUTES
// ============================================================

router.get("/my", AuthMiddleware.authenticate, getMyReviews);
router.get("/my-reviews", AuthMiddleware.authenticate, getMyReviews);

router.get(
  "/booking/:bookingId",
  AuthMiddleware.authenticate,
  getReviewByBooking
);

// ============================================================
// REVIEW ACTION ROUTES (before /:id)
// ============================================================

router.post("/:id/helpful", AuthMiddleware.authenticate, toggleHelpful);

router.post("/:id/report", AuthMiddleware.authenticate, reportReview);

router.post(
  "/:id/reply",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  addProviderReply
);

router.put(
  "/:id/reply",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  editProviderReply
);

// ============================================================
// CRUD
// ============================================================

router.post("/", AuthMiddleware.authenticate, createReview);

router.put("/:id", AuthMiddleware.authenticate, editReview);

router.delete("/:id", AuthMiddleware.authenticate, deleteReview);

// ============================================================
// GET BY ID (LAST)
// ============================================================

router.get("/:id", AuthMiddleware.authenticate, getReviewById);

export default router;