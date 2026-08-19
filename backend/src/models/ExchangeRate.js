// backend/src/models/ExchangeRate.js
// ✅ COMPLETE FIXED - Removed all index: true from field definitions
// ✅ All indexes defined ONLY in schema.index() section

import mongoose from "mongoose";

const exchangeRateSchema = new mongoose.Schema(
  {
    // =========================
    // CURRENCY PAIR
    // =========================
    fromCurrency: {
      type: String,
      required: [true, "From currency is required"],
      uppercase: true,
      trim: true,
      // ✅ REMOVED: index: true
    },

    toCurrency: {
      type: String,
      required: [true, "To currency is required"],
      uppercase: true,
      trim: true,
      // ✅ REMOVED: index: true
    },

    // =========================
    // EXCHANGE RATE
    // =========================
    rate: {
      type: Number,
      required: [true, "Exchange rate is required"],
      min: [0.0001, "Exchange rate must be greater than 0"],
    },

    inverseRate: {
      type: Number,
      min: [0.0001, "Inverse rate must be greater than 0"],
    },

    // =========================
    // TIMESTAMPS
    // =========================
    effectiveDate: {
      type: Date,
      default: Date.now,
      required: true,
      // ✅ REMOVED: index: true
    },

    expiresAt: {
      type: Date,
      // ✅ REMOVED: index: true
    },

    // =========================
    // SOURCE
    // =========================
    source: {
      type: String,
      enum: ["manual", "api", "admin", "system", "webhook", "fallback"],
      default: "manual",
      // ✅ REMOVED: index: true
    },

    sourceProvider: {
      type: String,
      enum: [
        "fixer",
        "openexchangerates",
        "currencyfreaks",
        "exchangerate-api",
        "national_bank",
        "manual",
        "admin",
        "fallback",
      ],
      default: "manual",
    },

    // =========================
    // METADATA
    // =========================
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
      // ✅ REMOVED: index: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // =========================
    // FLAGS
    // =========================
    isActive: {
      type: Boolean,
      default: true,
      // ✅ REMOVED: index: true
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // =========================
    // STATISTICS
    // =========================
    usageCount: {
      type: Number,
      default: 0,
    },

    lastUsedAt: {
      type: Date,
    },

    // =========================
    // API RESPONSE DATA
    // =========================
    apiResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// ✅ ALL INDEXES DEFINED IN ONE PLACE
// =========================
// NO index:true in field definitions above
// All indexes defined ONLY here

exchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1 });
exchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1, effectiveDate: -1 });
exchangeRateSchema.index({ effectiveDate: -1, expiresAt: 1 });
exchangeRateSchema.index({ isActive: 1, effectiveDate: -1 });
exchangeRateSchema.index({ source: 1, createdAt: -1 });
exchangeRateSchema.index({ createdBy: 1, createdAt: -1 });

// Compound indexes for common queries
exchangeRateSchema.index(
  { fromCurrency: 1, toCurrency: 1, isActive: 1, effectiveDate: -1 },
  { unique: true }
);

// =========================
// ✅ VIRTUALS
// =========================

exchangeRateSchema.virtual("pair").get(function () {
  return `${this.fromCurrency}/${this.toCurrency}`;
});

exchangeRateSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

exchangeRateSchema.virtual("isCurrent").get(function () {
  const now = new Date();
  const diff = now - this.effectiveDate;
  return diff < 24 * 60 * 60 * 1000;
});

exchangeRateSchema.virtual("ageInHours").get(function () {
  const now = new Date();
  const diff = now - this.effectiveDate;
  return diff / (1000 * 60 * 60);
});

exchangeRateSchema.virtual("formattedRate").get(function () {
  return `1 ${this.fromCurrency} = ${this.rate} ${this.toCurrency}`;
});

// =========================
// ✅ INSTANCE METHODS
// =========================

exchangeRateSchema.methods.convert = function (amount) {
  return amount * this.rate;
};

exchangeRateSchema.methods.convertInverse = function (amount) {
  if (!this.inverseRate) {
    this.inverseRate = 1 / this.rate;
  }
  return amount * this.inverseRate;
};

exchangeRateSchema.methods.markUsed = async function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  await this.save();
  return this;
};

exchangeRateSchema.methods.isValidForUse = function () {
  if (!this.isActive) return false;
  if (this.isExpired) return false;
  if (this.ageInHours > 24) return false;
  return true;
};

exchangeRateSchema.methods.deactivate = async function () {
  this.isActive = false;
  await this.save();
  return this;
};

exchangeRateSchema.methods.verify = async function () {
  this.isVerified = true;
  await this.save();
  return this;
};

// =========================
// ✅ STATIC METHODS
// =========================

