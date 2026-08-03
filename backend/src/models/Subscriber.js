// backend/src/models/Subscriber.js
// ✅ FIXED - Removed duplicate email index

import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,  // ✅ This creates the index automatically
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please enter a valid email address',
      },
    },
    name: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['subscribed', 'unsubscribed'],
      default: 'subscribed',
    },
    source: {
      type: String,
      enum: ['footer', 'popup', 'landing', 'checkout', 'other'],
      default: 'footer',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
// ✅ Only keep indexes for fields that need them beyond unique
subscriberSchema.index({ status: 1 });
subscriberSchema.index({ subscribedAt: -1 });
subscriberSchema.index({ createdAt: -1 });

// ─── Static Methods ─────────────────────────────────────────────

/**
 * Subscribe a new email
 */
subscriberSchema.statics.subscribe = async function (email, data = {}) {
  const existing = await this.findOne({ email: email.toLowerCase() });

  if (existing) {
    if (existing.status === 'unsubscribed') {
      existing.status = 'subscribed';
      existing.unsubscribedAt = null;
      existing.subscribedAt = new Date();
      existing.metadata = { ...existing.metadata, ...data.metadata };
      if (data.name) existing.name = data.name;
      await existing.save();
      return existing;
    }
    throw new Error('Email is already subscribed');
  }

  const subscriber = await this.create({
    email: email.toLowerCase(),
    name: data.name,
    source: data.source || 'footer',
    metadata: data.metadata || {},
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  return subscriber;
};

/**
 * Unsubscribe an email
 */
subscriberSchema.statics.unsubscribe = async function (email) {
  const subscriber = await this.findOne({ email: email.toLowerCase() });

  if (!subscriber) {
    throw new Error('Email not found in our system');
  }

  if (subscriber.status === 'unsubscribed') {
    throw new Error('Email is already unsubscribed');
  }

  subscriber.status = 'unsubscribed';
  subscriber.unsubscribedAt = new Date();
  await subscriber.save();

  return subscriber;
};

/**
 * Get active subscribers count
 */
subscriberSchema.statics.getActiveCount = async function () {
  return this.countDocuments({ status: 'subscribed' });
};

const Subscriber = mongoose.model('Subscriber', subscriberSchema);
export default Subscriber;