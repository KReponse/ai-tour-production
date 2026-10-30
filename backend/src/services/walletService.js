// backend/src/services/walletService.js
// ============================================================
// AI TOUR RWANDA
// FINAL WALLET SERVICE
//
// ARCHITECTURE
//
// Payment
//   ↓
// PaymentService
//   ↓
// SettlementService
//   ↓
// Earning  ← AUTHORITATIVE PROVIDER EARNINGS
//
// WalletService
//   ↓
// Wallet balance mirror / legacy wallet compatibility
//   ↓
// Ledger
//   ↓
// Transaction
//
// MVP POLICY
// - Platform commission = 0%
// - Provider receives 100%
// - WalletService MUST NOT create a platform commission
// - WalletService MUST NOT reverse/refund payments
// - SettlementService remains authoritative for Earning
// - WithdrawalService/SettlementService remains authoritative
//   for provider withdrawal reservations
// ============================================================

import Wallet from "../models/Wallet.js";
import Ledger from "../models/Ledger.js";
import Transaction from "../models/Transaction.js";
import Earning from "../models/Earning.js";
import User from "../models/User.js";

import { createNotification } from "../utils/notificationService.js";

import paymentConfig, {
  formatCurrency,
} from "../config/payment.config.js";

import ledgerService from "./ledgerService.js";

// ============================================================
// CONSTANTS
// ============================================================

const PLATFORM_COMMISSION_PERCENTAGE = 0;

const DEFAULT_CURRENCY = "RWF";

const WITHDRAWAL_METHODS = new Set([
  "bank",
  "bank_transfer",
  "mobile_money",
]);

const WALLET_TRANSACTION_TYPES = Object.freeze({
  PAYMENT: "payment",
  EARNING: "earning",
  SETTLEMENT: "settlement",
  WITHDRAWAL: "withdrawal",
  COMMISSION: "commission",
  TRANSFER: "transfer",
  ADJUSTMENT: "adjustment",
});

// ============================================================
// HELPERS
// ============================================================

function normalizeCurrency(currency) {
  const value = String(
    currency || DEFAULT_CURRENCY
  )
    .trim()
    .toUpperCase();

  return value || DEFAULT_CURRENCY;
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : fallback;
}

function roundMoney(value, decimals = 2) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  const factor = 10 ** decimals;

  return (
    Math.round(
      (numeric + Number.EPSILON) *
        factor
    ) / factor
  );
}

function getId(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    value._id
  ) {
    return value._id;
  }

  return value;
}

function getStringId(value) {
  const id = getId(value);

  return id ? String(id) : null;
}

// ============================================================
// WALLET SERVICE
// ============================================================

class WalletService {
  constructor() {
    // IMPORTANT:
    //
    // Never read a fallback like:
    //
    //   || 10
    //
    // because that could silently reintroduce the old
    // 10% commission.
    //
    this.platformCommission =
      PLATFORM_COMMISSION_PERCENTAGE;

    console.log(
      `💰 Wallet Service initialized (Commission: ${this.platformCommission}%)`
    );
  }

  // ==========================================================
  // COMMISSION
  // ==========================================================

  calculateCommission(amount) {
    const numericAmount =
      toNumber(amount, 0);

    if (numericAmount <= 0) {
      return 0;
    }

    return 0;
  }

  calculateProviderAmount(amount) {
    const numericAmount =
      toNumber(amount, 0);

    if (numericAmount <= 0) {
      return 0;
    }

    return roundMoney(
      numericAmount
    );
  }

  // ==========================================================
  // WALLET CREATION / RETRIEVAL
  // ==========================================================

