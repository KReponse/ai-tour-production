// backend/src/routes/heroRoutes.js
// ✅ NEW - Hero Video Routes

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { uploadHeroVideo, handleUploadError } from "../middleware/upload.js";
import {
  getActiveHeroVideos,
  getAllHeroVideos,
  getHeroVideoById,
  createHeroVideo,
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

// ─── CRUD Routes ─────────────────────────────────────────────

// Get all hero videos (admin list)
router.get("/", getAllHeroVideos);

// Get single hero video
router.get("/:id", getHeroVideoById);

// Create hero video (with video upload)
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