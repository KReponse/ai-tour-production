// backend/src/routes/chatRoutes.js
// ✅ FIXED - Using Authentication v2 middleware
// ✅ ADDED: Multiple routes for frontend compatibility

import express from 'express';
import {
  getRooms,
  getMessages,
  sendMessage,
  getOrCreateRoom,
  markAsRead,
  getUnreadCount
} from '../controllers/chatController.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All chat routes are protected
router.use(AuthMiddleware.authenticate);

// Chat rooms
router.get('/rooms', getRooms);
router.get('/rooms/unread-count', getUnreadCount);
router.post('/rooms', getOrCreateRoom);

// Messages
router.get('/rooms/:roomId/messages', getMessages);
router.post('/messages', sendMessage);
router.put('/rooms/:roomId/read', markAsRead);

// ✅ ADDED: Frontend compatibility routes
router.get('/conversations/unread', getUnreadCount);  // For /api/conversations/unread
router.get('/unread', getUnreadCount);               // For /api/chat/unread

export default router;