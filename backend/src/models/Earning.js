// backend/src/models/Earning.js

import mongoose from "mongoose";

const earningSchema = new mongoose.Schema(
{
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },

  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },

  // ✅ Amount breakdown
  amount: {
    type: Number,
    required: true,
    min: [0.01, "Amount must be greater than 0"],
  },

  // ✅ Platform fee (10% by default)
  platformFee: {
    type: Number,
    default: 0,
    min: [0, "Platform fee cannot be negative"],
  },

  // ✅ Net amount after fees (amount - platformFee)
  netAmount: {
    type: Number,
    default: 0,
    min: [0, "Net amount cannot be negative"],
  },

  // ✅ Booking type for analytics
  bookingType: {
    type: String,
    enum: ["listing", "tour"],
    required: true,
  },

  // ✅ Status tracking
  status: {
    type: String,
    enum: [
      "pending",      // Initial state, waiting for confirmation
      "available",    // Ready for withdrawal
      "withdrawn",    // Successfully withdrawn
      "failed",       // Withdrawal failed
      "refunded",     // Earning refunded (if booking cancelled)
    ],
    default: "pending",
  },

  // ✅ Withdrawal reference
  withdrawal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Withdrawal",
  },

  // ✅ Payment reference
  paymentId: {
    type: String,
  },

  withdrawnAt: {
    type: Date,
  },

  // ✅ For testing
  isTestMode: {
    type: Boolean,
    default: false,
  },

  // ✅ Metadata for additional context
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
},
{
  timestamps: true,
});

// =========================
// ✅ INDEXES
// =========================

// Primary lookups
earningSchema.index({ provider: 1, createdAt: -1 });
earningSchema.index({ booking: 1 });
earningSchema.index({ payment: 1 });

// Status filters
earningSchema.index({ status: 1, createdAt: -1 });
earningSchema.index({ provider: 1, status: 1 });

// Date range queries
earningSchema.index({ createdAt: -1 });
earningSchema.index({ withdrawnAt: -1 });

// Withdrawal lookup
earningSchema.index({ withdrawal: 1 });

// Compound index for provider earnings summary
earningSchema.index({ provider: 1, status: 1, createdAt: -1 });

// =========================
// ✅ VIRTUALS
// =========================

// Check if earning can be withdrawn
earningSchema.virtual("isWithdrawable").get(function() {
  return this.status === "available" && this.amount > 0 && !this.withdrawal;
});

// Check if earning is processing
earningSchema.virtual("isProcessing").get(function() {
  return this.status === "pending";
});

// Check if earning is already withdrawn
earningSchema.virtual("isWithdrawn").get(function() {
  return this.status === "withdrawn";
});

// Get platform fee percentage (10%)
earningSchema.virtual("platformFeePercentage").get(function() {
  return 10; // 10% platform fee
});

// =========================
// ✅ INSTANCE METHODS
// =========================

// Mark earning as available (after payment confirmation)
earningSchema.methods.markAsAvailable = async function() {
  this.status = "available";
  await this.save();
  return this;
};

// Mark earning as withdrawn
earningSchema.methods.markAsWithdrawn = async function(withdrawalId) {
  this.status = "withdrawn";
  this.withdrawal = withdrawalId;
  this.withdrawnAt = new Date();
  await this.save();
  return this;
};

// Mark earning as failed
earningSchema.methods.markAsFailed = async function(reason) {
  this.status = "failed";
  this.metadata = { ...this.metadata, failureReason: reason };
  await this.save();
  return this;
};

// Mark earning as refunded (if booking cancelled)
earningSchema.methods.markAsRefunded = async function() {
  this.status = "refunded";
  await this.save();
  return this;
};

// Calculate net amount (after platform fee)
earningSchema.methods.calculateNetAmount = function() {
  this.netAmount = this.amount - this.platformFee;
  return this.netAmount;
};

// =========================
// ✅ STATIC METHODS
// =========================

// Get total earnings for a provider
earningSchema.statics.getTotalEarnings = async function(providerId) {
  const result = await this.aggregate([
    {
      $match: {
        provider: providerId,
        status: { $in: ["available", "withdrawn"] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        netTotal: { $sum: "$netAmount" },
        platformFees: { $sum: "$platformFee" },
        count: { $sum: 1 },
      },
    },
  ]);
  return result[0] || { total: 0, netTotal: 0, platformFees: 0, count: 0 };
};

// Get available earnings (ready for withdrawal)
earningSchema.statics.getAvailableEarnings = async function(providerId) {
  const result = await this.aggregate([
    {
      $match: {
        provider: providerId,
        status: "available",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$netAmount" },
        count: { $sum: 1 },
      },
    },
  ]);
  return result[0] || { total: 0, count: 0 };
};

// Get earnings by status
earningSchema.statics.getEarningsByStatus = async function(providerId, status) {
  const filter = { provider: providerId };
  if (status) filter.status = status;
  
  return this.find(filter)
    .populate('booking', 'bookingCode startDate totalPrice')
    .populate('withdrawal', 'amount status')
    .sort({ createdAt: -1 });
};

// Get earnings for a specific booking
earningSchema.statics.getByBooking = async function(bookingId) {
  return this.findOne({ booking: bookingId });
};

// Get total platform fees collected
earningSchema.statics.getTotalPlatformFees = async function() {
  const result = await this.aggregate([
    {
      $match: {
        status: { $in: ["available", "withdrawn"] },
      },
    },
    {
      $group: {
        _id: null,
        totalFees: { $sum: "$platformFee" },
        count: { $sum: 1 },
      },
    },
  ]);
  return result[0] || { totalFees: 0, count: 0 };
};

// Get earnings summary for dashboard
earningSchema.statics.getDashboardSummary = async function(providerId) {
  const [total, available, withdrawn] = await Promise.all([
    this.aggregate([
      { $match: { provider: providerId, status: { $in: ["available", "withdrawn"] } } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } }
    ]),
    this.aggregate([
      { $match: { provider: providerId, status: "available" } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } }
    ]),
    this.aggregate([
      { $match: { provider: providerId, status: "withdrawn" } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } }
    ])
  ]);

  return {
    totalEarnings: total[0]?.total || 0,
    availableBalance: available[0]?.total || 0,
    withdrawnTotal: withdrawn[0]?.total || 0
  };
};

// =========================
// ✅ MIDDLEWARE
// =========================

// Pre-save middleware to calculate net amount
earningSchema.pre("save", function(next) {
  if (this.isModified("amount") || this.isModified("platformFee")) {
    this.netAmount = this.amount - this.platformFee;
  }
  next();
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const Earning = mongoose.model("Earning", earningSchema);
export default Earning;