// backend/src/routes/providerProfileRoutes.js
// ✅ COMPLETE FIXED - Public provider profile routes with proper authentication

import express from "express";
import upload from "../middleware/upload.js";
import {
  getPublicProviderProfile,
  getMyProviderProfile,
  updateMyProviderProfile,
} from "../controllers/providerProfileController.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// ============================================================
// ✅ PUBLIC ROUTES (No authentication required)
// ============================================================

/**
 * GET /public/:id
 * Get public provider profile by user ID
 * This is the endpoint used by the frontend to display provider profiles
 * Example: /public/6a633c86b1a622e903744f19
 */
router.get("/public/:id", getPublicProviderProfile);

// ============================================================
// ✅ PROTECTED ROUTES (Authentication required)
// ============================================================

/**
 * GET /me
 * Get the authenticated provider's own profile
 * Requires: provider role
 */
router.get(
  "/me",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole('provider'),
  getMyProviderProfile
);

/**
 * PUT /me
 * Update the authenticated provider's own profile
 * Requires: provider role
 * Supports: logo and coverImage file uploads
 */
router.put(
  "/me",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole('provider'),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  updateMyProviderProfile
);

// ============================================================
// ✅ ADDITIONAL PUBLIC ROUTES (Optional - for future use)
// ============================================================

/**
 * GET /public/business/:businessName
 * Get public provider profile by business name (slug)
 * Useful for SEO-friendly URLs
 */
// router.get("/public/business/:businessName", getPublicProviderProfileByBusinessName);

/**
 * GET /public/nearby
 * Get nearby providers based on location
 */
// router.get("/public/nearby", getNearbyProviders);

export default router;