// backend/src/routes/contactRoutes.js
// ✅ COMPLETE FIXED - Added submit route and message management routes

import express from 'express';
import {
  getContactContent,
  updateContactContent,
  resetContactContent,
  submitContact,        // ✅ ADDED
  getContactMessages,   // ✅ ADDED
  getContactMessageById,// ✅ ADDED
} from '../controllers/contactController.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
// Get contact page content
router.get('/', getContactContent);

// ✅ NEW: Submit contact form (public - no authentication required)
router.post('/submit', submitContact);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// Update contact content
router.put('/', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updateContactContent);

// Reset contact content to defaults
router.post('/reset', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), resetContactContent);

// ✅ NEW: Get all contact messages (admin only)
router.get('/messages', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getContactMessages);

// ✅ NEW: Get single contact message (admin only)
router.get('/messages/:id', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getContactMessageById);

export default router;