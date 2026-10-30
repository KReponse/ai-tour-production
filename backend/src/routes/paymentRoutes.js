// backend/src/routes/paymentRoutes.js
// ============================================================
// AI TOUR RWANDA - PAYMENT ROUTES
// ============================================================

import express from "express";

import { AuthMiddleware } from "../middleware/auth.middleware.js";

import {
  createCheckoutSession,
  verifyPayment,
  getPaymentById,
  getMyPayments,
  getProviderPayments,
  getAllPayments,
  getPaymentStats,
  getProviderPaymentStats,
  getAdminPaymentStats,
  requestRefund,
  processRefund,
  getPaymentReceipt,
  getPaymentAnalytics,
  exportPaymentsCSV,
  stripeWebhook,
} from "../controllers/paymentController.js";

const router = express.Router();

// ============================================================
// STRIPE WEBHOOK
// ============================================================
// IMPORTANT:
// This route MUST receive the raw Stripe request body.
// Do not put JSON parsing middleware before this route.
// Stripe signature verification happens inside the controller.
// ============================================================

router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// ============================================================
// PAYMENT STATISTICS
// ============================================================

router.get(
  "/stats",
  AuthMiddleware.authenticate,
  getPaymentStats
);

// ============================================================
// TRAVELER PAYMENTS
// ============================================================

router.get(
  "/my-payments",
  AuthMiddleware.authenticate,
  getMyPayments
);

// ============================================================
// CREATE CHECKOUT
// ============================================================
// Authentication REQUIRED.
// A traveler must be authenticated before creating a checkout.
// ============================================================

router.post(
  "/checkout",
  AuthMiddleware.authenticate,
  createCheckoutSession
);

// ============================================================
// VERIFY STRIPE PAYMENT
// ============================================================
// IMPORTANT:
//
// Do NOT require JWT here.
//
// Stripe redirects the traveler to:
//
// /payment-success?session_id=cs_test_...
//
// The frontend sends the Stripe session_id to this endpoint.
//
// Security is handled server-side by:
// 1. Finding the payment using the high-entropy Stripe session ID.
// 2. Verifying the payment with Stripe through PaymentService.
// 3. Updating Payment/Booking/Earning only after provider verification.
//
// The controller MUST NOT trust:
// - booking_id
// - frontend payment status
// - frontend success flag
//
// Only Stripe/provider verification can establish payment success.
// ============================================================

router.get(
  "/verify/:sessionId",
  verifyPayment
);

// ============================================================
// PAYMENT BY ID
// ============================================================

router.get(
  "/:id",
  AuthMiddleware.authenticate,
  getPaymentById
);

// ============================================================
// PAYMENT RECEIPT
// ============================================================

router.get(
  "/:id/receipt",
  AuthMiddleware.authenticate,
  getPaymentReceipt
);

// ============================================================
// REQUEST REFUND - TRAVELER
// ============================================================

router.post(
  "/:id/refund",
  AuthMiddleware.authenticate,
  requestRefund
);

// ============================================================
// PROVIDER PAYMENTS
// ============================================================

router.get(
  "/provider/payments",
  AuthMiddleware.authenticate,
  getProviderPayments
);

// ============================================================
// PROVIDER PAYMENT STATS
// ============================================================

router.get(
  "/provider/payments/stats",
  AuthMiddleware.authenticate,
  getProviderPaymentStats
);

// ============================================================
// PROVIDER EARNINGS
// ============================================================
// NOTE:
// If this endpoint is implemented in another controller/service
// later, keep this route aligned with that implementation.
// ============================================================

router.get(
  "/provider/earnings",
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      // Keep compatibility with existing controller/service setup.
      // If getProviderEarnings is exported from paymentController,
      // replace this wrapper with the direct controller import.
      const { getProviderEarnings } = await import(
        "../controllers/paymentController.js"
      );

      return getProviderEarnings(req, res, next);
    } catch (error) {
      return next(error);
    }
  }
);

// ============================================================
// ADMIN PAYMENTS
// ============================================================

router.get(
  "/admin/payments",
  AuthMiddleware.authenticate,
  getAllPayments
);

// ============================================================
// ADMIN PAYMENT STATS
// ============================================================

router.get(
  "/admin/payments/stats",
  AuthMiddleware.authenticate,
  getAdminPaymentStats
);

// ============================================================
// ADMIN PROCESS REFUND
// ============================================================

router.post(
  "/admin/payments/:id/refund",
  AuthMiddleware.authenticate,
  processRefund
);

// ============================================================
// ADMIN EXPORT PAYMENTS CSV
// ============================================================

router.get(
  "/admin/payments/export",
  AuthMiddleware.authenticate,
  exportPaymentsCSV
);

// ============================================================
// ADMIN PAYMENT ANALYTICS
// ============================================================

router.get(
  "/admin/analytics",
  AuthMiddleware.authenticate,
  getPaymentAnalytics
);

// ============================================================
// ERROR HANDLER FOR PAYMENT ROUTER
// ============================================================

router.use((error, req, res, next) => {
  console.error("❌ Payment route error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message:
      error.message ||
      "An error occurred while processing the payment request.",
  });
});

// ============================================================
// EXPORT
// ============================================================

export default router;