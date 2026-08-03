// backend/src/routes/adminRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getAllTours,
  getPendingTours,
  approveTour,
  rejectTour,
  deleteTour
} from '../controllers/tourController.js';
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  toggleUserStatus
} from '../controllers/userController.js';
import {
  getAllBookings,
  updateBookingStatus
} from '../controllers/bookingController.js';
import {
  getOverview,
  getUserStats,
  getTourStats,
  getBookingStats,
  getRevenueStats,
  getGrowthStats,
  getTopPerformers,
  getAIAnalytics,
  resetAIAnalytics,
  clearAICache
} from '../controllers/analyticsController.js';
import {
  getDashboardStats,
  getRecentActivities,
  getAllToursAdmin,
  approveTourAdmin,
  rejectTourAdmin,
  getPaymentAnalytics,
  getPaymentDetails,
  getPaymentStats,
  getPaymentsList
} from '../controllers/adminController.js';

import {
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  deleteRequest
} from '../controllers/requestController.js';

import {
  getProviderRequests,
  getProviderRequestById,
  updateProviderRequestStatus,
  approveProviderRequest,
  rejectProviderRequest,
  getAllProviders
} from '../controllers/providerController.js';

import {
  getAllListings,
  getPendingListings,
  approveListing,
  rejectListing,
  suspendListing,
  deleteListingAdmin,
} from "../controllers/listingController.js";

// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All admin routes are protected with adminOnly
// ✅ Updated to v2
router.use(AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'));

// =========================
// DASHBOARD
// =========================

router.get('/dashboard', getDashboardStats);
router.get('/dashboard/activities', getRecentActivities);

// =========================
// TOUR MANAGEMENT (Legacy - uses Listing)
// =========================

router.get('/tours', getAllToursAdmin);
router.get('/tours/pending', getPendingTours);
router.put('/tours/:id/approve', approveTourAdmin);
router.put('/tours/:id/reject', rejectTourAdmin);
router.delete('/tours/:id', deleteTour);

// =========================
// LISTING MANAGEMENT (Primary)
// =========================

router.get("/listings", getAllListings);
router.get("/listings/pending", getPendingListings);
router.put("/listings/:id/approve", approveListing);
router.put("/listings/:id/reject", rejectListing);
router.put("/listings/:id/suspend", suspendListing);
router.delete("/listings/:id", deleteListingAdmin);

// =========================
// USER MANAGEMENT
// =========================

router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/toggle', toggleUserStatus);
router.delete('/users/:id', deleteUser);

// =========================
// BOOKING MANAGEMENT
// =========================

router.get('/bookings', getAllBookings);
router.put('/bookings/:id/status', updateBookingStatus);

// =========================
// REQUESTS (User Trip Requests)
// =========================

router.get('/requests', getAllRequests);
router.get('/requests/:id', getRequestById);
router.put('/requests/:id/status', updateRequestStatus);
router.delete('/requests/:id', deleteRequest);

// =========================
// PROVIDER REQUESTS
// =========================

router.get('/provider-requests', getProviderRequests);
router.get('/provider-requests/:id', getProviderRequestById);
router.put('/provider-requests/:id', updateProviderRequestStatus);
router.put('/provider-requests/:id/approve', approveProviderRequest);
router.put('/provider-requests/:id/reject', rejectProviderRequest);
router.get('/providers', getAllProviders);

// =========================
// ANALYTICS
// =========================

router.get('/analytics/overview', getOverview);
router.get('/analytics/users', getUserStats);
router.get('/analytics/tours', getTourStats);
router.get('/analytics/bookings', getBookingStats);
router.get('/analytics/revenue', getRevenueStats);
router.get('/analytics/growth', getGrowthStats);
router.get('/analytics/top-performers', getTopPerformers);

// AI Analytics
router.get('/analytics/ai', getAIAnalytics);
router.post('/analytics/ai/reset', resetAIAnalytics);
router.delete('/analytics/ai/cache', clearAICache);

// =========================
// PAYMENT ROUTES
// =========================

// ✅ GET ALL PAYMENTS - Static route (MUST come before /:id)
router.get('/payments/all', getPaymentsList);

// ✅ GET PAYMENT STATS - Static route
router.get('/payments/stats', getPaymentStats);

// ✅ GET PAYMENT ANALYTICS - Static route
router.get('/payments/analytics', getPaymentAnalytics);

// ✅ GET PAYMENT BY ID - Dynamic route (MUST come LAST)
router.get('/payments/:id', getPaymentDetails);

export default router;