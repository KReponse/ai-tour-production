// backend/src/models/ChatSession.js
// ✅ FIXED - Using ES Module syntax

import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userLocation: {
    type: String,
    default: 'Rwanda'
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      location: 'Rwanda',
      lastIntent: null,
      lastSearch: null,
      lastResults: []
    }
  },
  lastMessage: {
    type: String,
    default: null
  },
  lastResponse: {
    type: String,
    default: null
  },
  lastIntent: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  endedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
chatSessionSchema.index({ userId: 1, isActive: 1 });
chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ 'messages.timestamp': 1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

// ✅ ES Module export
export default ChatSession;