// backend/src/routes/newsletterRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  subscribe,
  unsubscribe,
  getSubscribers,
  getStats,
  exportSubscribers,
} from '../controllers/newsletterController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// ✅ Updated to v2
router.get('/subscribers', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getSubscribers);
router.get('/stats', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getStats);
router.get('/export', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), exportSubscribers);

export default router;