// backend/src/models/Payment.js
// ✅ COMPLETE FIXED - All duplicate indexes removed
// ✅ All indexes defined in ONE place only
// ✅ Removed problematic virtual

import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
{
  // =========================
  // RELATIONSHIPS
  // =========================
  traveler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Traveler is required"],
  },

  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Provider is required"],
  },

  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: [true, "Booking is required"],
  },

  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: [true, "Listing is required"],
  },

  // =========================
  // AMOUNTS
  // =========================
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0.01, "Amount must be greater than 0"],
  },

  currency: {
    type: String,
    default: "USD",
    enum: ["USD", "EUR", "GBP", "RWF"],
  },

  platformFee: {
    type: Number,
    default: 0,
    min: [0, "Platform fee cannot be negative"],
  },

  providerAmount: {
    type: Number,
    default: 0,
    min: [0, "Provider amount cannot be negative"],
  },

  // =========================
  // PAYMENT IDENTIFIERS
  // =========================
  stripeSessionId: {
    type: String,
    // No index here - defined below
  },

  stripePaymentId: {
    type: String,
    // No index here - defined below
  },

  transactionId: {
    type: String,
    unique: true,
    sparse: true,
    // unique: true automatically creates an index
    // DO NOT add this to schema.index() section below
  },

  refundId: {
    type: String,
    sparse: true,
    // No index here - defined below
  },

  // =========================
  // PAYMENT METHOD
  // =========================
  paymentMethod: {
    type: String,
    enum: [
      "stripe",
      "card",
      "bank_transfer",
      "mobile_money",
      "momo",
      "airtel",
      "paypal",
      "test",
    ],
    default: "stripe",
  },

  // =========================
  // PAYMENT STATUS
  // =========================
  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "paid",
      "succeeded", 
      "failed",
      "refunded",
      "partially_refunded",
      "disputed",
    ],
    default: "pending",
    // No index here - defined below
  },

  paidAt: {
    type: Date,
    // No index here - defined below
  },

  refundedAt: {
    type: Date,
  },

  refundAmount: {
    type: Number,
    default: 0,
    min: [0, "Refund amount cannot be negative"],
  },

  // =========================
  // PAYOUT TRACKING
  // =========================
  payoutStatus: {
    type: String,
    enum: ["pending", "processing", "completed", "failed", "cancelled"],
    default: "pending",
    // No index here - defined below
  },

  payoutDate: {
    type: Date,
    // No index here - defined below
  },

  payoutReference: {
    type: String,
    sparse: true,
  },

  // =========================
  // SETTLEMENT FIELDS
  // =========================
  settlementCurrency: {
    type: String,
    default: "RWF",
    // No index here - defined below
  },

  settlementAmount: {
    type: Number,
    default: 0,
  },

  settlementExchangeRate: {
    type: Number,
    default: 1,
  },

  settlementFee: {
    type: Number,
    default: 0,
  },

  settlementStatus: {
    type: String,
    enum: ["pending", "processing", "settled", "failed"],
    default: "pending",
    // No index here - defined below
  },

  settledAt: {
    type: Date,
  },

  // =========================
  // METADATA
  // =========================
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },

  isTestMode: {
    type: Boolean,
    default: false,
  },

  errorMessage: {
    type: String,
  },

  source: {
    type: String,
    enum: ["checkout", "subscription", "manual", "webhook"],
    default: "checkout",
  },

  providerReference: {
    type: String,
    // No index here - defined below
  },

  providerData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },

  paymentUrl: {
    type: String,
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
paymentSchema.index({ traveler: 1 });
paymentSchema.index({ provider: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ listing: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paidAt: -1 });
paymentSchema.index({ stripeSessionId: 1 });
paymentSchema.index({ stripePaymentId: 1 });
paymentSchema.index({ providerReference: 1 });
//paymentSchema.index({ refundId: 1 }); // ✅ Only defined here
paymentSchema.index({ payoutStatus: 1 });
paymentSchema.index({ payoutDate: -1 });
paymentSchema.index({ settlementStatus: 1 });
paymentSchema.index({ settlementCurrency: 1 });

// =========================
// ✅ COMPOUND INDEXES
// =========================
paymentSchema.index({ traveler: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, status: 1, payoutStatus: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ traveler: 1, status: 1 });
paymentSchema.index({ traveler: 1, booking: 1, status: 1 });
paymentSchema.index({ provider: 1, payoutStatus: 1, paidAt: -1 });
paymentSchema.index({ settlementStatus: 1, settledAt: -1 });

// =========================
// ✅ IMPORTANT NOTES ON INDEXES:
// =========================
// 1. transactionId has unique:true - this automatically creates an index
//    DO NOT add: paymentSchema.index({ transactionId: 1 })
// 2. All other indexes are defined ONLY in this section
// 3. No field has both index:true AND a schema.index() call
// 4. All single field indexes are listed above
// 5. All compound indexes are listed above

// =========================
// ✅ VIRTUALS
// =========================

paymentSchema.virtual("isRefundable").get(function() {
  return this.status === "paid" && !this.refundId;
});

paymentSchema.virtual("canBeRefunded").get(function() {
  return this.status === "paid" && this.amount > 0;
});

paymentSchema.virtual("isSuccessful").get(function() {
  return this.status === "paid" || this.status === "processing";
});

paymentSchema.virtual("calculatedProviderAmount").get(function() {
  return this.amount - (this.platformFee || 0);
});

paymentSchema.virtual("isPayoutPending").get(function() {
  return this.payoutStatus === "pending";
});

paymentSchema.virtual("isPayoutCompleted").get(function() {
  return this.payoutStatus === "completed";
});

paymentSchema.virtual("isPayoutProcessing").get(function() {
  return this.payoutStatus === "processing";
});

// ✅ REMOVED: user virtual - causing population issues
// Use traveler directly instead

// =========================
// ✅ INSTANCE METHODS
// =========================

paymentSchema.methods.markAsPaid = async function(paymentIntentId) {
  this.status = "paid";
  this.stripePaymentId = paymentIntentId;
  this.paidAt = new Date();
  this.providerAmount = this.amount - (this.platformFee || 0);
  await this.save();
  return this;
};

paymentSchema.methods.markAsFailed = async function(errorMessage) {
  this.status = "failed";
  this.errorMessage = errorMessage;
  await this.save();
  return this;
};

paymentSchema.methods.processRefund = async function(refundId, amount = null) {
  this.status = "refunded";
  this.refundId = refundId;
  this.refundAmount = amount || this.amount;
  this.refundedAt = new Date();
  await this.save();
  return this;
};

paymentSchema.methods.processPartialRefund = async function(refundId, amount) {
  this.status = "partially_refunded";
  this.refundId = refundId;
  this.refundAmount = amount;
  this.refundedAt = new Date();
  await this.save();
  return this;
};

paymentSchema.methods.calculateProviderAmount = function() {
  this.providerAmount = this.amount - (this.platformFee || 0);
  return this.providerAmount;
};

paymentSchema.methods.markPayoutCompleted = async function(reference) {
  this.payoutStatus = "completed";
  this.payoutDate = new Date();
  if (reference) this.payoutReference = reference;
  await this.save();
  return this;
};

paymentSchema.methods.markPayoutFailed = async function(reason) {
  this.payoutStatus = "failed";
  this.errorMessage = reason;
  await this.save();
  return this;
};

paymentSchema.methods.markPayoutProcessing = async function() {
  this.payoutStatus = "processing";
  await this.save();
  return this;
};

paymentSchema.methods.markSettled = async function() {
  this.settlementStatus = "settled";
  this.settledAt = new Date();
  await this.save();
  return this;
};

// =========================
// ✅ STATIC METHODS
// =========================

paymentSchema.statics.getProviderEarnings = async function(providerId, options = {}) {
  const { period = 'all', status = 'paid' } = options;
  
  const match = { 
    provider: providerId,
    status: status,
  };

  if (period !== 'all') {
    const now = new Date();
    let startDate;
    
    switch(period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = null;
    }
    
    if (startDate) {
      match.paidAt = { $gte: startDate };
    }
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        grossRevenue: { $sum: "$amount" },
        platformCommission: { $sum: "$platformFee" },
        netEarnings: { $sum: "$providerAmount" },
        totalPayments: { $sum: 1 },
        averagePayment: { $avg: "$amount" },
        totalRefunded: { 
          $sum: { 
            $cond: [{ $eq: ["$status", "refunded"] }, "$refundAmount", 0] 
          } 
        }
      }
    }
  ]);
  
  const baseResult = result[0] || { 
    grossRevenue: 0, 
    platformCommission: 0, 
    netEarnings: 0, 
    totalPayments: 0, 
    averagePayment: 0,
    totalRefunded: 0 
  };

  const pendingPayouts = await this.countDocuments({
    provider: providerId,
    status: 'paid',
    payoutStatus: 'pending'
  });
  
  const pendingAmount = await this.aggregate([
    {
      $match: {
        provider: providerId,
        status: 'paid',
        payoutStatus: 'pending'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$providerAmount" }
      }
    }
  ]);

  const completedPayouts = await this.countDocuments({
    provider: providerId,
    status: 'paid',
    payoutStatus: 'completed'
  });
  
  const completedAmount = await this.aggregate([
    {
      $match: {
        provider: providerId,
        status: 'paid',
        payoutStatus: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$providerAmount" }
      }
    }
  ]);

  return {
    ...baseResult,
    pendingPayouts,
    pendingAmount: pendingAmount[0]?.total || 0,
    completedPayouts,
    completedAmount: completedAmount[0]?.total || 0
  };
};

