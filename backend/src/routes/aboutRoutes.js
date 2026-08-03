// backend/src/routes/aboutRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getAboutContent,
  updateAboutContent,
  resetAboutContent,
} from '../controllers/aboutController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
router.get('/', getAboutContent);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// ✅ Updated to v2
router.put('/', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updateAboutContent);
router.post('/reset', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), resetAboutContent);

export default router;