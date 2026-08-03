// backend/src/routes/notificationRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
} from '../controllers/notificationController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All notification routes are protected
// ✅ Updated to v2
router.use(AuthMiddleware.authenticate);

// Get notifications
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);

// Mark as read
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

// Delete
router.delete('/:id', deleteNotification);
router.delete('/read/all', deleteAllRead);

export default router;