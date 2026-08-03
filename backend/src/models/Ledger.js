// backend/src/models/Ledger.js
// ✅ COMPLETE FIXED - Removed duplicate indexes

import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema(
  {
    // =========================
    // IDENTIFIERS
    // =========================
    transactionId: {
      type: String,
      required: true,
      unique: true,
      default: () => `LED-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      // ✅ REMOVED: index: true - defined below
    },

    // =========================
    // ENTITY REFERENCES
    // =========================
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      // ✅ REMOVED: index: true - defined below
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      // ✅ REMOVED: index: true - defined below
    },

    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // ✅ REMOVED: index: true - defined below
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // ✅ REMOVED: index: true - defined below
    },

    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      // ✅ REMOVED: index: true - defined below
    },

    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
      // ✅ REMOVED: index: true - defined below
    },

    // =========================
    // ACCOUNTING INFORMATION
    // =========================
    debitAccount: {
      type: String,
      required: true,
      enum: [
        'ASSET_CASH', 'ASSET_BANK', 'ASSET_STRIPE', 'ASSET_MOMO', 'ASSET_AIRTEL',
        'REVENUE_PLATFORM_FEE', 'REVENUE_PROVIDER_EARNING',
        'LIABILITY_SETTLEMENT_PAYABLE', 'LIABILITY_REFUND_PAYABLE', 'LIABILITY_WITHDRAWAL_PENDING',
        'EQUITY_RETAINED_EARNINGS',
        'EXPENSE_PROVIDER_PAYOUT', 'EXPENSE_REFUND', 'EXPENSE_CHARGEBACK', 'EXPENSE_PLATFORM_OPERATING',
        'CONTROL_SUSPENSE', 'CONTROL_RECONCILIATION',
        'INCOME_PROVIDER', 'INCOME_PLATFORM',
      ],
    },

    creditAccount: {
      type: String,
      required: true,
      enum: [
        'ASSET_CASH', 'ASSET_BANK', 'ASSET_STRIPE', 'ASSET_MOMO', 'ASSET_AIRTEL',
        'REVENUE_PLATFORM_FEE', 'REVENUE_PROVIDER_EARNING',
        'LIABILITY_SETTLEMENT_PAYABLE', 'LIABILITY_REFUND_PAYABLE', 'LIABILITY_WITHDRAWAL_PENDING',
        'EQUITY_RETAINED_EARNINGS',
        'EXPENSE_PROVIDER_PAYOUT', 'EXPENSE_REFUND', 'EXPENSE_CHARGEBACK', 'EXPENSE_PLATFORM_OPERATING',
        'CONTROL_SUSPENSE', 'CONTROL_RECONCILIATION',
        'INCOME_PROVIDER', 'INCOME_PLATFORM',
      ],
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
      default: "RWF",
      enum: ["RWF", "USD", "EUR", "GBP"],
    },

    exchangeRateUsed: {
      type: Number,
      default: 1,
      min: 0,
    },

    originalAmount: {
      type: Number,
      min: 0,
    },

    convertedAmount: {
      type: Number,
      min: 0,
    },

    // =========================
    // TRANSACTION TYPE
    // =========================
    transactionType: {
      type: String,
      required: true,
      enum: [
        'PAYMENT_CAPTURED', 'PLATFORM_COMMISSION', 'PROVIDER_EARNING',
        'SETTLEMENT_RELEASED', 'SETTLEMENT_COMPLETED',
        'REFUND_INITIATED', 'REFUND_PROCESSED', 'REFUND_REVERSAL',
        'WITHDRAWAL_REQUESTED', 'WITHDRAWAL_PROCESSED', 'WITHDRAWAL_REVERSAL',
        'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT', 'ADJUSTMENT_REVERSAL',
        'CHARGEBACK_RECEIVED', 'CHARGEBACK_RESOLVED',
        'RECONCILIATION_ENTRY', 'RECONCILIATION_REVERSAL',
      ],
      // ✅ REMOVED: index: true - defined below
    },

    // =========================
    // STATUS
    // =========================
    status: {
      type: String,
      enum: ['pending', 'posted', 'reversed', 'failed', 'cancelled'],
      default: 'posted',
      // ✅ REMOVED: index: true - defined below
    },

    // =========================
    // REVERSAL TRACKING
    // =========================
    reversingEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ledger",
      // ✅ REMOVED: index: true - defined below
    },

    reversedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ledger",
      // ✅ REMOVED: index: true - defined below
    },

    isReversal: {
      type: Boolean,
      default: false,
    },

    reversalReason: {
      type: String,
      trim: true,
    },

    // =========================
    // METADATA
    // =========================
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    reference: {
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
      // ✅ REMOVED: index: true - defined below
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },

    // =========================
    // SOURCE SYSTEM
    // =========================
    source: {
      type: String,
      enum: ['payment', 'settlement', 'refund', 'withdrawal', 'admin', 'webhook', 'cron', 'system'],
      default: 'system',
    },

    // =========================
    // JOURNAL ENTRY
    // =========================
    journalEntryId: {
      type: String,
      // ✅ REMOVED: index: true - defined below
    },

    isJournalEntry: {
      type: Boolean,
      default: false,
    },

    journalType: {
      type: String,
      enum: ['single', 'compound'],
      default: 'single',
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// ✅ SINGLE SOURCE OF TRUTH FOR INDEXES
// =========================
// All indexes defined here - NO index:true in field definitions
// Fields with unique: true already create indexes automatically

// =========================
// ✅ SINGLE FIELD INDEXES
// =========================
ledgerSchema.index({ transactionId: 1 });
ledgerSchema.index({ paymentId: 1 });
ledgerSchema.index({ bookingId: 1 });
ledgerSchema.index({ travelerId: 1 });
ledgerSchema.index({ providerId: 1 });
ledgerSchema.index({ walletId: 1 });
ledgerSchema.index({ settlementId: 1 });
ledgerSchema.index({ status: 1 });
ledgerSchema.index({ transactionType: 1 });
ledgerSchema.index({ reversingEntryId: 1 });
ledgerSchema.index({ reversedById: 1 });
ledgerSchema.index({ createdBy: 1 });
ledgerSchema.index({ journalEntryId: 1 });

// =========================
// ✅ COMPOUND INDEXES
// =========================
ledgerSchema.index({ status: 1, createdAt: -1 });
ledgerSchema.index({ transactionType: 1, createdAt: -1 });
ledgerSchema.index({ debitAccount: 1, creditAccount: 1 });
ledgerSchema.index({ providerId: 1, status: 1, createdAt: -1 });
ledgerSchema.index({ travelerId: 1, status: 1, createdAt: -1 });
ledgerSchema.index({ transactionType: 1, status: 1, createdAt: -1 });
ledgerSchema.index({ providerId: 1, transactionType: 1, createdAt: -1 });

// ... rest of file remains the same (virtuals, methods, etc.)

const Ledger = mongoose.model("Ledger", ledgerSchema);
export default Ledger;