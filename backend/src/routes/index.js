// backend/src/routes/index.js
// ✅ COMPLETE - All routes registered including media routes

import express from 'express';

// ─── Import Routes ─────────────────────────────────────────────────
import authRoutes from './auth.routes.js';
import tourRoutes from './tourRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import requestRoutes from './requestRoutes.js';
import adminRoutes from './adminRoutes.js';
import userRoutes from './userRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import providerRoutes from './providerRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import providerTourRoutes from './providerTourRoutes.js';
import earningRoutes from './earningRoutes.js';
import aiRoutes from './aiRoutes.js';
import chatRoutes from './chatRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import videoRoutes from './videoRoutes.js';
import providerProfileRoutes from './providerProfileRoutes.js';
import listingRoutes from './listingRoutes.js';
import publicReviewRoutes from './publicReviewRoutes.js';
import providerReviewRoutes from './providerReviewRoutes.js';
import adminReviewRoutes from './adminReviewRoutes.js';
import newsletterRoutes from './newsletterRoutes.js';
import providerRequestRoutes from './providerRequestRoutes.js';
import currencyRoutes from './currencyRoutes.js';
import ledgerRoutes from './ledgerRoutes.js';
import walletRoutes from './walletRoutes.js';
import settlementRoutes from './settlementRoutes.js';
import rateLockRoutes from './rateLockRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import heroRoutes from './heroRoutes.js';
import footerRoutes from './footerRoutes.js';
import aboutRoutes from './aboutRoutes.js';
import contactRoutes from './contactRoutes.js';
import faqRoutes from './faqRoutes.js';
import helpRoutes from './helpRoutes.js';
import privacyRoutes from './privacyRoutes.js';
import termsRoutes from './termsRoutes.js';
import careersRoutes from './careersRoutes.js';
import blogRoutes from './blogRoutes.js';
import exchangeRateRoutes from './exchangeRateRoutes.js';
import featuredExperienceRoutes from './featuredExperienceRoutes.js';

// ✅ NEW: Media routes (direct Cloudinary uploads)
import mediaRoutes from './mediaRoutes.js';

// ─── Main Router ──────────────────────────────────────────────────
const router = express.Router();

// ─── Public Routes ──────────────────────────────────────────────
router.use('/auth', authRoutes);

// ─── Protected Routes ───────────────────────────────────────────
// Users
router.use('/users', userRoutes);

// Tours & Listings
router.use('/tours', tourRoutes);
router.use('/listings', listingRoutes);

// Bookings
router.use('/bookings', bookingRoutes);

// Payments
router.use('/payments', paymentRoutes);

// Requests
router.use('/requests', requestRoutes);

// Reviews
router.use('/reviews', reviewRoutes);
router.use('/public', publicReviewRoutes);
router.use('/provider/reviews', providerReviewRoutes);
router.use('/admin/reviews', adminReviewRoutes);

// Providers
router.use('/provider', providerRoutes);
router.use('/providers', providerRoutes);
router.use('/provider/tours', providerTourRoutes);
router.use('/provider-profiles', providerProfileRoutes);
router.use('/provider-request', providerRequestRoutes);

// Admin
router.use('/admin', adminRoutes);

// Notifications
router.use('/notifications', notificationRoutes);

// Earnings
router.use('/earnings', earningRoutes);

// AI & Chat
router.use('/ai', aiRoutes);
router.use('/chat', chatRoutes);

// Analytics
router.use('/analytics', analyticsRoutes);

// Videos
router.use('/videos', videoRoutes);

// Hero
router.use('/hero', heroRoutes);

// Content Management
router.use('/footer', footerRoutes);
router.use('/about', aboutRoutes);
router.use('/contact', contactRoutes);
router.use('/faq', faqRoutes);
router.use('/help', helpRoutes);
router.use('/privacy', privacyRoutes);
router.use('/terms', termsRoutes);
router.use('/careers', careersRoutes);
router.use('/blog', blogRoutes);
router.use('/newsletter', newsletterRoutes);

// Currency
router.use('/currencies', currencyRoutes);

// Financial Routes
router.use('/admin/ledger', ledgerRoutes);
router.use('/wallets', walletRoutes);
router.use('/settlements', settlementRoutes);
router.use('/rate-locks', rateLockRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/admin/exchange-rates', exchangeRateRoutes);
router.use('/webhook', webhookRoutes);

// Featured
router.use('/featured', featuredExperienceRoutes);

// ✅ NEW: Media routes (direct Cloudinary uploads)
router.use('/media', mediaRoutes);

// ─── Health Check ──────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Tour API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;