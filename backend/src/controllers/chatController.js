// backend/src/controllers/chatController.js
// ✅ UPDATED - Uses "listing" instead of "tour"

import ChatRoom from '../models/ChatRoom.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

// Get user's chat rooms
export const getRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      participants: req.user.id,
      isActive: true
    })
    .populate('participants', 'name email profileImage role')
    .populate({
      path: 'lastMessage',
      select: 'message sender createdAt'
    })
    .populate('listing', 'title coverImage location') // Changed from 'tour' to 'listing'
    .sort({ lastMessageAt: -1 });

    res.json({
      success: true,
      rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get messages for a room
export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const room = await ChatRoom.findOne({
      _id: roomId,
      participants: req.user.id
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this chat room'
      });
    }

    const messages = await Message.find({ room: roomId })
      .populate('sender', 'name profileImage role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Mark messages as read
    await Message.updateMany(
      {
        room: roomId,
        receiver: req.user.id,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    const unreadCount = await Message.countDocuments({
      room: roomId,
      receiver: req.user.id,
      read: false
    });
    
    room.unreadCount.set(req.user.id.toString(), 0);
    await room.save();

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('messages-read', {
        userId: req.user.id,
        roomId
      });
    }

    res.json({
      success: true,
      messages: messages.reverse(),
      total: await Message.countDocuments({ room: roomId }),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { roomId, message, receiverId, bookingId, listingId } = req.body; // Changed from tourId to listingId

    let room = await ChatRoom.findById(roomId);

    if (!room && receiverId) {
      room = new ChatRoom({
        participants: [req.user.id, receiverId],
        booking: bookingId || null,
        listing: listingId || null, // Changed from 'tour' to 'listing'
        unreadCount: new Map([
          [req.user.id.toString(), 0],
          [receiverId.toString(), 0]
        ])
      });
      await room.save();
    }

    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room or receiver'
      });
    }

    if (!room.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this chat room'
      });
    }

    const receiver = room.participants.find(
      p => p.toString() !== req.user.id.toString()
    );
    
    const newMessage = new Message({
      room: room._id,
      sender: req.user.id,
      receiver: receiver,
      message: message
    });

    await newMessage.save();

    room.lastMessage = newMessage._id;
    room.lastMessageAt = new Date();
    
    const receiverIdStr = receiver.toString();
    const currentUnread = room.unreadCount.get(receiverIdStr) || 0;
    room.unreadCount.set(receiverIdStr, currentUnread + 1);
    await room.save();

    await newMessage.populate('sender', 'name profileImage role');

    const io = req.app.get('io');
    if (io) {
      io.to(room._id.toString()).emit('new-message', {
        roomId: room._id,
        message: newMessage
      });
      
      io.to(`user-${receiver}`).emit('new-chat-message', {
        roomId: room._id,
        message: newMessage,
        sender: req.user.name
      });
    }

    res.json({
      success: true,
      message: newMessage,
      roomId: room._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create or get chat room
export const getOrCreateRoom = async (req, res) => {
  try {
    const { userId, bookingId, listingId } = req.body; // Changed from tourId to listingId

    let room = await ChatRoom.findOne({
      participants: { $all: [req.user.id, userId] },
      $or: [
        { booking: bookingId || null },
        { listing: listingId || null } // Changed from 'tour' to 'listing'
      ]
    });

    if (!room) {
      room = new ChatRoom({
        participants: [req.user.id, userId],
        booking: bookingId || null,
        listing: listingId || null, // Changed from 'tour' to 'listing'
        unreadCount: new Map([
          [req.user.id.toString(), 0],
          [userId.toString(), 0]
        ])
      });
      await room.save();
    }

    res.json({
      success: true,
      room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await ChatRoom.findOne({
      _id: roomId,
      participants: req.user.id
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await Message.updateMany(
      {
        room: roomId,
        receiver: req.user.id,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    room.unreadCount.set(req.user.id.toString(), 0);
    await room.save();

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('messages-read', {
        userId: req.user.id,
        roomId
      });
    }

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      read: false
    });

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};