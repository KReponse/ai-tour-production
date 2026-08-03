// backend/src/routes/auth.routes.js
// ✅ Authentication v2 - Auth Routes

import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { RateLimitMiddleware } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

// ─── Public Routes ──────────────────────────────────────────────
router.post('/register', RateLimitMiddleware.auth, AuthController.register);
router.post('/login', RateLimitMiddleware.auth, AuthController.login);
router.post('/refresh-token', RateLimitMiddleware.refresh, AuthController.refresh);
router.get('/verify-email/:token', AuthController.verifyEmail);
router.post('/resend-verification', RateLimitMiddleware.auth, AuthController.resendVerification);
router.post('/forgot-password', RateLimitMiddleware.auth, AuthController.forgotPassword);
router.post('/reset-password/:token', RateLimitMiddleware.auth, AuthController.resetPassword);

// ─── Protected Routes ───────────────────────────────────────────
router.use(AuthMiddleware.authenticate);

router.get('/me', AuthController.getCurrentUser);
router.put('/profile', AuthController.updateProfile);
router.post('/logout', AuthController.logout);
router.post('/logout-all', AuthController.logoutAll);
router.put('/change-password', AuthController.changePassword);

export default router;