exchangeRateSchema.statics.getLatest = async function (fromCurrency, toCurrency) {
  const rate = await this.findOne({
    fromCurrency: fromCurrency.toUpperCase(),
    toCurrency: toCurrency.toUpperCase(),
    isActive: true,
    effectiveDate: { $lte: new Date() },
    $or: [{ expiresAt: { $gte: new Date() } }, { expiresAt: null }],
  })
    .sort({ effectiveDate: -1 })
    .lean();

  return rate;
};

exchangeRateSchema.statics.getHistory = async function (
  fromCurrency,
  toCurrency,
  options = {}
) {
  const { limit = 30, days = 30, startDate, endDate } = options;

  const filter = {
    fromCurrency: fromCurrency.toUpperCase(),
    toCurrency: toCurrency.toUpperCase(),
    isActive: true,
  };

  if (startDate || endDate) {
    filter.effectiveDate = {};
    if (startDate) filter.effectiveDate.$gte = new Date(startDate);
    if (endDate) filter.effectiveDate.$lte = new Date(endDate);
  } else if (days) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    filter.effectiveDate = { $gte: start };
  }

  return this.find(filter)
    .sort({ effectiveDate: -1 })
    .limit(limit)
    .lean();
};

exchangeRateSchema.statics.getCurrent = async function (fromCurrency, toCurrency) {
  const rate = await this.findOne({
    fromCurrency: fromCurrency.toUpperCase(),
    toCurrency: toCurrency.toUpperCase(),
    isActive: true,
    effectiveDate: { $lte: new Date() },
    $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }],
  })
    .sort({ effectiveDate: -1 })
    .lean();

  return rate;
};

exchangeRateSchema.statics.getActiveRatesForCurrency = async function (currency) {
  return this.find({
    $or: [{ fromCurrency: currency.toUpperCase() }, { toCurrency: currency.toUpperCase() }],
    isActive: true,
    effectiveDate: { $lte: new Date() },
    $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }],
  })
    .sort({ effectiveDate: -1 })
    .lean();
};

exchangeRateSchema.statics.setRate = async function (
  fromCurrency,
  toCurrency,
  rate,
  options = {}
) {
  const {
    source = "manual",
    sourceProvider = "manual",
    expiresAt = null,
    createdBy = null,
    metadata = {},
  } = options;

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  const inverseRate = 1 / rate;

  const existing = await this.findOne({
    fromCurrency: from,
    toCurrency: to,
    isActive: true,
    effectiveDate: { $lte: new Date() },
    $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }],
  });

  if (existing) {
    existing.rate = rate;
    existing.inverseRate = inverseRate;
    existing.source = source;
    existing.sourceProvider = sourceProvider;
    existing.metadata = { ...existing.metadata, ...metadata };
    existing.updatedBy = createdBy;
    if (expiresAt) existing.expiresAt = new Date(expiresAt);

    await existing.save();
    return existing;
  }

  const newRate = new this({
    fromCurrency: from,
    toCurrency: to,
    rate,
    inverseRate,
    effectiveDate: new Date(),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    source,
    sourceProvider,
    metadata,
    createdBy,
    isActive: true,
  });

  await newRate.save();
  return newRate;
};

exchangeRateSchema.statics.cleanup = async function (daysToKeep = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const result = await this.deleteMany({
    isActive: false,
    effectiveDate: { $lt: cutoff },
  });

  return result.deletedCount;
};

exchangeRateSchema.statics.getStats = async function () {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ isActive: true });
  const expired = await this.countDocuments({ isActive: false });
  const verified = await this.countDocuments({ isVerified: true });

  const bySource = await this.aggregate([
    { $group: { _id: "$source", count: { $sum: 1 } } },
  ]);

  const byProvider = await this.aggregate([
    { $group: { _id: "$sourceProvider", count: { $sum: 1 } } },
  ]);

  const latest = await this.findOne()
    .sort({ effectiveDate: -1 })
    .lean();

  return {
    total,
    active,
    expired,
    verified,
    bySource: bySource.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byProvider: byProvider.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    latest: latest ? {
      pair: latest.pair,
      rate: latest.rate,
      effectiveDate: latest.effectiveDate,
    } : null,
  };
};

// =========================
// ✅ PRE-SAVE MIDDLEWARE
// =========================

exchangeRateSchema.pre("save", function (next) {
  if (!this.inverseRate && this.rate) {
    this.inverseRate = 1 / this.rate;
  }

  if (this.inverseRate <= 0) {
    this.inverseRate = 1 / this.rate;
  }

  if (!this.expiresAt && this.source !== "system") {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    this.expiresAt = expiry;
  }

  next();
});

// =========================
// ✅ TO JSON / TO OBJECT
// =========================

exchangeRateSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

exchangeRateSchema.set("toObject", {
  virtuals: true,
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const ExchangeRate = mongoose.model("ExchangeRate", exchangeRateSchema);

export default ExchangeRate;