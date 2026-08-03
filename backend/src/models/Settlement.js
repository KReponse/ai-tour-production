// backend/src/models/Settlement.js
// ✅ FIXED - Added "held" to status enum and all missing methods

import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    // =========================
    // IDENTIFIERS
    // =========================
    settlementId: {
      type: String,
      unique: true,
      default: () => `SET-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    },

    // =========================
    // ENTITY REFERENCES
    // =========================
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },

    ledger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ledger",
    },

    // =========================
    // AMOUNTS
    // =========================
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      enum: ["RWF", "USD", "EUR", "GBP"],
      default: "RWF",
    },

    settlementFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    exchangeRateUsed: {
      type: Number,
      default: 1,
      min: 0,
    },

    originalCurrency: {
      type: String,
      enum: ["RWF", "USD", "EUR", "GBP"],
    },

    originalAmount: {
      type: Number,
      default: 0,
    },

    // =========================
    // TIMING
    // =========================
    scheduledDate: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },

    processedDate: {
      type: Date,
    },

    completedDate: {
      type: Date,
    },

    // =========================
    // STATUS - ✅ FIXED: Added "held" for consistency
    // =========================
    status: {
      type: String,
      enum: [
        "pending", "scheduled", "processing", "completed",
        "failed", "cancelled", "held", "partially_completed",
      ],
      default: "pending",
    },

    // =========================
    // RETRY
    // =========================
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },

    failureReason: {
      type: String,
      trim: true,
    },

    retryHistory: [
      {
        attemptNumber: { type: Number, required: true },
        status: { type: String, enum: ["pending", "processing", "completed", "failed"] },
        error: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // =========================
    // BATCH
    // =========================
    batchId: {
      type: String,
    },

    batchSize: {
      type: Number,
      default: 0,
    },

    // =========================
    // PRIORITY
    // =========================
    priority: {
      type: String,
      enum: ["high", "normal", "low"],
      default: "normal",
    },

    // =========================
    // PAYMENT METHOD
    // =========================
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "mobile_money", "stripe", "manual"],
      required: true,
      default: "bank_transfer",
    },

    bankDetails: {
      bankName: { type: String, trim: true },
      accountName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      swiftCode: { type: String, trim: true },
    },

    mobileMoneyDetails: {
      provider: { type: String, enum: ["momo", "airtel", "tigo"] },
      phoneNumber: { type: String, trim: true },
    },

    // =========================
    // REFERENCE
    // =========================
    reference: {
      type: String,
      trim: true,
    },

    transactionId: {
      type: String,
      trim: true,
    },

    // =========================
    // APPROVAL
    // =========================
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },

    // =========================
    // METADATA
    // =========================
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    notes: {
      type: String,
      trim: true,
    },

    // =========================
    // AUDIT
    // =========================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// ✅ INDEXES
// =========================
settlementSchema.index({ settlementId: 1 });
settlementSchema.index({ provider: 1 });
settlementSchema.index({ payment: 1 });
settlementSchema.index({ booking: 1 });
settlementSchema.index({ wallet: 1 });
settlementSchema.index({ ledger: 1 });
settlementSchema.index({ status: 1 });
settlementSchema.index({ scheduledDate: 1 });
settlementSchema.index({ currency: 1 });
settlementSchema.index({ batchId: 1 });
settlementSchema.index({ priority: 1 });
settlementSchema.index({ provider: 1, status: 1 });
settlementSchema.index({ status: 1, scheduledDate: 1 });
settlementSchema.index({ provider: 1, status: 1, createdAt: -1 });
settlementSchema.index({ status: 1, currency: 1, createdAt: -1 });

// =========================
// ✅ VIRTUALS
// =========================

settlementSchema.virtual("isOverdue").get(function() {
  if (this.status !== "pending" && this.status !== "scheduled") return false;
  return new Date() > this.scheduledDate;
});

settlementSchema.virtual("canRetry").get(function() {
  return this.status === "failed" && this.attempts < this.maxAttempts;
});

settlementSchema.virtual("ageInDays").get(function() {
  const diff = Date.now() - this.createdAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// =========================
// ✅ INSTANCE METHODS
// =========================

/**
 * Mark settlement as processing
 */
settlementSchema.methods.process = async function(options = {}) {
  if (this.status !== "pending" && this.status !== "scheduled") {
    throw new Error(`Cannot process settlement with status: ${this.status}`);
  }

  this.status = "processing";
  this.processedDate = options.processedAt || new Date();
  this.metadata = { ...this.metadata, ...options.metadata };
  await this.save();
  return this;
};

/**
 * Mark settlement as completed
 */
settlementSchema.methods.complete = async function(reference, options = {}) {
  if (this.status !== "processing") {
    throw new Error(`Cannot complete settlement with status: ${this.status}`);
  }

  this.status = "completed";
  this.completedDate = options.processedAt || new Date();
  this.reference = reference || this.reference;
  this.metadata = { ...this.metadata, ...options.metadata };
  await this.save();
  return this;
};

/**
 * Mark settlement as failed
 */
settlementSchema.methods.fail = async function(error, options = {}) {
  if (this.status === "completed" || this.status === "cancelled") {
    throw new Error(`Cannot fail settlement with status: ${this.status}`);
  }

  this.status = "failed";
  this.failureReason = error || "Unknown error";
  this.attempts = (this.attempts || 0) + 1;
  this.metadata = { ...this.metadata, ...options.metadata };
  
  // Add to retry history
  this.retryHistory.push({
    attemptNumber: this.attempts,
    status: "failed",
    error: error || "Unknown error",
    timestamp: new Date(),
  });

  await this.save();
  return this;
};

/**
 * Retry a failed settlement
 */
settlementSchema.methods.retry = async function(options = {}) {
  if (this.status !== "failed") {
    throw new Error(`Cannot retry settlement with status: ${this.status}`);
  }

  if (!this.canRetry) {
    throw new Error(`Maximum retry attempts reached (${this.maxAttempts})`);
  }

  this.status = "pending";
  this.failureReason = null;
  this.metadata = { ...this.metadata, ...options.metadata };
  await this.save();
  return this;
};

/**
 * Cancel a settlement
 */
settlementSchema.methods.cancel = async function(reason, userId, options = {}) {
  if (this.status === "completed") {
    throw new Error("Cannot cancel a completed settlement");
  }

  this.status = "cancelled";
  this.notes = reason ? `Cancelled: ${reason}` : "Cancelled";
  this.updatedBy = userId;
  this.metadata = { ...this.metadata, ...options.metadata };
  await this.save();
  return this;
};

/**
 * Hold a settlement
 */
settlementSchema.methods.hold = async function(reason, userId, options = {}) {
  if (this.status === "completed" || this.status === "cancelled") {
    throw new Error(`Cannot hold settlement with status: ${this.status}`);
  }

  this.status = "held";
  this.notes = this.notes ? `${this.notes}\nHeld: ${reason}` : `Held: ${reason}`;
  this.updatedBy = userId;
  this.metadata = { ...this.metadata, ...options.metadata };
  await this.save();
  return this;
};

/**
 * Release settlement from hold
 */
settlementSchema.methods.releaseFromHold = async function(userId, options = {}) {
  if (this.status !== "held") {
    throw new Error(`Cannot release settlement with status: ${this.status}`);
  }

  this.status = "pending";
  this.notes = this.notes ? `${this.notes}\nReleased from hold` : "Released from hold";
  this.updatedBy = userId;
  this.metadata = { ...this.metadata, ...options.metadata };
  await this.save();
  return this;
};

/**
 * Schedule a settlement
 */
settlementSchema.methods.schedule = async function(scheduledDate, userId, options = {}) {
  if (this.status !== "pending" && this.status !== "scheduled") {
    throw new Error(`Cannot schedule settlement with status: ${this.status}`);
  }

  this.status = "scheduled";
  this.scheduledDate = new Date(scheduledDate);
  this.updatedBy = userId;
  this.metadata = { ...this.metadata, ...options.metadata };
  await this.save();
  return this;
};

// =========================
// ✅ STATIC METHODS
// =========================

/**
 * Get pending settlements
 */
settlementSchema.statics.getPending = async function(limit = 50) {
  return this.find({
    status: { $in: ["pending", "scheduled"] },
    scheduledDate: { $lte: new Date() },
  })
    .sort({ priority: 1, scheduledDate: 1 })
    .limit(limit)
    .lean();
};

/**
 * Get overdue settlements
 */
settlementSchema.statics.getOverdue = async function() {
  return this.find({
    status: { $in: ["pending", "scheduled"] },
    scheduledDate: { $lt: new Date() },
  })
    .sort({ scheduledDate: 1 })
    .lean();
};

/**
 * Get settlement statistics
 */
settlementSchema.statics.getStats = async function() {
  const [total, byStatus, totalAmount] = await Promise.all([
    this.countDocuments(),
    this.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" }, totalNet: { $sum: "$netAmount" } } },
    ]),
  ]);

  const byStatusObj = {};
  byStatus.forEach(s => {
    byStatusObj[s._id] = s.count;
  });

  return {
    total,
    byStatus: byStatusObj,
    totalAmount: totalAmount[0]?.total || 0,
    totalNetAmount: totalAmount[0]?.totalNet || 0,
  };
};

/**
 * Get settlements grouped by currency
 */
settlementSchema.statics.getByCurrency = async function() {
  return this.aggregate([
    {
      $group: {
        _id: "$currency",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        totalNet: { $sum: "$netAmount" },
      },
    },
  ]);
};

// =========================
// ✅ TO JSON / TO OBJECT
// =========================

settlementSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

settlementSchema.set("toObject", {
  virtuals: true,
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const Settlement = mongoose.model("Settlement", settlementSchema);
export default Settlement;