// backend/src/models/Booking.js
// ✅ COMPLETE FIXED - startDate validator is now context-aware
//    (only rejects past dates on CREATE or when startDate is MODIFIED)
// ✅ cancelBooking is idempotent (no duplicate saves)
// ✅ All duplicate index definitions removed (from prior fix)
// ✅ All indexes defined in ONE place only

import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
{
  // =========================
  // IDENTIFIERS
  // =========================
  bookingCode: {
    type: String,
    unique: true,
    default: () => "AITOUR-" + Date.now(),
  },

  bookingNumber: {
    type: String,
    unique: true,
    default: () => `BK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
  },

  // =========================
  // RELATIONSHIPS
  // =========================
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User is required"],
  },

  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: [true, "Listing is required for booking"],
  },

  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Provider is required"],
  },

  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },

  // =========================
  // DATES
  // =========================
  startDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;

        // ✅ FIX: Only validate on CREATE or when startDate is MODIFIED.
        // This allows cancellation and other status-only updates on
        // existing bookings whose start date has already passed,
        // WITHOUT weakening validation for new bookings or date edits.
        if (!this.isNew && !this.isModified('startDate')) {
          return true;
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const start = new Date(v);
        start.setHours(0, 0, 0, 0);
        return start >= now;
      },
      message: "Start date must be today or in the future",
    },
  },

  endDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        if (!this.startDate) return true;
        const start = new Date(this.startDate);
        const end = new Date(v);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return end >= start;
      },
      message: "End date must be on or after start date",
    },
  },

  checkIn: {
    type: Date,
  },

  checkOut: {
    type: Date,
  },

  // =========================
  // PEOPLE & PRICING
  // =========================
  numberOfPeople: {
    type: Number,
    default: 1,
    min: [1, "Minimum 1 person required"],
    max: [50, "Maximum 50 people allowed"],
  },

  totalPrice: {
    type: Number,
    required: [true, "Total price is required"],
    min: [0.01, "Price must be greater than 0"],
  },

  // =========================
  // PAYMENT STATUS
  // =========================
  paymentStatus: {
    type: String,
    enum: [
      "unpaid",
      "pending",
      "paid",
      "failed",
      "refunded",
      "partially_refunded",
    ],
    default: "unpaid",
  },

  paymentId: {
    type: String,
  },

  paidAt: {
    type: Date,
  },

  // =========================
  // PROVIDER PAYOUT TRACKING
  // =========================
  providerPayoutStatus: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
  },

  providerPayoutDate: {
    type: Date,
  },

  // =========================
  // BOOKING STATUS
  // =========================
  status: {
    type: String,
    enum: [
      "draft",
      "pending_payment",
      "paid",
      "confirmed",
      "in_progress",
      "completed",
      "review_eligible",
      "cancelled",
      "failed_payment",
      "rejected",
    ],
    default: "pending_payment",
  },

  // =========================
  // REVIEW
  // =========================
  canReview: {
    type: Boolean,
    default: false,
  },

  reviewSubmitted: {
    type: Boolean,
    default: false,
  },

  // =========================
  // CANCELLATION
  // =========================
  cancelledAt: {
    type: Date,
  },

  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
    default: null,
  },

  // =========================
  // REFUND
  // =========================
  refundAmount: {
    type: Number,
    default: 0,
    min: [0, "Refund amount cannot be negative"],
  },

  refundedAt: {
    type: Date,
  },

  refundId: {
    type: String,
  },

  // =========================
  // METADATA
  // =========================
  specialRequests: {
    type: String,
    trim: true,
    maxlength: [500, "Special requests cannot exceed 500 characters"],
  },

  adminNotes: {
    type: String,
    trim: true,
  },

  duplicateCheckPerformed: {
    type: Boolean,
    default: false,
  },
},
{
  timestamps: true,
});

// =========================
// ✅ INDEXES (unchanged from prior fix)
// =========================
bookingSchema.index({ user: 1 });
bookingSchema.index({ provider: 1 });
bookingSchema.index({ listing: 1 });
bookingSchema.index({ payment: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ startDate: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ providerPayoutStatus: 1 });
bookingSchema.index({ refundId: 1 });
bookingSchema.index({ paymentId: 1 });

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ listing: 1, status: 1 });
bookingSchema.index({ user: 1, listing: 1, status: 1 });
bookingSchema.index({ provider: 1, paymentStatus: 1 });
bookingSchema.index({ provider: 1, createdAt: -1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ status: 1, startDate: 1 });
bookingSchema.index({ providerPayoutStatus: 1, paidAt: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ user: 1, status: 1, createdAt: -1 });

// =========================
// ✅ VIRTUALS
// =========================
bookingSchema.virtual("isActive").get(function() {
  return ["pending_payment", "paid", "confirmed", "in_progress"].includes(this.status);
});

bookingSchema.virtual("canBeCancelled").get(function() {
  return ["pending_payment", "paid", "confirmed"].includes(this.status);
});

bookingSchema.virtual("canBeReviewed").get(function() {
  return (this.status === "completed" || this.status === "review_eligible") &&
         !this.reviewSubmitted;
});

bookingSchema.virtual("requiresPayment").get(function() {
  return this.paymentStatus === "unpaid" || this.paymentStatus === "pending";
});

bookingSchema.virtual("isPaid").get(function() {
  return this.paymentStatus === "paid";
});

bookingSchema.virtual("isCancelled").get(function() {
  return this.status === "cancelled";
});

bookingSchema.virtual("isCompleted").get(function() {
  return this.status === "completed" || this.status === "review_eligible";
});

bookingSchema.virtual("isProviderPayoutPending").get(function() {
  return this.providerPayoutStatus === "pending";
});

bookingSchema.virtual('tour').get(function() {
  return this.listing;
});

// =========================
// ✅ INSTANCE METHODS
// =========================

bookingSchema.methods.canCancel = function() {
  return ["pending_payment", "paid", "confirmed"].includes(this.status);
};

bookingSchema.methods.isReviewable = function() {
  return (this.status === "completed" || this.status === "review_eligible") &&
         !this.reviewSubmitted;
};

bookingSchema.methods.markAsPaid = async function(paymentId, paymentObjectId) {
  this.paymentStatus = "paid";
  this.paymentId = paymentId;
  this.paidAt = new Date();

  if (paymentObjectId) {
    this.payment = paymentObjectId;
  }

  if (this.status === "pending_payment") {
    this.status = "paid";
  }

  await this.save();
  return this;
};

bookingSchema.methods.markAsFailed = async function(reason) {
  this.paymentStatus = "failed";
  this.status = "failed_payment";
  this.adminNotes = reason || "Payment failed";
  await this.save();
  return this;
};

bookingSchema.methods.cancelBooking = async function(reason, userId) {
  // ✅ IDEMPOTENCY: If already cancelled, do nothing. Return the doc.
  // Prevents duplicate writes and duplicate refund triggers on retry.
  if (this.status === "cancelled") {
    return this;
  }

  let cancellationReason = "No reason provided";

  if (reason && typeof reason === 'string') {
    if (reason.startsWith('eyJ')) {
      console.warn('⚠️ JWT token detected as cancellation reason, using default instead');
      cancellationReason = "User requested cancellation";
    } else {
      cancellationReason = reason;
    }
  } else if (reason && typeof reason === 'object') {
    console.warn('⚠️ Object passed as cancellation reason, using default');
    cancellationReason = "User requested cancellation";
  }

  this.status = "cancelled";
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = cancellationReason;

  // ✅ Only flip payment status → refunded if it was paid.
  // (No re-save of startDate, so no validation runs on it.)
  if (this.paymentStatus === "paid") {
    this.paymentStatus = "refunded";
  }

  // ✅ With the context-aware validator (Fix 1), this save() no longer
  // throws for bookings with past startDate, because startDate is
  // neither new nor modified.
  await this.save();
  return this;
};

bookingSchema.methods.confirmBooking = async function() {
  if (this.status === "paid") {
    this.status = "confirmed";
    await this.save();
  } else {
    throw new Error("Booking must be paid before confirmation");
  }
  return this;
};

bookingSchema.methods.completeBooking = async function() {
  if (this.status === "confirmed" || this.status === "in_progress") {
    this.status = "completed";
    this.canReview = true;
    await this.save();
  } else if (this.status === "completed") {
    this.canReview = true;
    await this.save();
  } else {
    throw new Error("Only confirmed or in-progress bookings can be completed");
  }
  return this;
};

bookingSchema.methods.markAsReviewEligible = async function() {
  if (this.status === "completed") {
    this.status = "review_eligible";
    this.canReview = true;
    await this.save();
  }
  return this;
};

bookingSchema.methods.rejectBooking = async function(reason) {
  this.status = "rejected";
  this.adminNotes = reason || "Booking rejected by provider";
  await this.save();
  return this;
};

bookingSchema.methods.markProviderPayoutCompleted = async function() {
  this.providerPayoutStatus = "completed";
  this.providerPayoutDate = new Date();
  await this.save();
  return this;
};

bookingSchema.methods.markProviderPayoutPending = async function() {
  this.providerPayoutStatus = "pending";
  await this.save();
  return this;
};

// =========================
// ✅ STATIC METHODS
// =========================

bookingSchema.statics.hasActiveBooking = async function(userId, entityId, entityType = 'listing') {
  const field = entityType === 'listing' ? 'listing' : 'tour';
  const activeStatuses = ["pending_payment", "paid", "confirmed", "in_progress"];

  const booking = await this.findOne({
    user: userId,
    [field]: entityId,
    status: { $in: activeStatuses }
  });
  return !!booking;
};

bookingSchema.statics.getActiveBooking = async function(userId, entityId, entityType = 'listing') {
  const field = entityType === 'listing' ? 'listing' : 'tour';
  const activeStatuses = ["pending_payment", "paid", "confirmed", "in_progress"];

  return this.findOne({
    user: userId,
    [field]: entityId,
    status: { $in: activeStatuses }
  });
};

bookingSchema.statics.getActiveBookings = async function(userId) {
  return this.find({
    user: userId,
    status: { $in: ["pending_payment", "paid", "confirmed", "in_progress"] }
  })
  .populate('listing', 'title location coverImage price')
  .populate('provider', 'name email businessName avatar')
  .sort({ createdAt: -1 });
};

bookingSchema.statics.getProviderPendingBookings = async function(providerId) {
  return this.find({
    provider: providerId,
    status: { $in: ["paid", "pending_payment"] }
  })
  .populate('user', 'name email avatar phone')
  .populate('listing', 'title location coverImage price')
  .sort({ createdAt: -1 });
};

bookingSchema.statics.getProviderBookingsByStatus = async function(providerId, status) {
  const filter = { provider: providerId };
  if (status) filter.status = status;

  return this.find(filter)
    .populate('user', 'name email avatar phone')
    .populate('listing', 'title location coverImage price')
    .sort({ createdAt: -1 });
};

bookingSchema.statics.canBook = async function(userId, entityId, entityType = 'listing') {
  const hasActive = await this.hasActiveBooking(userId, entityId, entityType);
  return !hasActive;
};

bookingSchema.statics.getExpiredPendingPayments = async function() {
  const expiryTime = new Date(Date.now() - 30 * 60 * 1000);
  return this.find({
    status: "pending_payment",
    createdAt: { $lt: expiryTime }
  });
};

bookingSchema.statics.getProviderEarnings = async function(providerId) {
  const result = await this.aggregate([
    {
      $match: {
        provider: providerId,
        status: { $in: ["confirmed", "completed", "paid"] },
        paymentStatus: "paid"
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: "$totalPrice" },
        count: { $sum: 1 },
        averagePrice: { $avg: "$totalPrice" }
      }
    }
  ]);

  return result[0] || { totalEarnings: 0, count: 0, averagePrice: 0 };
};

bookingSchema.statics.getProviderRevenueByPeriod = async function(providerId, period = 'month') {
  const match = {
    provider: providerId,
    status: { $in: ["confirmed", "completed", "paid"] },
    paymentStatus: "paid"
  };

  let dateFilter = {};
  const now = new Date();

  switch(period) {
    case 'today':
      dateFilter = {
        paidAt: {
          $gte: new Date(now.setHours(0, 0, 0, 0))
        }
      };
      break;
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      dateFilter = { paidAt: { $gte: weekStart } };
      break;
    case 'month':
      dateFilter = {
        paidAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1)
        }
      };
      break;
    case 'year':
      dateFilter = {
        paidAt: {
          $gte: new Date(now.getFullYear(), 0, 1)
        }
      };
      break;
    default:
      dateFilter = {};
  }

  const result = await this.aggregate([
    { $match: { ...match, ...dateFilter } },
    {
      $group: {
        _id: {
          year: { $year: "$paidAt" },
          month: { $month: "$paidAt" },
          day: { $dayOfMonth: "$paidAt" }
        },
        revenue: { $sum: "$totalPrice" },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
  ]);

  return result;
};

// =========================
// ✅ PRE-SAVE MIDDLEWARE
// =========================

bookingSchema.pre('save', function(next) {
  if (!this.listing) {
    const error = new Error('Listing is required for booking');
    error.status = 400;
    return next(error);
  }

  if (!this.provider) {
    const error = new Error('Provider is required for booking');
    error.status = 400;
    return next(error);
  }

  next();
});

// =========================
// ✅ CREATE AND EXPORT THE MODEL
// =========================

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;