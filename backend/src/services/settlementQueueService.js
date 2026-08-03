// backend/src/services/settlementQueueService.js
// ✅ FIXED - Settlement Queue Service for Production-Grade Financial System
// ✅ Fixed wallet method calls to use releasePendingFundsForSettlement
// ✅ Fixed status consistency: on_hold -> held
// ✅ Fixed wallet field references

import Settlement from "../models/Settlement.js";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import { createNotification } from "../utils/notificationService.js";
import ledgerService from "./ledgerService.js";
import walletService from "./walletService.js";

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

class SettlementQueueService {
  constructor() {
    this.DEFAULT_SETTLEMENT_DAYS = 3;
    this.MAX_RETRY_ATTEMPTS = 3;
    this.BATCH_SIZE = 50;
    this.RETRY_DELAYS = [1, 2, 4]; // hours
    this.logger = logger;
    this.isProcessing = false;
    
    logger.info(`✅ Settlement Queue Service initialized`);
    logger.info(`📊 Default settlement days: ${this.DEFAULT_SETTLEMENT_DAYS}`);
    logger.info(`📊 Batch size: ${this.BATCH_SIZE}`);
    logger.info(`📊 Max retry attempts: ${this.MAX_RETRY_ATTEMPTS}`);
  }

  // =========================
  // SETTLEMENT CREATION
  // =========================

