// backend/src/routes/requestRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  createRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  deleteRequest
} from '../controllers/requestController.js';
import {
  createProviderRequest,
  getMyProviderRequest,
  getProviderRequests,
  getProviderRequestById,
  updateProviderRequestStatus,
  approveProviderRequest,
  rejectProviderRequest
} from '../controllers/providerController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// =========================
// ALL ROUTES ARE PROTECTED
// =========================

// ✅ Updated to v2
router.use(AuthMiddleware.authenticate);

// =========================
// USER REQUEST ROUTES
// =========================

// Create request (User/Provider)
router.post('/', createRequest);

// Get my requests (User)
router.get('/my', getMyRequests);

// =========================
// PROVIDER REQUEST ROUTES
// =========================

// Create provider request
router.post(
  '/provider',
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
    { name: 'nationalId', maxCount: 1 },
    { name: 'passport', maxCount: 1 },
    { name: 'rdbCertificate', maxCount: 1 },
    { name: 'tinCertificate', maxCount: 1 },
    { name: 'tourismLicense', maxCount: 1 },
    { name: 'businessRegistration', maxCount: 1 },
    { name: 'insurance', maxCount: 1 },
  ]),
  createProviderRequest
);

// Get my provider request status
router.get('/provider/me', getMyProviderRequest);

// =========================
// ⚠️ CRITICAL: ADMIN PROVIDER REQUEST ROUTES
// MUST come BEFORE the dynamic /:id route
// =========================

// ✅ Get all provider requests (Admin only)
// ✅ Updated to v2
router.get('/provider-requests', AuthMiddleware.requireRole('admin'), getProviderRequests);

// ✅ Get single provider request by ID (Admin only)
// ✅ Updated to v2
router.get('/provider-requests/:id', AuthMiddleware.requireRole('admin'), getProviderRequestById);

// ✅ Update provider request status (Admin only)
// ✅ Updated to v2
router.put('/provider-requests/:id', AuthMiddleware.requireRole('admin'), updateProviderRequestStatus);

// ✅ Approve provider request (Admin only)
// ✅ Updated to v2
router.put('/provider-requests/:id/approve', AuthMiddleware.requireRole('admin'), approveProviderRequest);

// ✅ Reject provider request (Admin only)
// ✅ Updated to v2
router.put('/provider-requests/:id/reject', AuthMiddleware.requireRole('admin'), rejectProviderRequest);

// =========================
// ⚠️ DYNAMIC ROUTE — MUST come AFTER static routes
// =========================

// Get specific request (User) - THIS MUST BE LAST
router.get('/:id', getRequestById);

// =========================
// ADMIN REQUEST ROUTES
// =========================

// Get all requests (Admin only)
// ✅ Updated to v2
router.get('/', AuthMiddleware.requireRole('admin'), getAllRequests);

// Update request status (Admin only)
// ✅ Updated to v2
router.put('/:id/status', AuthMiddleware.requireRole('admin'), updateRequestStatus);

// Delete request (Admin only)
// ✅ Updated to v2
router.delete('/:id', AuthMiddleware.requireRole('admin'), deleteRequest);

export default router;