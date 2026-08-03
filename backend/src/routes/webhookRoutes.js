// backend/src/routes/webhookRoutes.js
// ✅ NEW - Webhook Routes for Production-Grade Financial System

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import {
  handleWebhook,
  getWebhookEvents,
  getWebhookEvent,
  getWebhookEventsByProvider,
  getWebhookStats,
  getFailedWebhookEvents,
  retryWebhookEvent,
  cleanupWebhookEvents,
  verifyWebhookSignature,
} from "../controllers/webhookController.js";

const router = express.Router();

// ============================================================
// ✅ PUBLIC WEBHOOK ROUTES (No Auth - Called by external services)
// ============================================================

// Stripe webhook endpoint (must use raw body)
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// MoMo webhook endpoint
router.post(
  "/momo",
  express.json(),
  handleWebhook
);

// Airtel webhook endpoint
router.post(
  "/airtel",
  express.json(),
  handleWebhook
);

// PayPal webhook endpoint
router.post(
  "/paypal",
  express.json(),
  handleWebhook
);

// Generic webhook endpoint for future providers
router.post(
  "/:provider",
  express.json(),
  handleWebhook
);

// ============================================================
// ✅ ADMIN WEBHOOK ROUTES (Auth + Admin Role)
// ============================================================

// Apply admin middleware to all routes below
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole("admin"));

// ============================================================
// ✅ WEBHOOK QUERY ROUTES
// ============================================================

// Get all webhook events with filters
router.get("/events", getWebhookEvents);

// Get webhook event by ID
router.get("/events/:id", getWebhookEvent);

// Get webhook events by provider
router.get("/events/provider/:provider", getWebhookEventsByProvider);

// Get webhook statistics
router.get("/stats", getWebhookStats);

// Get failed webhook events
router.get("/failed", getFailedWebhookEvents);

// ============================================================
// ✅ WEBHOOK MANAGEMENT ROUTES
// ============================================================

// Verify webhook signature
router.post("/verify", verifyWebhookSignature);

// Retry a failed webhook event
router.post("/events/:id/retry", retryWebhookEvent);

// Cleanup old webhook events
router.delete("/cleanup", cleanupWebhookEvents);

export default router;