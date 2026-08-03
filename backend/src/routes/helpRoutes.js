// backend/src/routes/helpRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getHelpContent,
  getArticleBySlug,
  updateHelpContent,
  resetHelpContent,
} from '../controllers/helpController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
router.get('/', getHelpContent);
router.get('/article/:slug', getArticleBySlug);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// ✅ Updated to v2
router.put('/', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updateHelpContent);
router.post('/reset', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), resetHelpContent);

export default router;