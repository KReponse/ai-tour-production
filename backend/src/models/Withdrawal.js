// backend/src/models/Withdrawal.js

import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Withdrawal Model
 *
 * Purpose:
 * - Stores provider withdrawal requests.
 * - Prevents invalid state transitions.
 * - Keeps withdrawal accounting separate from Earning records.
 * - Supports bank, mobile money and PayPal withdrawals.
 *
 * IMPORTANT:
 * Withdrawal status is intentionally:
 *
 * pending
 *   ↓
 * approved
 *   ↓
 * paid
 *
 * Rejection can happen from pending or approved.
 *
 * We do NOT mark all provider earnings as "withdrawn" here.
 * A withdrawal is a separate financial transaction.
 */

const WITHDRAWAL_STATUSES = [
  "pending",
  "approved",
  "paid",
  "rejected",
];

const WITHDRAWAL_METHODS = [
  "bank",
  "mobile_money",
  "paypal",
];

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "RWF",
];

const withdrawalSchema = new Schema(
  {
    /**
     * Provider who requested the withdrawal.
     */
    provider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Provider is required"],
      index: true,
    },

    /**
     * Withdrawal amount requested by provider.
     *
     * This is the gross withdrawal amount before withdrawal fee.
     */
    amount: {
      type: Number,
      required: [true, "Withdrawal amount is required"],
      min: [0.01, "Withdrawal amount must be greater than 0"],
    },

    /**
     * Currency of the withdrawal.
     *
     * IMPORTANT:
     * The earning/withdrawal layer should not silently mix currencies.
     * Controller/service should ensure the provider withdraws from
     * an appropriate currency balance.
     */
    currency: {
      type: String,
      enum: CURRENCIES,
      default: "RWF",
      uppercase: true,
      trim: true,
      index: true,
    },

    /**
     * Withdrawal method.
     */
    method: {
      type: String,
      enum: {
        values: WITHDRAWAL_METHODS,
        message: "Invalid withdrawal method",
      },
      required: [true, "Withdrawal method is required"],
      lowercase: true,
      trim: true,
      index: true,
    },

    /**
     * Destination account information.
     *
     * MVP:
     * stored as a protected string.
     *
     * Production upgrade later:
     * encrypt sensitive payout information at application level.
     */
    accountDetails: {
      type: String,
      required: [true, "Account details are required"],
      trim: true,
      minlength: [2, "Account details are too short"],
      maxlength: [1000, "Account details are too long"],
      select: false,
    },

    /**
     * Current withdrawal state.
     */
    status: {
      type: String,
      enum: {
        values: WITHDRAWAL_STATUSES,
        message: "Invalid withdrawal status",
      },
      default: "pending",
      lowercase: true,
      trim: true,
      index: true,
    },

    /**
     * Admin note.
     *
     * Kept singular for compatibility with the existing frontend/controller.
     */
    adminNote: {
      type: String,
      trim: true,
      maxlength: [2000, "Admin note is too long"],
      default: null,
    },

    /**
     * Reason why a withdrawal was rejected.
     */
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [2000, "Rejection reason is too long"],
      default: null,
    },

    /**
     * Date the withdrawal was actually paid.
     */
    paidAt: {
      type: Date,
      default: null,
    },

    /**
     * Human-readable unique withdrawal reference.
     *
     * Example:
     * WDR-20260909-ABC12345
     */
    reference: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    /**
     * External payment provider transaction reference.
     *
     * Example:
     * Mobile money transaction ID
     * Bank transfer reference
     * PayPal payout ID
     */
    transactionReference: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    /**
     * Withdrawal processing fee.
     *
     * MVP default = 0.
     */
    fee: {
      type: Number,
      min: [0, "Withdrawal fee cannot be negative"],
      default: 0,
    },

    /**
     * Actual amount provider receives after withdrawal fee.
     */
    netAmount: {
      type: Number,
      min: [0, "Net withdrawal amount cannot be negative"],
      default: 0,
    },

    /**
     * Admin/user who processed the withdrawal.
     */
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /**
     * Last processing timestamp.
     */
    processedAt: {
      type: Date,
      default: null,
    },

    /**
     * External provider data.
     *
     * Useful for Stripe, PayPal, bank or mobile-money metadata.
     */
    providerData: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },

    /**
     * Internal metadata.
     */
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,

    /**
     * Prevent accidental unknown fields from silently entering
     * the financial document.
     */
    strict: true,

    /**
     * Keep virtuals in API responses.
     */
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.accountDetails;
        delete ret.__v;
        return ret;
      },
    },

    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.accountDetails;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/* =========================================================
   INDEXES
========================================================= */

