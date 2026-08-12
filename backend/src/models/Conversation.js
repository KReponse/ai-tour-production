// backend/src/models/Conversation.js
// ✅ NEW - Unified conversation model for all chat types

import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  // Participants
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['traveler', 'provider', 'admin'],
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: null,
    },
  }],

  // Conversation type
  type: {
    type: String,
    enum: ['traveler_provider', 'traveler_support', 'provider_support'],
    required: true,
  },

  // Related entities
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    default: null,
  },

  // Last message
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },

  // Unread counts per participant
  unreadCounts: {
    type: Map,
    of: Number,
    default: new Map(),
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map(),
  },
}, {
  timestamps: true,
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ type: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ 'participants.user': 1, isActive: 1 });

// ✅ Export with default
const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;