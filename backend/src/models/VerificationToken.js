// backend/src/models/VerificationToken.js
// ✅ FIXED - Removed duplicate tokenHash index

import mongoose from 'mongoose';

const verificationTokenSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  usedAt: Date,
  isUsed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ─── Indexes ─────────────────────────────────────────────────────
// ✅ REMOVED duplicate tokenHash index - unique: true already creates it
verificationTokenSchema.index({ userId: 1 });
verificationTokenSchema.index({ expiresAt: 1, isUsed: 1 });
verificationTokenSchema.index({ type: 1 });

// ─── Methods ─────────────────────────────────────────────────────
verificationTokenSchema.methods = {
  use: async function() {
    this.isUsed = true;
    this.usedAt = new Date();
    return this.save();
  },

  isValid: function() {
    return !this.isUsed && this.expiresAt > new Date();
  }
};

export const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);
export default VerificationToken;