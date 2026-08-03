// backend/src/routes/publicReviewRoutes.js

import express from 'express';
import {
  getPublicReviews,
  getPublicReviewById,
  getListingReviews,
  getProviderReviews,
  getReviewStats
} from '../controllers/publicReviewController.js';

const router = express.Router();

// Public review endpoints (NO AUTH)
router.get('/reviews', getPublicReviews);
router.get('/reviews/:id', getPublicReviewById);
router.get('/listings/:listingId/reviews', getListingReviews);
router.get('/providers/:providerId/reviews', getProviderReviews);
router.get('/stats/:entityType/:entityId', getReviewStats);

export default router;