// backend/src/models/Transaction.js
// ✅ COMPLETE FIXED - Removed ALL duplicate index definitions
// ✅ All indexes defined in ONE place only
// ✅ No field has both index:true AND schema.index()

import mongoose from "mongoose";

/**
 * Transaction Schema
 * 
 * This model records every financial transaction in the system.
 * It provides a complete audit trail for all financial activities.
 * 
 * Transaction Types:
 * - payment: Customer payment for booking
 * - refund: Refund to customer
 * - commission: Platform commission deduction
 * - earning: Provider earning credit
 * - withdrawal: Provider withdrawal request
 * - payout: Provider payout processing
 * - adjustment: Manual balance adjustment
 * - transfer: Transfer between wallets
 * - escrow: Escrow hold/release
 * 
 * Transaction Status:
 * - pending: Initial state, waiting for confirmation
 * - processing: Being processed
 * - completed: Successfully completed
 * - failed: Failed to complete
 * - cancelled: Cancelled by user or system
 * - reversed: Transaction reversed
 * - refunded: Transaction refunded
 * - held: On hold pending review
 */
const transactionSchema = new mongoose.Schema(
{
  // ─── Basic Information ────────────────────────────────────────
  // Unique transaction reference (human-readable)
  reference: {
    type: String,
    unique: true, // ✅ This creates the index automatically
    required: true,
    // ✅ REMOVED: index: true - duplicate of unique: true
  },

  // Transaction type
  type: {
    type: String,
    enum: [
      "payment",
      "refund",
      "commission",
      "earning",
      "withdrawal",
      "payout",
      "adjustment",
      "transfer",
      "escrow",
    ],
    required: true,
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // Transaction status
  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "completed",
      "failed",
      "cancelled",
      "reversed",
      "refunded",
      "held",
    ],
    default: "pending",
    required: true,
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // ─── Amounts ────────────────────────────────────────────────────
  // Gross amount (original total)
  grossAmount: {
    type: Number,
    required: true,
    min: [0, "Amount cannot be negative"],
  },

  // Net amount (after fees/deductions)
  netAmount: {
    type: Number,
    required: true,
    min: [0, "Amount cannot be negative"],
  },

  // Fees applied
  fees: {
    // Platform commission
    platformFee: {
      type: Number,
      default: 0,
      min: [0, "Fee cannot be negative"],
    },
    // Payment gateway fee
    gatewayFee: {
      type: Number,
      default: 0,
      min: [0, "Fee cannot be negative"],
    },
    // Processing fee
    processingFee: {
      type: Number,
      default: 0,
      min: [0, "Fee cannot be negative"],
    },
    // Tax
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
  },

  // ─── Participants ──────────────────────────────────────────────
  // Who initiated the transaction
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // Who received the transaction
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // Provider involved (if applicable)
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // Customer involved (if applicable)
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // ─── Related Records ──────────────────────────────────────────
  // Booking reference
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // Payment reference
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // Wallet references
  sourceWallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet",
    // ✅ REMOVED: index: true - defined in indexes section
  },

  destinationWallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet",
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // Earning reference
  earning: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Earning",
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // Withdrawal reference
  withdrawal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Withdrawal",
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // ─── Currency ──────────────────────────────────────────────────
  currency: {
    type: String,
    enum: ["USD", "RWF", "EUR", "GBP"],
    default: "USD",
    required: true,
    // ✅ REMOVED: index: true - defined in indexes section
  },

  // Exchange rate if currency conversion occurred
  exchangeRate: {
    type: Number,
    default: 1,
    min: [0.01, "Exchange rate must be greater than 0"],
  },

  // Original currency amount (if converted)
  originalAmount: {
    type: Number,
    min: [0, "Amount cannot be negative"],
  },

  // Original currency code
  originalCurrency: {
    type: String,
    enum: ["USD", "RWF", "EUR", "GBP"],
  },

  // ─── Description ───────────────────────────────────────────────
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
  },

  // Long description for detailed context
  detailedDescription: {
    type: String,
    trim: true,
    maxlength: [2000, "Detailed description cannot exceed 2000 characters"],
  },

  // ─── Metadata ──────────────────────────────────────────────────
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Provider-specific data (e.g., Stripe transaction ID)
  providerData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // ─── Timestamps ────────────────────────────────────────────────
  // When transaction was initiated
  initiatedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },

  // When transaction was completed
  completedAt: {
    type: Date,
  },

  // When transaction was settled
  settledAt: {
    type: Date,
  },

  // ─── Additional Fields ─────────────────────────────────────────
  // IP address of initiator
  ipAddress: {
    type: String,
  },

  // User agent
  userAgent: {
    type: String,
  },

  // Is this a test transaction
  isTestMode: {
    type: Boolean,
    default: false,
  },

  // Notes from admin
  adminNotes: {
    type: String,
    trim: true,
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
// ✅ SINGLE FIELD INDEXES
// =========================
// ❌ DO NOT add reference index here - it's already created by 'unique: true'
// ✅ Add all other single field indexes here
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ initiator: 1 });
transactionSchema.index({ recipient: 1 });
transactionSchema.index({ provider: 1 });
transactionSchema.index({ customer: 1 });
transactionSchema.index({ currency: 1 });
transactionSchema.index({ grossAmount: 1 });

