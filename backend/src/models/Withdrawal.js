// backend/src/models/Withdrawal.js
// ✅ COMPLETE FIXED - Added proper indexes
// ✅ All indexes defined in ONE place only
// ✅ No duplicate index definitions

import mongoose from "mongoose";

/**
 * Withdrawal Schema
 * 
 * This model tracks provider withdrawal requests and their status.
 * 
 * Withdrawal Status:
 * - pending: Initial state, waiting for admin approval
 * - approved: Approved by admin, ready for processing
 * - paid: Payment has been sent to provider
 * - rejected: Withdrawal request rejected
 * 
 * Withdrawal Methods:
 * - bank: Bank transfer
 * - mobile_money: Mobile money (Momo, Airtel, etc.)
 * - paypal: PayPal transfer
 */

const withdrawalSchema = new mongoose.Schema(
{
  // ─── Provider ──────────────────────────────────────────────────
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Provider is required"],
    // ✅ REMOVED: index: true - defined in schema.index() below
  },

  // ─── Amount ────────────────────────────────────────────────────
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0.01, "Amount must be greater than 0"],
  },

  // ─── Withdrawal Method ────────────────────────────────────────
  method: {
    type: String,
    enum: [
      "bank",
      "mobile_money",
      "paypal"
    ],
    default: "bank",
    // ✅ REMOVED: index: true - defined in schema.index() below
  },

  // ─── Account Details ──────────────────────────────────────────
  accountDetails: {
    type: String,
    required: [true, "Account details are required"],
    trim: true,
  },

  // ─── Status ────────────────────────────────────────────────────
  status: {
    type: String,
    enum: [
      "pending",
      "approved",
      "paid",
      "rejected"
    ],
    default: "pending",
    // ✅ REMOVED: index: true - defined in schema.index() below
  },

  // ─── Admin Notes ──────────────────────────────────────────────
  adminNote: {
    type: String,
    default: "",
    trim: true,
  },

  // ─── Timestamps ────────────────────────────────────────────────
  paidAt: {
    type: Date,
    // ✅ REMOVED: index: true - defined in schema.index() below
  },

  // ─── Additional Fields ────────────────────────────────────────
  // Reference number for tracking
  reference: {
    type: String,
    unique: true, // ✅ Creates index automatically
    // DO NOT add schema.index() for this field
  },

  // Bank/transaction reference from payment provider
  transactionReference: {
    type: String,
    // ✅ REMOVED: index: true - defined in schema.index() below
  },

  // Any fees charged for the withdrawal
  fee: {
    type: Number,
    default: 0,
    min: [0, "Fee cannot be negative"],
  },

  // Net amount after fees
  netAmount: {
    type: Number,
    // This will be calculated as amount - fee
  },

  // Admin who processed the withdrawal
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  processedAt: {
    type: Date,
  },

  // Rejection reason
  rejectionReason: {
    type: String,
    trim: true,
  },

  // Payment provider data
  providerData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Metadata
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
// ✅ ALL INDEXES DEFINED IN ONE PLACE
// =========================
// NO index:true in field definitions above
// NO duplicate indexes here

// =========================
// ✅ IMPORTANT NOTES ON INDEXES:
// =========================
// 1. reference has unique:true - this automatically creates an index
//    DO NOT add: withdrawalSchema.index({ reference: 1 })
// 2. All other indexes are defined ONLY in this section
// 3. No field has both index:true AND a schema.index() call

// =========================
// ✅ SINGLE FIELD INDEXES
// =========================
withdrawalSchema.index({ provider: 1 });
withdrawalSchema.index({ status: 1 });
withdrawalSchema.index({ method: 1 });
withdrawalSchema.index({ paidAt: -1 });
withdrawalSchema.index({ createdAt: -1 });
withdrawalSchema.index({ transactionReference: 1 });
withdrawalSchema.index({ processedBy: 1 });

// =========================
// ✅ COMPOUND INDEXES (for common queries)
// =========================
withdrawalSchema.index({ provider: 1, status: 1 });
withdrawalSchema.index({ provider: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ provider: 1, status: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, method: 1 });

// =========================
// ✅ VIRTUALS
// =========================

// Check if withdrawal is pending
withdrawalSchema.virtual("isPending").get(function() {
  return this.status === "pending";
});

// Check if withdrawal is approved
withdrawalSchema.virtual("isApproved").get(function() {
  return this.status === "approved";
});

// Check if withdrawal is paid
withdrawalSchema.virtual("isPaid").get(function() {
  return this.status === "paid";
});

// Check if withdrawal is rejected
withdrawalSchema.virtual("isRejected").get(function() {
  return this.status === "rejected";
});

// Check if withdrawal can be processed
withdrawalSchema.virtual("canBeProcessed").get(function() {
  return this.status === "pending" || this.status === "approved";
});

// Calculate net amount (amount - fee)
withdrawalSchema.virtual("calculatedNetAmount").get(function() {
  return this.amount - (this.fee || 0);
});

// =========================
// ✅ INSTANCE METHODS
// =========================

/**
 * Approve the withdrawal
 */
