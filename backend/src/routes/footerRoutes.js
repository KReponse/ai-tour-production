// backend/src/routes/footerRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from "express";
import {
  getFooterContent,
  updateFooterContent,
  resetFooterContent,
} from "../controllers/footerController.js";
// ✅ Updated to v2
import { AuthMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
router.get("/", getFooterContent);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// ✅ Updated to v2
router.put("/", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updateFooterContent);
router.post("/reset", AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), resetFooterContent);

export default router;