/**
 * Provider withdrawal history.
 */
withdrawalSchema.index({
  provider: 1,
  createdAt: -1,
});

/**
 * Provider + status.
 */
withdrawalSchema.index({
  provider: 1,
  status: 1,
  createdAt: -1,
});

/**
 * Admin pending/approved queue.
 */
withdrawalSchema.index({
  status: 1,
  createdAt: -1,
});

/**
 * Currency-aware provider queries.
 */
withdrawalSchema.index({
  provider: 1,
  currency: 1,
  status: 1,
  createdAt: -1,
});

/**
 * Payment transaction lookup.
 */
withdrawalSchema.index({
  transactionReference: 1,
});

/* =========================================================
   VIRTUALS
========================================================= */

/**
 * Is withdrawal waiting for admin action?
 */
withdrawalSchema.virtual("isPending").get(function () {
  return this.status === "pending";
});

/**
 * Has admin approved this withdrawal?
 */
withdrawalSchema.virtual("isApproved").get(function () {
  return this.status === "approved";
});

/**
 * Has provider actually been paid?
 */
withdrawalSchema.virtual("isPaid").get(function () {
  return this.status === "paid";
});

/**
 * Was withdrawal rejected?
 */
withdrawalSchema.virtual("isRejected").get(function () {
  return this.status === "rejected";
});

/**
 * Can this withdrawal still be processed?
 *
 * Only pending or approved withdrawals can move forward.
 */
withdrawalSchema.virtual("canBeProcessed").get(function () {
  return this.status === "pending" || this.status === "approved";
});

/**
 * Amount provider receives after fee.
 */
withdrawalSchema.virtual("calculatedNetAmount").get(function () {
  const amount = Number(this.amount || 0);
  const fee = Number(this.fee || 0);

  return Math.max(0, amount - fee);
});

/* =========================================================
   INSTANCE METHODS
========================================================= */

/**
 * Generate a unique human-readable reference.
 */
withdrawalSchema.methods.generateReference = function () {
  const date = new Date();

  const datePart =
    `${date.getFullYear()}` +
    `${String(date.getMonth() + 1).padStart(2, "0")}` +
    `${String(date.getDate()).padStart(2, "0")}`;

  const randomPart = Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase();

  return `WDR-${datePart}-${randomPart}`;
};

/**
 * Approve withdrawal.
 *
 * Allowed:
 * pending → approved
 */
withdrawalSchema.methods.approve = async function (adminId, note = null) {
  if (this.status !== "pending") {
    throw new Error(
      `Withdrawal cannot be approved from status "${this.status}"`
    );
  }

  this.status = "approved";

  if (adminId) {
    this.processedBy = adminId;
  }

  this.processedAt = new Date();

  if (note) {
    this.adminNote = String(note).trim();
  }

  return this.save();
};

/**
 * Mark withdrawal as paid.
 *
 * Allowed:
 * approved → paid
 *
 * We intentionally do not allow:
 * pending → paid
 *
 * This ensures admin approval exists before actual payout.
 */
