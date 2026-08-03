// backend/src/routes/currencyRoutes.js
// ✅ COMPLETE FIXED - Moved default currency to public routes

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import {
  getCurrencies,
  getCurrencyByCode,
  getDefaultCurrency,
  getSupportedCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  updateExchangeRate,
  getExchangeRateHistory,
  toggleCurrencyStatus,
  setDefaultCurrency,
  setBaseCurrency,
  bulkUpdateExchangeRates,
  getCurrencyStats,
  convertAmount,
  getPlatformFees,
  getProviderSettlementCurrency,
  updateProviderSettlementCurrency,
  getUserPreferredCurrency,
  updateUserPreferredCurrency,
  getAllowedSettlementCurrencies,
  getCurrencyExchangeRate,
} from "../controllers/currencyController.js";

const router = express.Router();

// ============================================================
// ✅ PUBLIC ROUTES (No Authentication Required)
// ============================================================

// Get supported currencies (public)
router.get("/supported", getSupportedCurrencies);

// ✅ Get default currency (public - needed before login)
router.get("/default", getDefaultCurrency);

// Convert amount (public)
router.get("/convert", convertAmount);

// Get platform fees (public)
router.get("/fees", getPlatformFees);

// Get exchange rate (public)
router.get("/exchange-rate", getCurrencyExchangeRate);

// Get allowed settlement currencies (public)
router.get("/settlement/allowed", getAllowedSettlementCurrencies);

// ============================================================
// ✅ AUTHENTICATED ROUTES (Auth Required)
// ============================================================

// Apply authentication middleware to all routes below
router.use(AuthMiddleware.authenticate);

// Get all currencies (auth required)
router.get("/", getCurrencies);

// Get currency by code (auth required)
router.get("/:code", getCurrencyByCode);

// Get user preferred currency (auth required)
router.get("/user/preferred", getUserPreferredCurrency);

// Update user preferred currency (auth required)
router.put("/user/preferred", updateUserPreferredCurrency);

// Get provider settlement currency (auth required)
router.get("/provider/settlement", getProviderSettlementCurrency);

// Update provider settlement currency (auth required)
router.put("/provider/settlement", updateProviderSettlementCurrency);

// ============================================================
// ✅ ADMIN ROUTES (Admin Role Required)
// ============================================================

// Create currency
router.post("/", AuthMiddleware.requireRole("admin"), createCurrency);

// Update currency
router.put("/:code", AuthMiddleware.requireRole("admin"), updateCurrency);

// Delete currency
router.delete("/:code", AuthMiddleware.requireRole("admin"), deleteCurrency);

// Update exchange rate
router.put(
  "/:code/exchange-rate",
  AuthMiddleware.requireRole("admin"),
  updateExchangeRate
);

// Get exchange rate history
router.get(
  "/:code/history",
  AuthMiddleware.requireRole("admin"),
  getExchangeRateHistory
);

// Toggle currency status
router.put(
  "/:code/toggle",
  AuthMiddleware.requireRole("admin"),
  toggleCurrencyStatus
);

// Set default currency
router.put(
  "/:code/default",
  AuthMiddleware.requireRole("admin"),
  setDefaultCurrency
);

// Set base currency
router.put(
  "/:code/base",
  AuthMiddleware.requireRole("admin"),
  setBaseCurrency
);

// Bulk update exchange rates
router.post(
  "/bulk/rates",
  AuthMiddleware.requireRole("admin"),
  bulkUpdateExchangeRates
);

// Get currency statistics
router.get(
  "/stats/all",
  AuthMiddleware.requireRole("admin"),
  getCurrencyStats
);

export default router;