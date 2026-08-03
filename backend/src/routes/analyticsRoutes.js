// backend/src/routes/analyticsRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from "express";
import {
  getOverview,
  getUserStats,
  getTourStats,
  getBookingStats,
  getRevenueStats,
  getProviderAnalytics,
  getGrowthStats,
  getTopPerformers
} from "../controllers/analyticsController.js";
// ✅ Updated to v2
import { AuthMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// All analytics routes are protected
// ✅ Updated to v2
router.use(AuthMiddleware.authenticate);

// Admin routes
// ✅ Updated to v2
router.get("/overview", AuthMiddleware.requireRole('admin'), getOverview);
router.get("/users", AuthMiddleware.requireRole('admin'), getUserStats);
router.get("/tours", AuthMiddleware.requireRole('admin'), getTourStats);
router.get("/bookings", AuthMiddleware.requireRole('admin'), getBookingStats);
router.get("/revenue", AuthMiddleware.requireRole('admin'), getRevenueStats);
router.get("/growth", AuthMiddleware.requireRole('admin'), getGrowthStats);
router.get("/top-performers", AuthMiddleware.requireRole('admin'), getTopPerformers);

// Provider route
// ✅ Updated to v2
router.get("/provider", AuthMiddleware.requireRole('provider'), getProviderAnalytics);

export default router;