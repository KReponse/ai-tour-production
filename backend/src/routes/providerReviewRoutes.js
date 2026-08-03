// backend/src/routes/providerReviewRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getProviderReviews,
  respondToReview,
  editResponse,
  getProviderReviewStats
} from '../controllers/providerReviewController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { canRespondToReview } from '../middleware/reviewPermission.js';

const router = express.Router();

// ✅ Updated to v2
router.use(AuthMiddleware.authenticate, AuthMiddleware.requireRole('provider'));

// ✅ GET provider reviews
router.get('/', getProviderReviews);

// ✅ GET provider review stats
router.get('/stats', getProviderReviewStats);

// ✅ Respond to review
router.post('/:id/respond', canRespondToReview, respondToReview);

// ✅ Edit response
router.put('/:id/respond', canRespondToReview, editResponse);

export default router;