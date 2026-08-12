// backend/src/routes/conversationRoutes.js
// ✅ COMPLETE FIXED - Added default export

import express from 'express';
import {
  getConversations,
  getConversation,
  getMessages,
  createConversation,
  sendMessage,
  markAsRead,
  getUnreadCount,
} from '../controllers/conversationController.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

// ─── Conversations ──────────────────────────────────────────────
// Get all conversations for the current user
router.get('/', getConversations);

// Get total unread count
router.get('/unread', getUnreadCount);

// Create a new conversation
router.post('/', createConversation);

// Get a single conversation
router.get('/:id', getConversation);

// ─── Messages ──────────────────────────────────────────────────
// Get messages for a conversation
router.get('/:id/messages', getMessages);

// Send a message to a conversation
router.post('/:id/messages', sendMessage);

// ─── Read Receipts ─────────────────────────────────────────────
// Mark messages as read
router.put('/:id/read', markAsRead);

// ✅ Add default export
export default router;