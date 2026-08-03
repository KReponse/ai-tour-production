// backend/src/routes/userRoutes.js
// ✅ UPDATED - Added debugging

import express from "express";
import {
  getMe,
  updateMe,
  getMyStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus,
  deleteUser
} from "../controllers/userController.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

console.log('✅ userRoutes loaded');

// =========================
// PROTECTED ROUTES (USER)
// =========================

router.use(AuthMiddleware.authenticate);
console.log('✅ Auth middleware applied to user routes');

// Get current user
router.get("/me", (req, res, next) => {
  console.log('📌 GET /me route hit!');
  console.log('👤 req.user:', req.user);
  next();
}, getMe);

// Update profile
router.put("/me", updateMe);

// Get user stats
router.get("/me/stats", getMyStats);

// =========================
// ADMIN ROUTES
// =========================

router.get("/", AuthMiddleware.requireRole('admin'), getAllUsers);
router.get("/:id", AuthMiddleware.requireRole('admin'), getUserById);
router.put("/:id/role", AuthMiddleware.requireRole('admin'), updateUserRole);
router.put("/:id/toggle", AuthMiddleware.requireRole('admin'), toggleUserStatus);
router.delete("/:id", AuthMiddleware.requireRole('admin'), deleteUser);

console.log('✅ userRoutes registered with /me endpoint');

export default router;