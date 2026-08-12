// backend/src/models/ChatSession.js
// ✅ COMPLETE FIXED - Removed all index: true from field definitions
// ✅ All indexes defined ONLY in schema.index() section

import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    // ✅ REMOVED: index: true (unique:true creates it automatically)
  },
  userId: {
    type: String,
    required: true,
    // ✅ REMOVED: index: true
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
    // ✅ REMOVED: index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // ✅ REMOVED: index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    // ✅ REMOVED: index: true
  },
  endedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// =========================
// ✅ ALL INDEXES DEFINED IN ONE PLACE
// =========================
// NO index:true in field definitions above
// All indexes defined ONLY here

// Single field indexes
chatSessionSchema.index({ userId: 1 });
chatSessionSchema.index({ isActive: 1 });
chatSessionSchema.index({ createdAt: -1 });
chatSessionSchema.index({ updatedAt: -1 });

// Compound indexes for performance
chatSessionSchema.index({ userId: 1, isActive: 1 });
chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ 'messages.timestamp': 1 });

// =========================
// ✅ IMPORTANT NOTES ON INDEXES:
// =========================
// 1. id has unique:true - this automatically creates an index
//    DO NOT add: chatSessionSchema.index({ id: 1 })
// 2. All other indexes are defined ONLY in this section
// 3. No field has both index:true AND a schema.index() call

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;