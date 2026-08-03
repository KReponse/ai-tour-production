// backend/src/routes/rateLockRoutes.js
// ✅ NEW - Rate Lock Routes for Production-Grade Financial System

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import {
  createRateLock,
  getRateLock,
  getRateLockForBooking,
  getProviderRateLocks,
  extendRateLock,
  cancelRateLock,
  getRateLockStats,
  validateRateLock,
  getActiveLocksCount,
  cleanupExpiredLocks,
} from "../controllers/rateLockController.js";

const router = express.Router();

// ============================================================
// ✅ PUBLIC ROUTES (No Auth Required)
// ============================================================

// Validate a rate lock (public for checkout)
router.get("/validate/:lockId", validateRateLock);

// Get active locks count (public)
router.get("/active/count", getActiveLocksCount);

// ============================================================
// ✅ AUTHENTICATED ROUTES (Auth Required)
// ============================================================

// Apply authentication to all routes below
router.use(AuthMiddleware.authenticate);

// ============================================================
// ✅ RATE LOCK QUERY ROUTES
// ============================================================

// Get rate lock by ID
router.get("/:lockId", getRateLock);

// Get rate lock for a booking
router.get("/booking/:bookingId", getRateLockForBooking);

// Get provider rate locks
router.get("/provider/locks", AuthMiddleware.requireRole("provider"), getProviderRateLocks);

// Get rate lock statistics (admin)
router.get("/stats/all", AuthMiddleware.requireRole("admin"), getRateLockStats);

// ============================================================
// ✅ RATE LOCK MANAGEMENT ROUTES
// ============================================================

// Create a rate lock
router.post("/", createRateLock);

// Extend a rate lock
router.post("/:lockId/extend", extendRateLock);

// Cancel a rate lock
router.post("/:lockId/cancel", cancelRateLock);

// ============================================================
// ✅ ADMIN RATE LOCK ROUTES
// ============================================================

// Cleanup expired locks (admin)
router.post("/cleanup", AuthMiddleware.requireRole("admin"), cleanupExpiredLocks);

export default router;