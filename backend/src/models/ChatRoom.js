// backend/src/models/ChatRoom.js
// ✅ COMPLETE FIXED - Removed problematic unique index

import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
    index: false, // No unique index
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    default: null,
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: () => new Map(),
  },
  isActive: {
    type: Boolean,
    default: true
  },
}, {
  timestamps: true, // ✅ Use timestamps instead of custom createdAt
});

// ✅ Index for finding rooms by participants (non-unique)
chatRoomSchema.index({ participants: 1 });

// ✅ Compound index for querying (non-unique)
chatRoomSchema.index({ participants: 1, lastMessageAt: -1 });

// ✅ Index for active rooms
chatRoomSchema.index({ participants: 1, isActive: 1 });

// ❌ REMOVED: Unique index causing duplicate key errors
// chatRoomSchema.index({ participants: 1, booking: 1 }, { unique: true });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
export default ChatRoom;