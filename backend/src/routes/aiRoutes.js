// backend/src/routes/aiRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  aiChat,
  aiPlanner,
  aiRecommendations,
  aiSearch,
  getTrendingExperiences,
  getFeaturedExperiences,
  switchAIProvider,
  getAIProviderInfo
} from '../controllers/aiController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// =========================
// ✅ PUBLIC ROUTES (No Auth Required)
// =========================

// ✅ AI Provider Info - Public (moved here)
router.get('/provider-info', getAIProviderInfo);

// AI Chat - Get personalized responses with Experiences
router.post('/chat', aiChat);

// AI Planner - Plan trips using Experiences
router.post('/planner', aiPlanner);
router.post('/generate-trip', aiPlanner); // Alias

// AI Search - Search across all Listings
router.get('/search', aiSearch);

// AI Suggestions - Quick suggestions (alias)
router.get('/suggestions', aiRecommendations);

// =========================
// ✅ PROTECTED ROUTES (Auth Required)
// =========================

// AI Recommendations - Get personalized Experience recommendations
// ✅ Updated to v2
router.get('/recommendations', AuthMiddleware.authenticate, aiRecommendations);

// Trending Experiences - Most popular right now
// ✅ Updated to v2
router.get('/trending', AuthMiddleware.authenticate, getTrendingExperiences);

// Featured Experiences - Curated top picks
// ✅ Updated to v2
router.get('/featured', AuthMiddleware.authenticate, getFeaturedExperiences);

// =========================
// ✅ ADMIN ROUTES (Auth + Admin Role)
// =========================

// Switch AI provider
// ✅ Updated to v2
router.post('/switch-provider', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), switchAIProvider);

export default router;