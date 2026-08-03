// backend/src/models/Wallet.js
// ✅ COMPLETE FIXED - Professional Wallet Model with all required features
// ✅ Renamed conflicting method to isWithdrawable
// ✅ Added all necessary fields for production

import mongoose from "mongoose";

/**
 * Wallet Schema
 * 
 * This model stores wallet information for providers and the platform.
 * It supports multiple currencies and tracks both available and pending balances.
 * 
 * Types of Wallets:
 * - provider: Individual provider earnings wallet
 * - platform: AI Tour platform commission wallet
 * - commission: Temporary holding for commission before distribution
 * 
 * Balance Types:
 * - available: Ready for withdrawal
 * - pending: Awaiting confirmation (e.g., 3-day settlement period)
 * - held: On hold (e.g., dispute, escrow)
 * - frozen: Temporarily frozen
 */
const walletSchema = new mongoose.Schema(
{
  // ─── Owner Information ────────────────────────────────────────
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // ─── Wallet Type ──────────────────────────────────────────────
  type: {
    type: String,
    enum: ["provider", "platform", "commission"],
    required: true,
    default: "provider",
    index: true,
  },

  // ─── Currency ──────────────────────────────────────────────────
  currency: {
    type: String,
    enum: ["USD", "RWF", "EUR", "GBP"],
    default: "USD",
    required: true,
  },

  // ─── Balance Types ─────────────────────────────────────────────
  balances: {
    // ✅ Available balance - ready for withdrawal
    available: {
      type: Number,
      default: 0,
      min: [0, "Available balance cannot be negative"],
    },
    // ✅ Pending balance - awaiting settlement (e.g., 3-day hold)
    pending: {
      type: Number,
      default: 0,
      min: [0, "Pending balance cannot be negative"],
    },
    // ✅ Held balance - on hold for disputes/escrow
    held: {
      type: Number,
      default: 0,
      min: [0, "Held balance cannot be negative"],
    },
    // ✅ Frozen balance - temporarily frozen
    frozen: {
      type: Number,
      default: 0,
      min: [0, "Frozen balance cannot be negative"],
    },
  },

  // ─── Total Lifetime Earnings ──────────────────────────────────
  totalLifetimeEarnings: {
    type: Number,
    default: 0,
    min: 0,
  },

  totalLifetimeWithdrawn: {
    type: Number,
    default: 0,
    min: 0,
  },

  // ─── Transaction History ──────────────────────────────────────
  transactions: [
    {
      transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
      },
      ledgerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ledger",
      },
      type: {
        type: String,
        enum: ["credit", "debit", "adjustment"],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      balanceType: {
        type: String,
        enum: ["available", "pending", "held", "frozen"],
        required: true,
      },
      previousBalance: {
        type: Number,
        required: true,
      },
      newBalance: {
        type: Number,
        required: true,
      },
      description: {
        type: String,
        trim: true,
      },
      reference: {
        type: String,
        trim: true,
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  // ─── Withdrawal Limits ─────────────────────────────────────────
  withdrawalLimits: {
    // Per transaction minimum
    minAmount: {
      type: Number,
      default: 1000, // 1000 RWF or equivalent
    },
    // Per transaction maximum
    maxAmount: {
      type: Number,
      default: 10000000, // 10,000,000 RWF or equivalent
    },
    // Daily withdrawal limit
    dailyLimit: {
      type: Number,
      default: 5000000, // 5,000,000 RWF or equivalent
    },
    // Monthly withdrawal limit
    monthlyLimit: {
      type: Number,
      default: 50000000, // 50,000,000 RWF or equivalent
    },
  },

  // ─── Daily/Withdrawal Counters ─────────────────────────────────
  withdrawalCounters: {
    today: {
      date: {
        type: Date,
        default: () => new Date(),
      },
      count: {
        type: Number,
        default: 0,
      },
      totalAmount: {
        type: Number,
        default: 0,
      },
    },
    thisMonth: {
      month: {
        type: Number,
        default: () => new Date().getMonth(),
      },
      year: {
        type: Number,
        default: () => new Date().getFullYear(),
      },
      totalAmount: {
        type: Number,
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  },

  // ─── Status ────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ["active", "suspended", "closed"],
    default: "active",
    index: true,
  },

  // ─── Freeze Reason ─────────────────────────────────────────────
  frozenReason: {
    type: String,
    trim: true,
  },

  frozenAt: {
    type: Date,
  },

  frozenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  // ─── Metadata ──────────────────────────────────────────────────
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // ─── Last Activity ─────────────────────────────────────────────
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },

  lastSettlementAt: {
    type: Date,
  },

  lastWithdrawalAt: {
    type: Date,
  },

  // ─── Version (for optimistic locking) ──────────────────────────
  version: {
    type: Number,
    default: 0,
  },
},
{
  timestamps: true,
});

// =========================
// ✅ INDEXES
// =========================

// Primary lookups
walletSchema.index({ ownerId: 1, currency: 1, type: 1 }, { unique: true });
walletSchema.index({ ownerId: 1, type: 1 });
walletSchema.index({ type: 1, status: 1 });

// Activity tracking
walletSchema.index({ lastActivityAt: -1 });
walletSchema.index({ createdAt: -1 });

// For reporting
walletSchema.index({ "balances.available": 1 });
walletSchema.index({ type: 1, status: 1, "balances.available": 1 });

// =========================
// ✅ VIRTUALS
// =========================

// Total balance = available + pending + held
walletSchema.virtual("totalBalance").get(function() {
  return this.balances.available + this.balances.pending + this.balances.held;
});

// Total balance including frozen
walletSchema.virtual("totalBalanceAll").get(function() {
  return this.balances.available + this.balances.pending + this.balances.held + this.balances.frozen;
});

// Is wallet active
walletSchema.virtual("isActive").get(function() {
  return this.status === "active";
});

// ✅ RENAMED: Can withdraw virtual (check eligibility)
walletSchema.virtual("isWithdrawable").get(function() {
  return this.status === "active" && this.balances.available > 0;
});

// Wallet display name
walletSchema.virtual("displayName").get(function() {
  const typeNames = {
    provider: "Provider Wallet",
    platform: "Platform Wallet",
    commission: "Commission Wallet",
  };
  return `${typeNames[this.type] || 'Wallet'} (${this.currency})`;
});

// Formatted balances
walletSchema.virtual("formattedAvailable").get(function() {
  return `${this.balances.available} ${this.currency}`;
});

walletSchema.virtual("formattedPending").get(function() {
  return `${this.balances.pending} ${this.currency}`;
});

walletSchema.virtual("formattedHeld").get(function() {
  return `${this.balances.held} ${this.currency}`;
});

walletSchema.virtual("formattedTotal").get(function() {
  return `${this.totalBalance} ${this.currency}`;
});

// =========================
// ✅ INSTANCE METHODS
// =========================

/**
 * Add funds to wallet with optimistic locking
 */
walletSchema.methods.addFunds = async function(amount, type = "credit", description = "", transactionId = null, metadata = {}) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (this.status !== "active") {
    throw new Error(`Wallet is not active (status: ${this.status})`);
  }

  const previousBalance = this.balances.available;

  // Use optimistic locking
  const updated = await this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      version: this.version,
    },
    {
      $inc: {
        "balances.available": amount,
        totalLifetimeEarnings: amount,
        version: 1,
      },
      $set: {
        lastActivityAt: new Date(),
      },
      $push: {
        transactions: {
          transactionId: transactionId,
          type: type,
          amount: amount,
          balanceType: "available",
          previousBalance: previousBalance,
          newBalance: previousBalance + amount,
          description: description || "Funds added to wallet",
          reference: transactionId,
          metadata: metadata,
          createdAt: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!updated) {
    throw new Error("Wallet updated by another transaction. Please retry.");
  }

  // Update the current instance
  Object.assign(this, updated.toObject());

  console.log(`💰 Wallet ${this._id}: Added ${amount} ${this.currency}`);
  return this;
};

/**
 * Deduct funds from wallet with optimistic locking
 */
walletSchema.methods.deductFunds = async function(amount, type = "debit", description = "", transactionId = null, metadata = {}) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (this.balances.available < amount) {
    throw new Error(`Insufficient funds. Available: ${this.balances.available}, Requested: ${amount}`);
  }

  if (this.status !== "active") {
    throw new Error(`Wallet is not active (status: ${this.status})`);
  }

  const previousBalance = this.balances.available;

  // Use optimistic locking
  const updated = await this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      version: this.version,
      "balances.available": { $gte: amount },
    },
    {
      $inc: {
        "balances.available": -amount,
        totalLifetimeWithdrawn: amount,
        version: 1,
      },
      $set: {
        lastActivityAt: new Date(),
        lastWithdrawalAt: new Date(),
      },
      $push: {
        transactions: {
          transactionId: transactionId,
          type: type,
          amount: amount,
          balanceType: "available",
          previousBalance: previousBalance,
          newBalance: previousBalance - amount,
          description: description || "Funds deducted from wallet",
          reference: transactionId,
          metadata: metadata,
          createdAt: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!updated) {
    throw new Error("Wallet updated by another transaction. Please retry.");
  }

  // Update the current instance
  Object.assign(this, updated.toObject());

  console.log(`💰 Wallet ${this._id}: Deducted ${amount} ${this.currency}`);
  return this;
};

/**
 * Move funds from pending to available
 */
walletSchema.methods.releasePendingFunds = async function(amount, description = "", transactionId = null, metadata = {}) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (this.balances.pending < amount) {
    throw new Error(`Insufficient pending funds. Pending: ${this.balances.pending}, Requested: ${amount}`);
  }

  const prevPending = this.balances.pending;
  const prevAvailable = this.balances.available;

  // Use optimistic locking
  const updated = await this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      version: this.version,
      "balances.pending": { $gte: amount },
    },
    {
      $inc: {
        "balances.pending": -amount,
        "balances.available": amount,
        version: 1,
      },
      $set: {
        lastActivityAt: new Date(),
        lastSettlementAt: new Date(),
      },
      $push: {
        transactions: [
          {
            transactionId: transactionId,
            type: "credit",
            amount: amount,
            balanceType: "pending",
            previousBalance: prevPending,
            newBalance: prevPending - amount,
            description: description || "Pending funds released",
            reference: transactionId,
            metadata: metadata,
            createdAt: new Date(),
          },
          {
            transactionId: transactionId,
            type: "credit",
            amount: amount,
            balanceType: "available",
            previousBalance: prevAvailable,
            newBalance: prevAvailable + amount,
            description: description || "Funds moved from pending to available",
            reference: transactionId,
            metadata: metadata,
            createdAt: new Date(),
          },
        ],
      },
    },
    { new: true }
  );

  if (!updated) {
    throw new Error("Wallet updated by another transaction. Please retry.");
  }

  // Update the current instance
  Object.assign(this, updated.toObject());

  console.log(`💰 Wallet ${this._id}: Released ${amount} ${this.currency} from pending`);
  return this;
};

