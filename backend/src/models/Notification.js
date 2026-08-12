// backend/src/models/Notification.js
// ✅ PRODUCTION READY - Notification Model
// ✅ COMPLETE FIXED - Removed all index: true from field definitions
// ✅ All indexes defined ONLY in schema.index() section

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    // ✅ REMOVED: index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  type: {
    type: String,
    enum: [
      // Booking related
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'booking_rejected',
      'booking_completed',
      'booking_update',
      
      // Payment related
      'payment_success',
      'payment_failed',
      'payment_received',
      'refund_request',
      'refund_processed',
      
      // Review related
      'new_review',
      'provider_reply',
      'review_hidden',
      'review_restored',
      'review_report_threshold',
      
      // Message related
      'new_message',
      
      // Tour/Listing related
      'tour_created',
      'tour_approved',
      'tour_rejected',
      'listing_created',
      'listing_approved',
      'listing_rejected',
      'listing_suspended',
      'listing_deleted',
      
      // Earning related
      'earning_credited',
      'withdrawal_requested',
      'withdrawal_completed',
      
      // Wallet related
      'wallet_deposit',
      'wallet_frozen',
      'wallet_unfrozen',
      
      // System
      'system_alert',
      'account_verified',
      'account_suspended',
      'provider_approved',
      'provider_rejected',
    ],
    required: true,
    // ✅ REMOVED: index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  read: {
    type: Boolean,
    default: false,
    // ✅ REMOVED: index: true
  },
  readAt: {
    type: Date,
  },
  link: {
    type: String,
    trim: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  emailSentAt: {
    type: Date,
  },
  pushSent: {
    type: Boolean,
    default: false,
  },
  pushSentAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // ✅ REMOVED: index: true
  },
}, {
  timestamps: true,
});

// =========================
// ✅ ALL INDEXES DEFINED IN ONE PLACE
// =========================
// NO index:true in field definitions above
// All indexes defined ONLY here

// Single field indexes
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ read: 1 });
notificationSchema.index({ createdAt: -1 });

// Compound indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ read: 1, createdAt: -1 });

// =========================
// ✅ IMPORTANT NOTES ON INDEXES:
// =========================
// 1. No field has both index:true AND a schema.index() call
// 2. All indexes are defined ONLY in this section
// 3. All single field indexes are listed above
// 4. All compound indexes are listed above

// =========================
// ✅ STATIC METHODS
// =========================

notificationSchema.statics.markAllAsRead = async function(recipientId) {
  const result = await this.updateMany(
    { recipient: recipientId, read: false },
    { read: true, readAt: new Date() }
  );
  return result;
};

notificationSchema.statics.getUnreadCount = async function(recipientId) {
  return this.countDocuments({ recipient: recipientId, read: false });
};

notificationSchema.statics.getForUser = async function(recipientId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  
  const filter = { recipient: recipientId };
  if (unreadOnly) {
    filter.read = false;
  }
  
  const [notifications, total] = await Promise.all([
    this.find(filter)
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);
  
  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// =========================
// ✅ INSTANCE METHODS
// =========================

notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

notificationSchema.methods.markAsUnread = async function() {
  this.read = false;
  this.readAt = null;
  await this.save();
  return this;
};

// =========================
// ✅ VIRTUALS
// =========================

notificationSchema.virtual('isRead').get(function() {
  return this.read === true;
});

notificationSchema.virtual('isUnread').get(function() {
  return this.read === false;
});

// =========================
// ✅ TO JSON / TO OBJECT
// =========================

notificationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

notificationSchema.set('toObject', {
  virtuals: true,
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;