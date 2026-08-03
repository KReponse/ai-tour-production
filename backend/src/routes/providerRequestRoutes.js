// backend/src/routes/providerRequestRoutes.js
// ✅ NEW - Provider Request Routes

import express from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { getMyProviderRequest } from "../controllers/providerRequestController.js";

const router = express.Router();

// ✅ Get current user's provider request
router.get("/my", AuthMiddleware.authenticate, getMyProviderRequest);

export default router;