withdrawalSchema.methods.markAsPaid = async function (
  transactionReference = null
) {
  if (this.status !== "approved") {
    throw new Error(
      `Withdrawal must be approved before payment. Current status: "${this.status}"`
    );
  }

  if (this.paidAt) {
    throw new Error("Withdrawal has already been paid");
  }

  this.status = "paid";
  this.paidAt = new Date();

  if (transactionReference) {
    this.transactionReference = String(transactionReference).trim();
  }

  this.processedAt = new Date();

  return this.save();
};

/**
 * Reject withdrawal.
 *
 * Allowed:
 * pending → rejected
 * approved → rejected
 */
withdrawalSchema.methods.reject = async function (
  adminId,
  reason
) {
  if (!["pending", "approved"].includes(this.status)) {
    throw new Error(
      `Withdrawal cannot be rejected from status "${this.status}"`
    );
  }

  const cleanReason = String(reason || "").trim();

  if (!cleanReason) {
    throw new Error("Rejection reason is required");
  }

  this.status = "rejected";
  this.rejectionReason = cleanReason;

  if (adminId) {
    this.processedBy = adminId;
  }

  this.processedAt = new Date();

  return this.save();
};

/**
 * Backward-compatible processing helper.
 *
 * For existing code that calls:
 *
 * withdrawal.process(adminId, reference)
 *
 * this now means:
 * 1. approve pending withdrawal
 * 2. mark it paid
 *
 * For a production admin workflow, preferably call approve()
 * and markAsPaid() separately.
 */
withdrawalSchema.methods.process = async function (
  adminId,
  transactionReference = null
) {
  if (this.status === "pending") {
    await this.approve(adminId);
  }

  if (this.status !== "approved") {
    throw new Error(
      `Withdrawal cannot be processed from status "${this.status}"`
    );
  }

  if (transactionReference) {
    this.transactionReference = String(transactionReference).trim();
  }

  return this.markAsPaid(this.transactionReference);
};

/**
 * Add/update admin note.
 */
withdrawalSchema.methods.addAdminNote = async function (note) {
  const cleanNote = String(note || "").trim();

  if (!cleanNote) {
    throw new Error("Admin note cannot be empty");
  }

  this.adminNote = cleanNote;

  return this.save();
};

/* =========================================================
   STATIC METHODS
========================================================= */

/**
 * Generate a unique withdrawal reference.
 *
 * The database unique index remains the final protection against
 * collisions. If a generated reference somehow already exists,
 * generate another one.
 */
withdrawalSchema.statics.generateReference = async function () {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = new this().generateReference();

    const exists = await this.exists({ reference });

    if (!exists) {
      return reference;
    }
  }

  throw new Error(
    "Unable to generate a unique withdrawal reference"
  );
};

/**
 * Get pending withdrawals.
 */
withdrawalSchema.statics.getPendingWithdrawals = function (
  options = {}
) {
  const {
    limit = 50,
    skip = 0,
  } = options;

  return this.find({
    status: "pending",
  })
    .sort({ createdAt: 1 })
    .skip(Math.max(0, Number(skip)))
    .limit(Math.min(100, Math.max(1, Number(limit))))
    .populate("provider", "name email");
};

/**
 * Get provider withdrawals.
 */
