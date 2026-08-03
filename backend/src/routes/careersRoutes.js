// backend/src/routes/careersRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getCareersContent,
  updateCareersContent,
  resetCareersContent,
} from '../controllers/careersController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
router.get('/', getCareersContent);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// ✅ Updated to v2
router.put('/', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updateCareersContent);
router.post('/reset', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), resetCareersContent);

export default router;