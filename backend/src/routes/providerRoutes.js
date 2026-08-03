// backend/src/routes/providerRoutes.js
// ✅ UPDATED - Added requireVerified to protected provider routes

import express from "express";
import {
  getProviderProfile,
  updateProviderProfile,
  getPublicProviderProfile,
  getPublicProviderTours,
  getPublicProviderReviews
} from "../controllers/providerController.js";
import {
  getProviderBookings,
  getProviderTravelers,
  getProviderAnalytics,
  getProviderEarnings
} from "../controllers/bookingController.js";
// ✅ Using v2 middleware
import { AuthMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// ===============================
// PUBLIC ROUTES
// ===============================

// ✅ GET public provider profile
router.get("/:id/public", getPublicProviderProfile);

// ✅ GET public provider tours (experiences)
router.get("/:id/tours", getPublicProviderTours);

// ✅ GET public provider reviews
router.get("/:id/reviews", getPublicProviderReviews);

// ===============================
// PROVIDER PROFILE
// ===============================

// ✅ Added requireVerified - providers must verify email to access profile
router.get("/profile", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), AuthMiddleware.requireVerified, getProviderProfile);
router.put("/profile", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), AuthMiddleware.requireVerified, updateProviderProfile);

// ===============================
// PROVIDER BOOKINGS
// ===============================

// ✅ Added requireVerified - providers must verify email to access bookings
router.get("/bookings", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), AuthMiddleware.requireVerified, getProviderBookings);

// ===============================
// PROVIDER TRAVELERS
// ===============================

// ✅ Added requireVerified - providers must verify email to access travelers
router.get("/travelers", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), AuthMiddleware.requireVerified, getProviderTravelers);

// ===============================
// PROVIDER ANALYTICS
// ===============================

// ✅ Added requireVerified - providers must verify email to access analytics
router.get("/analytics", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), AuthMiddleware.requireVerified, getProviderAnalytics);

// ===============================
// PROVIDER EARNINGS
// ===============================

// ✅ Added requireVerified - providers must verify email to access earnings
router.get("/earnings", AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'), AuthMiddleware.requireVerified, getProviderEarnings);

export default router;