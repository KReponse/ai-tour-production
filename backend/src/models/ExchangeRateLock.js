// backend/src/models/ExchangeRateLock.js
// ✅ NEW - Exchange Rate Lock Model for Production-Grade Financial System

import mongoose from "mongoose";

/**
 * Exchange Rate Lock Schema
 * 
 * This model freezes exchange rates at the time of checkout to ensure
 * consistent pricing throughout the payment lifecycle.
 * 
 * Lock Flow:
 * 1. Travelera starts checkout → Rate locked
 * 2. Payment uses locked rate → No recalculation
 * 3. Refund uses same rate → Consistent amounts
 * 4. Provider settlement uses same rate → Accurate settlement
 * 
 * Lock Statuses:
 * - active: Rate is active and valid
 * - used: Rate has been used for payment
 * - expired: Rate has expired
 * - cancelled: Lock was cancelled
 * - refunded: Rate used for refund
 */

const exchangeRateLockSchema = new mongoose.Schema(
  {
    // =========================
    // IDENTIFIERS
    // =========================
    lockId: {
      type: String,
      unique: true,
      default: () => `LOCK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    },

    // =========================
    // ENTITY REFERENCES
    // =========================
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    traveler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =========================
    // CURRENCIES
    // =========================
    baseCurrency: {
      type: String,
      required: true,
      enum: ["RWF", "USD", "EUR", "GBP"],
      default: "RWF",
    },

    displayCurrency: {
      type: String,
      required: true,
      enum: ["RWF", "USD", "EUR", "GBP"],
      default: "USD",
    },

    settlementCurrency: {
      type: String,
      required: true,
      enum: ["RWF", "USD", "EUR", "GBP"],
      default: "RWF",
    },

    // =========================
    // LOCKED RATES
    // =========================
    lockedRate: {
      type: Number,
      required: true,
      min: 0.0001,
    },

    inverseRate: {
      type: Number,
      min: 0.0001,
    },

    // =========================
    // AMOUNTS AT LOCK TIME
    // =========================
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    convertedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    settlementAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // =========================
    // TIMING
    // =========================
    lockedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },

    usedAt: {
      type: Date,
    },

    // =========================
    // STATUS
    // =========================
    status: {
      type: String,
      enum: [
        "active",      // Rate is active and valid
        "used",        // Rate has been used for payment
        "expired",     // Rate has expired
        "cancelled",   // Lock was cancelled
        "refunded",    // Rate used for refund
      ],
      default: "active",
    },

    // =========================
    // REFUND
    // =========================
    refundLockId: {
      type: String,
    },

    refundRate: {
      type: Number,
    },

    refundAmount: {
      type: Number,
      default: 0,
    },

    // =========================
    // SOURCE
    // =========================
    source: {
      type: String,
      enum: ["checkout", "admin", "system", "webhook"],
      default: "checkout",
    },

    sourceReference: {
      type: String,
      trim: true,
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
exchangeRateLockSchema.index({ lockId: 1 });
exchangeRateLockSchema.index({ booking: 1 });
exchangeRateLockSchema.index({ payment: 1 });
exchangeRateLockSchema.index({ traveler: 1 });
exchangeRateLockSchema.index({ provider: 1 });
exchangeRateLockSchema.index({ status: 1 });
exchangeRateLockSchema.index({ expiresAt: 1 });
exchangeRateLockSchema.index({ refundLockId: 1 });

exchangeRateLockSchema.index({ status: 1, expiresAt: 1 });
exchangeRateLockSchema.index({ booking: 1, status: 1 });
exchangeRateLockSchema.index({ traveler: 1, status: 1 });
exchangeRateLockSchema.index({ provider: 1, status: 1 });
exchangeRateLockSchema.index({ status: 1, expiresAt: 1, lockedAt: -1 });
exchangeRateLockSchema.index({ baseCurrency: 1, displayCurrency: 1 });

// =========================
// ✅ VIRTUALS
// =========================

exchangeRateLockSchema.virtual("isActive").get(function() {
  return this.status === "active";
});

exchangeRateLockSchema.virtual("isUsed").get(function() {
  return this.status === "used";
});

exchangeRateLockSchema.virtual("isExpired").get(function() {
  return this.status === "expired" || this.expiresAt < new Date();
});

exchangeRateLockSchema.virtual("isCancelled").get(function() {
  return this.status === "cancelled";
});

exchangeRateLockSchema.virtual("isRefunded").get(function() {
  return this.status === "refunded";
});

exchangeRateLockSchema.virtual("isValid").get(function() {
  return this.status === "active" && this.expiresAt > new Date();
});

exchangeRateLockSchema.virtual("timeRemaining").get(function() {
  if (this.expiresAt < new Date()) return 0;
  return Math.floor((this.expiresAt - new Date()) / 1000);
});

exchangeRateLockSchema.virtual("timeRemainingMinutes").get(function() {
  const seconds = this.timeRemaining;
  return Math.floor(seconds / 60);
});

exchangeRateLockSchema.virtual("formattedRate").get(function() {
  return `1 ${this.displayCurrency} = ${this.lockedRate} ${this.baseCurrency}`;
});

exchangeRateLockSchema.virtual("formattedOriginalAmount").get(function() {
  return `${this.originalAmount} ${this.displayCurrency}`;
});

exchangeRateLockSchema.virtual("formattedConvertedAmount").get(function() {
  return `${this.convertedAmount} ${this.baseCurrency}`;
});

exchangeRateLockSchema.virtual("formattedSettlementAmount").get(function() {
  return `${this.settlementAmount} ${this.settlementCurrency}`;
});

// =========================
// ✅ INSTANCE METHODS
// =========================

/**
 * Mark lock as used
 */
exchangeRateLockSchema.methods.markAsUsed = async function(paymentId, metadata = {}) {
  if (this.status !== "active") {
    throw new Error(`Cannot mark lock as used with status: ${this.status}`);
  }

  this.status = "used";
  this.payment = paymentId;
  this.usedAt = new Date();
  this.metadata = { ...this.metadata, ...metadata, usedAt: new Date() };
  await this.save();

  console.log(`✅ Rate lock ${this.lockId} marked as used for payment ${paymentId}`);
  return this;
};

/**
 * Mark lock as refunded
 */
exchangeRateLockSchema.methods.markAsRefunded = async function(refundLockId, refundAmount, metadata = {}) {
  if (this.status !== "used" && this.status !== "active") {
    throw new Error(`Cannot mark lock as refunded with status: ${this.status}`);
  }

  this.status = "refunded";
  this.refundLockId = refundLockId;
  this.refundAmount = refundAmount;
  this.refundRate = this.lockedRate;
  this.metadata = { ...this.metadata, ...metadata, refundedAt: new Date() };
  await this.save();

  console.log(`🔄 Rate lock ${this.lockId} marked as refunded`);
  return this;
};

/**
 * Cancel the lock
 */
exchangeRateLockSchema.methods.cancel = async function(reason, userId = null, metadata = {}) {
  if (this.status === "used" || this.status === "refunded") {
    throw new Error(`Cannot cancel lock with status: ${this.status}`);
  }

  this.status = "cancelled";
  this.metadata = { ...this.metadata, ...metadata, cancelledAt: new Date(), cancelReason: reason };
  this.updatedBy = userId;
  await this.save();

  console.log(`🚫 Rate lock ${this.lockId} cancelled: ${reason}`);
  return this;
};

/**
 * Extend lock expiry
 */
exchangeRateLockSchema.methods.extendLock = async function(minutes = 30, userId = null) {
  if (this.status !== "active") {
    throw new Error(`Cannot extend lock with status: ${this.status}`);
  }

  const newExpiry = new Date(Date.now() + minutes * 60 * 1000);
  this.expiresAt = newExpiry;
  this.metadata = { ...this.metadata, extendedAt: new Date(), extendedBy: userId };
  await this.save();

  console.log(`⏰ Rate lock ${this.lockId} extended to ${newExpiry}`);
  return this;
};

/**
 * Verify lock is valid for use
 */
exchangeRateLockSchema.methods.verify = function() {
  if (this.status !== "active") {
    return { valid: false, reason: `Lock status is ${this.status}` };
  }
  if (this.expiresAt < new Date()) {
    return { valid: false, reason: "Lock has expired" };
  }
  if (this.lockedRate <= 0) {
    return { valid: false, reason: "Invalid exchange rate" };
  }
  return { valid: true };
};

/**
 * Get rate for settlement
 */
exchangeRateLockSchema.methods.getSettlementRate = function() {
  return {
    rate: this.lockedRate,
    inverseRate: this.inverseRate || 1 / this.lockedRate,
    currency: this.settlementCurrency,
    amount: this.settlementAmount,
  };
};

// =========================
// ✅ STATIC METHODS
// =========================

/**
 * Create a rate lock
 */
exchangeRateLockSchema.statics.createLock = async function(data) {
  const {
    booking,
    traveler,
    provider,
    baseCurrency,
    displayCurrency,
    settlementCurrency,
    lockedRate,
    originalAmount,
    convertedAmount,
    settlementAmount,
    expiresAt,
    source = "checkout",
    createdBy,
    metadata = {},
  } = data;

  const inverseRate = 1 / lockedRate;

  const lock = new this({
    booking,
    traveler,
    provider,
    baseCurrency: baseCurrency || "RWF",
    displayCurrency: displayCurrency || "USD",
    settlementCurrency: settlementCurrency || "RWF",
    lockedRate,
    inverseRate,
    originalAmount,
    convertedAmount,
    settlementAmount,
    expiresAt: expiresAt || new Date(Date.now() + 30 * 60 * 1000),
    source,
    createdBy,
    metadata,
    status: "active",
  });

  await lock.save();
  console.log(`🔒 Rate lock created: ${lock.lockId}`);
  return lock;
};

/**
 * Get active lock for booking
 */
exchangeRateLockSchema.statics.getActiveLock = async function(bookingId) {
  return this.findOne({
    booking: bookingId,
    status: "active",
    expiresAt: { $gt: new Date() },
  })
    .sort({ lockedAt: -1 })
    .lean();
};

/**
 * Get lock by booking with any status
 */
exchangeRateLockSchema.statics.getByBooking = async function(bookingId) {
  return this.findOne({
    booking: bookingId,
  })
    .sort({ lockedAt: -1 })
    .lean();
};

/**
 * Get locks by status
 */
exchangeRateLockSchema.statics.getByStatus = async function(status, options = {}) {
  const { limit = 100, page = 1 } = options;
  const skip = (page - 1) * limit;

  const [locks, total] = await Promise.all([
    this.find({ status })
      .populate("booking", "bookingCode user")
      .populate("traveler", "name email")
      .populate("provider", "name email businessName")
      .sort({ lockedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({ status }),
  ]);

  return {
    locks,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get expired locks
 */
exchangeRateLockSchema.statics.getExpiredLocks = async function() {
  return this.find({
    status: "active",
    expiresAt: { $lt: new Date() },
  })
    .populate("booking", "bookingCode")
    .lean();
};

/**
 * Clean up expired locks
 */
exchangeRateLockSchema.statics.cleanupExpired = async function() {
  const expired = await this.getExpiredLocks();
  let count = 0;

  for (const lock of expired) {
    lock.status = "expired";
    lock.metadata = { ...lock.metadata, expiredAt: new Date() };
    await lock.save();
    count++;
  }

  console.log(`🧹 Cleaned up ${count} expired rate locks`);
  return count;
};

/**
 * Get lock statistics
 */
exchangeRateLockSchema.statics.getStats = async function() {
  const [
    total,
    active,
    used,
    expired,
    cancelled,
    refunded,
    totalAmount,
    usedAmount,
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ status: "active" }),
    this.countDocuments({ status: "used" }),
    this.countDocuments({ status: "expired" }),
    this.countDocuments({ status: "cancelled" }),
    this.countDocuments({ status: "refunded" }),
    this.aggregate([
      { $group: { _id: null, total: { $sum: "$convertedAmount" } } },
    ]),
    this.aggregate([
      { $match: { status: "used" } },
      { $group: { _id: null, total: { $sum: "$convertedAmount" } } },
    ]),
  ]);

  return {
    total,
    active,
    used,
    expired,
    cancelled,
    refunded,
    totalAmount: totalAmount[0]?.total || 0,
    usedAmount: usedAmount[0]?.total || 0,
    activeRate: total > 0 ? (active / total) * 100 : 0,
    usageRate: total > 0 ? (used / total) * 100 : 0,
  };
};

/**
 * Get locks by currency pair
 */
exchangeRateLockSchema.statics.getByCurrencyPair = async function() {
  return this.aggregate([
    {
      $group: {
        _id: {
          baseCurrency: "$baseCurrency",
          displayCurrency: "$displayCurrency",
        },
        count: { $sum: 1 },
        averageRate: { $avg: "$lockedRate" },
        totalAmount: { $sum: "$convertedAmount" },
        usedCount: {
          $sum: { $cond: [{ $eq: ["$status", "used"] }, 1, 0] },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// =========================
// ✅ PRE-SAVE MIDDLEWARE
// =========================

exchangeRateLockSchema.pre("save", function(next) {
  // Calculate inverse rate if not provided
  if (!this.inverseRate && this.lockedRate) {
    this.inverseRate = 1 / this.lockedRate;
  }

  // Ensure inverse rate is valid
  if (this.inverseRate <= 0) {
    this.inverseRate = 1 / this.lockedRate;
  }

  // Ensure expiry is set
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  }

  // Ensure currencies are uppercase
  if (this.baseCurrency) {
    this.baseCurrency = this.baseCurrency.toUpperCase();
  }
  if (this.displayCurrency) {
    this.displayCurrency = this.displayCurrency.toUpperCase();
  }
  if (this.settlementCurrency) {
    this.settlementCurrency = this.settlementCurrency.toUpperCase();
  }

  // Validate amounts
  if (this.originalAmount < 0) this.originalAmount = 0;
  if (this.convertedAmount < 0) this.convertedAmount = 0;
  if (this.settlementAmount < 0) this.settlementAmount = 0;

  next();
});

// =========================
// ✅ POST-SAVE MIDDLEWARE
// =========================

exchangeRateLockSchema.post("save", function(doc) {
  console.log(`📊 Rate lock ${doc.lockId}: ${doc.status} - ${doc.displayCurrency}/${doc.baseCurrency} @ ${doc.lockedRate}`);
});

// =========================
// ✅ TO JSON / TO OBJECT
// =========================

exchangeRateLockSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret._id;
    return ret;
  },
});

exchangeRateLockSchema.set("toObject", {
  virtuals: true,
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const ExchangeRateLock = mongoose.model("ExchangeRateLock", exchangeRateLockSchema);

export default ExchangeRateLock;