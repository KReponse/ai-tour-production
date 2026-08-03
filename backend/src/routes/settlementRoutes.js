// backend/src/routes/settlementRoutes.js
// ✅ NEW - Settlement Routes for Production-Grade Financial System

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import {
  getSettlements,
  getSettlement,
  getProviderSettlements,
  createSettlement,
  createBulkSettlements,
  processSettlements,
  processProviderSettlements,
  processOverdueSettlements,
  retrySettlement,
  retryAllFailedSettlements,
  cancelSettlement,
  holdSettlement,
  releaseSettlementFromHold,
  scheduleSettlement,
  getSettlementStats,
  getSettlementQueueStatus,
  runScheduledProcessing,
  exportSettlementsCSV,
  cleanupSettlements,
} from "../controllers/settlementController.js";

const router = express.Router();

// ============================================================
// ✅ PUBLIC / WEBHOOK ROUTES (No Auth)
// ============================================================

// None - all settlement routes require authentication

// ============================================================
// ✅ PROVIDER ROUTES (Auth + Provider Role)
// ============================================================

// Get provider's settlements
router.get(
  "/provider",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("provider"),
  getProviderSettlements
);

// ============================================================
// ✅ ADMIN ROUTES (Auth + Admin Role)
// ============================================================

// Apply admin middleware to all routes below
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole("admin"));

// ============================================================
// ✅ SETTLEMENT QUERY ROUTES
// ============================================================

// Get all settlements with filters
router.get("/", getSettlements);

// Get settlement by ID
router.get("/:id", getSettlement);

// Get settlement statistics
router.get("/stats/all", getSettlementStats);

// Get settlement queue status
router.get("/queue-status", getSettlementQueueStatus);

// Export settlements as CSV
router.get("/export/csv", exportSettlementsCSV);

// ============================================================
// ✅ SETTLEMENT CREATION ROUTES
// ============================================================

// Create a single settlement
router.post("/", createSettlement);

// Create bulk settlements
router.post("/bulk", createBulkSettlements);

// ============================================================
// ✅ SETTLEMENT PROCESSING ROUTES
// ============================================================

// Process pending settlements
router.post("/process", processSettlements);

// Process provider settlements
router.post("/provider/:providerId/process", processProviderSettlements);

// Process overdue settlements
router.post("/overdue/process", processOverdueSettlements);

// Run scheduled processing
router.post("/process/scheduled", runScheduledProcessing);

// ============================================================
// ✅ SETTLEMENT MANAGEMENT ROUTES
// ============================================================

// Retry a failed settlement
router.post("/:id/retry", retrySettlement);

// Retry all failed settlements
router.post("/retry/all", retryAllFailedSettlements);

// Cancel a settlement
router.post("/:id/cancel", cancelSettlement);

// Put settlement on hold
router.post("/:id/hold", holdSettlement);

// Release settlement from hold
router.post("/:id/release", releaseSettlementFromHold);

// Schedule a settlement
router.put("/:id/schedule", scheduleSettlement);

// ============================================================
// ✅ SETTLEMENT CLEANUP ROUTES
// ============================================================

// Cleanup old settlements
router.delete("/cleanup", cleanupSettlements);

export default router;