  async getOrCreateWallet(
    userId,
    type = "provider",
    currency = DEFAULT_CURRENCY
  ) {
    try {
      if (!userId) {
        return {
          success: false,
          error:
            "User ID is required",
        };
      }

      const normalizedCurrency =
        normalizeCurrency(
          currency
        );

      const wallet =
        await Wallet.getOrCreateWallet(
          userId,
          type,
          normalizedCurrency
        );

      return {
        success: true,
        wallet,
      };
    } catch (error) {
      console.error(
        "❌ Get or create wallet error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUserWallets(userId) {
    try {
      const wallets =
        await Wallet.getUserWallets(
          userId
        );

      const summary =
        await Wallet.getBalanceSummary(
          userId
        );

      return {
        success: true,
        wallets,
        summary,
      };
    } catch (error) {
      console.error(
        "❌ Get user wallets error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getWallet(walletId) {
    try {
      const wallet =
        await Wallet.findById(
          walletId
        ).populate(
          "ownerId",
          "name email"
        );

      if (!wallet) {
        return {
          success: false,
          error:
            "Wallet not found",
        };
      }

      return {
        success: true,
        wallet,
      };
    } catch (error) {
      console.error(
        "❌ Get wallet error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // BALANCE
  // ==========================================================

  async getBalance(walletId) {
    try {
      const result =
        await this.getWallet(
          walletId
        );

      if (!result.success) {
        return result;
      }

      const wallet =
        result.wallet;

      return {
        success: true,

        balance: {
          available:
            toNumber(
              wallet.balances?.available
            ),

          pending:
            toNumber(
              wallet.balances?.pending
            ),

          held:
            toNumber(
              wallet.balances?.held
            ),

          frozen:
            toNumber(
              wallet.balances?.frozen
            ),

          total:
            toNumber(
              wallet.totalBalance
            ),
        },

        currency:
          wallet.currency,
      };
    } catch (error) {
      console.error(
        "❌ Get balance error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getProviderBalanceSummary(
    providerId
  ) {
    try {
      const wallets =
        await Wallet.find({
          ownerId: providerId,

          type: {
            $in: [
              "provider",
              "commission",
            ],
          },

          status: "active",
        });

      const summary = {
        totalAvailable: 0,
        totalPending: 0,
        totalHeld: 0,
        totalFrozen: 0,

        byCurrency: {},

        byType: {
          provider: {
            available: 0,
            pending: 0,
          },

          commission: {
            available: 0,
            pending: 0,
          },
        },
      };

      for (const wallet of wallets) {
        const available =
          toNumber(
            wallet.balances?.available
          );

        const pending =
          toNumber(
            wallet.balances?.pending
          );

        const held =
          toNumber(
            wallet.balances?.held
          );

        const frozen =
          toNumber(
            wallet.balances?.frozen
          );

        summary.totalAvailable +=
          available;

        summary.totalPending +=
          pending;

        summary.totalHeld +=
          held;

        summary.totalFrozen +=
          frozen;

        const currency =
          normalizeCurrency(
            wallet.currency
          );

        if (
          !summary.byCurrency[
            currency
          ]
        ) {
          summary.byCurrency[
            currency
          ] = {
            available: 0,
            pending: 0,
            held: 0,
            frozen: 0,
          };
        }

        summary.byCurrency[
          currency
        ].available += available;

        summary.byCurrency[
          currency
        ].pending += pending;

        summary.byCurrency[
          currency
        ].held += held;

        summary.byCurrency[
          currency
        ].frozen += frozen;

        if (
          summary.byType[
            wallet.type
          ]
        ) {
          summary.byType[
            wallet.type
          ].available +=
            available;

          summary.byType[
            wallet.type
          ].pending +=
            pending;
        }
      }

      const recentTransactions =
        await Transaction.find({
          $or: [
            {
              provider:
                providerId,
            },

            {
              recipient:
                providerId,
            },
          ],

          status: {
            $in: [
              "completed",
              "pending",
            ],
          },
        })
          .sort({
            createdAt: -1,
          })
          .limit(10);

      return {
        success: true,
        summary,
        recentTransactions,
      };
    } catch (error) {
      console.error(
        "❌ Get provider balance summary error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // DEPOSIT
  // ==========================================================

  async deposit(
    walletId,
    amount,
    description = "",
    transactionId = null,
    metadata = {}
  ) {
    try {
      const numericAmount =
        roundMoney(amount);

      if (
        numericAmount <= 0
      ) {
        return {
          success: false,
          error:
            "Amount must be greater than 0",
        };
      }

      const wallet =
        await Wallet.findById(
          walletId
        );

      if (!wallet) {
        return {
          success: false,
          error:
            "Wallet not found",
        };
      }

      await wallet.addFunds(
        numericAmount,
        "credit",
        description,
        transactionId
      );

      // Wallet deposit is represented as a cash/asset movement.
      await ledgerService.createEntry({
        walletId:
          wallet._id,

        debitAccount:
          ledgerService
            .LEDGER_ACCOUNTS
            .ASSET_CASH,

        creditAccount:
          ledgerService
            .LEDGER_ACCOUNTS
            .INCOME_PROVIDER,

        amount:
          numericAmount,

        currency:
          wallet.currency,

        transactionType:
          ledgerService
            .TRANSACTION_TYPES
            .ADJUSTMENT_CREDIT,

        description:
          description ||
          "Deposit to wallet",

        reference:
          transactionId,

        metadata,

        source: "wallet",
      });

      const transaction =
        await this.createTransaction({
          type:
            WALLET_TRANSACTION_TYPES.PAYMENT,

          status:
            "completed",

          grossAmount:
            numericAmount,

          netAmount:
            numericAmount,

          initiator:
            wallet.ownerId,

          recipient:
            wallet.ownerId,

          sourceWallet:
            wallet._id,

          destinationWallet:
            wallet._id,

          currency:
            wallet.currency,

          description:
            description ||
            "Deposit to wallet",

          metadata,
        });

      return {
        success: true,
        wallet,
        transaction,

        newBalance:
          wallet.balances
            .available,
      };
    } catch (error) {
      console.error(
        "❌ Deposit error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // PAYMENT CREDIT
  //
  // LEGACY COMPATIBILITY METHOD
  //
  // This method is NOT the source of truth for Earning.
  // SettlementService/Earning handle authoritative earnings.
  //
  // It only mirrors a paid transaction into Wallet.
  // ==========================================================

  async processPaymentCredit(
    booking,
    payment,
    providerId
  ) {
    try {
      if (!booking) {
        throw new Error(
          "Booking is required"
        );
      }

      if (!payment) {
        throw new Error(
          "Payment is required"
        );
      }

      if (!providerId) {
        throw new Error(
          "Provider ID is required"
        );
      }

      const amount =
        roundMoney(
          toNumber(
            payment.providerAmount ??
              payment.amount,
            0
          )
        );

      if (
        amount <= 0
      ) {
        throw new Error(
          "Payment amount must be greater than zero"
        );
      }

      const currency =
        normalizeCurrency(
          payment.currency
        );

      // --------------------------------------------------------
      // MVP: 0% COMMISSION
      // --------------------------------------------------------

      const commission = 0;

      const providerAmount =
        amount;

      // --------------------------------------------------------
      // PROVIDER WALLET
      // --------------------------------------------------------

      const walletResult =
        await this.getOrCreateWallet(
          providerId,
          "provider",
          currency
        );

      if (!walletResult.success) {
        throw new Error(
          "Failed to get provider wallet"
        );
      }

      const providerWallet =
        walletResult.wallet;

      const settlementDays =
        toNumber(
          paymentConfig?.wallet
            ?.settlementDays,
          3
        );

      const pendingAmount =
        providerAmount;

      const previousPending =
        toNumber(
          providerWallet
            .balances
            ?.pending
        );

      providerWallet.balances.pending +=
        pendingAmount;

      providerWallet.lastActivityAt =
        new Date();

      providerWallet.transactions.push({
        transactionId:
          payment._id,

        type:
          "credit",

        amount:
          pendingAmount,

        balanceType:
          "pending",

        previousBalance:
          previousPending,

        newBalance:
          providerWallet
            .balances
            .pending,

        description:
          `Payment for booking ${
            booking.bookingCode ||
            booking._id
          } (wallet pending mirror)`,

        metadata: {
          bookingId:
            getStringId(
              booking._id
            ),

          paymentId:
            getStringId(
              payment._id
            ),

          settlementDays,

          commission: 0,

          providerAmount,

          estimatedSettlement:
            new Date(
              Date.now() +
                settlementDays *
                  24 *
                  60 *
                  60 *
                  1000
            ),
        },

        createdAt:
          new Date(),
      });

      await providerWallet.save();

      // --------------------------------------------------------
      // LEDGER
      //
      // Provider gets 100%. No platform commission entry.
      // --------------------------------------------------------

      if (
        typeof ledgerService.recordPayment ===
        "function"
      ) {
        await ledgerService.recordPayment(
          payment,
          booking,
          payment.user,
          providerId
        );
      }

      // --------------------------------------------------------
      // SINGLE EARNING RECORD
      //
      // Do NOT create another Earning here if one already exists.
      // --------------------------------------------------------

      const earning =
        await Earning.findOne({
          payment:
            payment._id,
        });

      // --------------------------------------------------------
      // TRANSACTION MIRROR
      // --------------------------------------------------------

      const transaction =
        await this.createTransaction({
          type:
            WALLET_TRANSACTION_TYPES.EARNING,

          status:
            "pending",

          grossAmount:
            amount,

          netAmount:
            providerAmount,

          fees: {
            platformFee: 0,
          },

          initiator:
            payment.user,

          recipient:
            providerId,

          provider:
            providerId,

          customer:
            payment.user,

          booking:
            booking._id,

          payment:
            payment._id,

          sourceWallet:
            null,

          destinationWallet:
            providerWallet._id,

          earning:
            earning?._id ||
            null,

          currency,

          description:
            `Provider earning mirror for booking ${
              booking.bookingCode ||
              booking._id
            }`,

          metadata: {
            commission: 0,

            settlementDays,

            source:
              "wallet_compatibility_layer",
          },
        });

      return {
        success: true,

        providerWallet,

        providerAmount,

        commission: 0,

        pendingAmount,

        settlementDays,

        estimatedSettlement:
          new Date(
            Date.now() +
              settlementDays *
                24 *
                60 *
                60 *
                1000
          ),

        earning:
          earning || null,

        transaction,
      };
    } catch (error) {
      console.error(
        "❌ Process payment credit error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // RELEASE PENDING FUNDS
  //
  // Compatibility method for existing settlement queue.
  //
  // Earning is authoritative and is NOT recreated here.
  // ==========================================================

  async releasePendingFunds(
    providerId,
    amount = null,
    bookingId = null,
    currency = DEFAULT_CURRENCY
  ) {
    try {
      const normalizedCurrency =
        normalizeCurrency(
          currency
        );

      const walletResult =
        await this.getOrCreateWallet(
          providerId,
          "provider",
          normalizedCurrency
        );

      if (!walletResult.success) {
        throw new Error(
          "Failed to get provider wallet"
        );
      }

      const wallet =
        walletResult.wallet;

      let releaseAmount =
        amount == null
          ? wallet.balances.pending
          : roundMoney(amount);

      if (
        releaseAmount <= 0
      ) {
        return {
          success: true,
          wallet,
          releasedAmount: 0,
          newPending:
            wallet.balances.pending,
          newAvailable:
            wallet.balances.available,
        };
      }

      if (
        releaseAmount >
        wallet.balances.pending
      ) {
        return {
          success: false,
          error:
            `Insufficient pending funds. Available: ${
              wallet.balances.pending
            }, Requested: ${
              releaseAmount
            }`,
        };
      }

      const previousPending =
        wallet.balances.pending;

      const previousAvailable =
        wallet.balances.available;

      wallet.balances.pending -=
        releaseAmount;

      wallet.balances.available +=
        releaseAmount;

      wallet.totalLifetimeEarnings =
        toNumber(
          wallet.totalLifetimeEarnings
        ) + releaseAmount;

      wallet.lastActivityAt =
        new Date();

      wallet.transactions.push({
        transactionId:
          null,

        type:
          "credit",

        amount:
          releaseAmount,

        balanceType:
          "available",

        previousBalance:
          previousAvailable,

        newBalance:
          wallet.balances.available,

        description:
          bookingId
            ? `Funds released for booking ${bookingId}`
            : "Pending funds released",

        metadata: {
          bookingId:
            bookingId
              ? getStringId(
                  bookingId
                )
              : null,

          releasedFrom:
            "pending",

          releaseType:
            "settlement",
        },

        createdAt:
          new Date(),
      });

      await wallet.save();

      if (
        typeof ledgerService.createEntry ===
        "function"
      ) {
        await ledgerService.createEntry({
          walletId:
            wallet._id,

          providerId,

          debitAccount:
            ledgerService
              .LEDGER_ACCOUNTS
              .LIABILITY_SETTLEMENT_PAYABLE,

          creditAccount:
            ledgerService
              .LEDGER_ACCOUNTS
              .ASSET_CASH,

          amount:
            releaseAmount,

          currency:
            wallet.currency,

          transactionType:
            ledgerService
              .TRANSACTION_TYPES
              .SETTLEMENT_COMPLETED,

          description:
            bookingId
              ? `Settlement for booking ${bookingId}`
              : "Pending funds released",

          source:
            "settlement",
        });
      }

      await this.createTransaction({
        type:
          WALLET_TRANSACTION_TYPES.SETTLEMENT,

        status:
          "completed",

        grossAmount:
          releaseAmount,

        netAmount:
          releaseAmount,

        initiator:
          providerId,

        recipient:
          providerId,

        sourceWallet:
          wallet._id,

        destinationWallet:
          wallet._id,

        currency:
          wallet.currency,

        description:
          bookingId
            ? `Funds released from pending for booking ${bookingId}`
            : "Pending funds released",

        metadata: {
          previousPending,
          newPending:
            wallet.balances.pending,

          previousAvailable,
          newAvailable:
            wallet.balances.available,
        },
      });

      return {
        success: true,
        wallet,

        releasedAmount:
          releaseAmount,

        newPending:
          wallet.balances.pending,

        newAvailable:
          wallet.balances.available,
      };
    } catch (error) {
      console.error(
        "❌ Release pending funds error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // RELEASE PENDING FUNDS FOR SETTLEMENT
  // ==========================================================

  async releasePendingFundsForSettlement(
    providerId,
    amount,
    bookingId,
    currency = DEFAULT_CURRENCY
  ) {
    try {
      const normalizedCurrency =
        normalizeCurrency(
          currency
        );

      const walletResult =
        await this.getOrCreateWallet(
          providerId,
          "provider",
          normalizedCurrency
        );

      if (!walletResult.success) {
        throw new Error(
          "Failed to get provider wallet"
        );
      }

      const wallet =
        walletResult.wallet;

      const pendingTransactions =
        wallet.transactions
          .filter(
            (transaction) =>
              transaction.type ===
                "credit" &&
              transaction.balanceType ===
                "pending" &&
              transaction.metadata
                ?.bookingId &&
              String(
                transaction.metadata
                  .bookingId
              ) ===
                String(
                  bookingId
                ) &&
              !transaction.metadata
                ?.released
          );

      if (
        pendingTransactions.length ===
        0
      ) {
        // Idempotency:
        //
        // It may already have been released by a previous
        // settlement execution.
        return {
          success: true,
          alreadyReleased: true,
          wallet,
          releasedAmount: 0,
          bookingId,
        };
      }

      const requestedAmount =
        amount == null
          ? pendingTransactions.reduce(
              (
                sum,
                transaction
              ) =>
                sum +
                toNumber(
                  transaction.amount
                ),
              0
            )
          : roundMoney(
              amount
            );

      if (
        requestedAmount <= 0
      ) {
        return {
          success: false,
          error:
            "Settlement release amount must be greater than zero",
        };
      }

      if (
        requestedAmount >
        wallet.balances.pending
      ) {
        return {
          success: false,
          error:
            `Insufficient pending funds. Available: ${
              wallet.balances.pending
            }, Requested: ${
              requestedAmount
            }`,
        };
      }

      const previousPending =
        wallet.balances.pending;

      const previousAvailable =
        wallet.balances.available;

      wallet.balances.pending -=
        requestedAmount;

      wallet.balances.available +=
        requestedAmount;

      wallet.totalLifetimeEarnings =
        toNumber(
          wallet.totalLifetimeEarnings
        ) + requestedAmount;

      wallet.lastActivityAt =
        new Date();

      // Mark only the booking's pending records as released.
      let remaining =
        requestedAmount;

      for (
        const transaction of pendingTransactions
      ) {
        if (
          remaining <= 0
        ) {
          break;
        }

        const transactionAmount =
          toNumber(
            transaction.amount
          );

        const applied =
          Math.min(
            transactionAmount,
            remaining
          );

        transaction.metadata = {
          ...(transaction.metadata ||
            {}),

          releasedAt:
            new Date(),

          releasedAmount:
            applied,

          released: true,

          settlementCompleted:
            true,
        };

        remaining =
          roundMoney(
            remaining - applied
          );
      }

      wallet.transactions.push({
        transactionId:
          null,

        type:
          "credit",

        amount:
          requestedAmount,

        balanceType:
          "available",

        previousBalance:
          previousAvailable,

        newBalance:
          wallet.balances.available,

        description:
          `Settlement funds released for booking ${bookingId}`,

        metadata: {
          bookingId:
            getStringId(
              bookingId
            ),

          releasedFrom:
            "pending",

          settlementType:
            "booking_settlement",

          previousPending,

          newPending:
            wallet.balances.pending,
        },

        createdAt:
          new Date(),
      });

      await wallet.save();

      if (
        typeof ledgerService.createEntry ===
        "function"
      ) {
        await ledgerService.createEntry({
          walletId:
            wallet._id,

          providerId,

          debitAccount:
            ledgerService
              .LEDGER_ACCOUNTS
              .LIABILITY_SETTLEMENT_PAYABLE,

          creditAccount:
            ledgerService
              .LEDGER_ACCOUNTS
              .ASSET_CASH,

          amount:
            requestedAmount,

          currency:
            wallet.currency,

          transactionType:
            ledgerService
              .TRANSACTION_TYPES
              .SETTLEMENT_COMPLETED,

          description:
            `Settlement completed for booking ${bookingId}`,

          source:
            "settlement",

          metadata: {
            bookingId:
              getStringId(
                bookingId
              ),

            releaseAmount:
              requestedAmount,
          },
        });
      }

      await this.createTransaction({
        type:
          WALLET_TRANSACTION_TYPES.SETTLEMENT,

        status:
          "completed",

        grossAmount:
          requestedAmount,

        netAmount:
          requestedAmount,

        initiator:
          providerId,

        recipient:
          providerId,

        sourceWallet:
          wallet._id,

        destinationWallet:
          wallet._id,

        currency:
          wallet.currency,

        description:
          `Settlement completed for booking ${bookingId}`,

        metadata: {
          bookingId:
            getStringId(
              bookingId
            ),

          previousPending,

          newPending:
            wallet.balances.pending,

          previousAvailable,

          newAvailable:
            wallet.balances.available,
        },
      });

      // IMPORTANT:
      //
      // We deliberately do not create a new Earning here.
      //
      // SettlementService/Earning already own that state.

      return {
        success: true,

        alreadyReleased:
          false,

        wallet,

        releasedAmount:
          requestedAmount,

        newPending:
          wallet.balances.pending,

        newAvailable:
          wallet.balances.available,

        bookingId,
      };
    } catch (error) {
      console.error(
        "❌ Release pending funds for settlement error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // WITHDRAWAL COMPATIBILITY
  //
  // IMPORTANT:
  //
  // SettlementService is the authoritative withdrawal flow.
  // These methods are kept only for existing legacy callers.
  //
  // New provider withdrawals should use:
  //
  // SettlementService.processWithdrawalRequest()
  // ==========================================================

  async requestWithdrawal(
    providerId,
    amount,
    currency = DEFAULT_CURRENCY,
    paymentMethod = "bank_transfer",
    metadata = {}
  ) {
    try {
      const normalizedCurrency =
        normalizeCurrency(
          currency
        );

      const numericAmount =
        roundMoney(amount);

      if (
        numericAmount <= 0
      ) {
        return {
          success: false,
          error:
            "Amount must be greater than 0",
        };
      }

      const allowedMethods =
        WITHDRAWAL_METHODS.has(
          paymentMethod
        );

      if (
        !allowedMethods
      ) {
        return {
          success: false,
          error:
            `Unsupported withdrawal method: ${paymentMethod}`,
        };
      }

      // --------------------------------------------------------
      // Prefer the authoritative SettlementService if available.
      // --------------------------------------------------------

      try {
        const settlementModule =
          await import(
            "./settlementService.js"
          );

        const settlementService =
          settlementModule.default;

        if (
          settlementService &&
          typeof settlementService.processWithdrawalRequest ===
            "function"
        ) {
          return settlementService.processWithdrawalRequest(
            providerId,
            numericAmount,
            normalizedCurrency,
            paymentMethod,
            metadata
          );
        }
      } catch (settlementError) {
        console.warn(
          "SettlementService withdrawal bridge unavailable:",
          settlementError.message
        );
      }

      // --------------------------------------------------------
      // Legacy fallback.
      //
      // Reserve the wallet amount but do not claim that this
      // is the authoritative Earning settlement flow.
      // --------------------------------------------------------

      const walletResult =
        await this.getOrCreateWallet(
          providerId,
          "provider",
          normalizedCurrency
        );

      if (!walletResult.success) {
        throw new Error(
          "Failed to get provider wallet"
        );
      }

      const wallet =
        walletResult.wallet;

      if (
        wallet.balances.available <
        numericAmount
      ) {
        return {
          success: false,
          error:
            `Insufficient funds. Available: ${wallet.balances.available}`,
        };
      }

      const eligibility =
        wallet.checkWithdrawEligibility(
          numericAmount
        );

      if (
        !eligibility.allowed
      ) {
        return {
          success: false,
          error:
            eligibility.reason,
        };
      }

      const previousAvailable =
        wallet.balances.available;

      wallet.balances.available -=
        numericAmount;

      wallet.transactions.push({
        transactionId:
          null,

        type:
          "debit",

        amount:
          numericAmount,

        balanceType:
          "available",

        previousBalance:
          previousAvailable,

        newBalance:
          wallet.balances.available,

        description:
          `Legacy withdrawal request - ${paymentMethod}`,

        metadata: {
          paymentMethod,
          compatibility:
            true,

          ...metadata,
        },

        createdAt:
          new Date(),
      });

      await wallet.save();

      if (
        typeof wallet.updateWithdrawalCounters ===
        "function"
      ) {
        await wallet.updateWithdrawalCounters(
          numericAmount
        );
      }

      const transaction =
        await this.createTransaction({
          type:
            WALLET_TRANSACTION_TYPES.WITHDRAWAL,

          status:
            "pending",

          grossAmount:
            numericAmount,

          netAmount:
            numericAmount,

          initiator:
            providerId,

          recipient:
            providerId,

          provider:
            providerId,

          sourceWallet:
            wallet._id,

          destinationWallet:
            null,

          currency:
            normalizedCurrency,

          description:
            `Legacy withdrawal request via ${paymentMethod}`,

          metadata: {
            paymentMethod,

            compatibility:
              true,

            ...metadata,
          },
        });

      await createNotification({
        recipient:
          providerId,

        sender:
          providerId,

        type:
          "withdrawal_requested",

        title:
          "Withdrawal Requested 💸",

        message:
          `Withdrawal of ${await formatCurrency(
            numericAmount,
            normalizedCurrency
          )} has been requested.`,

        data: {
          withdrawalId:
            transaction._id,

          amount:
            numericAmount,

          currency:
            normalizedCurrency,
        },

        link:
          "/provider/withdrawals",
      });

      return {
        success: true,

        wallet,

        transaction,

        newBalance:
          wallet.balances.available,

        withdrawalId:
          transaction._id,
      };
    } catch (error) {
      console.error(
        "❌ Request withdrawal error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // PROCESS LEGACY WITHDRAWAL
  // ==========================================================

  async processWithdrawal(
    transactionId,
    status = "completed",
    adminNotes = ""
  ) {
    try {
      const transaction =
        await Transaction.findById(
          transactionId
        );

      if (!transaction) {
        return {
          success: false,
          error:
            "Transaction not found",
        };
      }

      if (
        transaction.type !==
        "withdrawal"
      ) {
        return {
          success: false,
          error:
            "Transaction is not a withdrawal",
        };
      }

      if (
        transaction.status !==
        "pending"
      ) {
        return {
          success: false,
          error:
            `Transaction already ${transaction.status}`,
        };
      }

      transaction.status =
        status;

      if (
        status ===
        "completed"
      ) {
        transaction.completedAt =
          new Date();

        transaction.settledAt =
          new Date();
      }

      if (adminNotes) {
        transaction.adminNotes =
          adminNotes;
      }

      await transaction.save();

      if (
        status ===
        "completed"
      ) {
        const wallet =
          await Wallet.findById(
            transaction.sourceWallet
          );

        if (wallet) {
          const withdrawalTx =
            wallet.transactions.find(
              (item) =>
                item.transactionId &&
                String(
                  item.transactionId
                ) ===
                  String(
                    transactionId
                  )
            );

          if (withdrawalTx) {
            withdrawalTx.status =
              "completed";

            await wallet.save();
          }

          if (
            typeof ledgerService.createEntry ===
            "function"
          ) {
            await ledgerService.createEntry({
              walletId:
                wallet._id,

              providerId:
                transaction
                  .initiator,

              debitAccount:
                ledgerService
                  .LEDGER_ACCOUNTS
                  .LIABILITY_WITHDRAWAL_PENDING,

              creditAccount:
                ledgerService
                  .LEDGER_ACCOUNTS
                  .EXPENSE_PROVIDER_PAYOUT,

              amount:
                transaction
                  .grossAmount,

              currency:
                transaction
                  .currency,

              transactionType:
                ledgerService
                  .TRANSACTION_TYPES
                  .WITHDRAWAL_PROCESSED,

              description:
                `Legacy withdrawal processed for provider ${transaction.initiator}`,

              reference:
                transactionId,

              source:
                "withdrawal",
            });
          }
        }

        await createNotification({
          recipient:
            transaction
              .initiator,

          sender:
            null,

          type:
            "withdrawal_completed",

          title:
            "Withdrawal Completed ✅",

          message:
            `Your withdrawal of ${await formatCurrency(
              transaction.grossAmount,
              transaction.currency
            )} has been processed.`,

          data: {
            withdrawalId:
              transaction._id,

            amount:
              transaction
                .grossAmount,

            currency:
              transaction
                .currency,
          },

          link:
            "/provider/withdrawals",
        });
      }

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      console.error(
        "❌ Process withdrawal error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // PLATFORM WALLET
  // ==========================================================

  async getOrCreatePlatformWallet(
    currency = DEFAULT_CURRENCY
  ) {
    try {
      const normalizedCurrency =
        normalizeCurrency(
          currency
        );

      const platformUser =
        await User.findOne({
          role: "admin",
        });

      if (!platformUser) {
        return {
          success: false,
          error:
            "Platform user not found",
        };
      }

      const wallet =
        await Wallet.getOrCreateWallet(
          platformUser._id,
          "platform",
          normalizedCurrency
        );

      return {
        success: true,
        wallet,
      };
    } catch (error) {
      console.error(
        "❌ Get platform wallet error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getPlatformWalletSummary() {
    try {
      const wallets =
        await Wallet.find({
          type: {
            $in: [
              "platform",
              "commission",
            ],
          },

          status: "active",
        });

      const summary = {
        totalAvailable: 0,
        totalPending: 0,
        totalHeld: 0,
        totalFrozen: 0,

        byCurrency: {},

        byType: {
          platform: {
            available: 0,
            pending: 0,
          },

          commission: {
            available: 0,
            pending: 0,
          },
        },
      };

      for (const wallet of wallets) {
        const currency =
          normalizeCurrency(
            wallet.currency
          );

        const available =
          toNumber(
            wallet.balances?.available
          );

        const pending =
          toNumber(
            wallet.balances?.pending
          );

        const held =
          toNumber(
            wallet.balances?.held
          );

        const frozen =
          toNumber(
            wallet.balances?.frozen
          );

        summary.totalAvailable +=
          available;

        summary.totalPending +=
          pending;

        summary.totalHeld +=
          held;

        summary.totalFrozen +=
          frozen;

        if (
          !summary.byCurrency[
            currency
          ]
        ) {
          summary.byCurrency[
            currency
          ] = {
            available: 0,
            pending: 0,
            held: 0,
            frozen: 0,
          };
        }

        summary.byCurrency[
          currency
        ].available +=
          available;

        summary.byCurrency[
          currency
        ].pending +=
          pending;

        summary.byCurrency[
          currency
        ].held +=
          held;

        summary.byCurrency[
          currency
        ].frozen +=
          frozen;

        if (
          summary.byType[
            wallet.type
          ]
        ) {
          summary.byType[
            wallet.type
          ].available +=
            available;

          summary.byType[
            wallet.type
          ].pending +=
            pending;
        }
      }

      return {
        success: true,
        summary,
      };
    } catch (error) {
      console.error(
        "❌ Get platform wallet summary error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // TRANSACTIONS
  // ==========================================================

  async createTransaction(
    data
  ) {
    try {
      const type =
        data.type ||
        "adjustment";

      const prefix =
        String(type)
          .substring(0, 3)
          .toUpperCase();

      const reference =
        typeof Transaction.generateReference ===
        "function"
          ? Transaction.generateReference(
              prefix
            )
          : `TXN-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 7)}`;

      const transaction =
        new Transaction({
          reference,

          type,

          status:
            data.status ||
            "pending",

          grossAmount:
            toNumber(
              data.grossAmount
            ),

          netAmount:
            data.netAmount !=
            null
              ? toNumber(
                  data.netAmount
                )
              : toNumber(
                  data.grossAmount
                ),

          fees:
            data.fees || {},

          initiator:
            data.initiator,

          recipient:
            data.recipient ||
            null,

          provider:
            data.provider ||
            null,

          customer:
            data.customer ||
            null,

          booking:
            data.booking ||
            null,

          payment:
            data.payment ||
            null,

          sourceWallet:
            data.sourceWallet ||
            null,

          destinationWallet:
            data.destinationWallet ||
            null,

          earning:
            data.earning ||
            null,

          currency:
            normalizeCurrency(
              data.currency
            ),

          description:
            data.description ||
            "",

          metadata:
            data.metadata ||
            {},

          providerData:
            data.providerData ||
            {},

          initiatedAt:
            data.initiatedAt ||
            new Date(),

          isTestMode:
            Boolean(
              data.isTestMode
            ),

          ipAddress:
            data.ipAddress ||
            null,

          userAgent:
            data.userAgent ||
            null,
        });

      await transaction.save();

      return transaction;
    } catch (error) {
      console.error(
        "❌ Create transaction error:",
        error.message
      );

      throw error;
    }
  }

  async getTransactionHistory(
    filter,
    options = {}
  ) {
    try {
      const limit =
        Math.min(
          Math.max(
            toNumber(
              options.limit,
              50
            ),
            1
          ),
          200
        );

      const skip =
        Math.max(
          toNumber(
            options.skip,
            0
          ),
          0
        );

      const sort =
        options.sort || {
          createdAt: -1,
        };

      const transactions =
        await Transaction.find(
          filter
        )
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(
            "initiator",
            "name email"
          )
          .populate(
            "recipient",
            "name email"
          )
          .populate(
            "booking",
            "bookingCode status"
          )
          .populate(
            "payment",
            "status amount"
          );

      const total =
        await Transaction.countDocuments(
          filter
        );

      return {
        success: true,
        transactions,
        total,
        limit,
        skip,
      };
    } catch (error) {
      console.error(
        "❌ Get transaction history error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // WALLET EXISTENCE
  // ==========================================================

  async hasWallet(
    userId,
    type = "provider",
    currency = DEFAULT_CURRENCY
  ) {
    try {
      const normalizedCurrency =
        normalizeCurrency(
          currency
        );

      const wallet =
        await Wallet.findOne({
          ownerId:
            userId,

          type,

          currency:
            normalizedCurrency,
        });

      return {
        success: true,

        hasWallet:
          Boolean(wallet),

        wallet:
          wallet || null,
      };
    } catch (error) {
      console.error(
        "❌ Check wallet error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // TRANSACTION BY REFERENCE
  // ==========================================================

  async getTransactionByReference(
    reference
  ) {
    try {
      const transaction =
        await Transaction.findOne({
          reference,
        })
          .populate(
            "initiator",
            "name email"
          )
          .populate(
            "recipient",
            "name email"
          )
          .populate(
            "booking",
            "bookingCode status"
          )
          .populate(
            "payment",
            "status amount"
          );

      if (!transaction) {
        return {
          success: false,
          error:
            "Transaction not found",
        };
      }

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      console.error(
        "❌ Get transaction by reference error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // WALLET STATS
  // ==========================================================

  async getStats() {
    try {
      return await Wallet.getStats();
    } catch (error) {
      console.error(
        "❌ Get wallet stats error:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

const walletService =
  new WalletService();

export default walletService;