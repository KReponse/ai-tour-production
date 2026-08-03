// backend/src/routes/blogRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getBlogContent,
  getPublishedPosts,
  getPostBySlug,
  updateBlogContent,
  resetBlogContent,
} from '../controllers/blogController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────
router.get('/', getBlogContent);
router.get('/posts', getPublishedPosts);
router.get('/post/:slug', getPostBySlug);

// ─── ADMIN ROUTES ──────────────────────────────────────────────
// ✅ Updated to v2
router.put('/', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), updateBlogContent);
router.post('/reset', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), resetBlogContent);

export default router;