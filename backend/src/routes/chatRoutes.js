// backend/src/routes/chatRoutes.js
// ✅ FIXED - Using Authentication v2 middleware

import express from 'express';
import {
  getRooms,
  getMessages,
  sendMessage,
  getOrCreateRoom,
  markAsRead,
  getUnreadCount
} from '../controllers/chatController.js';
// ✅ Updated to v2
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All chat routes are protected
// ✅ Updated to v2
router.use(AuthMiddleware.authenticate);

// Chat rooms
router.get('/rooms', getRooms);
router.get('/rooms/unread-count', getUnreadCount);
router.post('/rooms', getOrCreateRoom);

// Messages
router.get('/rooms/:roomId/messages', getMessages);
router.post('/messages', sendMessage);
router.put('/rooms/:roomId/read', markAsRead);

export default router;