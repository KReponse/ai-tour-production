// backend/src/models/Activity.js

import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: [
      'user_registered',
      'user_logged_in',
      'user_logged_out',
      
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'booking_completed',
      
      'payment_success',
      'payment_failed',
      
      'listing_created',
      'listing_updated',
      'listing_approved',
      'listing_rejected',
      
      'tour_created',
      'tour_updated',
      'tour_approved',
      'tour_rejected',
      
      'review_created',
      'review_updated',
      'review_deleted',
      
      'provider_requested',
      'provider_approved',
      'provider_rejected',
      
      'notification_sent',
      'notification_read'
    ],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ action: 1 });
activitySchema.index({ createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;