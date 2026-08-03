// backend/src/routes/privacyRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getPrivacyContent,
  updatePrivacyContent,
  resetPrivacyContent,
} from '../controllers/privacyController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
router.get('/', getPrivacyContent);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// ✅ Updated to v2
router.put('/', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updatePrivacyContent);
router.post('/reset', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), resetPrivacyContent);

export default router;