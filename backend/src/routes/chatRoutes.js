// backend/src/routes/chatRoutes.js
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

// ✅ ADDED: Frontend compatibility route
router.get('/conversations/unread', getUnreadCount);

export default router;