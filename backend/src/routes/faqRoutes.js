// backend/src/routes/faqRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getFaqContent,
  updateFaqContent,
  resetFaqContent,
} from '../controllers/faqController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
router.get('/', getFaqContent);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// ✅ Updated to v2
router.put('/', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updateFaqContent);
router.post('/reset', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), resetFaqContent);

export default router;