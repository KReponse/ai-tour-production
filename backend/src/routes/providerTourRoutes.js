// backend/src/routes/providerTourRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from "express";
import {
  getMyTours,
  createProviderTour,
  updateProviderTour,
  getProviderTourById,
  deleteProviderTour,
  toggleTourStatus
} from "../controllers/providerTourController.js";
// ✅ Updated to v2
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// All routes are protected and require provider role
// ✅ Updated to v2
router.use(AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'));

// ===============================
// TOUR MANAGEMENT
// ===============================

// Get all my tours (listings)
router.get("/", getMyTours);

// Get single tour by ID
router.get("/:id", getProviderTourById);

// Create tour with file uploads
router.post(
  "/",
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 15 },
    { name: "videos", maxCount: 3 }
  ]),
  createProviderTour
);

// Update tour
router.put(
  "/:id",
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 15 },
    { name: "videos", maxCount: 3 }
  ]),
  updateProviderTour
);

// Toggle tour status (active/inactive)
router.put("/:id/toggle", toggleTourStatus);

// Delete tour
router.delete("/:id", deleteProviderTour);

export default router;