// backend/src/models/Session.js
// ✅ FIXED - Removed duplicate refreshTokenId index

import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  refreshTokenId: {
    type: String,
    required: true,
    unique: true // ✅ This creates the index
  },
  device: {
    userAgent: String,
    ip: String,
    country: String,
    browser: String,
    os: String
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ─── Indexes ─────────────────────────────────────────────────────
// ✅ REMOVED duplicate refreshTokenId index - unique: true already creates it
sessionSchema.index({ userId: 1 });
sessionSchema.index({ userId: 1, isActive: 1 });

export const Session = mongoose.model('Session', sessionSchema);
export default Session;