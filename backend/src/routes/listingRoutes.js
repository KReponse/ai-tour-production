// backend/src/routes/listingRoutes.js
// ✅ FIXED - Using Authentication v2 middleware
// ✅ ADDED: GET /provider/:providerId route
// ✅ FIXED: Using upload from middleware (dynamic storage)

import express from "express";
import upload from "../middleware/upload.js";
import {
  createListing,
  getListings,
  getSingleListing,
  getProviderListings,
  getAllListings,
  getPendingListings,
  approveListing,
  rejectListing,
  deleteListing,
  deleteListingAdmin,
  toggleListingStatus,
  toggleLike,
  getLikes,
  checkLike,
  updateListing,
  suspendListing,
  getListingsByProvider,
} from "../controllers/listingController.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// =========================
// PUBLIC ROUTES
// =========================

router.get("/", getListings);
router.get("/provider/:providerId", getListingsByProvider);

// =========================
// STATIC ROUTES
// =========================

router.get("/my", AuthMiddleware.authenticate, getProviderListings);

// =========================
// LIKES ROUTES (Protected)
// =========================

router.post("/:id/like", AuthMiddleware.authenticate, toggleLike);
router.get("/:id/likes", getLikes);
router.get("/:id/likes/check", AuthMiddleware.authenticate, checkLike);

// =========================
// DYNAMIC ROUTES
// =========================

router.get("/:id", getSingleListing);

// =========================
// PROVIDER ROUTES (Protected)
// =========================

// ✅ CREATE LISTING - Using upload with dynamic storage
router.post(
  "/",
  AuthMiddleware.authenticate,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "coverMedia", maxCount: 1 },
    { name: "coverMediaType", maxCount: 1 },
    { name: "galleryImages", maxCount: 15 },
    { name: "videos", maxCount: 3 },
  ]),
  createListing
);

// ✅ UPDATE LISTING - Using upload with dynamic storage
router.put(
  "/:id",
  AuthMiddleware.authenticate,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "coverMedia", maxCount: 1 },
    { name: "coverMediaType", maxCount: 1 },
    { name: "galleryImages", maxCount: 15 },
    { name: "videos", maxCount: 3 },
  ]),
  updateListing
);

router.delete("/:id", AuthMiddleware.authenticate, deleteListing);
router.patch("/:id/status", AuthMiddleware.authenticate, toggleListingStatus);

// =========================
// ADMIN ROUTES
// =========================

router.get("/admin/all", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getAllListings);
router.get("/admin/pending", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getPendingListings);
router.put("/admin/:id/approve", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), approveListing);
router.put("/admin/:id/reject", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), rejectListing);
router.put("/admin/:id/suspend", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), suspendListing);
router.delete("/admin/:id", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), deleteListingAdmin);

export default router;