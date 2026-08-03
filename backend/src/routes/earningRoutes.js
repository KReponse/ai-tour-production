// backend/src/routes/earningRoutes.js
// ✅ NEW - Earning Routes with Authentication v2

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
  getPlatformFees
} from "../controllers/earningController.js";
// ✅ Using Authentication v2
import { AuthMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

console.log('✅ Earning routes loading...');

// ============================================
// ✅ ALL ROUTES ARE PROTECTED
// ============================================

router.use(AuthMiddleware.authenticate);

// ============================================
// ✅ USER / TRAVELER EARNING ROUTES
// ============================================

// Get my earnings
router.get("/my", getEarnings);

// Get earning summary
router.get("/my/summary", getEarningSummary);

// Get earning details by ID
router.get("/my/:id", getEarningDetails);

// ============================================
// ✅ WITHDRAWAL ROUTES
// ============================================

// Get withdrawable balance
router.get("/withdrawable", getWithdrawableBalance);

// Request withdrawal
router.post("/withdraw", requestWithdrawal);

// Get withdrawal history
router.get("/withdrawals", getWithdrawalHistory);

// ============================================
// ✅ TRANSACTION ROUTES
// ============================================

// Get transaction history
router.get("/transactions", getTransactionHistory);

// ============================================
// ✅ PROVIDER ROUTES
// ============================================

// Get provider earnings (requires provider role)
router.get("/provider", AuthMiddleware.requireRole('provider'), getProviderEarnings);

// Get provider earning summary
router.get("/provider/summary", AuthMiddleware.requireRole('provider'), getProviderEarningSummary);

// ============================================
// ✅ ADMIN ROUTES (Admin Only)
// ============================================

// Admin: Get all earnings
router.get("/admin", AuthMiddleware.requireRole('admin'), getAdminEarnings);

// Admin: Update withdrawal status
router.put("/admin/withdrawals/:id", AuthMiddleware.requireRole('admin'), updateWithdrawalStatus);

// Admin: Get platform fees
router.get("/admin/fees", AuthMiddleware.requireRole('admin'), getPlatformFees);

console.log('✅ All earning routes registered');

export default router;