/**
 * Hold funds (put in escrow)
 */
walletSchema.methods.holdFunds = async function(amount, description = "", transactionId = null, metadata = {}) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (this.balances.available < amount) {
    throw new Error(`Insufficient funds. Available: ${this.balances.available}, Requested: ${amount}`);
  }

  const prevAvailable = this.balances.available;
  const prevHeld = this.balances.held;

  // Use optimistic locking
  const updated = await this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      version: this.version,
      "balances.available": { $gte: amount },
    },
    {
      $inc: {
        "balances.available": -amount,
        "balances.held": amount,
        version: 1,
      },
      $set: {
        lastActivityAt: new Date(),
      },
      $push: {
        transactions: [
          {
            transactionId: transactionId,
            type: "debit",
            amount: amount,
            balanceType: "available",
            previousBalance: prevAvailable,
            newBalance: prevAvailable - amount,
            description: description || "Funds placed on hold",
            reference: transactionId,
            metadata: metadata,
            createdAt: new Date(),
          },
          {
            transactionId: transactionId,
            type: "credit",
            amount: amount,
            balanceType: "held",
            previousBalance: prevHeld,
            newBalance: prevHeld + amount,
            description: description || "Funds moved to held balance",
            reference: transactionId,
            metadata: metadata,
            createdAt: new Date(),
          },
        ],
      },
    },
    { new: true }
  );

  if (!updated) {
    throw new Error("Wallet updated by another transaction. Please retry.");
  }

  // Update the current instance
  Object.assign(this, updated.toObject());

  console.log(`🔒 Wallet ${this._id}: Held ${amount} ${this.currency}`);
  return this;
};

