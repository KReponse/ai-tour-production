// backend/src/models/RateLock.js
// ✅ Rate Lock Model - For locking rates/prices during checkout

import mongoose from "mongoose";

const rateLockSchema = new mongoose.Schema(
  {
    // =========================
    // IDENTIFIERS
    // =========================
    lockId: {
      type: String,
      required: true,
      unique: true, // ✅ This creates the index automatically
      default: () => `RATE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    // =========================
    // ENTITY REFERENCES
    // =========================
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
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
    // RATE DETAILS
    // =========================
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    lockedPrice: {
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

    // =========================
    // STATUS
    // =========================
    status: {
      type: String,
      enum: ["active", "used", "expired", "cancelled"],
      default: "active",
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    // =========================
    // USAGE
    // =========================
    usedAt: {
      type: Date,
    },

    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // =========================
    // METADATA
    // =========================
    reason: {
      type: String,
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
// ✅ ALL INDEXES DEFINED IN ONE PLACE
// =========================
// ❌ DO NOT add lockId index here - it's already created by 'unique: true'
// ✅ Add all other single field indexes here

// =========================
// ✅ SINGLE FIELD INDEXES
// =========================
// rateLockSchema.index({ lockId: 1 }); // ❌ REMOVED - unique:true creates it automatically
rateLockSchema.index({ booking: 1 });
rateLockSchema.index({ listing: 1 });
rateLockSchema.index({ traveler: 1 });
rateLockSchema.index({ provider: 1 });
rateLockSchema.index({ status: 1 });
rateLockSchema.index({ expiresAt: 1 });

// =========================
// ✅ COMPOUND INDEXES
// =========================
rateLockSchema.index({ booking: 1, status: 1 });
rateLockSchema.index({ traveler: 1, status: 1 });
rateLockSchema.index({ status: 1, expiresAt: 1 });
rateLockSchema.index({ provider: 1, status: 1, createdAt: -1 });

// =========================
// ✅ IMPORTANT NOTES ON INDEXES:
// =========================
// 1. lockId has unique:true - this automatically creates an index
//    DO NOT add: rateLockSchema.index({ lockId: 1 })
// 2. All other indexes are defined ONLY in this section
// 3. No field has both index:true AND a schema.index() call

// =========================
// ✅ VIRTUALS
// =========================

rateLockSchema.virtual("isActive").get(function() {
  return this.status === "active" && this.expiresAt > new Date();
});

rateLockSchema.virtual("isExpired").get(function() {
  return this.status === "expired" || this.expiresAt < new Date();
});

rateLockSchema.virtual("isUsed").get(function() {
  return this.status === "used";
});

rateLockSchema.virtual("isCancelled").get(function() {
  return this.status === "cancelled";
});

rateLockSchema.virtual("timeRemaining").get(function() {
  if (this.expiresAt < new Date()) return 0;
  return Math.floor((this.expiresAt - new Date()) / 1000);
});

rateLockSchema.virtual("timeRemainingMinutes").get(function() {
  return Math.floor(this.timeRemaining / 60);
});

// =========================
// ✅ INSTANCE METHODS
// =========================

rateLockSchema.methods.markAsUsed = async function(userId) {
  if (this.status !== "active") {
    throw new Error(`Cannot mark lock as used with status: ${this.status}`);
  }
  this.status = "used";
  this.usedAt = new Date();
  this.usedBy = userId;
  await this.save();
  return this;
};

rateLockSchema.methods.markAsExpired = async function() {
  if (this.status !== "active") {
    throw new Error(`Cannot mark lock as expired with status: ${this.status}`);
  }
  this.status = "expired";
  await this.save();
  return this;
};

rateLockSchema.methods.cancel = async function(reason) {
  this.status = "cancelled";
  this.reason = reason || "Cancelled by user";
  await this.save();
  return this;
};

rateLockSchema.methods.extendLock = async function(minutes = 15) {
  if (this.status !== "active") {
    throw new Error(`Cannot extend lock with status: ${this.status}`);
  }
  this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  await this.save();
  return this;
};

rateLockSchema.methods.isValid = function() {
  return this.status === "active" && this.expiresAt > new Date();
};

// =========================
// ✅ STATIC METHODS
// =========================

rateLockSchema.statics.createLock = async function(data) {
  const {
    booking,
    listing,
    traveler,
    provider,
    originalPrice,
    lockedPrice,
    currency,
    expiresAt,
    createdBy,
  } = data;

  const lock = new this({
    booking,
    listing,
    traveler,
    provider,
    originalPrice,
    lockedPrice: lockedPrice || originalPrice,
    currency: currency || "RWF",
    expiresAt: expiresAt || new Date(Date.now() + 30 * 60 * 1000),
    createdBy,
    status: "active",
  });

  await lock.save();
  return lock;
};

rateLockSchema.statics.getActiveLock = async function(bookingId) {
  return this.findOne({
    booking: bookingId,
    status: "active",
    expiresAt: { $gt: new Date() },
  }).lean();
};

rateLockSchema.statics.getLocksByBooking = async function(bookingId) {
  return this.find({ booking: bookingId })
    .sort({ lockedAt: -1 })
    .lean();
};

rateLockSchema.statics.getLocksByTraveler = async function(travelerId) {
  return this.find({ traveler: travelerId })
    .sort({ lockedAt: -1 })
    .lean();
};

rateLockSchema.statics.getLocksByProvider = async function(providerId) {
  return this.find({ provider: providerId })
    .sort({ lockedAt: -1 })
    .lean();
};

rateLockSchema.statics.cleanupExpired = async function() {
  const expired = await this.find({
    status: "active",
    expiresAt: { $lt: new Date() },
  });

  let count = 0;
  for (const lock of expired) {
    lock.status = "expired";
    await lock.save();
    count++;
  }

  return count;
};

// =========================
// ✅ TO JSON / TO OBJECT
// =========================

rateLockSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

rateLockSchema.set("toObject", {
  virtuals: true,
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const RateLock = mongoose.model("RateLock", rateLockSchema);
export default RateLock;