// backend/src/routes/aiRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  aiChat,
  aiChatWithSession,
  getChatHistory,
  clearChatHistory,
  getActiveSessions,
  aiPlanner,
  aiRecommendations,
  aiSearch,
  getTrendingExperiences,
  getFeaturedExperiences,
  switchAIProvider,
  getAIProviderInfo,
  getDestinations  // ✅ NEW
} from '../controllers/aiController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// =========================
// ✅ PUBLIC ROUTES (No Auth Required)
// =========================

// ✅ AI Provider Info - Public
router.get('/provider-info', getAIProviderInfo);

// ✅ AI Chat - Get personalized responses with Experiences
router.post('/chat', aiChat);

// ✅ AI Chat with Session - Continue conversation
router.post('/chat/session', aiChatWithSession);

// ✅ AI Planner - Plan trips using Experiences
router.post('/planner', aiPlanner);
router.post('/generate-trip', aiPlanner); // Alias

// ✅ AI Search - Search across all Listings
router.get('/search', aiSearch);

// ✅ AI Suggestions - Quick suggestions (alias)
router.get('/suggestions', aiRecommendations);

// ✅ GET DESTINATIONS - Dynamic destinations from listings
router.get('/destinations', getDestinations);  // ✅ NEW

// =========================
// ✅ PROTECTED ROUTES (Auth Required)
// =========================

// AI Recommendations - Get personalized Experience recommendations
router.get('/recommendations', AuthMiddleware.authenticate, aiRecommendations);

// Trending Experiences - Most popular right now
router.get('/trending', AuthMiddleware.authenticate, getTrendingExperiences);

// Featured Experiences - Curated top picks
router.get('/featured', AuthMiddleware.authenticate, getFeaturedExperiences);

// =========================
// ✅ SESSION ROUTES (Auth Optional)
// =========================

// Get chat history by session ID
router.get('/chat/history/:sessionId', getChatHistory);

// Clear chat history by session ID
router.delete('/chat/history/:sessionId', clearChatHistory);

// =========================
// ✅ ADMIN ROUTES (Auth + Admin Role)
// =========================

// Get active sessions (Admin only)
router.get('/sessions', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), getActiveSessions);

// Switch AI provider (Admin only)
router.post('/switch-provider', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), switchAIProvider);

export default router;