paymentSchema.statics.getProviderDashboardStats = async function(providerId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);

  const [allTime, todayStats, weekStats, monthStats, yearStats, pendingPayouts, refunded] = await Promise.all([
    this.aggregate([
      { $match: { provider: providerId, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 }, net: { $sum: "$providerAmount" } } }
    ]),
    this.aggregate([
      { $match: { provider: providerId, status: "paid", paidAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { provider: providerId, status: "paid", paidAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { provider: providerId, status: "paid", paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { provider: providerId, status: "paid", paidAt: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]),
    this.countDocuments({ 
      provider: providerId, 
      status: "paid", 
      payoutStatus: "pending" 
    }),
    this.aggregate([
      { $match: { provider: providerId, status: "refunded" } },
      { $group: { _id: null, total: { $sum: "$refundAmount" }, count: { $sum: 1 } } }
    ])
  ]);

  return {
    allTime: allTime[0] || { total: 0, count: 0, net: 0 },
    today: todayStats[0] || { total: 0, count: 0 },
    week: weekStats[0] || { total: 0, count: 0 },
    month: monthStats[0] || { total: 0, count: 0 },
    year: yearStats[0] || { total: 0, count: 0 },
    pendingPayouts,
    refunded: refunded[0] || { total: 0, count: 0 }
  };
};

paymentSchema.statics.getTravelerPayments = async function(travelerId, options = {}) {
  const { limit = 50, page = 1, status = null } = options;
  
  const filter = { traveler: travelerId };
  if (status && status !== 'all') {
    filter.status = status;
  }
  
  const skip = (page - 1) * limit;
  
  const [payments, total] = await Promise.all([
    this.find(filter)
      .populate('booking', 'bookingNumber startDate endDate status')
      .populate('listing', 'title location images')
      .populate('provider', 'name email avatar businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter)
  ]);
  
  return {
    payments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

paymentSchema.statics.getProviderPayments = async function(providerId, options = {}) {
  const { limit = 50, page = 1, status = null } = options;
  
  const filter = { provider: providerId };
  if (status && status !== 'all') {
    filter.status = status;
  }
  
  const skip = (page - 1) * limit;
  
  const [payments, total] = await Promise.all([
    this.find(filter)
      .populate('booking', 'bookingNumber startDate endDate status')
      .populate('traveler', 'name email avatar')
      .populate('listing', 'title location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter)
  ]);
  
  return {
    payments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

paymentSchema.statics.findBySessionId = async function(sessionId) {
  return this.findOne({ stripeSessionId: sessionId });
};

paymentSchema.statics.findByTransactionId = async function(transactionId) {
  return this.findOne({ transactionId });
};

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;