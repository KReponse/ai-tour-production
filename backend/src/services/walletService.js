// backend/src/services/walletService.js
// ✅ COMPLETE FIXED - Wallet Service with Ledger Integration
// ✅ Added releasePendingFundsForSettlement method for settlement integration
// ✅ Fixed field name consistency (totalLifetimeEarnings)
// ✅ Added pending transaction tracking for settlements

import Wallet from "../models/Wallet.js";
import Ledger from "../models/Ledger.js";
import Transaction from "../models/Transaction.js";
import Earning from "../models/Earning.js";
import User from "../models/User.js";
import { createNotification } from "../utils/notificationService.js";
import paymentConfig, { calculateCommission, formatCurrency } from "../config/payment.config.js";
import ledgerService from "./ledgerService.js";

/**
 * Wallet Service
 * 
 * Manages all wallet operations including:
 * - Creating and retrieving wallets
 * - Depositing and withdrawing funds
 * - Processing payments and commissions
 * - Managing transaction history
 * - Handling wallet transfers
 * - Recording all operations in ledger
 */
class WalletService {
  constructor() {
    this.platformCommission = paymentConfig.commission?.defaultPercentage || 10;
    console.log(`💰 Wallet Service initialized (Commission: ${this.platformCommission}%)`);
  }

  // ─── Wallet Creation & Retrieval ──────────────────────────────

