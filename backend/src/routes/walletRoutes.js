// backend/src/routes/walletRoutes.js
// ✅ NEW - Wallet Routes for Production-Grade Financial System

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import {
  getUserWallets,
  getWallet,
  getWalletBalance,
  getProviderBalanceSummary,
  getProviderWallets,
  depositToWallet,
  requestWithdrawal,
  getWithdrawalHistory,
  getTransactionHistory,
  getTransactionByReference,
  processWithdrawal,
  getAdminWalletSummary,
  freezeWallet,
  unfreezeWallet,
  getWalletStats,
  getWalletTransactions,
  getAllWallets,
} from "../controllers/walletController.js";

const router = express.Router();

// ============================================================
// ✅ ROUTES WITH AUTHENTICATION (All routes require auth)
// ============================================================

router.use(AuthMiddleware.authenticate);

// ============================================================
// ✅ USER WALLET ROUTES
// ============================================================

// Get user's wallets
router.get("/", getUserWallets);

// Get wallet by ID
router.get("/:id", getWallet);

// Get wallet balance
router.get("/:id/balance", getWalletBalance);

// Get wallet transactions
router.get("/:id/transactions", getWalletTransactions);

// ============================================================
// ✅ PROVIDER WALLET ROUTES
// ============================================================

// Get provider balance summary
router.get("/provider/summary", AuthMiddleware.requireRole("provider"), getProviderBalanceSummary);

// Get provider wallets
router.get("/provider/list", AuthMiddleware.requireRole("provider"), getProviderWallets);

// Request withdrawal
router.post("/withdraw/request", AuthMiddleware.requireRole("provider"), requestWithdrawal);

// Get withdrawal history
router.get("/withdrawals", AuthMiddleware.requireRole("provider"), getWithdrawalHistory);

// ============================================================
// ✅ TRANSACTION ROUTES
// ============================================================

// Get transaction history
router.get("/transactions", getTransactionHistory);

// Get transaction by reference
router.get("/transactions/:reference", getTransactionByReference);

// ============================================================
// ✅ ADMIN WALLET ROUTES
// ============================================================

// Get all wallets (admin)
router.get("/admin/all", AuthMiddleware.requireRole("admin"), getAllWallets);

// Get admin wallet summary
router.get("/admin/summary", AuthMiddleware.requireRole("admin"), getAdminWalletSummary);

// Get wallet stats
router.get("/admin/stats", AuthMiddleware.requireRole("admin"), getWalletStats);

// Deposit to wallet (admin)
router.post("/:id/deposit", AuthMiddleware.requireRole("admin"), depositToWallet);

// Process withdrawal (admin)
router.put("/withdrawals/:id/process", AuthMiddleware.requireRole("admin"), processWithdrawal);

// Freeze wallet (admin)
router.post("/:id/freeze", AuthMiddleware.requireRole("admin"), freezeWallet);

// Unfreeze wallet (admin)
router.post("/:id/unfreeze", AuthMiddleware.requireRole("admin"), unfreezeWallet);

export default router;