withdrawalSchema.methods.approve = async function(adminId, note = "") {
  this.status = "approved";
  this.processedBy = adminId;
  this.processedAt = new Date();
  if (note) {
    this.adminNote = note;
  }
  await this.save();
  return this;
};

/**
 * Mark withdrawal as paid
 */
withdrawalSchema.methods.markAsPaid = async function(reference = null) {
  this.status = "paid";
  this.paidAt = new Date();
  if (reference) {
    this.transactionReference = reference;
  }
  await this.save();
  return this;
};

/**
 * Reject the withdrawal
 */
withdrawalSchema.methods.reject = async function(adminId, reason = "") {
  this.status = "rejected";
  this.processedBy = adminId;
  this.processedAt = new Date();
  this.rejectionReason = reason || "Withdrawal rejected";
  await this.save();
  return this;
};

/**
 * Process the withdrawal (approve + mark as paid in one step)
 */
withdrawalSchema.methods.process = async function(adminId, reference = null) {
  this.status = "paid";
  this.processedBy = adminId;
  this.processedAt = new Date();
  this.paidAt = new Date();
  if (reference) {
    this.transactionReference = reference;
  }
  await this.save();
  return this;
};

/**
 * Add admin note
 */
withdrawalSchema.methods.addAdminNote = async function(note) {
  this.adminNote = note;
  await this.save();
  return this;
};

/**
 * Generate reference number
 */
withdrawalSchema.methods.generateReference = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `WD-${timestamp}-${random}`;
};

// =========================
// ✅ STATIC METHODS
// =========================

/**
 * Generate a unique withdrawal reference
 */
withdrawalSchema.statics.generateReference = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `WD-${timestamp}-${random}`;
};

/**
 * Get pending withdrawals
 */
withdrawalSchema.statics.getPendingWithdrawals = async function(limit = 100) {
  return this.find({
    status: "pending"
  })
  .populate("provider", "name email businessName avatar")
  .sort({ createdAt: 1 })
  .limit(limit);
};

/**
 * Get withdrawals by provider
 */
withdrawalSchema.statics.getProviderWithdrawals = async function(providerId, options = {}) {
  const { limit = 50, page = 1, status = null } = options;
  
  const filter = { provider: providerId };
  if (status && status !== "all") {
    filter.status = status;
  }
  
  const skip = (page - 1) * limit;
  
  const [withdrawals, total] = await Promise.all([
    this.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter)
  ]);
  
  return {
    withdrawals,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Get withdrawal summary for a provider
 */
withdrawalSchema.statics.getProviderWithdrawalSummary = async function(providerId) {
  const [pending, approved, paid, rejected] = await Promise.all([
    this.aggregate([
      { $match: { provider: providerId, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { provider: providerId, status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { provider: providerId, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { provider: providerId, status: "rejected" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ])
  ]);

  return {
    pending: pending[0] || { total: 0, count: 0 },
    approved: approved[0] || { total: 0, count: 0 },
    paid: paid[0] || { total: 0, count: 0 },
    rejected: rejected[0] || { total: 0, count: 0 },
    totalWithdrawn: (paid[0]?.total || 0) + (approved[0]?.total || 0),
    totalWithdrawalCount: (paid[0]?.count || 0) + (approved[0]?.count || 0)
  };
};

/**
 * Get admin withdrawal statistics
 */
withdrawalSchema.statics.getAdminStats = async function() {
  const [pending, approved, paid, rejected, totals] = await Promise.all([
    this.countDocuments({ status: "pending" }),
    this.countDocuments({ status: "approved" }),
    this.countDocuments({ status: "paid" }),
    this.countDocuments({ status: "rejected" }),
    this.aggregate([
      {
        $group: {
          _id: null,
          totalPending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
          totalApproved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] } },
          totalPaid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] } },
          totalRejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0] } },
          totalFees: { $sum: "$fee" }
        }
      }
    ])
  ]);

  const result = totals[0] || { 
    totalPending: 0, 
    totalApproved: 0, 
    totalPaid: 0, 
    totalRejected: 0,
    totalFees: 0
  };

  return {
    counts: { pending, approved, paid, rejected },
    amounts: result,
    totalWithdrawn: result.totalPaid + result.totalApproved
  };
};

/**
 * Get withdrawals by date range
 */
withdrawalSchema.statics.getByDateRange = async function(startDate, endDate, options = {}) {
  const { status, providerId, limit = 100, skip = 0 } = options;

  const filter = {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (status) filter.status = status;
  if (providerId) filter.provider = providerId;

  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("provider", "name email businessName avatar")
    .populate("processedBy", "name email");
};

// =========================
// ✅ PRE-SAVE MIDDLEWARE
// =========================

withdrawalSchema.pre('save', function(next) {
  // Generate reference if not provided
  if (!this.reference) {
    this.reference = this.constructor.generateReference();
  }
  
  // Calculate net amount
  this.netAmount = this.amount - (this.fee || 0);
  
  // Ensure net amount is not negative
  if (this.netAmount < 0) {
    next(new Error('Net amount cannot be negative. Fee exceeds withdrawal amount.'));
  }
  
  next();
});

// =========================
// ✅ CREATE AND EXPORT THE MODEL
// =========================

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);
export default Withdrawal;