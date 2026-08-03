// backend/src/routes/tourRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import upload from '../middleware/upload.js';
import {
  createTour,
  getTours,
  getSingleTour,
  getProviderTours,
  getAllTours,
  getPendingTours,
  approveTour,
  rejectTour,
  deleteTour,
  toggleLike,
  getLikes,
  checkLike,
  getToursByLocation,
  updateTour,
  getPopularTours,
} from '../controllers/tourController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// =========================
// PUBLIC ROUTES
// =========================

router.get('/', getTours);
router.get('/popular', getPopularTours);
router.get('/location/:location', getToursByLocation);

// ✅ Updated to v2
router.get('/my', AuthMiddleware.authenticate, getProviderTours);

// =========================
// LIKES ROUTES (Protected)
// =========================

// ✅ Updated to v2
router.post('/:id/like', AuthMiddleware.authenticate, toggleLike);
router.get('/:id/likes', getLikes);
// ✅ Updated to v2
router.get('/:id/likes/check', AuthMiddleware.authenticate, checkLike);

// =========================
// PROVIDER ROUTES (Protected)
// =========================

// ✅ id route LAST
router.get('/:id', getSingleTour);

// ✅ Updated to v2
router.post(
  '/',
  AuthMiddleware.authenticate,
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 15 },
    { name: 'videos', maxCount: 3 }
  ]),
  createTour
);

// ✅ Updated to v2
router.put(
  '/:id',
  AuthMiddleware.authenticate,
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 15 },
    { name: 'videos', maxCount: 3 }
  ]),
  updateTour
);

// =========================
// ADMIN ROUTES (Protected + Admin Only)
// =========================

// ✅ Updated to v2
router.get('/admin/all', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getAllTours);
router.get('/admin/pending', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getPendingTours);
router.put('/admin/:id/approve', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), approveTour);
router.put('/admin/:id/reject', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), rejectTour);
router.delete('/admin/:id', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), deleteTour);

export default router;