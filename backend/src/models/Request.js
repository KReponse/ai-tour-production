// backend/src/models/Request.js
import mongoose from "mongoose";

const requestSchema = new mongoose.Schema(
  {
    // =========================
    // USER
    // =========================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // =========================
    // REQUEST TYPE
    // =========================
    type: {
      type: String,
      enum: ['support', 'feedback', 'feature', 'bug', 'planning', 'other'],
      default: 'planning'
    },

    // =========================
    // TRIP DETAILS (for planning)
    // =========================
    destination: {
      type: String,
      trim: true
    },

    startDate: {
      type: Date
    },

    endDate: {
      type: Date
    },

    travelers: {
      type: Number,
      min: 1,
      default: 1
    },

    budget: {
      type: String,
      trim: true
    },

    accommodation: {
      type: String,
      enum: ['budget', 'mid-range', 'luxury', 'not-specified'],
      default: 'not-specified'
    },

    preferences: {
      type: [String],
      default: []
    },

    specialRequests: {
      type: String,
      trim: true
    },

    // =========================
    // GENERAL REQUEST FIELDS
    // =========================
    subject: {
      type: String,
      trim: true
    },

    message: {
      type: String,
      trim: true
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // =========================
    // STATUS
    // =========================
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'rejected'],
      default: 'pending'
    },

    adminNote: {
      type: String,
      trim: true
    },

    resolvedAt: {
      type: Date
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
  }
);

// =========================
// INDEXES
// =========================
requestSchema.index({ user: 1, createdAt: -1 });
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ type: 1 });
requestSchema.index({ destination: 1 });

// =========================
// VIRTUAL: Trip Duration
// =========================
requestSchema.virtual('tripDuration').get(function() {
  if (this.startDate && this.endDate) {
    const diff = this.endDate - this.startDate;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  }
  return null;
});

// =========================
// METHOD: Check if trip is valid
// =========================
requestSchema.methods.isTripValid = function() {
  return this.destination && this.startDate && this.endDate;
};

// =========================
// METHOD: Format for response
// =========================
requestSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.tripDuration = this.tripDuration;
  return obj;
};

const Request = mongoose.model("Request", requestSchema);
export default Request;