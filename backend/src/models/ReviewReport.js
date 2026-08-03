// backend/src/models/ReviewReport.js

import mongoose from 'mongoose';

const reviewReportSchema = new mongoose.Schema({
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    required: true
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    enum: [
      'inappropriate',
      'fake',
      'offensive',
      'spam',
      'irrelevant',
      'other'
    ],
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'dismissed'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  action: {
    type: String,
    enum: ['hide', 'keep', 'delete', 'warn']
  }
}, {
  timestamps: true
});

reviewReportSchema.index({ review: 1 });
reviewReportSchema.index({ status: 1 });
reviewReportSchema.index({ reporter: 1 });

export default mongoose.model('ReviewReport', reviewReportSchema);