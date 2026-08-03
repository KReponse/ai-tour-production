// backend/src/routes/termsRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getTermsContent,
  updateTermsContent,
  resetTermsContent,
} from '../controllers/termsController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
router.get('/', getTermsContent);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// ✅ Updated to v2
router.put('/', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updateTermsContent);
router.post('/reset', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), resetTermsContent);

export default router;