// backend/src/routes/providerReviewRoutes.js
// ✅ COMPLETE FIXED - All routes properly configured

import express from 'express';
import {
  getProviderReviews,
  getProviderReviewStats,
  addReview,           // ✅ POST handler
  updateReview,        // ✅ PUT handler
  deleteReview,        // ✅ DELETE handler
  respondToReview,
  editResponse,
  deleteResponse,
  getReviewById
} from '../controllers/providerReviewController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { canRespondToReview } from '../middleware/reviewPermission.js';

const router = express.Router();

// ✅ All routes require authentication and provider role
router.use(AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'));

// =========================
// ✅ GET ROUTES
// =========================
// Get all provider reviews
router.get('/', getProviderReviews);

// Get review statistics
router.get('/stats', getProviderReviewStats);

// Get single review by ID
router.get('/:id', getReviewById);

// =========================
// ✅ POST ROUTES - THIS FIXES YOUR 404 ERROR!
// =========================
// Create a new review
router.post('/', addReview);  // ✅ THIS WAS MISSING!

// =========================
// ✅ PUT ROUTES
// =========================
// Update a review
router.put('/:id', updateReview);

// Edit response to a review
router.put('/:id/respond', canRespondToReview, editResponse);

// =========================
// ✅ DELETE ROUTES
// =========================
// Delete a review
router.delete('/:id', deleteReview);

// Delete response from a review
router.delete('/:id/respond', deleteResponse);

// =========================
// ✅ RESPONSE ROUTES
// =========================
// Add response to a review
router.post('/:id/respond', canRespondToReview, respondToReview);

export default router;