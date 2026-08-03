// backend/src/routes/paymentRoutes.js
// ✅ COMPLETE FIXED - Only payment-specific routes
// ✅ Removed wallet/withdrawal/earnings routes (moved to their own routers)

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
// ✅ PUBLIC / WEBHOOK ROUTES (No Auth)
// ============================================================

router.post("/webhook/stripe", express.raw({ type: "application/json" }), stripeWebhook);

// ============================================================
// ✅ TRAVELER ROUTES (Auth Required)
// ============================================================

// Get payment statistics for traveler
router.get("/stats", AuthMiddleware.authenticate, getPaymentStats);

// Get traveler's payments
router.get("/my-payments", AuthMiddleware.authenticate, getMyPayments);

// Get payment by ID
router.get("/:id", AuthMiddleware.authenticate, getPaymentById);

// Get payment receipt
router.get("/:id/receipt", AuthMiddleware.authenticate, getPaymentReceipt);

// Request refund
router.post("/:id/refund", AuthMiddleware.authenticate, requestRefund);

// ============================================================
// ✅ CHECKOUT ROUTES (Auth Required)
// ============================================================

// Create checkout session
router.post("/checkout", AuthMiddleware.authenticate, createCheckoutSession);

// Verify payment
router.get("/verify/:sessionId", AuthMiddleware.authenticate, verifyPayment);

// ============================================================
// ✅ PROVIDER ROUTES (Auth + Provider Role)
// ============================================================

// Get provider's payments
router.get(
  "/provider/payments",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderPayments
);

// Get provider's payment statistics
router.get(
  "/provider/payments/stats",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderPaymentStats
);

// Get provider's payment by ID
router.get(
  "/provider/payments/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getPaymentById
);

// ❌ REMOVED: /provider/earnings → Use /api/earnings/provider
// ❌ REMOVED: /wallet/balance → Use /api/wallets/provider/summary
// ❌ REMOVED: /wallet/withdraw → Use /api/wallets/withdraw/request
// ❌ REMOVED: /wallet/withdrawals → Use /api/wallets/withdrawals
// ❌ REMOVED: /transactions → Use /api/wallets/transactions

// ============================================================
// ✅ ADMIN ROUTES (Auth + Admin Role)
// ============================================================

// Get all payments (admin)
router.get(
  "/admin/payments",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  getAllPayments
);

// Get admin payment statistics
router.get(
  "/admin/payments/stats",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  getAdminPaymentStats
);

// Get payment by ID (admin)
router.get(
  "/admin/payments/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  getPaymentById
);

// Process refund (admin)
router.post(
  "/admin/payments/:id/refund",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  processRefund
);

// Export payments as CSV (admin)
router.get(
  "/admin/payments/export",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  exportPaymentsCSV
);

// Get payment analytics (admin)
router.get(
  "/admin/analytics",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("admin"),
  getPaymentAnalytics
);

export default router;