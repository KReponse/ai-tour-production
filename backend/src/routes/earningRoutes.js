
// backend/src/routes/earningRoutes.js

// ============================================================
// AI TOUR RWANDA - EARNING ROUTES
// ============================================================
//
// Authentication:
// - Every route requires authentication.
// - Provider wallet/withdrawal routes require provider role.
// - Admin routes require admin role.
//
// IMPORTANT:
// - Stripe webhook does NOT belong here.
// - Payment confirmation and Earning creation are handled by:
//
//     paymentController
//          ↓
//     paymentService
//          ↓
//     Payment = paid
//          ↓
//     Booking = paid
//          ↓
//     Earning = created once
//
// Correct Stripe webhook:
// POST /api/payments/webhook/stripe
//
// ============================================================

import express from "express";

import {
  getEarnings,
  getEarningSummary,
  getEarningDetails,
  getWithdrawableBalance,
  requestWithdrawal,
  getWithdrawalHistory,
  getTransactionHistory,
  getProviderEarnings,
  getProviderEarningSummary,
  getAdminEarnings,
  updateWithdrawalStatus,
  getPlatformFees,
} from "../controllers/earningController.js";

import { AuthMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// ============================================================
// AUTHENTICATION
// ============================================================
//
// Every earning route requires authentication.
//

router.use(
  AuthMiddleware.authenticate
);

// ============================================================
// MY EARNINGS
// ============================================================
//
// These routes are kept for frontend compatibility.
//
// GET /api/earnings/my
// GET /api/earnings/my/summary
// GET /api/earnings/my/:id
//
// The controller performs the ownership check.
//

router.get(
  "/my",
  getEarnings
);

router.get(
  "/my/summary",
  getEarningSummary
);

router.get(
  "/my/:id",
  getEarningDetails
);

// ============================================================
// PROVIDER WALLET / WITHDRAWAL
// ============================================================
//
// Only providers can access these routes.
//
// Wallet and withdrawal operations must never be available
// to ordinary travelers.
//

router.get(
  "/withdrawable",
  AuthMiddleware.requireRole("provider"),
  getWithdrawableBalance
);

router.post(
  "/withdraw",
  AuthMiddleware.requireRole("provider"),
  requestWithdrawal
);

router.get(
  "/withdrawals",
  AuthMiddleware.requireRole("provider"),
  getWithdrawalHistory
);

// ============================================================
// TRANSACTION HISTORY
// ============================================================
//
// Provider transaction history.
//
// The controller also uses the authenticated user's provider ID,
// so a provider cannot request another provider's transactions.
//

router.get(
  "/transactions",
  AuthMiddleware.requireRole("provider"),
  getTransactionHistory
);

// ============================================================
// PROVIDER EARNINGS
// ============================================================
//
// Explicit provider endpoints.
//
// GET /api/earnings/provider
// GET /api/earnings/provider/summary
//

router.get(
  "/provider",
  AuthMiddleware.requireRole("provider"),
  getProviderEarnings
);

router.get(
  "/provider/summary",
  AuthMiddleware.requireRole("provider"),
  getProviderEarningSummary
);

// ============================================================
// ADMIN EARNINGS
// ============================================================
//
// Admin-only financial management.
//
// GET:
//   /api/earnings/admin
//   /api/earnings/admin/fees
//
// PUT:
//   /api/earnings/admin/withdrawals/:id
//
// Withdrawal status flow:
//
//   pending
//      ↓
//   approved
//      ↓
//   paid
//
// Or:
//
//   pending → rejected
//   approved → rejected
//
// ============================================================

router.get(
  "/admin",
  AuthMiddleware.requireRole("admin"),
  getAdminEarnings
);

router.put(
  "/admin/withdrawals/:id",
  AuthMiddleware.requireRole("admin"),
  updateWithdrawalStatus
);

router.get(
  "/admin/fees",
  AuthMiddleware.requireRole("admin"),
  getPlatformFees
);

// ============================================================
// STRIPE WEBHOOK
// ============================================================
//
// ❌ DO NOT ADD STRIPE WEBHOOK HERE.
//
// The Stripe webhook belongs exclusively to paymentRoutes:
//
// POST /api/payments/webhook/stripe
//
// Flow:
//
// Stripe
//   ↓
// paymentController.stripeWebhook
//   ↓
// paymentService.handleWebhook
//   ↓
// Payment = paid
//   ↓
// Booking = paid
//   ↓
// Earning = created once
//
// This prevents duplicate payment confirmation,
// duplicate Earning creation and inconsistent financial state.
//
// ============================================================

export default router;