  /**
   * Get or create a wallet for a user
   */
  async getOrCreateWallet(userId, type = "provider", currency = "USD") {
    try {
      const wallet = await Wallet.getOrCreateWallet(userId, type, currency);
      return {
        success: true,
        wallet,
      };
    } catch (error) {
      console.error("❌ Get or create wallet error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user's wallets
   */
  async getUserWallets(userId) {
    try {
      const wallets = await Wallet.getUserWallets(userId);
      const summary = await Wallet.getBalanceSummary(userId);
      
      return {
        success: true,
        wallets,
        summary,
      };
    } catch (error) {
      console.error("❌ Get user wallets error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId) {
    try {
      const wallet = await Wallet.findById(walletId)
        .populate("ownerId", "name email");
      
      if (!wallet) {
        return {
          success: false,
          error: "Wallet not found",
        };
      }

      return {
        success: true,
        wallet,
      };
    } catch (error) {
      console.error("❌ Get wallet error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ─── Balance Operations ────────────────────────────────────────

  /**
   * Get wallet balance
   */
  async getBalance(walletId) {
    try {
      const result = await this.getWallet(walletId);
      if (!result.success) {
        return result;
      }

      const wallet = result.wallet;
      return {
        success: true,
        balance: {
          available: wallet.balances.available,
          pending: wallet.balances.pending,
          held: wallet.balances.held,
          frozen: wallet.balances.frozen,
          total: wallet.totalBalance,
        },
        currency: wallet.currency,
      };
    } catch (error) {
      console.error("❌ Get balance error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get provider balance summary
   */
  async getProviderBalanceSummary(providerId) {
    try {
      const wallets = await Wallet.find({
        ownerId: providerId,
        type: { $in: ["provider", "commission"] },
        status: "active",
      });

      const summary = {
        totalAvailable: 0,
        totalPending: 0,
        totalHeld: 0,
        totalFrozen: 0,
        byCurrency: {},
        byType: {
          provider: { available: 0, pending: 0 },
          commission: { available: 0, pending: 0 },
        },
      };

      for (const wallet of wallets) {
        summary.totalAvailable += wallet.balances.available;
        summary.totalPending += wallet.balances.pending;
        summary.totalHeld += wallet.balances.held;
        summary.totalFrozen += wallet.balances.frozen;

        if (!summary.byCurrency[wallet.currency]) {
          summary.byCurrency[wallet.currency] = {
            available: 0,
            pending: 0,
            held: 0,
            frozen: 0,
          };
        }
        summary.byCurrency[wallet.currency].available += wallet.balances.available;
        summary.byCurrency[wallet.currency].pending += wallet.balances.pending;
        summary.byCurrency[wallet.currency].held += wallet.balances.held;
        summary.byCurrency[wallet.currency].frozen += wallet.balances.frozen;

        if (summary.byType[wallet.type]) {
          summary.byType[wallet.type].available += wallet.balances.available;
          summary.byType[wallet.type].pending += wallet.balances.pending;
        }
      }

      // Get recent transactions
      const recentTransactions = await Transaction.find({
        $or: [
          { provider: providerId },
          { recipient: providerId },
        ],
        status: { $in: ["completed", "pending"] },
      })
      .sort({ createdAt: -1 })
      .limit(10);

      return {
        success: true,
        summary,
        recentTransactions,
      };
    } catch (error) {
      console.error("❌ Get provider balance summary error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ─── Deposit Operations ────────────────────────────────────────

  /**
   * Deposit funds into wallet with ledger recording
   */
  async deposit(walletId, amount, description = "", transactionId = null, metadata = {}) {
    try {
      if (amount <= 0) {
        return {
          success: false,
          error: "Amount must be greater than 0",
        };
      }

      const wallet = await Wallet.findById(walletId);
      if (!wallet) {
        return {
          success: false,
          error: "Wallet not found",
        };
      }

      // Add funds
      await wallet.addFunds(amount, "credit", description, transactionId);

      // ✅ Record in ledger
      await ledgerService.createEntry({
        walletId: wallet._id,
        debitAccount: ledgerService.LEDGER_ACCOUNTS.ASSET_CASH,
        creditAccount: ledgerService.LEDGER_ACCOUNTS.INCOME_PROVIDER,
        amount: amount,
        currency: wallet.currency,
        transactionType: ledgerService.TRANSACTION_TYPES.ADJUSTMENT_CREDIT,
        description: description || "Deposit to wallet",
        reference: transactionId,
        metadata,
        source: "wallet",
      });

      // Create transaction record
      const transaction = await this.createTransaction({
        type: "payment",
        status: "completed",
        grossAmount: amount,
        netAmount: amount,
        initiator: wallet.ownerId,
        recipient: wallet.ownerId,
        sourceWallet: walletId,
        destinationWallet: walletId,
        currency: wallet.currency,
        description: description || "Deposit to wallet",
        metadata: metadata,
      });

      return {
        success: true,
        wallet,
        transaction,
        newBalance: wallet.balances.available,
      };
    } catch (error) {
      console.error("❌ Deposit error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process payment and credit provider wallet with ledger
   */
  async processPaymentCredit(booking, payment, providerId) {
    try {
      console.log(`💰 Processing payment credit for provider: ${providerId}`);

      // ─── 1. Calculate amounts ──────────────────────────────────
      const amount = payment.amount;
      const commission = payment.platformFee || calculateCommission(amount);
      const providerAmount = amount - commission;

      // ─── 2. Get provider wallet ────────────────────────────────
      const walletResult = await this.getOrCreateWallet(providerId, "provider", payment.currency);
      if (!walletResult.success) {
        throw new Error("Failed to get provider wallet");
      }
      const providerWallet = walletResult.wallet;

      // ─── 3. Get platform wallet ────────────────────────────────
      const platformResult = await this.getOrCreatePlatformWallet(payment.currency);
      if (!platformResult.success) {
        throw new Error("Failed to get platform wallet");
      }
      const platformWallet = platformResult.wallet;

      // ─── 4. Credit provider wallet (pending settlement) ────────
      const settlementDays = paymentConfig.wallet?.settlementDays || 3;
      const pendingAmount = providerAmount;
      const prevPending = providerWallet.balances.pending;
      providerWallet.balances.pending += pendingAmount;
      providerWallet.lastActivityAt = new Date();

      providerWallet.transactions.push({
        transactionId: payment._id,
        type: "credit",
        amount: pendingAmount,
        balanceType: "pending",
        previousBalance: prevPending,
        newBalance: providerWallet.balances.pending,
        description: `Payment for booking ${booking.bookingCode} (pending ${settlementDays} days)`,
        metadata: {
          bookingId: booking._id,
          paymentId: payment._id,
          settlementDays: settlementDays,
          estimatedSettlement: new Date(Date.now() + settlementDays * 24 * 60 * 60 * 1000),
        },
        createdAt: new Date(),
      });

      await providerWallet.save();

      // ─── 5. Credit platform wallet (commission) ────────────────
      await platformWallet.addFunds(
        commission,
        "credit",
        `Commission from booking ${booking.bookingCode}`,
        payment._id
      );

      // ─── 6. Record in ledger ────────────────────────────────────
      await ledgerService.recordPayment(payment, booking, payment.user, providerId);

      // ─── 7. Create transaction records ──────────────────────────
      await this.createTransaction({
        type: "earning",
        status: "pending",
        grossAmount: amount,
        netAmount: providerAmount,
        fees: {
          platformFee: commission,
        },
        initiator: payment.user,
        recipient: providerId,
        provider: providerId,
        customer: payment.user,
        booking: booking._id,
        payment: payment._id,
        sourceWallet: null,
        destinationWallet: providerWallet._id,
        earning: null,
        currency: payment.currency,
        description: `Earning from booking ${booking.bookingCode}`,
        metadata: {
          settlementDays: settlementDays,
          estimatedSettlement: new Date(Date.now() + settlementDays * 24 * 60 * 60 * 1000),
        },
      });

      // ─── 8. Create platform commission transaction ──────────────
      await this.createTransaction({
        type: "commission",
        status: "completed",
        grossAmount: commission,
        netAmount: commission,
        fees: {
          platformFee: commission,
        },
        initiator: payment.user,
        recipient: null,
        provider: providerId,
        customer: payment.user,
        booking: booking._id,
        payment: payment._id,
        sourceWallet: null,
        destinationWallet: platformWallet._id,
        currency: payment.currency,
        description: `Platform commission for booking ${booking.bookingCode}`,
      });

      console.log(`✅ Payment credited to provider ${providerId}: $${providerAmount} (pending ${settlementDays} days)`);

      return {
        success: true,
        providerWallet,
        platformWallet,
        providerAmount,
        commission,
        pendingAmount,
        settlementDays,
        estimatedSettlement: new Date(Date.now() + settlementDays * 24 * 60 * 60 * 1000),
        ledgerEntries: payment.ledgerEntries || [],
      };

    } catch (error) {
      console.error("❌ Process payment credit error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Release pending funds to available balance with ledger
   */
  async releasePendingFunds(providerId, amount = null, bookingId = null) {
    try {
      // ─── 1. Get provider wallet ────────────────────────────────
      const walletResult = await this.getOrCreateWallet(providerId, "provider", "USD");
      if (!walletResult.success) {
        throw new Error("Failed to get provider wallet");
      }
      const wallet = walletResult.wallet;

      // ─── 2. Determine amount to release ─────────────────────────
      let releaseAmount = amount || wallet.balances.pending;

      if (releaseAmount > wallet.balances.pending) {
        return {
          success: false,
          error: `Insufficient pending funds. Available: ${wallet.balances.pending}, Requested: ${releaseAmount}`,
        };
      }

      // ─── 3. Release funds ──────────────────────────────────────
      const prevPending = wallet.balances.pending;
      const prevAvailable = wallet.balances.available;

      wallet.balances.pending -= releaseAmount;
      wallet.balances.available += releaseAmount;
      wallet.totalLifetimeEarnings = (wallet.totalLifetimeEarnings || 0) + releaseAmount;
      wallet.lastActivityAt = new Date();

      wallet.transactions.push({
        transactionId: null,
        type: "credit",
        amount: releaseAmount,
        balanceType: "available",
        previousBalance: prevAvailable,
        newBalance: wallet.balances.available,
        description: bookingId ? `Funds released for booking ${bookingId}` : "Pending funds released",
        metadata: {
          bookingId: bookingId,
          releasedFrom: "pending",
          releaseType: "settlement",
        },
        createdAt: new Date(),
      });

      await wallet.save();

      // ─── 4. Record in ledger ────────────────────────────────────
      await ledgerService.createEntry({
        walletId: wallet._id,
        providerId: providerId,
        debitAccount: ledgerService.LEDGER_ACCOUNTS.LIABILITY_SETTLEMENT_PAYABLE,
        creditAccount: ledgerService.LEDGER_ACCOUNTS.ASSET_CASH,
        amount: releaseAmount,
        currency: wallet.currency,
        transactionType: ledgerService.TRANSACTION_TYPES.SETTLEMENT_COMPLETED,
        description: bookingId ? `Settlement for booking ${bookingId}` : "Pending funds released",
        source: "settlement",
      });

      // ─── 5. Update earning records ─────────────────────────────
      if (bookingId) {
        await Earning.updateMany(
          { provider: providerId, booking: bookingId, status: "pending" },
          { status: "available" }
        );
      }

      // ─── 6. Create transaction record ──────────────────────────
      await this.createTransaction({
        type: "settlement",
        status: "completed",
        grossAmount: releaseAmount,
        netAmount: releaseAmount,
        initiator: providerId,
        recipient: providerId,
        sourceWallet: wallet._id,
        destinationWallet: wallet._id,
        currency: wallet.currency,
        description: bookingId ? `Funds released from pending for booking ${bookingId}` : "Pending funds released to available balance",
        metadata: {
          previousPending: prevPending,
          newPending: wallet.balances.pending,
          previousAvailable: prevAvailable,
          newAvailable: wallet.balances.available,
        },
      });

      return {
        success: true,
        wallet,
        releasedAmount: releaseAmount,
        newPending: wallet.balances.pending,
        newAvailable: wallet.balances.available,
      };

    } catch (error) {
      console.error("❌ Release pending funds error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ✅ NEW: Release pending funds for settlement (matches settlementQueueService expectation)
   * This method is specifically designed to work with the settlement queue service
   */
  async releasePendingFundsForSettlement(providerId, amount, bookingId) {
    try {
      console.log(`💰 Releasing pending funds for settlement - Provider: ${providerId}, Amount: ${amount}, Booking: ${bookingId}`);

      // ─── 1. Get provider wallet ────────────────────────────────
      const walletResult = await this.getOrCreateWallet(providerId, "provider", "USD");
      if (!walletResult.success) {
        throw new Error("Failed to get provider wallet");
      }
      const wallet = walletResult.wallet;

      // ─── 2. Find pending transaction for this booking ──────────
      const pendingTx = wallet.transactions.find(
        t => t.metadata?.bookingId?.toString() === bookingId?.toString() &&
             t.balanceType === "pending" &&
             t.type === "credit"
      );

      if (!pendingTx) {
        console.warn(`⚠️ No pending transaction found for booking ${bookingId}`);
        return {
          success: false,
          error: "No pending funds found for this booking",
        };
      }

      const releaseAmount = amount || pendingTx.amount;

      if (releaseAmount > wallet.balances.pending) {
        return {
          success: false,
          error: `Insufficient pending funds. Available: ${wallet.balances.pending}, Requested: ${releaseAmount}`,
        };
      }

      // ─── 3. Release funds ──────────────────────────────────────
      const prevPending = wallet.balances.pending;
      const prevAvailable = wallet.balances.available;

      wallet.balances.pending -= releaseAmount;
      wallet.balances.available += releaseAmount;
      wallet.totalLifetimeEarnings = (wallet.totalLifetimeEarnings || 0) + releaseAmount;
      wallet.lastActivityAt = new Date();

      // Add transaction record
      wallet.transactions.push({
        transactionId: null,
        type: "credit",
        amount: releaseAmount,
        balanceType: "available",
        previousBalance: prevAvailable,
        newBalance: wallet.balances.available,
        description: `Settlement funds released for booking ${bookingId}`,
        metadata: {
          bookingId: bookingId,
          releasedFrom: "pending",
          settlementType: "booking_settlement",
          previousPending: prevPending,
          newPending: wallet.balances.pending,
        },
        createdAt: new Date(),
      });

      // ─── 4. Update pending transaction status ──────────────────
      // Find and update the specific pending transaction
      const pendingIndex = wallet.transactions.findIndex(
        t => t.metadata?.bookingId?.toString() === bookingId?.toString() &&
             t.balanceType === "pending" &&
             t.type === "credit"
      );

      if (pendingIndex !== -1) {
        wallet.transactions[pendingIndex].metadata = {
          ...wallet.transactions[pendingIndex].metadata,
          releasedAt: new Date(),
          releasedAmount: releaseAmount,
          released: true,
          settlementCompleted: true,
        };
      }

      await wallet.save();

      // ─── 5. Record in ledger ────────────────────────────────────
      await ledgerService.createEntry({
        walletId: wallet._id,
        providerId: providerId,
        debitAccount: ledgerService.LEDGER_ACCOUNTS.LIABILITY_SETTLEMENT_PAYABLE,
        creditAccount: ledgerService.LEDGER_ACCOUNTS.ASSET_CASH,
        amount: releaseAmount,
        currency: wallet.currency,
        transactionType: ledgerService.TRANSACTION_TYPES.SETTLEMENT_COMPLETED,
        description: `Settlement completed for booking ${bookingId}`,
        source: "settlement",
        metadata: {
          bookingId: bookingId,
          releaseAmount: releaseAmount,
        },
      });

      // ─── 6. Update earning records ─────────────────────────────
      if (bookingId) {
        await Earning.updateMany(
          { provider: providerId, booking: bookingId, status: "pending" },
          { 
            status: "available",
            settledAt: new Date(),
          }
        );
      }

      // ─── 7. Create transaction record ──────────────────────────
      await this.createTransaction({
        type: "settlement",
        status: "completed",
        grossAmount: releaseAmount,
        netAmount: releaseAmount,
        initiator: providerId,
        recipient: providerId,
        sourceWallet: wallet._id,
        destinationWallet: wallet._id,
        currency: wallet.currency,
        description: `Settlement completed for booking ${bookingId}`,
        metadata: {
          bookingId: bookingId,
          previousPending: prevPending,
          newPending: wallet.balances.pending,
          previousAvailable: prevAvailable,
          newAvailable: wallet.balances.available,
        },
      });

      console.log(`✅ Settlement funds released: ${releaseAmount} for booking ${bookingId}`);

      return {
        success: true,
        wallet,
        releasedAmount: releaseAmount,
        newPending: wallet.balances.pending,
        newAvailable: wallet.balances.available,
        bookingId: bookingId,
      };

    } catch (error) {
      console.error("❌ Release pending funds for settlement error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ─── Withdrawal Operations ──────────────────────────────────────

  /**
   * Process withdrawal request with ledger
   */
  async requestWithdrawal(providerId, amount, currency = "USD", paymentMethod = "bank_transfer", metadata = {}) {
    try {
      // ─── 1. Get provider wallet ────────────────────────────────
      const walletResult = await this.getOrCreateWallet(providerId, "provider", currency);
      if (!walletResult.success) {
        throw new Error("Failed to get provider wallet");
      }
      const wallet = walletResult.wallet;

      // ─── 2. Validate withdrawal ─────────────────────────────────
      if (amount <= 0) {
        return {
          success: false,
          error: "Amount must be greater than 0",
        };
      }

      if (wallet.balances.available < amount) {
        return {
          success: false,
          error: `Insufficient funds. Available: ${wallet.balances.available}`,
        };
      }

      // Check withdrawal limits
      const eligibility = wallet.checkWithdrawEligibility(amount);
      if (!eligibility.allowed) {
        return {
          success: false,
          error: eligibility.reason,
        };
      }

      // ─── 3. Deduct funds ────────────────────────────────────────
      const prevAvailable = wallet.balances.available;
      wallet.balances.available -= amount;
      wallet.lastActivityAt = new Date();

      wallet.transactions.push({
        transactionId: null,
        type: "debit",
        amount: amount,
        balanceType: "available",
        previousBalance: prevAvailable,
        newBalance: wallet.balances.available,
        description: `Withdrawal request - ${paymentMethod}`,
        metadata: {
          paymentMethod: paymentMethod,
          ...metadata,
        },
        createdAt: new Date(),
      });

      await wallet.save();

      // ─── 4. Record in ledger ────────────────────────────────────
      await ledgerService.recordWithdrawal(
        { _id: `WTH-${Date.now()}`, amount, currency },
        { _id: providerId },
        wallet
      );

      // ─── 5. Update withdrawal counters ─────────────────────────
      await wallet.updateWithdrawalCounters(amount);

      // ─── 6. Create transaction record ──────────────────────────
      const transaction = await this.createTransaction({
        type: "withdrawal",
        status: "pending",
        grossAmount: amount,
        netAmount: amount,
        initiator: providerId,
        recipient: providerId,
        provider: providerId,
        sourceWallet: wallet._id,
        destinationWallet: null,
        currency: currency,
        description: `Withdrawal request via ${paymentMethod}`,
        metadata: {
          paymentMethod,
          ...metadata,
        },
      });

      // ─── 7. Create notification ─────────────────────────────────
      await createNotification({
        recipient: providerId,
        sender: providerId,
        type: "withdrawal_requested",
        title: "Withdrawal Requested 💸",
        message: `Withdrawal of ${formatCurrency(amount, currency)} has been requested.`,
        data: { 
          withdrawalId: transaction._id,
          amount: amount,
          currency: currency,
        },
        link: `/provider/withdrawals`,
      });

      return {
        success: true,
        wallet,
        transaction,
        newBalance: wallet.balances.available,
        withdrawalId: transaction._id,
      };

    } catch (error) {
      console.error("❌ Request withdrawal error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process withdrawal (admin action) with ledger
   */
  async processWithdrawal(transactionId, status = "completed", adminNotes = "") {
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return {
          success: false,
          error: "Transaction not found",
        };
      }

      if (transaction.type !== "withdrawal") {
        return {
          success: false,
          error: "Transaction is not a withdrawal",
        };
      }

      if (transaction.status !== "pending") {
        return {
          success: false,
          error: `Transaction already ${transaction.status}`,
        };
      }

      // Update transaction
      transaction.status = status;
      if (status === "completed") {
        transaction.completedAt = new Date();
        transaction.settledAt = new Date();
      }
      if (adminNotes) {
        transaction.adminNotes = adminNotes;
      }
      await transaction.save();

      // Update withdrawal related data
      if (status === "completed") {
        // Get wallet and update transaction history
        const wallet = await Wallet.findById(transaction.sourceWallet);
        if (wallet) {
          // Find the withdrawal transaction in wallet history
          const withdrawalTx = wallet.transactions.find(
            t => t.transactionId && t.transactionId.toString() === transactionId
          );
          if (withdrawalTx) {
            withdrawalTx.status = "completed";
            await wallet.save();
          }

          // ✅ Record in ledger for completed withdrawal
          await ledgerService.createEntry({
            walletId: wallet._id,
            providerId: transaction.initiator,
            debitAccount: ledgerService.LEDGER_ACCOUNTS.LIABILITY_WITHDRAWAL_PENDING,
            creditAccount: ledgerService.LEDGER_ACCOUNTS.EXPENSE_PROVIDER_PAYOUT,
            amount: transaction.grossAmount,
            currency: transaction.currency,
            transactionType: ledgerService.TRANSACTION_TYPES.WITHDRAWAL_PROCESSED,
            description: `Withdrawal processed for provider ${transaction.initiator}`,
            reference: transactionId,
            source: "withdrawal",
          });
        }

        // Create notification for provider
        await createNotification({
          recipient: transaction.initiator,
          sender: null,
          type: "withdrawal_completed",
          title: "Withdrawal Completed ✅",
          message: `Your withdrawal of ${formatCurrency(transaction.grossAmount, transaction.currency)} has been processed.`,
          data: { 
            withdrawalId: transaction._id,
            amount: transaction.grossAmount,
            currency: transaction.currency,
          },
          link: `/provider/withdrawals`,
        });
      }

      return {
        success: true,
        transaction,
      };

    } catch (error) {
      console.error("❌ Process withdrawal error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ─── Platform Wallet Operations ─────────────────────────────────

  /**
   * Get or create platform wallet
   */
  async getOrCreatePlatformWallet(currency = "USD") {
    try {
      const platformUser = await User.findOne({ role: "admin" });
      if (!platformUser) {
        return {
          success: false,
          error: "Platform user not found",
        };
      }

      const wallet = await Wallet.getOrCreateWallet(platformUser._id, "platform", currency);
      return {
        success: true,
        wallet,
      };
    } catch (error) {
      console.error("❌ Get platform wallet error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get platform wallet summary
   */
  async getPlatformWalletSummary() {
    try {
      const wallets = await Wallet.find({
        type: { $in: ["platform", "commission"] },
        status: "active",
      });

      const summary = {
        totalAvailable: 0,
        totalPending: 0,
        totalHeld: 0,
        totalFrozen: 0,
        byCurrency: {},
        byType: {
          platform: { available: 0, pending: 0 },
          commission: { available: 0, pending: 0 },
        },
      };

      for (const wallet of wallets) {
        summary.totalAvailable += wallet.balances.available;
        summary.totalPending += wallet.balances.pending;
        summary.totalHeld += wallet.balances.held;
        summary.totalFrozen += wallet.balances.frozen;

        if (!summary.byCurrency[wallet.currency]) {
          summary.byCurrency[wallet.currency] = {
            available: 0,
            pending: 0,
            held: 0,
            frozen: 0,
          };
        }
        summary.byCurrency[wallet.currency].available += wallet.balances.available;
        summary.byCurrency[wallet.currency].pending += wallet.balances.pending;
        summary.byCurrency[wallet.currency].held += wallet.balances.held;
        summary.byCurrency[wallet.currency].frozen += wallet.balances.frozen;

        if (summary.byType[wallet.type]) {
          summary.byType[wallet.type].available += wallet.balances.available;
          summary.byType[wallet.type].pending += wallet.balances.pending;
        }
      }

      return {
        success: true,
        summary,
      };
    } catch (error) {
      console.error("❌ Get platform wallet summary error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ─── Transaction Operations ─────────────────────────────────────

  /**
   * Create a transaction record
   */
  async createTransaction(data) {
    try {
      // Import Transaction model dynamically to avoid circular dependency
      const Transaction = (await import("../models/Transaction.js")).default;
      
      const reference = Transaction.generateReference 
        ? Transaction.generateReference(data.type.substring(0, 3).toUpperCase())
        : `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      const transaction = new Transaction({
        reference: reference,
        type: data.type,
        status: data.status || "pending",
        grossAmount: data.grossAmount,
        netAmount: data.netAmount || data.grossAmount,
        fees: data.fees || {},
        initiator: data.initiator,
        recipient: data.recipient || null,
        provider: data.provider || null,
        customer: data.customer || null,
        booking: data.booking || null,
        payment: data.payment || null,
        sourceWallet: data.sourceWallet || null,
        destinationWallet: data.destinationWallet || null,
        earning: data.earning || null,
        currency: data.currency || "USD",
        description: data.description || "",
        metadata: data.metadata || {},
        providerData: data.providerData || {},
        initiatedAt: data.initiatedAt || new Date(),
        isTestMode: data.isTestMode || false,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      });

      await transaction.save();
      return transaction;
    } catch (error) {
      console.error("❌ Create transaction error:", error.message);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(filter, options = {}) {
    try {
      const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
      
      const Transaction = (await import("../models/Transaction.js")).default;
      
      const transactions = await Transaction.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("initiator", "name email")
        .populate("recipient", "name email")
        .populate("booking", "bookingCode status")
        .populate("payment", "status amount");

      const total = await Transaction.countDocuments(filter);

      return {
        success: true,
        transactions,
        total,
        limit,
        skip,
      };
    } catch (error) {
      console.error("❌ Get transaction history error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ─── Utility Methods ────────────────────────────────────────────

  /**
   * Check if user has wallet
   */
  async hasWallet(userId, type = "provider", currency = "USD") {
    try {
      const wallet = await Wallet.findOne({
        ownerId: userId,
        type: type,
        currency: currency,
      });
      return {
        success: true,
        hasWallet: !!wallet,
        wallet: wallet || null,
      };
    } catch (error) {
      console.error("❌ Check wallet error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get transaction by reference
   */
  async getTransactionByReference(reference) {
    try {
      const Transaction = (await import("../models/Transaction.js")).default;
      
      const transaction = await Transaction.findOne({ reference })
        .populate("initiator", "name email")
        .populate("recipient", "name email")
        .populate("booking", "bookingCode status")
        .populate("payment", "status amount");
      
      if (!transaction) {
        return {
          success: false,
          error: "Transaction not found",
        };
      }

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      console.error("❌ Get transaction by reference error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get wallet stats
   */
  async getStats() {
    try {
      return await Wallet.getStats();
    } catch (error) {
      console.error("❌ Get wallet stats error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ─── Singleton Export ────────────────────────────────────────────

const walletService = new WalletService();
export default walletService;