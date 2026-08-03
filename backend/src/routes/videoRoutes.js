// backend/src/routes/videoRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from "express";

import {
  uploadVideo,
  getVideos,
  getFeaturedVideos,
  getMyVideos,
  likeVideo,
  addView,
  deleteVideo,
} from "../controllers/videoController.js";

// ✅ Updated to v2
import { AuthMiddleware } from "../middleware/auth.middleware.js";

import uploadVideoMiddleware from "../middleware/uploadVideo.js";

const router = express.Router();

/*
=====================================
Public
=====================================
*/

router.get("/", getVideos);

router.get("/featured", getFeaturedVideos);

/*
=====================================
Provider
=====================================
*/

// ✅ Updated to v2
router.get("/my", AuthMiddleware.authenticate, getMyVideos);

// ✅ Updated to v2
router.post(
  "/",
  AuthMiddleware.authenticate,
  uploadVideoMiddleware.single("video"),
  uploadVideo
);

// ✅ Updated to v2
router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  deleteVideo
);

/*
=====================================
Interactions
=====================================
*/

// ✅ Updated to v2
router.patch("/:id/like", AuthMiddleware.authenticate, likeVideo);

router.patch("/:id/view", addView);

export default router;