// backend/src/models/RefreshToken.js
// ✅ FIXED - Removed duplicate tokenHash and tokenId indexes

import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true // ✅ This creates the index
  },
  tokenId: {
    type: String,
    required: true,
    unique: true // ✅ This creates the index
  },
  expiresAt: {
    type: Date,
    required: true
  },
  revokedAt: Date,
  revokedReason: {
    type: String,
    enum: ['logout', 'password_change', 'admin_revoke', 'security_breach', 'refresh_used']
  },
  device: {
    userAgent: String,
    ip: String,
    country: String,
    browser: String,
    os: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ─── Indexes ─────────────────────────────────────────────────────
// ✅ REMOVED duplicate tokenHash and tokenId indexes - unique: true already creates them
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 });
refreshTokenSchema.index({ userId: 1, isActive: 1 });

// ─── Methods ─────────────────────────────────────────────────────
refreshTokenSchema.methods = {
  revoke: async function(reason = 'logout') {
    this.revokedAt = new Date();
    this.revokedReason = reason;
    this.isActive = false;
    return this.save();
  },

  isExpired: function() {
    return this.expiresAt < new Date();
  },

  isValid: function() {
    return this.isActive && !this.revokedAt && !this.isExpired();
  }
};

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;