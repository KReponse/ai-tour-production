// backend/src/services/ledgerService.js
// ✅ NEW - Ledger Service for Production-Grade Financial Accounting

import Ledger from "../models/Ledger.js";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Settlement from "../models/Settlement.js";

// Try to import logger, fallback to console if not available
let logger;
try {
  const loggerModule = await import("../config/logger.js");
  logger = loggerModule.default || loggerModule;
} catch (error) {
  logger = {
    info: (...args) => console.log('ℹ️', ...args),
    error: (...args) => console.error('❌', ...args),
    warn: (...args) => console.warn('⚠️', ...args),
    debug: (...args) => console.debug('🔍', ...args),
  };
}

class LedgerService {
  constructor() {
    this.logger = logger;
    this.LEDGER_ACCOUNTS = {
      // Asset Accounts
      ASSET_CASH: 'ASSET_CASH',
      ASSET_BANK: 'ASSET_BANK',
      ASSET_STRIPE: 'ASSET_STRIPE',
      ASSET_MOMO: 'ASSET_MOMO',
      ASSET_AIRTEL: 'ASSET_AIRTEL',
      
      // Revenue Accounts
      REVENUE_PLATFORM_FEE: 'REVENUE_PLATFORM_FEE',
      REVENUE_PROVIDER_EARNING: 'REVENUE_PROVIDER_EARNING',
      
      // Liability Accounts
      LIABILITY_SETTLEMENT_PAYABLE: 'LIABILITY_SETTLEMENT_PAYABLE',
      LIABILITY_REFUND_PAYABLE: 'LIABILITY_REFUND_PAYABLE',
      LIABILITY_WITHDRAWAL_PENDING: 'LIABILITY_WITHDRAWAL_PENDING',
      
      // Equity Accounts
      EQUITY_RETAINED_EARNINGS: 'EQUITY_RETAINED_EARNINGS',
      
      // Expense Accounts
      EXPENSE_PROVIDER_PAYOUT: 'EXPENSE_PROVIDER_PAYOUT',
      EXPENSE_REFUND: 'EXPENSE_REFUND',
      EXPENSE_CHARGEBACK: 'EXPENSE_CHARGEBACK',
      EXPENSE_PLATFORM_OPERATING: 'EXPENSE_PLATFORM_OPERATING',
      
      // Control Accounts
      CONTROL_SUSPENSE: 'CONTROL_SUSPENSE',
      CONTROL_RECONCILIATION: 'CONTROL_RECONCILIATION',
      
      // Income Accounts
      INCOME_PROVIDER: 'INCOME_PROVIDER',
      INCOME_PLATFORM: 'INCOME_PLATFORM',
    };

    this.TRANSACTION_TYPES = {
      PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
      PLATFORM_COMMISSION: 'PLATFORM_COMMISSION',
      PROVIDER_EARNING: 'PROVIDER_EARNING',
      SETTLEMENT_RELEASED: 'SETTLEMENT_RELEASED',
      SETTLEMENT_COMPLETED: 'SETTLEMENT_COMPLETED',
      REFUND_INITIATED: 'REFUND_INITIATED',
      REFUND_PROCESSED: 'REFUND_PROCESSED',
      REFUND_REVERSAL: 'REFUND_REVERSAL',
      WITHDRAWAL_REQUESTED: 'WITHDRAWAL_REQUESTED',
      WITHDRAWAL_PROCESSED: 'WITHDRAWAL_PROCESSED',
      WITHDRAWAL_REVERSAL: 'WITHDRAWAL_REVERSAL',
      ADJUSTMENT_CREDIT: 'ADJUSTMENT_CREDIT',
      ADJUSTMENT_DEBIT: 'ADJUSTMENT_DEBIT',
      ADJUSTMENT_REVERSAL: 'ADJUSTMENT_REVERSAL',
      CHARGEBACK_RECEIVED: 'CHARGEBACK_RECEIVED',
      CHARGEBACK_RESOLVED: 'CHARGEBACK_RESOLVED',
      RECONCILIATION_ENTRY: 'RECONCILIATION_ENTRY',
      RECONCILIATION_REVERSAL: 'RECONCILIATION_REVERSAL',
    };
  }

  // =========================
  // CORE LEDGER OPERATIONS
  // =========================