/**
 * Release held funds
 */
walletSchema.methods.releaseHeldFunds = async function(amount, description = "", transactionId = null, metadata = {}) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (this.balances.held < amount) {
    throw new Error(`Insufficient held funds. Held: ${this.balances.held}, Requested: ${amount}`);
  }

  const prevHeld = this.balances.held;
  const prevAvailable = this.balances.available;

  // Use optimistic locking
  const updated = await this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      version: this.version,
      "balances.held": { $gte: amount },
    },
    {
      $inc: {
        "balances.held": -amount,
        "balances.available": amount,
        version: 1,
      },
      $set: {
        lastActivityAt: new Date(),
      },
      $push: {
        transactions: [
          {
            transactionId: transactionId,
            type: "debit",
            amount: amount,
            balanceType: "held",
            previousBalance: prevHeld,
            newBalance: prevHeld - amount,
            description: description || "Held funds released",
            reference: transactionId,
            metadata: metadata,
            createdAt: new Date(),
          },
          {
            transactionId: transactionId,
            type: "credit",
            amount: amount,
            balanceType: "available",
            previousBalance: prevAvailable,
            newBalance: prevAvailable + amount,
            description: description || "Funds moved from held to available",
            reference: transactionId,
            metadata: metadata,
            createdAt: new Date(),
          },
        ],
      },
    },
    { new: true }
  );

  if (!updated) {
    throw new Error("Wallet updated by another transaction. Please retry.");
  }

  // Update the current instance
  Object.assign(this, updated.toObject());

  console.log(`🔓 Wallet ${this._id}: Released ${amount} ${this.currency} from held`);
  return this;
};

