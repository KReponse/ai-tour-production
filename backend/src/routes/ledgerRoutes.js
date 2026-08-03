// backend/src/routes/ledgerRoutes.js
import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import {
  getLedgerEntries,
  getLedgerEntryById,      // ✅ This must exist
  getLedgerSummary,
  getLedgerStats,
  exportLedgerCSV,
  createLedgerEntry,
  reverseLedgerEntry,
  reconcileLedger,
} from "../controllers/ledgerController.js";

const router = express.Router();

// All routes require admin authentication
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole("admin"));

router.get("/", getLedgerEntries);
router.get("/summary", getLedgerSummary);
router.get("/stats", getLedgerStats);
router.get("/export", exportLedgerCSV);
router.get("/:id", getLedgerEntryById);
router.post("/", createLedgerEntry);
router.post("/:id/reverse", reverseLedgerEntry);
router.post("/reconcile", reconcileLedger);

export default router;