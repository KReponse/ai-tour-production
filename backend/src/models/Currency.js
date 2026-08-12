// backend/src/models/Currency.js
// ✅ COMPLETE FIXED - Removed duplicate code index (unique:true creates it automatically)

import mongoose from "mongoose";

const currencySchema = new mongoose.Schema(
  {
    // =========================
    // CURRENCY IDENTIFIERS
    // =========================
    code: {
      type: String,
      required: [true, "Currency code is required"],
      unique: true, // ✅ This creates the index automatically
      uppercase: true,
      trim: true,
      enum: ["RWF", "USD", "EUR", "GBP", "KES", "UGX", "TZS"],
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    symbol: {
      type: String,
      required: [true, "Currency symbol is required"],
      trim: true,
      default: "₣",
    },

    name: {
      type: String,
      required: [true, "Currency name is required"],
      trim: true,
    },

    // =========================
    // CURRENCY PROPERTIES
    // =========================
    decimalPlaces: {
      type: Number,
      default: 2,
      min: 0,
      max: 4,
    },

    // =========================
    // STATUS
    // =========================
    isActive: {
      type: Boolean,
      default: true,
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    isDefault: {
      type: Boolean,
      default: false,
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    isBaseCurrency: {
      type: Boolean,
      default: false,
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    // =========================
    // EXCHANGE RATE
    // =========================
    exchangeRate: {
      type: Number,
      required: [true, "Exchange rate is required"],
      min: [0.0001, "Exchange rate must be greater than 0"],
      default: 1,
    },

    exchangeRateUpdatedAt: {
      type: Date,
      default: Date.now,
    },

    exchangeRateSource: {
      type: String,
      enum: ["manual", "api", "admin", "system"],
      default: "manual",
    },

    // =========================
    // PLATFORM FEES BY CURRENCY
    // =========================
    platformFeePercentage: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },

    platformFeeFixed: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================
    // PAYMENT METHODS
    // =========================
    paymentMethods: [
      {
        type: String,
        enum: [
          "stripe",
          "momo",
          "airtel",
          "bank_transfer",
          "card",
          "paypal",
          "crypto",
        ],
      },
    ],

    // =========================
    // SETTLEMENT
    // =========================
    settlementAllowed: {
      type: Boolean,
      default: true,
    },

    settlementFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================
    // MINIMUM / MAXIMUM
    // =========================
    minPaymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxPaymentAmount: {
      type: Number,
      default: 100000,
      min: 0,
    },

    minWithdrawalAmount: {
      type: Number,
      default: 1000,
      min: 0,
    },

    // =========================
    // FORMATTING
    // =========================
    format: {
      locale: {
        type: String,
        default: "en-US",
      },
      currencyDisplay: {
        type: String,
        enum: ["symbol", "code", "name"],
        default: "symbol",
      },
      position: {
        type: String,
        enum: ["before", "after"],
        default: "before",
      },
      thousandsSeparator: {
        type: String,
        default: ",",
      },
      decimalSeparator: {
        type: String,
        default: ".",
      },
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
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // =========================
    // FLAGS
    // =========================
    isCrypto: {
      type: Boolean,
      default: false,
    },

    isFiat: {
      type: Boolean,
      default: true,
    },

    countryCodes: [
      {
        type: String,
        uppercase: true,
        trim: true,
      },
    ],

    // =========================
    // RATE LIMITS
    // =========================
    rateLimit: {
      daily: {
        type: Number,
        default: 0,
      },
      monthly: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// ✅ ALL INDEXES DEFINED IN ONE PLACE
// =========================
// ❌ DO NOT add code index here - it's already created by 'unique: true'
// ✅ Add all other single field indexes here

// =========================
// ✅ SINGLE FIELD INDEXES
// =========================
// currencySchema.index({ code: 1 }); // ❌ REMOVED - unique:true creates it automatically
currencySchema.index({ isActive: 1 });
currencySchema.index({ isDefault: 1 });
currencySchema.index({ isBaseCurrency: 1 });
currencySchema.index({ exchangeRate: 1 });

// =========================
// ✅ COMPOUND INDEXES
// =========================
currencySchema.index({ isActive: 1, isDefault: 1, code: 1 });
currencySchema.index({ isActive: 1, settlementAllowed: 1 });

// =========================
// ✅ IMPORTANT NOTES ON INDEXES:
// =========================
// 1. code has unique:true - this automatically creates an index
//    DO NOT add: currencySchema.index({ code: 1 })
// 2. All other indexes are defined ONLY in this section
// 3. No field has both index:true AND a schema.index() call
// 4. All single field indexes are listed above
// 5. All compound indexes are listed above

// =========================
// ✅ VIRTUALS
// =========================

currencySchema.virtual("displayName").get(function () {
  return `${this.symbol} ${this.code}`;
});

currencySchema.virtual("formattedExchangeRate").get(function () {
  return `${this.symbol}1 = ${this.exchangeRate} ${this.code}`;
});

currencySchema.virtual("isActiveCurrency").get(function () {
  return this.isActive === true;
});

currencySchema.virtual("isDefaultCurrency").get(function () {
  return this.isDefault === true;
});

currencySchema.virtual("platformFeeDecimal").get(function () {
  return this.platformFeePercentage / 100;
});

currencySchema.virtual("exchangeRateAge").get(function () {
  if (!this.exchangeRateUpdatedAt) return null;
  const now = new Date();
  const diff = now - this.exchangeRateUpdatedAt;
  return diff / (1000 * 60 * 60);
});

currencySchema.virtual("isRateStale").get(function () {
  const age = this.exchangeRateAge;
  if (age === null) return true;
  return age > 24;
});

// =========================
// ✅ INSTANCE METHODS
// =========================

currencySchema.methods.formatAmount = function (amount) {
  const formatter = new Intl.NumberFormat(this.format.locale, {
    style: "currency",
    currency: this.code,
    minimumFractionDigits: this.decimalPlaces,
    maximumFractionDigits: this.decimalPlaces,
    currencyDisplay: this.format.currencyDisplay,
  });
  return formatter.format(amount);
};

currencySchema.methods.getSymbol = function () {
  return this.symbol;
};

currencySchema.methods.updateExchangeRate = async function (rate, source = "manual") {
  this.exchangeRate = rate;
  this.exchangeRateUpdatedAt = new Date();
  this.exchangeRateSource = source;
  await this.save();
  return this;
};

currencySchema.methods.isAmountValid = function (amount) {
  if (amount < this.minPaymentAmount) return false;
  if (this.maxPaymentAmount > 0 && amount > this.maxPaymentAmount) return false;
  return true;
};

currencySchema.methods.calculatePlatformFee = function (amount) {
  const percentage = (amount * this.platformFeePercentage) / 100;
  const fixed = this.platformFeeFixed || 0;
  return percentage + fixed;
};

currencySchema.methods.convertFromBase = function (amount, baseRate = 1) {
  return amount * this.exchangeRate;
};

currencySchema.methods.convertToBase = function (amount, baseRate = 1) {
  return amount / this.exchangeRate;
};

currencySchema.methods.getDecimalPlaces = function () {
  return this.decimalPlaces;
};

// =========================
// ✅ STATIC METHODS
// =========================

currencySchema.statics.getDefault = async function () {
  let currency = await this.findOne({ isDefault: true, isActive: true });
  if (!currency) {
    currency = await this.findOne({ isBaseCurrency: true, isActive: true });
  }
  if (!currency) {
    currency = await this.findOne({ isActive: true });
  }
  return currency;
};

currencySchema.statics.getBaseCurrency = async function () {
  let currency = await this.findOne({ isBaseCurrency: true, isActive: true });
  if (!currency) {
    currency = await this.findOne({ isDefault: true, isActive: true });
  }
  return currency;
};

currencySchema.statics.getActiveCurrencies = async function () {
  return this.find({ isActive: true }).sort({ isDefault: -1, code: 1 });
};

currencySchema.statics.getByCode = async function (code) {
  return this.findOne({ code: code.toUpperCase() });
};

currencySchema.statics.getByPaymentMethod = async function (paymentMethod) {
  return this.find({
    isActive: true,
    paymentMethods: paymentMethod,
  }).sort({ isDefault: -1, code: 1 });
};

currencySchema.statics.getSettlementCurrencies = async function () {
  return this.find({
    isActive: true,
    settlementAllowed: true,
  }).sort({ isDefault: -1, code: 1 });
};

currencySchema.statics.seedDefaults = async function () {
  const count = await this.countDocuments();
  if (count > 0) return;

  const defaultCurrencies = [
    {
      code: "RWF",
      symbol: "FRw",
      name: "Rwandan Franc",
      decimalPlaces: 0,
      isDefault: true,
      isBaseCurrency: true,
      isActive: true,
      exchangeRate: 1,
      platformFeePercentage: 5,
      paymentMethods: ["momo", "airtel", "bank_transfer"],
      settlementAllowed: true,
      format: {
        locale: "rw-RW",
        currencyDisplay: "symbol",
        position: "before",
      },
      countryCodes: ["RW"],
    },
    {
      code: "USD",
      symbol: "$",
      name: "US Dollar",
      decimalPlaces: 2,
      isDefault: false,
      isBaseCurrency: false,
      isActive: true,
      exchangeRate: 1450,
      platformFeePercentage: 10,
      paymentMethods: ["stripe", "card", "paypal"],
      settlementAllowed: true,
      format: {
        locale: "en-US",
        currencyDisplay: "symbol",
        position: "before",
      },
      countryCodes: ["US"],
    },
    {
      code: "EUR",
      symbol: "€",
      name: "Euro",
      decimalPlaces: 2,
      isDefault: false,
      isBaseCurrency: false,
      isActive: true,
      exchangeRate: 1550,
      platformFeePercentage: 10,
      paymentMethods: ["stripe", "card", "paypal"],
      settlementAllowed: true,
      format: {
        locale: "en-EU",
        currencyDisplay: "symbol",
        position: "before",
      },
      countryCodes: ["EU"],
    },
    {
      code: "GBP",
      symbol: "£",
      name: "British Pound",
      decimalPlaces: 2,
      isDefault: false,
      isBaseCurrency: false,
      isActive: true,
      exchangeRate: 1800,
      platformFeePercentage: 10,
      paymentMethods: ["stripe", "card", "paypal"],
      settlementAllowed: true,
      format: {
        locale: "en-GB",
        currencyDisplay: "symbol",
        position: "before",
      },
      countryCodes: ["GB"],
    },
  ];

  await this.insertMany(defaultCurrencies);
  console.log("✅ Default currencies seeded");
};

// =========================
// ✅ PRE-SAVE MIDDLEWARE
// =========================

currencySchema.pre("save", function (next) {
  if (this.isDefault) {
    this.constructor
      .updateMany({ _id: { $ne: this._id }, isDefault: true }, { isDefault: false })
      .then(() => next())
      .catch(next);
  } else {
    next();
  }
});

currencySchema.pre("save", function (next) {
  if (this.isBaseCurrency) {
    this.constructor
      .updateMany({ _id: { $ne: this._id }, isBaseCurrency: true }, { isBaseCurrency: false })
      .then(() => next())
      .catch(next);
  } else {
    next();
  }
});

// =========================
// ✅ TO JSON / TO OBJECT
// =========================

currencySchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

currencySchema.set("toObject", {
  virtuals: true,
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const Currency = mongoose.model("Currency", currencySchema);
export default Currency;