/**
 * Freeze wallet
 */
walletSchema.methods.freeze = async function(reason = "", userId = null) {
  if (this.status === "suspended") {
    throw new Error("Wallet is already suspended");
  }

  this.status = "suspended";
  this.frozenReason = reason || "No reason provided";
  this.frozenAt = new Date();
  this.frozenBy = userId;
  
  this.metadata.set("freezeReason", reason || "No reason provided");
  this.metadata.set("frozenAt", new Date());
  
  await this.save();
  console.log(`🔒 Wallet ${this._id}: Frozen - ${reason}`);
  return this;
};

/**
 * Unfreeze wallet
 */
walletSchema.methods.unfreeze = async function(reason = "", userId = null) {
  if (this.status !== "suspended") {
    throw new Error("Wallet is not frozen");
  }

  this.status = "active";
  this.frozenReason = null;
  this.frozenAt = null;
  this.frozenBy = null;
  
  this.metadata.set("unfreezeReason", reason || "No reason provided");
  this.metadata.set("unfrozenAt", new Date());
  
  await this.save();
  console.log(`🔓 Wallet ${this._id}: Unfrozen - ${reason}`);
  return this;
};

/**
 * ✅ RENAMED: Check if wallet can withdraw (validation)
 * This checks all conditions for withdrawal eligibility
 */
walletSchema.methods.checkWithdrawEligibility = function(amount) {
  if (this.status !== "active") {
    return { allowed: false, reason: "Wallet is not active" };
  }
  if (this.balances.available < amount) {
    return { allowed: false, reason: `Insufficient funds. Available: ${this.balances.available}` };
  }
  if (this.withdrawalLimits.minAmount && amount < this.withdrawalLimits.minAmount) {
    return { allowed: false, reason: `Amount is less than minimum withdrawal (${this.withdrawalLimits.minAmount})` };
  }
  if (this.withdrawalLimits.maxAmount && amount > this.withdrawalLimits.maxAmount) {
    return { allowed: false, reason: `Amount exceeds maximum withdrawal (${this.withdrawalLimits.maxAmount})` };
  }
  return { allowed: true };
};