withdrawalSchema.statics.getProviderWithdrawals = function (
  providerId,
  options = {}
) {
  const {
    status,
    currency,
    limit = 50,
    skip = 0,
  } = options;

  const query = {
    provider: providerId,
  };

  if (status) {
    query.status = status;
  }

  if (currency) {
    query.currency = String(currency).toUpperCase();
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(Math.max(0, Number(skip)))
    .limit(Math.min(100, Math.max(1, Number(limit))));
};

/**
 * Get provider withdrawal summary.
 *
 * IMPORTANT:
 * "withdrawn" means PAID only.
 *
 * Approved withdrawals are reserved funds,
 * but they are NOT withdrawn yet.
 */
withdrawalSchema.statics.getProviderWithdrawalSummary = async function (
  providerId,
  currency = null
) {
  const match = {
    provider: new mongoose.Types.ObjectId(providerId),
  };

  if (currency) {
    match.currency = String(currency).toUpperCase();
  }

  const rows = await this.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: "$status",

        amount: {
          $sum: "$amount",
        },

        netAmount: {
          $sum: "$netAmount",
        },

        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const summary = {
    pendingAmount: 0,
    pendingCount: 0,

    approvedAmount: 0,
    approvedCount: 0,

    paidAmount: 0,
    paidNetAmount: 0,
    paidCount: 0,

    rejectedAmount: 0,
    rejectedCount: 0,

    totalRequestedAmount: 0,
    totalPaidAmount: 0,
  };

  for (const row of rows) {
    switch (row._id) {
      case "pending":
        summary.pendingAmount = row.amount;
        summary.pendingCount = row.count;
        break;

      case "approved":
        summary.approvedAmount = row.amount;
        summary.approvedCount = row.count;
        break;

      case "paid":
        summary.paidAmount = row.amount;
        summary.paidNetAmount = row.netAmount;
        summary.paidCount = row.count;
        break;

      case "rejected":
        summary.rejectedAmount = row.amount;
        summary.rejectedCount = row.count;
        break;

      default:
        break;
    }
  }

  summary.totalRequestedAmount =
    summary.pendingAmount +
    summary.approvedAmount +
    summary.paidAmount;

  summary.totalPaidAmount = summary.paidNetAmount;

  /**
   * Reserved funds are pending + approved.
   */
  summary.reservedAmount =
    summary.pendingAmount +
    summary.approvedAmount;

  summary.reservedCount =
    summary.pendingCount +
    summary.approvedCount;

  return summary;
};

/**
 * Get pending/approved reserved withdrawal amount.
 *
 * This is important when calculating a provider's withdrawable balance.
 */
withdrawalSchema.statics.getProviderReservedAmount = async function (
  providerId,
  currency = null
) {
  const match = {
    provider: new mongoose.Types.ObjectId(providerId),
    status: {
      $in: ["pending", "approved"],
    },
  };

  if (currency) {
    match.currency = String(currency).toUpperCase();
  }

  const result = await this.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: null,
        amount: {
          $sum: "$amount",
        },
      },
    },
  ]);

  return result[0]?.amount || 0;
};

/**
 * Get total amount actually paid out.
 */
withdrawalSchema.statics.getProviderPaidAmount = async function (
  providerId,
  currency = null
) {
  const match = {
    provider: new mongoose.Types.ObjectId(providerId),
    status: "paid",
  };

  if (currency) {
    match.currency = String(currency).toUpperCase();
  }

  const result = await this.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: null,
        amount: {
          $sum: "$amount",
        },
        netAmount: {
          $sum: "$netAmount",
        },
      },
    },
  ]);

  return {
    amount: result[0]?.amount || 0,
    netAmount: result[0]?.netAmount || 0,
  };
};

/**
 * Admin dashboard statistics.
 */
