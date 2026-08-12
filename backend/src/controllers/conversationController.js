// backend/src/controllers/conversationController.js
// ✅ COMPLETE FIXED - All functions properly exported

import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { ResponseUtils } from '../utils/response.utils.js';

// ─── GET CONVERSATIONS ──────────────────────────────────────────

export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const filter = {
      'participants.user': userId,
      isActive: true,
    };

    // Role-based filtering
    if (userRole === 'traveler') {
      filter.type = { $in: ['traveler_provider', 'traveler_support'] };
    } else if (userRole === 'provider') {
      filter.type = { $in: ['traveler_provider', 'provider_support'] };
    } // Admin sees all

    const conversations = await Conversation.find(filter)
      .populate('participants.user', 'name email role profileImage')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    // Get unread counts
    const conversationsWithUnread = conversations.map(conv => {
      const convObj = conv.toObject();
      const unreadCount = conv.unreadCounts?.get(userId.toString()) || 0;
      return { ...convObj, unreadCount };
    });

    res.json({
      success: true,
      data: conversationsWithUnread,
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET CONVERSATION ───────────────────────────────────────────

export const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      _id: id,
      'participants.user': userId,
      isActive: true,
    })
      .populate('participants.user', 'name email role profileImage')
      .populate('lastMessage');

    if (!conversation) {
      return ResponseUtils.error(res, 'Conversation not found', 404);
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET MESSAGES ───────────────────────────────────────────────

export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 30 } = req.query;
    const userId = req.user.id;

    // Verify access
    const conversation = await Conversation.findOne({
      _id: id,
      'participants.user': userId,
      isActive: true,
    });

    if (!conversation) {
      return ResponseUtils.error(res, 'Conversation not found', 404);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({ conversation: id })
      .populate('sender', 'name email role profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ conversation: id });

    res.json({
      success: true,
      data: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── CREATE CONVERSATION ────────────────────────────────────────

export const createConversation = async (req, res) => {
  try {
    const { participantId, type, bookingId, listingId, message } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate
    if (!participantId || !type) {
      return ResponseUtils.error(res, 'Participant and type are required', 400);
    }

    // Check if conversation exists
    const existing = await Conversation.findOne({
      'participants.user': { $all: [userId, participantId] },
      type,
      isActive: true,
      ...(bookingId && { booking: bookingId }),
    });

    if (existing) {
      // If message provided, add it
      if (message) {
        const newMessage = new Message({
          conversation: existing._id,
          sender: userId,
          content: message,
        });
        await newMessage.save();

        // Update last message
        existing.lastMessage = newMessage._id;
        existing.lastMessageAt = new Date();

        // Increment unread for recipient
        const currentUnread = existing.unreadCounts?.get(participantId) || 0;
        existing.unreadCounts.set(participantId, currentUnread + 1);

        await existing.save();

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
          io.to(`conversation:${existing._id}`).emit('new-message', {
            conversationId: existing._id,
            message: newMessage,
          });
          io.to(`user:${participantId}`).emit('unread-count-update', {
            count: await getTotalUnread(participantId),
          });
        }
      }

      return res.json({
        success: true,
        data: existing,
        isNew: false,
      });
    }

    // Create new conversation
    const conversation = new Conversation({
      participants: [
        { user: userId, role: userRole },
        { user: participantId, role: 'unknown' },
      ],
      type,
      booking: bookingId || null,
      listing: listingId || null,
    });

    // Set participant roles
    const participant = conversation.participants.find(
      p => p.user.toString() === participantId
    );
    if (participant) {
      const User = await import('../models/User.js').then(m => m.default);
      const userData = await User.findById(participantId);
      participant.role = userData?.role || 'traveler';
    }

    await conversation.save();

    // If message provided, add it
    if (message) {
      const newMessage = new Message({
        conversation: conversation._id,
        sender: userId,
        content: message,
      });
      await newMessage.save();

      conversation.lastMessage = newMessage._id;
      conversation.lastMessageAt = new Date();

      const currentUnread = conversation.unreadCounts?.get(participantId) || 0;
      conversation.unreadCounts.set(participantId, currentUnread + 1);

      await conversation.save();
    }

    // Populate
    await conversation.populate('participants.user', 'name email role profileImage');

    res.status(201).json({
      success: true,
      data: conversation,
      isNew: true,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── SEND MESSAGE ───────────────────────────────────────────────

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const userId = req.user.id;

    if (!conversationId || !content) {
      return ResponseUtils.error(res, 'Conversation ID and content are required', 400);
    }

    // Verify access
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId,
      isActive: true,
    });

    if (!conversation) {
      return ResponseUtils.error(res, 'Conversation not found', 404);
    }

    // Create message
    const message = new Message({
      conversation: conversationId,
      sender: userId,
      content: content.trim(),
    });
    await message.save();

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();

    // Increment unread for other participants
    const otherParticipants = conversation.participants.filter(
      p => p.user.toString() !== userId
    );

    for (const p of otherParticipants) {
      const currentUnread = conversation.unreadCounts?.get(p.user.toString()) || 0;
      conversation.unreadCounts.set(p.user.toString(), currentUnread + 1);
    }

    await conversation.save();

    // Populate sender
    await message.populate('sender', 'name email role profileImage');

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      // To conversation room
      io.to(`conversation:${conversationId}`).emit('new-message', {
        conversationId,
        message,
      });

      // To individual users
      for (const p of otherParticipants) {
        io.to(`user:${p.user}`).emit('unread-count-update', {
          count: await getTotalUnread(p.user),
        });
        io.to(`user:${p.user}`).emit('new-chat-message', {
          conversationId,
          message,
          sender: req.user.name,
        });
      }
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── MARK AS READ ───────────────────────────────────────────────

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      _id: id,
      'participants.user': userId,
      isActive: true,
    });

    if (!conversation) {
      return ResponseUtils.error(res, 'Conversation not found', 404);
    }

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: id,
        'sender': { $ne: userId },
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    // Reset unread count
    conversation.unreadCounts.set(userId.toString(), 0);
    await conversation.save();

    // Update participant last read
    const participant = conversation.participants.find(
      p => p.user.toString() === userId
    );
    if (participant) {
      participant.lastReadAt = new Date();
      await conversation.save();
    }

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${id}`).emit('messages-read', {
        conversationId: id,
        userId,
      });
      io.to(`user:${userId}`).emit('unread-count-update', {
        count: await getTotalUnread(userId),
      });
    }

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET UNREAD COUNT ───────────────────────────────────────────

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await getTotalUnread(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── HELPERS ─────────────────────────────────────────────────────

async function getTotalUnread(userId) {
  const conversations = await Conversation.find({
    'participants.user': userId,
    isActive: true,
  });

  let total = 0;
  for (const conv of conversations) {
    total += conv.unreadCounts?.get(userId.toString()) || 0;
  }
  return total;
}