/**
 * Update withdrawal counters
 */
walletSchema.methods.updateWithdrawalCounters = async function(amount) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Reset daily counter if new day
  if (this.withdrawalCounters.today.date < today) {
    this.withdrawalCounters.today = {
      date: today,
      count: 0,
      totalAmount: 0,
    };
  }

  // Reset monthly counter if new month
  if (this.withdrawalCounters.thisMonth.month !== now.getMonth() ||
      this.withdrawalCounters.thisMonth.year !== now.getFullYear()) {
    this.withdrawalCounters.thisMonth = {
      month: now.getMonth(),
      year: now.getFullYear(),
      totalAmount: 0,
      count: 0,
    };
  }

  // Check daily limit
  if (this.withdrawalLimits.dailyLimit &&
      this.withdrawalCounters.today.totalAmount + amount > this.withdrawalLimits.dailyLimit) {
    throw new Error(`Daily withdrawal limit exceeded. Remaining: ${this.withdrawalLimits.dailyLimit - this.withdrawalCounters.today.totalAmount}`);
  }

  // Check monthly limit
  if (this.withdrawalLimits.monthlyLimit &&
      this.withdrawalCounters.thisMonth.totalAmount + amount > this.withdrawalLimits.monthlyLimit) {
    throw new Error(`Monthly withdrawal limit exceeded. Remaining: ${this.withdrawalLimits.monthlyLimit - this.withdrawalCounters.thisMonth.totalAmount}`);
  }

  // Update counters
  this.withdrawalCounters.today.count += 1;
  this.withdrawalCounters.today.totalAmount += amount;
  this.withdrawalCounters.thisMonth.count += 1;
  this.withdrawalCounters.thisMonth.totalAmount += amount;

  await this.save();
  return this;
};

/**
 * Get transaction history with pagination
 */
