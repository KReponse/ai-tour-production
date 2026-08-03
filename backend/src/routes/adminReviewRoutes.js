// backend/src/routes/adminReviewRoutes.js
// ✅ PRODUCTION READY - Admin Review Moderation Routes

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import {
  getAllReviews,
  getReviewStats,
  getReviewByIdAdmin,
  hideReview,
  restoreReview,
  permanentDeleteReview,
  updateReviewStatus,
} from "../controllers/adminReviewController.js";

const router = express.Router();

// All admin review routes require authentication and admin role
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole("admin"));

// ============================================================
// ✅ REVIEW QUERY ROUTES
// ============================================================

// Get all reviews with filters
router.get("/", getAllReviews);

// Get review stats
router.get("/stats", getReviewStats);

// Get review by ID
router.get("/:id", getReviewByIdAdmin);

// ============================================================
// ✅ REVIEW MODERATION ROUTES
// ============================================================

// Hide review
router.put("/:id/hide", hideReview);

// Restore review
router.put("/:id/restore", restoreReview);

// Update review status
router.put("/:id/status", updateReviewStatus);

// Permanent delete review
router.delete("/:id/permanent", permanentDeleteReview);

export default router;