  /**
   * Create a settlement from a payment
   */
  async createSettlement(data) {
    try {
      const {
        paymentId,
        providerId,
        bookingId,
        amount,
        currency,
        exchangeRateUsed,
        settlementFee = 0,
        netAmount,
        scheduledDate,
        paymentMethod,
        createdBy,
        metadata = {},
      } = data;

      // Validate required fields
      if (!paymentId || !providerId || !bookingId || !amount) {
        throw new Error('Payment ID, provider ID, booking ID, and amount are required');
      }

      // Get payment details
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      // Get provider wallet
      const walletResult = await walletService.getOrCreateWallet(providerId, 'provider', currency);
      if (!walletResult.success) {
        throw new Error(`Failed to get provider wallet: ${walletResult.error}`);
      }
      const wallet = walletResult.wallet;

      // Check if settlement already exists for this payment
      const existingSettlement = await Settlement.findOne({ payment: paymentId });
      if (existingSettlement) {
        logger.warn(`⚠️ Settlement already exists for payment ${paymentId}`);
        return {
          success: false,
          error: 'Settlement already exists for this payment',
          settlement: existingSettlement,
        };
      }

      // Calculate net amount if not provided
      const calculatedNetAmount = netAmount || (amount - settlementFee);

      // Calculate scheduled date
      const settlementDays = payment.metadata?.settlementDays || this.DEFAULT_SETTLEMENT_DAYS;
      const calculatedScheduledDate = scheduledDate || 
        new Date(Date.now() + settlementDays * 24 * 60 * 60 * 1000);

      // Create settlement
      const settlement = new Settlement({
        provider: providerId,
        payment: paymentId,
        booking: bookingId,
        wallet: wallet._id,
        amount,
        currency: currency || payment.currency || 'RWF',
        settlementFee,
        netAmount: calculatedNetAmount,
        exchangeRateUsed: exchangeRateUsed || payment.exchangeRate || 1,
        scheduledDate: calculatedScheduledDate,
        paymentMethod: paymentMethod || payment.paymentMethod || 'bank_transfer',
        status: 'pending',
        priority: 'normal',
        createdBy,
        metadata: {
          ...metadata,
          settlementDays,
          originalAmount: payment.amount,
          originalCurrency: payment.currency,
        },
      });

      await settlement.save();

      logger.info(`✅ Settlement created: ${settlement.settlementId} for payment ${paymentId}`);
      
      // ✅ FIXED: Use releasePendingFundsForSettlement for proper settlement handling
      await walletService.releasePendingFundsForSettlement(providerId, null, bookingId);

      // Create notification
      await this.sendSettlementCreatedNotification(settlement);

      return {
        success: true,
        settlement,
      };

    } catch (error) {
      logger.error('❌ Error creating settlement:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create settlements for multiple payments
   */
  async createBulkSettlements(payments, providerId) {
    try {
      const results = [];
      const errors = [];

      for (const payment of payments) {
        const result = await this.createSettlement({
          paymentId: payment._id,
          providerId: providerId,
          bookingId: payment.booking,
          amount: payment.providerAmount || payment.amount,
          currency: payment.settlementCurrency || payment.currency,
          exchangeRateUsed: payment.exchangeRate || 1,
          netAmount: payment.providerAmount || payment.amount,
          createdBy: providerId,
          metadata: { bulk: true },
        });

        if (result.success) {
          results.push(result.settlement);
        } else {
          errors.push({
            paymentId: payment._id,
            error: result.error,
          });
        }
      }

      return {
        success: true,
        created: results.length,
        failed: errors.length,
        settlements: results,
        errors,
      };

    } catch (error) {
      logger.error('❌ Error creating bulk settlements:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // SETTLEMENT PROCESSING
  // =========================

  /**
   * Process pending settlements
   */
  async processPendingSettlements(batchSize = this.BATCH_SIZE) {
    if (this.isProcessing) {
      logger.warn('⚠️ Settlement processing already in progress');
      return {
        success: false,
        error: 'Already processing',
      };
    }

    this.isProcessing = true;
    const results = [];
    const errors = [];

    try {
      // Get pending settlements
      const pending = await Settlement.getPending(batchSize);
      
      if (pending.length === 0) {
        logger.info('ℹ️ No pending settlements to process');
        return {
          success: true,
          processed: 0,
          message: 'No pending settlements',
        };
      }

      logger.info(`📊 Processing ${pending.length} pending settlements`);

      for (const settlement of pending) {
        try {
          const result = await this.processSettlement(settlement);
          if (result.success) {
            results.push(result);
          } else {
            errors.push({
              settlementId: settlement.settlementId,
              error: result.error,
            });
          }
        } catch (error) {
          logger.error(`❌ Error processing settlement ${settlement.settlementId}:`, error);
          errors.push({
            settlementId: settlement.settlementId,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors,
      };

    } catch (error) {
      logger.error('❌ Error processing settlements:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single settlement
   */
  async processSettlement(settlement) {
    try {
      // Verify settlement can be processed
      if (settlement.status === 'completed') {
        return {
          success: false,
          error: 'Settlement already completed',
          settlement,
        };
      }

      if (settlement.status === 'cancelled') {
        return {
          success: false,
          error: 'Settlement cancelled',
          settlement,
        };
      }

      if (settlement.amount <= 0) {
        await settlement.fail('Invalid amount', { processedAt: new Date() });
        return {
          success: false,
          error: 'Invalid amount',
          settlement,
        };
      }

      // Mark as processing
      await settlement.process({ processedAt: new Date() });

      // Get wallet
      const wallet = await Wallet.findById(settlement.wallet);
      if (!wallet) {
        await settlement.fail('Wallet not found', { processedAt: new Date() });
        return {
          success: false,
          error: 'Wallet not found',
          settlement,
        };
      }

      // ✅ FIXED: Use releasePendingFundsForSettlement for proper settlement handling
      const releaseResult = await walletService.releasePendingFundsForSettlement(
        settlement.provider,
        settlement.netAmount,
        settlement.booking
      );

      if (!releaseResult.success) {
        await settlement.fail(releaseResult.error, { processedAt: new Date() });
        return {
          success: false,
          error: releaseResult.error,
          settlement,
        };
      }

      // Record settlement in ledger
      const ledgerResult = await ledgerService.recordSettlement(
        settlement,
        await Payment.findById(settlement.payment),
        await User.findById(settlement.provider),
        wallet
      );

      // Mark as completed
      await settlement.complete(settlement.settlementId, {
        processedAt: new Date(),
        ledgerEntries: ledgerResult,
      });

      // Send notification
      await this.sendSettlementCompletedNotification(settlement);

      logger.info(`✅ Settlement ${settlement.settlementId} completed successfully`);
      return {
        success: true,
        settlement,
        wallet,
        ledgerResult,
      };

    } catch (error) {
      logger.error(`❌ Error processing settlement ${settlement.settlementId}:`, error);
      
      // Mark as failed
      try {
        await settlement.fail(error.message, { processedAt: new Date() });
      } catch (failError) {
        logger.error('❌ Error marking settlement as failed:', failError);
      }

      return {
        success: false,
        error: error.message,
        settlement,
      };
    }
  }

  // =========================
  // SETTLEMENT RETRY
  // =========================

  /**
   * Retry a failed settlement
   */
  async retrySettlement(settlementId) {
    try {
      const settlement = await Settlement.findById(settlementId);
      if (!settlement) {
        return {
          success: false,
          error: 'Settlement not found',
        };
      }

      if (settlement.status !== 'failed') {
        return {
          success: false,
          error: `Cannot retry settlement with status: ${settlement.status}`,
        };
      }

      if (!settlement.canRetry) {
        return {
          success: false,
          error: `Maximum retry attempts reached (${settlement.maxAttempts})`,
        };
      }

      await settlement.retry({ retriedAt: new Date() });

      logger.info(`🔄 Settlement ${settlement.settlementId} scheduled for retry`);
      return {
        success: true,
        settlement,
      };

    } catch (error) {
      logger.error('❌ Error retrying settlement:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Retry all failed settlements
   */
  async retryAllFailedSettlements() {
    try {
      const failed = await Settlement.find({ 
        status: 'failed',
        attempts: { $lt: this.MAX_RETRY_ATTEMPTS },
      });

      const results = [];
      for (const settlement of failed) {
        const result = await this.retrySettlement(settlement._id);
        results.push(result);
      }

      return {
        success: true,
        retried: results.filter(r => r.success).length,
        results,
      };

    } catch (error) {
      logger.error('❌ Error retrying failed settlements:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // SETTLEMENT MANAGEMENT
  // =========================

  /**
   * Cancel a settlement
   */
  async cancelSettlement(settlementId, reason, userId) {
    try {
      const settlement = await Settlement.findById(settlementId);
      if (!settlement) {
        return {
          success: false,
          error: 'Settlement not found',
        };
      }

      if (settlement.status === 'completed') {
        return {
          success: false,
          error: 'Cannot cancel a completed settlement',
        };
      }

      await settlement.cancel(reason, userId, { cancelledAt: new Date() });

      logger.info(`🚫 Settlement ${settlement.settlementId} cancelled: ${reason}`);
      return {
        success: true,
        settlement,
      };

    } catch (error) {
      logger.error('❌ Error cancelling settlement:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Put settlement on hold
   */
  async holdSettlement(settlementId, reason, userId) {
    try {
      const settlement = await Settlement.findById(settlementId);
      if (!settlement) {
        return {
          success: false,
          error: 'Settlement not found',
        };
      }

      if (settlement.status === 'completed') {
        return {
          success: false,
          error: 'Cannot hold a completed settlement',
        };
      }

      await settlement.hold(reason, userId, { heldAt: new Date() });

      logger.info(`⏸️ Settlement ${settlement.settlementId} placed on hold: ${reason}`);
      return {
        success: true,
        settlement,
      };

    } catch (error) {
      logger.error('❌ Error holding settlement:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Release settlement from hold
   */
  async releaseFromHold(settlementId, userId) {
    try {
      const settlement = await Settlement.findById(settlementId);
      if (!settlement) {
        return {
          success: false,
          error: 'Settlement not found',
        };
      }

      // ✅ FIXED: Use 'held' status (matches controller and model)
      if (settlement.status !== 'held') {
        return {
          success: false,
          error: 'Settlement is not on hold',
        };
      }

      await settlement.releaseFromHold(userId, { releasedAt: new Date() });

      logger.info(`▶️ Settlement ${settlement.settlementId} released from hold`);
      return {
        success: true,
        settlement,
      };

    } catch (error) {
      logger.error('❌ Error releasing settlement from hold:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Schedule a settlement for future processing
   */
  async scheduleSettlement(settlementId, scheduledDate, userId) {
    try {
      const settlement = await Settlement.findById(settlementId);
      if (!settlement) {
        return {
          success: false,
          error: 'Settlement not found',
        };
      }

      if (settlement.status !== 'pending' && settlement.status !== 'scheduled') {
        return {
          success: false,
          error: `Cannot schedule settlement with status: ${settlement.status}`,
        };
      }

      if (scheduledDate < new Date()) {
        return {
          success: false,
          error: 'Scheduled date must be in the future',
        };
      }

      await settlement.schedule(scheduledDate, userId, { scheduledAt: new Date() });

      logger.info(`📅 Settlement ${settlement.settlementId} scheduled for ${scheduledDate}`);
      return {
        success: true,
        settlement,
      };

    } catch (error) {
      logger.error('❌ Error scheduling settlement:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // QUERY METHODS
  // =========================

  /**
   * Get settlement by ID
   */
  async getSettlement(settlementId) {
    try {
      const settlement = await Settlement.findById(settlementId)
        .populate('provider', 'name email businessName')
        .populate('payment', 'transactionId amount currency status')
        .populate('booking', 'bookingCode')
        .populate('wallet', 'balances currency')
        .lean();

      if (!settlement) {
        return {
          success: false,
          error: 'Settlement not found',
        };
      }

      return {
        success: true,
        settlement,
      };
    } catch (error) {
      logger.error('❌ Error getting settlement:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get settlements for a provider
   */
  async getProviderSettlements(providerId, options = {}) {
    try {
      const { status = null, page = 1, limit = 20, startDate = null, endDate = null } = options;

      const filter = { provider: providerId };
      if (status) filter.status = status;
      if (startDate) filter.createdAt = { $gte: new Date(startDate) };
      if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

      const skip = (page - 1) * limit;

      const [settlements, total] = await Promise.all([
        Settlement.find(filter)
          .populate('payment', 'transactionId amount currency status')
          .populate('booking', 'bookingCode')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Settlement.countDocuments(filter),
      ]);

      return {
        success: true,
        settlements,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('❌ Error getting provider settlements:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get settlement statistics
   */
  async getStats() {
    try {
      const stats = await Settlement.getStats();
      
      // Get additional stats
      const [
        byCurrency,
        overdue,
        totalAmountByStatus,
        averageProcessingTime,
      ] = await Promise.all([
        Settlement.getByCurrency(),
        Settlement.getOverdue(),
        Settlement.aggregate([
          {
            $group: {
              _id: '$status',
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ]),
        Settlement.aggregate([
          {
            $match: {
              status: 'completed',
              processedDate: { $exists: true },
            },
          },
          {
            $project: {
              processingTime: {
                $subtract: ['$processedDate', '$createdAt'],
              },
            },
          },
          {
            $group: {
              _id: null,
              average: { $avg: '$processingTime' },
            },
          },
        ]),
      ]);

      return {
        success: true,
        stats: {
          ...stats,
          byCurrency,
          overdue: overdue.length,
          byStatus: totalAmountByStatus,
          averageProcessingTime: averageProcessingTime[0]?.average || 0,
        },
      };
    } catch (error) {
      logger.error('❌ Error getting settlement stats:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // NOTIFICATIONS
  // =========================

  /**
   * Send settlement created notification
   */
  async sendSettlementCreatedNotification(settlement) {
    try {
      const provider = await User.findById(settlement.provider);
      if (!provider) return;

      await createNotification({
        recipient: settlement.provider,
        type: 'settlement_created',
        title: 'Settlement Scheduled 📅',
        message: `A settlement of ${settlement.netAmount} ${settlement.currency} has been scheduled for ${new Date(settlement.scheduledDate).toLocaleDateString()}.`,
        data: {
          settlementId: settlement.settlementId,
          amount: settlement.netAmount,
          currency: settlement.currency,
          scheduledDate: settlement.scheduledDate,
        },
        link: `/provider/settlements/${settlement._id}`,
      });

      logger.info(`📧 Settlement created notification sent to provider ${settlement.provider}`);
    } catch (error) {
      logger.error('❌ Error sending settlement notification:', error);
    }
  }

  /**
   * Send settlement completed notification
   */
  async sendSettlementCompletedNotification(settlement) {
    try {
      const provider = await User.findById(settlement.provider);
      if (!provider) return;

      await createNotification({
        recipient: settlement.provider,
        type: 'settlement_completed',
        title: 'Settlement Completed ✅',
        message: `Your settlement of ${settlement.netAmount} ${settlement.currency} has been completed and funds are now available in your wallet.`,
        data: {
          settlementId: settlement.settlementId,
          amount: settlement.netAmount,
          currency: settlement.currency,
          completedDate: settlement.completedDate,
        },
        link: `/provider/settlements/${settlement._id}`,
      });

      logger.info(`📧 Settlement completed notification sent to provider ${settlement.provider}`);
    } catch (error) {
      logger.error('❌ Error sending settlement notification:', error);
    }
  }

  /**
   * Send settlement failed notification
   */
  async sendSettlementFailedNotification(settlement) {
    try {
      const provider = await User.findById(settlement.provider);
      if (!provider) return;

      await createNotification({
        recipient: settlement.provider,
        type: 'settlement_failed',
        title: 'Settlement Failed ❌',
        message: `A settlement of ${settlement.netAmount} ${settlement.currency} has failed. Please contact support.`,
        data: {
          settlementId: settlement.settlementId,
          amount: settlement.netAmount,
          currency: settlement.currency,
          failureReason: settlement.failureReason,
        },
        link: `/provider/settlements/${settlement._id}`,
      });

      logger.info(`📧 Settlement failed notification sent to provider ${settlement.provider}`);
    } catch (error) {
      logger.error('❌ Error sending settlement notification:', error);
    }
  }

  // =========================
  // MAINTENANCE
  // =========================

  /**
   * Clean up old settlements
   */
  async cleanupOldSettlements(daysToKeep = 90) {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysToKeep);

      const result = await Settlement.deleteMany({
        status: { $in: ['completed', 'cancelled'] },
        completedDate: { $lt: cutoff },
      });

      logger.info(`🧹 Cleaned up ${result.deletedCount} old settlements`);
      return {
        success: true,
        deleted: result.deletedCount,
      };
    } catch (error) {
      logger.error('❌ Error cleaning up settlements:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process overdue settlements
   */
  async processOverdueSettlements() {
    try {
      const overdue = await Settlement.getOverdue();
      
      if (overdue.length === 0) {
        return {
          success: true,
          processed: 0,
          message: 'No overdue settlements',
        };
      }

      logger.info(`⚠️ Found ${overdue.length} overdue settlements`);

      // Process overdue settlements immediately
      const results = [];
      for (const settlement of overdue) {
        // Update scheduled date to now
        settlement.scheduledDate = new Date();
        await settlement.save();
        
        // Process immediately
        const result = await this.processSettlement(settlement);
        results.push(result);
      }

      return {
        success: true,
        processed: results.filter(r => r.success).length,
        results,
      };
    } catch (error) {
      logger.error('❌ Error processing overdue settlements:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Run scheduled settlement processing
   */
  async runScheduledProcessing() {
    logger.info('🔄 Running scheduled settlement processing...');
    
    const [
      pendingResult,
      overdueResult,
      retryResult,
    ] = await Promise.all([
      this.processPendingSettlements(),
      this.processOverdueSettlements(),
      this.retryAllFailedSettlements(),
    ]);

    return {
      success: true,
      pending: pendingResult,
      overdue: overdueResult,
      retry: retryResult,
    };
  }

  /**
   * Process settlements for a specific provider
   */
  async processProviderSettlements(providerId) {
    try {
      const settlements = await Settlement.find({
        provider: providerId,
        status: { $in: ['pending', 'scheduled'] },
        scheduledDate: { $lte: new Date() },
      });

      if (settlements.length === 0) {
        return {
          success: true,
          processed: 0,
          message: 'No pending settlements for this provider',
        };
      }

      const results = [];
      for (const settlement of settlements) {
        const result = await this.processSettlement(settlement);
        results.push(result);
      }

      return {
        success: true,
        processed: results.filter(r => r.success).length,
        results,
      };
    } catch (error) {
      logger.error(`❌ Error processing provider settlements for ${providerId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get settlement queue status
   */
  async getQueueStatus() {
    try {
      const [
        pending,
        scheduled,
        processing,
        completed,
        failed,
        held,
      ] = await Promise.all([
        Settlement.countDocuments({ status: 'pending' }),
        Settlement.countDocuments({ status: 'scheduled' }),
        Settlement.countDocuments({ status: 'processing' }),
        Settlement.countDocuments({ status: 'completed' }),
        Settlement.countDocuments({ status: 'failed' }),
        // ✅ FIXED: Use 'held' instead of 'on_hold'
        Settlement.countDocuments({ status: 'held' }),
      ]);

      const total = pending + scheduled + processing + completed + failed + held;

      return {
        success: true,
        queueStatus: {
          total,
          pending,
          scheduled,
          processing,
          completed,
          failed,
          held,
          completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
          failureRate: total > 0 ? ((failed / total) * 100).toFixed(1) : 0,
        },
      };
    } catch (error) {
      logger.error('❌ Error getting queue status:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// =========================
// ✅ SINGLETON EXPORT
// =========================

const settlementQueueService = new SettlementQueueService();

// Run scheduled processing every 5 minutes
setInterval(() => {
  settlementQueueService.runScheduledProcessing().catch(error => {
    logger.error('❌ Scheduled processing error:', error);
  });
}, 5 * 60 * 1000);

// Run cleanup every day
setInterval(() => {
  settlementQueueService.cleanupOldSettlements(90).catch(error => {
    logger.error('❌ Cleanup error:', error);
  });
}, 24 * 60 * 60 * 1000);

export default settlementQueueService;