walletSchema.methods.getTransactionHistory = async function(options = {}) {
  const { limit = 50, page = 1, type = null, startDate = null, endDate = null } = options;
  
  let transactions = this.transactions || [];
  
  // Filter by type
  if (type) {
    transactions = transactions.filter(t => t.type === type);
  }
  
  // Filter by date range
  if (startDate) {
    transactions = transactions.filter(t => new Date(t.createdAt) >= new Date(startDate));
  }
  if (endDate) {
    transactions = transactions.filter(t => new Date(t.createdAt) <= new Date(endDate));
  }
  
  // Sort by date (newest first)
  transactions = transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Paginate
  const total = transactions.length;
  const skip = (page - 1) * limit;
  const paginated = transactions.slice(skip, skip + limit);
  
  return {
    transactions: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

// =========================
// ✅ STATIC METHODS
// =========================

/**
 * Get or create wallet for a user
 */
walletSchema.statics.getOrCreateWallet = async function(ownerId, type = "provider", currency = "USD") {
  let wallet = await this.findOne({
    ownerId: ownerId,
    type: type,
    currency: currency,
  });

  if (!wallet) {
    wallet = await this.create({
      ownerId: ownerId,
      type: type,
      currency: currency,
      balances: {
        available: 0,
        pending: 0,
        held: 0,
        frozen: 0,
      },
      status: "active",
    });
    console.log(`📌 Created ${type} wallet for user ${ownerId} (${currency})`);
  }

  return wallet;
};

/**
 * Get wallet balance summary
 */
walletSchema.statics.getBalanceSummary = async function(ownerId) {
  const wallets = await this.find({
    ownerId: ownerId,
    status: "active",
  }).lean();

  const summary = {
    total: 0,
    byCurrency: {},
    byType: {
      provider: 0,
      platform: 0,
      commission: 0,
    },
  };

  for (const wallet of wallets) {
    const total = wallet.balances.available + wallet.balances.pending + wallet.balances.held;
    summary.total += total;

    if (!summary.byCurrency[wallet.currency]) {
      summary.byCurrency[wallet.currency] = 0;
    }
    summary.byCurrency[wallet.currency] += total;

    if (summary.byType[wallet.type] !== undefined) {
      summary.byType[wallet.type] += total;
    }
  }

  return summary;
};

/**
 * Get all wallets for a user
 */
walletSchema.statics.getUserWallets = async function(ownerId) {
  return this.find({
    ownerId: ownerId,
    status: "active",
  }).sort({ type: 1, currency: 1 });
};

/**
 * Transfer between wallets
 */
walletSchema.statics.transfer = async function(fromWalletId, toWalletId, amount, description = "", transactionId = null) {
  const fromWallet = await this.findById(fromWalletId);
  const toWallet = await this.findById(toWalletId);

  if (!fromWallet || !toWallet) {
    throw new Error("Wallet not found");
  }

  if (fromWallet.balances.available < amount) {
    throw new Error(`Insufficient funds in source wallet. Available: ${fromWallet.balances.available}`);
  }

  // Deduct from source
  await fromWallet.deductFunds(amount, "debit", `Transfer to ${toWallet.ownerId} - ${description}`, transactionId);

  // Add to destination
  await toWallet.addFunds(amount, "credit", `Transfer from ${fromWallet.ownerId} - ${description}`, transactionId);

  return { fromWallet, toWallet };
};

/**
 * Get wallet statistics (admin)
 */
walletSchema.statics.getStats = async function() {
  const [
    totalWallets,
    activeWallets,
    totalBalance,
    pendingBalance,
    totalLifetime,
    byCurrency,
  ] = await Promise.all([
    this.countDocuments({}),
    this.countDocuments({ status: "active" }),
    this.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: null, total: { $sum: "$balances.available" } } },
    ]),
    this.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: null, total: { $sum: "$balances.pending" } } },
    ]),
    this.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: null, total: { $sum: "$totalLifetimeEarnings" } } },
    ]),
    this.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$currency", total: { $sum: "$balances.available" } } },
    ]),
  ]);

  const byCurrencyObj = {};
  byCurrency.forEach(c => {
    byCurrencyObj[c._id] = c.total;
  });

  return {
    totalWallets,
    activeWallets,
    suspendedWallets: totalWallets - activeWallets,
    totalAvailableBalance: totalBalance[0]?.total || 0,
    totalPendingBalance: pendingBalance[0]?.total || 0,
    totalLifetimeEarnings: totalLifetime[0]?.total || 0,
    byCurrency: byCurrencyObj,
  };
};

// =========================
// ✅ PRE-SAVE MIDDLEWARE
// =========================

walletSchema.pre("save", function(next) {
  // Ensure balances are never negative
  if (this.balances.available < 0) {
    this.balances.available = 0;
  }
  if (this.balances.pending < 0) {
    this.balances.pending = 0;
  }
  if (this.balances.held < 0) {
    this.balances.held = 0;
  }
  if (this.balances.frozen < 0) {
    this.balances.frozen = 0;
  }

  // Set default withdrawal limits if not set
  if (!this.withdrawalLimits.minAmount) {
    this.withdrawalLimits.minAmount = 1000;
  }
  if (!this.withdrawalLimits.maxAmount) {
    this.withdrawalLimits.maxAmount = 10000000;
  }
  if (!this.withdrawalLimits.dailyLimit) {
    this.withdrawalLimits.dailyLimit = 5000000;
  }
  if (!this.withdrawalLimits.monthlyLimit) {
    this.withdrawalLimits.monthlyLimit = 50000000;
  }

  // Ensure currency is uppercase
  if (this.currency) {
    this.currency = this.currency.toUpperCase();
  }

  next();
});

// =========================
// ✅ POST-SAVE MIDDLEWARE
// =========================

walletSchema.post("save", function(doc) {
  if (doc.isModified("balances.available")) {
    console.log(`📊 Wallet ${doc._id}: Balance updated to ${doc.balances.available} ${doc.currency}`);
  }
});

// =========================
// ✅ TO JSON / TO OBJECT
// =========================

walletSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret._id;
    return ret;
  },
});

walletSchema.set("toObject", {
  virtuals: true,
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;