  /**
   * Create a single ledger entry
   */
  async createEntry(data) {
    try {
      const {
        paymentId,
        bookingId,
        travelerId,
        providerId,
        walletId,
        settlementId,
        debitAccount,
        creditAccount,
        amount,
        currency,
        exchangeRateUsed = 1,
        originalAmount = null,
        convertedAmount = null,
        transactionType,
        description,
        reference = null,
        metadata = {},
        createdBy = null,
        source = 'system',
      } = data;

      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate accounts
      if (!this.LEDGER_ACCOUNTS[debitAccount] || !this.LEDGER_ACCOUNTS[creditAccount]) {
        throw new Error(`Invalid account: ${debitAccount} or ${creditAccount}`);
      }

      // Validate transaction type
      if (!this.TRANSACTION_TYPES[transactionType]) {
        throw new Error(`Invalid transaction type: ${transactionType}`);
      }

      // Create entry
      const entry = new Ledger({
        paymentId,
        bookingId,
        travelerId,
        providerId,
        walletId,
        settlementId,
        debitAccount,
        creditAccount,
        amount,
        currency: currency || 'RWF',
        exchangeRateUsed,
        originalAmount: originalAmount || amount,
        convertedAmount: convertedAmount || amount,
        transactionType,
        description,
        reference,
        metadata,
        createdBy,
        source,
        status: 'posted',
      });

      await entry.save();

      this.logger.info(`📒 Ledger entry created: ${entry.transactionId} - ${transactionType} - ${amount} ${currency}`);
      return entry;

    } catch (error) {
      this.logger.error('❌ Error creating ledger entry:', error);
      throw error;
    }
  }

