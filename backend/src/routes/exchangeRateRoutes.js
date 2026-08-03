// backend/src/routes/exchangeRateRoutes.js
// ✅ Admin Exchange Rate Routes

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import {
  getAllExchangeRates,
  getExchangeRateById,
  createExchangeRate,
  updateExchangeRate,
  deleteExchangeRate,
  toggleExchangeRateStatus,
  refreshExchangeRates,
  getExchangeRateStats,
} from "../controllers/exchangeRateController.js";

const router = express.Router();

// All routes require admin authentication
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole("admin"));

// Get all exchange rates with pagination
router.get("/", getAllExchangeRates);

// Get exchange rate stats
router.get("/stats", getExchangeRateStats);

// Refresh exchange rates from API
router.post("/refresh", refreshExchangeRates);

// Get exchange rate by ID
router.get("/:id", getExchangeRateById);

// Create exchange rate
router.post("/", createExchangeRate);

// Update exchange rate
router.put("/:id", updateExchangeRate);

// Toggle exchange rate status
router.put("/:id/status", toggleExchangeRateStatus);

// Delete exchange rate
router.delete("/:id", deleteExchangeRate);

export default router;