withdrawalSchema.statics.getAdminStats = async function () {
  const rows = await this.aggregate([
    {
      $group: {
        _id: "$status",

        amount: {
          $sum: "$amount",
        },

        netAmount: {
          $sum: "$netAmount",
        },

        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const stats = {
    pending: {
      count: 0,
      amount: 0,
    },

    approved: {
      count: 0,
      amount: 0,
    },

    paid: {
      count: 0,
      amount: 0,
      netAmount: 0,
    },

    rejected: {
      count: 0,
      amount: 0,
    },

    totalRequested: 0,
    totalPaid: 0,
    totalReserved: 0,
  };

  for (const row of rows) {
    if (row._id === "pending") {
      stats.pending.count = row.count;
      stats.pending.amount = row.amount;
    }

    if (row._id === "approved") {
      stats.approved.count = row.count;
      stats.approved.amount = row.amount;
    }

    if (row._id === "paid") {
      stats.paid.count = row.count;
      stats.paid.amount = row.amount;
      stats.paid.netAmount = row.netAmount;
    }

    if (row._id === "rejected") {
      stats.rejected.count = row.count;
      stats.rejected.amount = row.amount;
    }
  }

  stats.totalRequested =
    stats.pending.amount +
    stats.approved.amount +
    stats.paid.amount;

  stats.totalPaid = stats.paid.netAmount;

  stats.totalReserved =
    stats.pending.amount +
    stats.approved.amount;

  return stats;
};

/**
 * Get withdrawals between two dates.
 */
withdrawalSchema.statics.getByDateRange = function (
  startDate,
  endDate,
  options = {}
) {
  const {
    providerId,
    status,
    currency,
    limit = 100,
    skip = 0,
  } = options;

  const query = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  if (providerId) {
    query.provider = providerId;
  }

  if (status) {
    query.status = status;
  }

  if (currency) {
    query.currency = String(currency).toUpperCase();
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(Math.max(0, Number(skip)))
    .limit(Math.min(500, Math.max(1, Number(limit))))
    .populate("provider", "name email");
};

/* =========================================================
   VALIDATION
========================================================= */

/**
 * Validate business rules before validation/save.
 *
 * NOTE:
 * Mongoose's normal validation runs before save middleware.
 * Therefore these checks are also useful as explicit application
 * safeguards when values are changed and saved. 
 */
withdrawalSchema.pre("validate", function (next) {
  const amount = Number(this.amount || 0);
  const fee = Number(this.fee || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return next(
      new Error("Withdrawal amount must be greater than 0")
    );
  }

  if (!Number.isFinite(fee) || fee < 0) {
    return next(
      new Error("Withdrawal fee cannot be negative")
    );
  }

  if (fee > amount) {
    return next(
      new Error("Withdrawal fee cannot exceed withdrawal amount")
    );
  }

  this.netAmount = Number((amount - fee).toFixed(2));

  return next();
});

/**
 * Generate reference and enforce state-specific fields.
 */
withdrawalSchema.pre("save", async function (next) {
  try {
    /**
     * Generate reference only when needed.
     */
    if (!this.reference) {
      this.reference = await this.constructor.generateReference();
    }

    /**
     * Normalize currency.
     */
    if (this.currency) {
      this.currency = String(this.currency).toUpperCase();
    }

    /**
     * Normalize method/status.
     */
    if (this.method) {
      this.method = String(this.method).toLowerCase();
    }

    if (this.status) {
      this.status = String(this.status).toLowerCase();
    }

    /**
     * A paid withdrawal must have paidAt.
     */
    if (this.status === "paid" && !this.paidAt) {
      this.paidAt = new Date();
    }

    /**
     * A rejected withdrawal should have a rejection reason.
     *
     * We do not throw here if an old record is being loaded/updated
     * without changing status, but new transitions through reject()
     * always provide one.
     */
    if (
      this.isModified("status") &&
      this.status === "rejected" &&
      !String(this.rejectionReason || "").trim()
    ) {
      return next(
        new Error("Rejection reason is required for rejected withdrawals")
      );
    }

    /**
     * A paid withdrawal cannot later have its payment timestamp removed.
     */
    if (
      !this.isNew &&
      this.isModified("status") &&
      this.status !== "paid" &&
      this.paidAt
    ) {
      return next(
        new Error("A paid withdrawal cannot move back to another status")
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

/* =========================================================
   MODEL EXPORT
========================================================= */

const Withdrawal =
  mongoose.models.Withdrawal ||
  mongoose.model("Withdrawal", withdrawalSchema);

export default Withdrawal;

/**
 * Named constants for controllers/services.
 */
export {
  WITHDRAWAL_STATUSES,
  WITHDRAWAL_METHODS,
  CURRENCIES,
};