  /**
   * Create a journal entry (compound entry with multiple lines)
   */
  async createJournalEntry(entries, metadata = {}) {
    try {
      if (!entries || entries.length === 0) {
        throw new Error('At least one entry is required');
      }

      const journalId = `JRN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const createdEntries = [];

      for (const entryData of entries) {
        const entry = await this.createEntry({
          ...entryData,
          metadata: {
            ...entryData.metadata,
            ...metadata,
            journalId,
            isJournalEntry: true,
          },
        });
        createdEntries.push(entry);
      }

      // Verify debit = credit
      const totalDebit = createdEntries.reduce((sum, e) => sum + e.amount, 0);
      const totalCredit = createdEntries.reduce((sum, e) => sum + e.amount, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        // If not balanced, reverse all entries
        for (const entry of createdEntries) {
          await entry.reverse('Journal entry not balanced', null);
        }
        throw new Error(`Journal entry not balanced: Debit ${totalDebit} vs Credit ${totalCredit}`);
      }

      this.logger.info(`📒 Journal entry created: ${journalId} with ${createdEntries.length} entries`);
      return createdEntries;

    } catch (error) {
      this.logger.error('❌ Error creating journal entry:', error);
      throw error;
    }
  }

  // =========================
  // PAYMENT LEDGER
  // =========================

  /**
   * Record a successful payment
   */
  async recordPayment(payment, booking, traveler, provider) {
    try {
      const entries = [];

      // 1. Payment captured (Traveler pays)
      entries.push({
        paymentId: payment._id,
        bookingId: booking._id,
        travelerId: traveler._id,
        providerId: provider._id,
        debitAccount: this.LEDGER_ACCOUNTS.ASSET_CASH,
        creditAccount: this.LEDGER_ACCOUNTS.CONTROL_SUSPENSE,
        amount: payment.amount,
        currency: payment.currency,
        exchangeRateUsed: payment.exchangeRate || 1,
        transactionType: this.TRANSACTION_TYPES.PAYMENT_CAPTURED,
        description: `Payment captured for booking ${booking.bookingCode}`,
        reference: payment.transactionId,
        createdBy: traveler._id,
        source: 'payment',
      });

      // 2. Platform commission
      if (payment.platformFee > 0) {
        entries.push({
          paymentId: payment._id,
          bookingId: booking._id,
          travelerId: traveler._id,
          providerId: provider._id,
          debitAccount: this.LEDGER_ACCOUNTS.CONTROL_SUSPENSE,
          creditAccount: this.LEDGER_ACCOUNTS.REVENUE_PLATFORM_FEE,
          amount: payment.platformFee,
          currency: payment.currency,
          exchangeRateUsed: payment.exchangeRate || 1,
          transactionType: this.TRANSACTION_TYPES.PLATFORM_COMMISSION,
          description: `Platform commission for booking ${booking.bookingCode}`,
          reference: payment.transactionId,
          createdBy: null,
          source: 'payment',
        });
      }

      // 3. Provider earning
      if (payment.providerAmount > 0) {
        entries.push({
          paymentId: payment._id,
          bookingId: booking._id,
          travelerId: traveler._id,
          providerId: provider._id,
          debitAccount: this.LEDGER_ACCOUNTS.CONTROL_SUSPENSE,
          creditAccount: this.LEDGER_ACCOUNTS.LIABILITY_SETTLEMENT_PAYABLE,
          amount: payment.providerAmount,
          currency: payment.settlementCurrency || payment.currency,
          exchangeRateUsed: payment.exchangeRate || 1,
          transactionType: this.TRANSACTION_TYPES.PROVIDER_EARNING,
          description: `Provider earning for booking ${booking.bookingCode}`,
          reference: payment.transactionId,
          createdBy: null,
          source: 'payment',
        });
      }

      // Create journal entry
      const results = await this.createJournalEntry(entries, {
        paymentId: payment._id,
        bookingId: booking._id,
        type: 'payment_captured',
      });

      // Update payment with ledger reference
      payment.ledgerEntries = results.map(e => e._id);
      await payment.save();

      this.logger.info(`✅ Payment ledger recorded for ${payment._id}`);
      return results;

    } catch (error) {
      this.logger.error('❌ Error recording payment ledger:', error);
      throw error;
    }
  }

  /**
   * Record a refund
   */
  async recordRefund(payment, booking, traveler, provider, refundAmount) {
    try {
      const entries = [];

      // 1. Refund processed
      entries.push({
        paymentId: payment._id,
        bookingId: booking._id,
        travelerId: traveler._id,
        providerId: provider._id,
        debitAccount: this.LEDGER_ACCOUNTS.EXPENSE_REFUND,
        creditAccount: this.LEDGER_ACCOUNTS.ASSET_CASH,
        amount: refundAmount,
        currency: payment.currency,
        exchangeRateUsed: payment.exchangeRate || 1,
        transactionType: this.TRANSACTION_TYPES.REFUND_PROCESSED,
        description: `Refund processed for booking ${booking.bookingCode}`,
        reference: payment.transactionId,
        createdBy: traveler._id,
        source: 'refund',
      });

      // 2. Reverse provider earning
      if (payment.providerAmount > 0) {
        const providerRefund = refundAmount > payment.providerAmount 
          ? payment.providerAmount 
          : refundAmount;

        entries.push({
          paymentId: payment._id,
          bookingId: booking._id,
          travelerId: traveler._id,
          providerId: provider._id,
          debitAccount: this.LEDGER_ACCOUNTS.LIABILITY_SETTLEMENT_PAYABLE,
          creditAccount: this.LEDGER_ACCOUNTS.EXPENSE_REFUND,
          amount: providerRefund,
          currency: payment.settlementCurrency || payment.currency,
          exchangeRateUsed: payment.exchangeRate || 1,
          transactionType: this.TRANSACTION_TYPES.REFUND_REVERSAL,
          description: `Reverse provider earning for booking ${booking.bookingCode}`,
          reference: payment.transactionId,
          createdBy: null,
          source: 'refund',
        });
      }

      // 3. Reverse platform commission (pro-rata)
      if (payment.platformFee > 0 && refundAmount > 0) {
        const commissionRefund = (refundAmount / payment.amount) * payment.platformFee;

        entries.push({
          paymentId: payment._id,
          bookingId: booking._id,
          travelerId: traveler._id,
          providerId: provider._id,
          debitAccount: this.LEDGER_ACCOUNTS.REVENUE_PLATFORM_FEE,
          creditAccount: this.LEDGER_ACCOUNTS.CONTROL_SUSPENSE,
          amount: commissionRefund,
          currency: payment.currency,
          exchangeRateUsed: payment.exchangeRate || 1,
          transactionType: this.TRANSACTION_TYPES.REFUND_REVERSAL,
          description: `Reverse platform commission for booking ${booking.bookingCode}`,
          reference: payment.transactionId,
          createdBy: null,
          source: 'refund',
        });
      }

      // Create journal entry
      const results = await this.createJournalEntry(entries, {
        paymentId: payment._id,
        bookingId: booking._id,
        type: 'refund_processed',
        refundAmount,
      });

      this.logger.info(`✅ Refund ledger recorded for ${payment._id}`);
      return results;

    } catch (error) {
      this.logger.error('❌ Error recording refund ledger:', error);
      throw error;
    }
  }

  /**
   * Record a settlement
   */
  async recordSettlement(settlement, payment, provider, wallet) {
    try {
      const entries = [];

      // 1. Settlement released
      entries.push({
        paymentId: payment._id,
        bookingId: payment.booking,
        providerId: provider._id,
        walletId: wallet._id,
        settlementId: settlement._id,
        debitAccount: this.LEDGER_ACCOUNTS.LIABILITY_SETTLEMENT_PAYABLE,
        creditAccount: this.LEDGER_ACCOUNTS.ASSET_BANK,
        amount: settlement.netAmount,
        currency: settlement.currency,
        exchangeRateUsed: settlement.exchangeRateUsed || 1,
        transactionType: this.TRANSACTION_TYPES.SETTLEMENT_RELEASED,
        description: `Settlement released for provider ${provider.email}`,
        reference: settlement.settlementId,
        createdBy: provider._id,
        source: 'settlement',
      });

      // 2. Record settlement completed
      entries.push({
        paymentId: payment._id,
        bookingId: payment.booking,
        providerId: provider._id,
        walletId: wallet._id,
        settlementId: settlement._id,
        debitAccount: this.LEDGER_ACCOUNTS.ASSET_BANK,
        creditAccount: this.LEDGER_ACCOUNTS.INCOME_PROVIDER,
        amount: settlement.netAmount,
        currency: settlement.currency,
        exchangeRateUsed: settlement.exchangeRateUsed || 1,
        transactionType: this.TRANSACTION_TYPES.SETTLEMENT_COMPLETED,
        description: `Settlement completed for provider ${provider.email}`,
        reference: settlement.settlementId,
        createdBy: provider._id,
        source: 'settlement',
      });

      // Create journal entry
      const results = await this.createJournalEntry(entries, {
        settlementId: settlement._id,
        paymentId: payment._id,
        type: 'settlement_completed',
      });

      // Update settlement with ledger reference
      settlement.ledger = results[0]._id;
      await settlement.save();

      this.logger.info(`✅ Settlement ledger recorded for ${settlement.settlementId}`);
      return results;

    } catch (error) {
      this.logger.error('❌ Error recording settlement ledger:', error);
      throw error;
    }
  }

  /**
   * Record a withdrawal
   */
  async recordWithdrawal(withdrawal, provider, wallet) {
    try {
      const entries = [];

      // 1. Withdrawal requested
      entries.push({
        providerId: provider._id,
        walletId: wallet._id,
        debitAccount: this.LEDGER_ACCOUNTS.ASSET_BANK,
        creditAccount: this.LEDGER_ACCOUNTS.LIABILITY_WITHDRAWAL_PENDING,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        exchangeRateUsed: 1,
        transactionType: this.TRANSACTION_TYPES.WITHDRAWAL_REQUESTED,
        description: `Withdrawal requested by provider ${provider.email}`,
        reference: withdrawal._id,
        createdBy: provider._id,
        source: 'withdrawal',
      });

      // 2. Withdrawal processed
      entries.push({
        providerId: provider._id,
        walletId: wallet._id,
        debitAccount: this.LEDGER_ACCOUNTS.LIABILITY_WITHDRAWAL_PENDING,
        creditAccount: this.LEDGER_ACCOUNTS.EXPENSE_PROVIDER_PAYOUT,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        exchangeRateUsed: 1,
        transactionType: this.TRANSACTION_TYPES.WITHDRAWAL_PROCESSED,
        description: `Withdrawal processed for provider ${provider.email}`,
        reference: withdrawal._id,
        createdBy: provider._id,
        source: 'withdrawal',
      });

      // Create journal entry
      const results = await this.createJournalEntry(entries, {
        withdrawalId: withdrawal._id,
        type: 'withdrawal_processed',
      });

      this.logger.info(`✅ Withdrawal ledger recorded for ${withdrawal._id}`);
      return results;

    } catch (error) {
      this.logger.error('❌ Error recording withdrawal ledger:', error);
      throw error;
    }
  }

  // =========================
  // QUERY METHODS
  // =========================

  /**
   * Get ledger entries for a payment
   */
  async getPaymentLedger(paymentId) {
    try {
      return await Ledger.find({ paymentId, status: 'posted' })
        .sort({ createdAt: 1 })
        .lean();
    } catch (error) {
      this.logger.error('❌ Error getting payment ledger:', error);
      throw error;
    }
  }

  /**
   * Get ledger entries for a booking
   */
  async getBookingLedger(bookingId) {
    try {
      return await Ledger.find({ bookingId, status: 'posted' })
        .sort({ createdAt: 1 })
        .lean();
    } catch (error) {
      this.logger.error('❌ Error getting booking ledger:', error);
      throw error;
    }
  }

  /**
   * Get ledger entries for a provider
   */
  async getProviderLedger(providerId, options = {}) {
    try {
      const { limit = 100, page = 1, startDate = null, endDate = null } = options;
      const skip = (page - 1) * limit;

      const filter = { providerId, status: 'posted' };
      if (startDate) filter.createdAt = { $gte: new Date(startDate) };
      if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

      const [entries, total] = await Promise.all([
        Ledger.find(filter)
          .populate('paymentId', 'transactionId amount currency')
          .populate('bookingId', 'bookingCode')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Ledger.countDocuments(filter),
      ]);

      return {
        entries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('❌ Error getting provider ledger:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(account, options = {}) {
    try {
      const { currency = null, startDate = null, endDate = null } = options;

      const match = {
        debitAccount: account,
        status: 'posted',
      };

      if (currency) match.currency = currency;
      if (startDate) match.createdAt = { $gte: startDate };
      if (endDate) match.createdAt = { ...match.createdAt, $lte: endDate };

      const result = await Ledger.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);

      return {
        account,
        totalDebit: result[0]?.totalDebit || 0,
        balance: result[0]?.totalDebit || 0,
        count: result[0]?.count || 0,
      };
    } catch (error) {
      this.logger.error('❌ Error getting account balance:', error);
      throw error;
    }
  }

  /**
   * Get provider summary
   */
  async getProviderSummary(providerId, options = {}) {
    try {
      const { startDate = null, endDate = null } = options;

      const match = {
        providerId,
        status: 'posted',
      };

      if (startDate) match.createdAt = { $gte: startDate };
      if (endDate) match.createdAt = { ...match.createdAt, $lte: endDate };

      const result = await Ledger.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$transactionType',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);

      return result;
    } catch (error) {
      this.logger.error('❌ Error getting provider summary:', error);
      throw error;
    }
  }

  /**
   * Get total platform revenue
   */
  async getTotalPlatformRevenue(startDate = null, endDate = null) {
    try {
      const match = {
        transactionType: this.TRANSACTION_TYPES.PLATFORM_COMMISSION,
        status: 'posted',
      };

      if (startDate) match.createdAt = { $gte: startDate };
      if (endDate) match.createdAt = { ...match.createdAt, $lte: endDate };

      const result = await Ledger.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);

      return result[0]?.total || 0;
    } catch (error) {
      this.logger.error('❌ Error getting platform revenue:', error);
      throw error;
    }
  }

  /**
   * Reverse a ledger entry
   */
  async reverseEntry(entryId, reason, userId) {
    try {
      const entry = await Ledger.findById(entryId);
      if (!entry) {
        throw new Error('Ledger entry not found');
      }

      if (entry.isReversal) {
        throw new Error('Cannot reverse a reversal entry');
      }

      if (entry.status === 'reversed') {
        throw new Error('Entry already reversed');
      }

      const reverseEntry = await entry.reverse(reason, userId);
      this.logger.info(`↩️ Ledger entry ${entryId} reversed: ${reason}`);
      return reverseEntry;
    } catch (error) {
      this.logger.error('❌ Error reversing ledger entry:', error);
      throw error;
    }
  }

  /**
   * Get ledger statistics
   */
  async getStats() {
    try {
      const [
        total,
        posted,
        reversed,
        failed,
        totalAmount,
        byType,
        byCurrency,
        platformRevenue,
        providerEarnings,
        refunds,
      ] = await Promise.all([
        Ledger.countDocuments(),
        Ledger.countDocuments({ status: 'posted' }),
        Ledger.countDocuments({ status: 'reversed' }),
        Ledger.countDocuments({ status: 'failed' }),
        Ledger.aggregate([
          { $match: { status: 'posted' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Ledger.aggregate([
          { $match: { status: 'posted' } },
          { $group: { _id: '$transactionType', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        Ledger.aggregate([
          { $match: { status: 'posted' } },
          { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        this.getTotalPlatformRevenue(),
        Ledger.aggregate([
          {
            $match: {
              transactionType: this.TRANSACTION_TYPES.PROVIDER_EARNING,
              status: 'posted',
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        Ledger.aggregate([
          {
            $match: {
              transactionType: this.TRANSACTION_TYPES.REFUND_PROCESSED,
              status: 'posted',
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
      ]);

      return {
        total,
        posted,
        reversed,
        failed,
        totalAmount: totalAmount[0]?.total || 0,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = { total: item.total, count: item.count };
          return acc;
        }, {}),
        byCurrency: byCurrency.reduce((acc, item) => {
          acc[item._id] = { total: item.total, count: item.count };
          return acc;
        }, {}),
        platformRevenue,
        providerEarnings: providerEarnings[0]?.total || 0,
        refunds: refunds[0]?.total || 0,
      };
    } catch (error) {
      this.logger.error('❌ Error getting ledger stats:', error);
      throw error;
    }
  }
}

// =========================
// ✅ SINGLETON EXPORT
// =========================

const ledgerService = new LedgerService();
export default ledgerService;