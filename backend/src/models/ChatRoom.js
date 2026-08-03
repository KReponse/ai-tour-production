// backend/src/models/ChatRoom.js
// ✅ UPDATED - Uses "listing" instead of "tour"

import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  listing: {  // Changed from 'tour' to 'listing'
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing'
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
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure unique chat room between two users for same booking/listing
chatRoomSchema.index({ participants: 1, booking: 1 }, { unique: true });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
export default ChatRoom;