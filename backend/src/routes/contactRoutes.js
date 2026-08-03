// backend/src/routes/contactRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getContactContent,
  updateContactContent,
  resetContactContent,
} from '../controllers/contactController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
router.get('/', getContactContent);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// ✅ Updated to v2
router.put('/', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updateContactContent);
router.post('/reset', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), resetContactContent);

export default router;