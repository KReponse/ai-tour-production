// backend/src/routes/heroRoutes.js
// ✅ COMPLETE FIXED - Added signed upload and Cloudinary direct upload routes
// ✅ Supports: Traditional upload, Direct upload, Signed upload params

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { uploadHeroVideo, handleUploadError } from "../middleware/upload.js";
import {
  getActiveHeroVideos,
  getAllHeroVideos,
  getHeroVideoById,
  createHeroVideo,
  createHeroVideoFromCloudinary,
  getSignedUploadParams,
  updateHeroVideo,
  uploadHeroVideo as uploadHeroVideoController,
  toggleHeroVideo,
  deleteHeroVideo,
  updatePriority,
} from "../controllers/heroController.js";

const router = express.Router();

// ============================================================
// ✅ PUBLIC ROUTES
// ============================================================

// Get active hero videos for homepage
router.get("/active", getActiveHeroVideos);

// ============================================================
// ✅ ADMIN ROUTES (All require authentication + admin role)
// ============================================================

router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole("admin"));

// ─── Direct Upload Routes (NEW) ──────────────────────────────

// Get signed upload params for direct browser upload
router.get("/sign-upload", getSignedUploadParams);

// Create hero video from Cloudinary URL (after direct upload)
router.post("/cloudinary", createHeroVideoFromCloudinary);

// ─── Traditional CRUD Routes ─────────────────────────────────

// Get all hero videos (admin list)
router.get("/", getAllHeroVideos);

// Get single hero video
router.get("/:id", getHeroVideoById);

// Create hero video (with video upload - traditional)
router.post(
  "/",
  uploadHeroVideo,
  handleUploadError,
  createHeroVideo
);

// Update hero video (metadata only)
router.put("/:id", updateHeroVideo);

// Upload/replace hero video
router.post(
  "/:id/upload",
  uploadHeroVideo,
  handleUploadError,
  uploadHeroVideoController
);

// Toggle active status
router.put("/:id/toggle", toggleHeroVideo);

// Update priority
router.put("/:id/priority", updatePriority);

// Delete hero video
router.delete("/:id", deleteHeroVideo);

export default router;