// ✅ Related records (for joins)
transactionSchema.index({ booking: 1 });
transactionSchema.index({ payment: 1 });
transactionSchema.index({ earning: 1 });
transactionSchema.index({ withdrawal: 1 });
transactionSchema.index({ sourceWallet: 1 });
transactionSchema.index({ destinationWallet: 1 });

// ✅ Date range queries (for reporting)
transactionSchema.index({ initiatedAt: -1 });
transactionSchema.index({ completedAt: -1 });
transactionSchema.index({ settledAt: -1 });

// =========================
// ✅ COMPOUND INDEXES
// =========================
// ✅ Primary lookup indexes
transactionSchema.index({ initiator: 1, createdAt: -1 });
transactionSchema.index({ recipient: 1, createdAt: -1 });
transactionSchema.index({ provider: 1, createdAt: -1 });
transactionSchema.index({ customer: 1, createdAt: -1 });

// ✅ Status and type filters
transactionSchema.index({ status: 1, type: 1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

// ✅ Complex queries
transactionSchema.index({ initiator: 1, status: 1, createdAt: -1 });
transactionSchema.index({ provider: 1, type: 1, status: 1 });
transactionSchema.index({ type: 1, status: 1, completedAt: -1 });

// =========================
// ✅ IMPORTANT NOTES ON INDEXES:
// =========================
// 1. reference has unique:true - this automatically creates an index
//    DO NOT add: transactionSchema.index({ reference: 1 })
// 2. All other indexes are defined ONLY in this section
// 3. No field has both index:true AND a schema.index() call
// 4. All single field indexes are listed above
// 5. All compound indexes are listed above

// =========================
// ✅ VIRTUALS
// =========================

// Total fees
transactionSchema.virtual("totalFees").get(function() {
  return this.fees.platformFee + this.fees.gatewayFee + this.fees.processingFee + this.fees.tax;
});

// Is transaction completed
transactionSchema.virtual("isCompleted").get(function() {
  return this.status === "completed";
});

// Is transaction pending
transactionSchema.virtual("isPending").get(function() {
  return this.status === "pending" || this.status === "processing";
});

// Is transaction refundable
transactionSchema.virtual("isRefundable").get(function() {
  return this.type === "payment" &&
         this.status === "completed" &&
         !this.metadata.get("refundedAt");
});

// =========================
// ✅ INSTANCE METHODS
// =========================

/**
 * Mark transaction as completed
 */
transactionSchema.methods.markAsCompleted = async function(settledAt = null) {
  this.status = "completed";
  this.completedAt = new Date();
  if (settledAt) {
    this.settledAt = settledAt;
  }
  await this.save();
  return this;
};

/**
 * Mark transaction as failed
 */
transactionSchema.methods.markAsFailed = async function(reason = "") {
  this.status = "failed";
  if (reason) {
    this.metadata.set("failureReason", reason);
  }
  await this.save();
  return this;
};

/**
 * Mark transaction as cancelled
 */
transactionSchema.methods.markAsCancelled = async function(reason = "") {
  this.status = "cancelled";
  if (reason) {
    this.metadata.set("cancellationReason", reason);
  }
  await this.save();
  return this;
};

/**
 * Mark transaction as refunded
 */
transactionSchema.methods.markAsRefunded = async function(refundTransactionId) {
  this.status = "refunded";
  this.metadata.set("refundedAt", new Date());
  this.metadata.set("refundTransactionId", refundTransactionId);
  await this.save();
  return this;
};

/**
 * Mark transaction as held
 */
transactionSchema.methods.markAsHeld = async function(reason = "") {
  this.status = "held";
  if (reason) {
    this.metadata.set("holdReason", reason);
  }
  await this.save();
  return this;
};

/**
 * Release held transaction
 */
transactionSchema.methods.releaseFromHold = async function(reason = "") {
  this.status = "completed";
  this.metadata.set("releaseReason", reason);
  this.metadata.set("releasedAt", new Date());
  await this.save();
  return this;
};

/**
 * Add note to transaction
 */
transactionSchema.methods.addNote = async function(note, isAdmin = false) {
  const notes = this.metadata.get("notes") || [];
  notes.push({
    note: note,
    isAdmin: isAdmin,
    createdAt: new Date(),
  });
  this.metadata.set("notes", notes);
  await this.save();
  return this;
};

/**
 * Calculate transaction totals
 */
transactionSchema.methods.calculateTotals = function() {
  const totalFees = this.totalFees;
  return {
    grossAmount: this.grossAmount,
    netAmount: this.netAmount,
    totalFees: totalFees,
    platformFee: this.fees.platformFee,
    gatewayFee: this.fees.gatewayFee,
    processingFee: this.fees.processingFee,
    tax: this.fees.tax,
  };
};

// =========================
// ✅ STATIC METHODS
// =========================

/**
 * Generate unique transaction reference
 */
transactionSchema.statics.generateReference = function(prefix = "TXN") {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Get transaction summary for a user
 */
transactionSchema.statics.getUserTransactionSummary = async function(userId) {
  const [sent, received, totals] = await Promise.all([
    this.aggregate([
      { $match: { initiator: userId, status: "completed" } },
      { $group: {
        _id: null,
        totalSent: { $sum: "$grossAmount" },
        count: { $sum: 1 },
      } },
    ]),
    this.aggregate([
      { $match: { recipient: userId, status: "completed" } },
      { $group: {
        _id: null,
        totalReceived: { $sum: "$grossAmount" },
        count: { $sum: 1 },
      } },
    ]),
    this.aggregate([
      { $match: { initiator: userId, status: "completed" } },
      { $group: {
        _id: null,
        totalFees: { $sum: "$fees.platformFee" },
      } },
    ]),
  ]);

  return {
    totalSent: sent[0]?.totalSent || 0,
    totalReceived: received[0]?.totalReceived || 0,
    totalFees: totals[0]?.totalFees || 0,
    sentCount: sent[0]?.count || 0,
    receivedCount: received[0]?.count || 0,
    netBalance: (received[0]?.totalReceived || 0) - (sent[0]?.totalSent || 0) - (totals[0]?.totalFees || 0),
  };
};

/**
 * Get transactions by date range
 */
transactionSchema.statics.getByDateRange = async function(startDate, endDate, options = {}) {
  const { type, status, userId, limit = 100, skip = 0 } = options;

  const filter = {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (type) filter.type = type;
  if (status) filter.status = status;
  if (userId) {
    filter.$or = [
      { initiator: userId },
      { recipient: userId },
    ];
  }

  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("initiator", "name email")
    .populate("recipient", "name email")
    .populate("booking", "bookingCode status")
    .populate("payment", "status amount");
};

/**
 * Get pending transactions
 */
transactionSchema.statics.getPendingTransactions = async function(limit = 100) {
  return this.find({
    status: { $in: ["pending", "processing"] },
  })
  .sort({ createdAt: 1 })
  .limit(limit)
  .populate("initiator", "name email")
  .populate("recipient", "name email");
};

/**
 * Get provider transaction summary
 */
transactionSchema.statics.getProviderTransactionSummary = async function(providerId) {
  const [earnings, withdrawals, pending] = await Promise.all([
    this.aggregate([
      { $match: { provider: providerId, type: "earning", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$netAmount" }, count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { provider: providerId, type: "withdrawal", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$grossAmount" }, count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { provider: providerId, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$netAmount" }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalEarnings: earnings[0]?.total || 0,
    totalWithdrawals: withdrawals[0]?.total || 0,
    pendingTransactions: pending[0]?.total || 0,
    earningsCount: earnings[0]?.count || 0,
    withdrawalsCount: withdrawals[0]?.count || 0,
    pendingCount: pending[0]?.count || 0,
  };
};

export default mongoose.model("Transaction", transactionSchema);