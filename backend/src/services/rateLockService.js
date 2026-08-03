// backend/src/services/rateLockService.js
// ✅ NEW - Exchange Rate Lock Service for Production-Grade Financial System

import ExchangeRateLock from "../models/ExchangeRateLock.js";
import ExchangeRate from "../models/ExchangeRate.js";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import currencyService from "./currencyService.js";
import exchangeRateService from "./exchangeRateService.js";

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

class RateLockService {
  constructor() {
    this.DEFAULT_LOCK_DURATION = 30; // minutes
    this.MAX_LOCK_EXTENSIONS = 3;
    this.logger = logger;
    
    logger.info(`✅ Rate Lock Service initialized`);
    logger.info(`📊 Default lock duration: ${this.DEFAULT_LOCK_DURATION} minutes`);
    logger.info(`📊 Max lock extensions: ${this.MAX_LOCK_EXTENSIONS}`);
  }

  // =========================
  // RATE LOCK CREATION
  // =========================

  /**
   * Create a rate lock for a booking
   */
  async createRateLock(data) {
    try {
      const {
        booking,
        traveler,
        provider,
        baseCurrency = 'RWF',
        displayCurrency = 'USD',
        settlementCurrency = 'RWF',
        originalAmount,
        expiresAt,
        source = 'checkout',
        createdBy,
        metadata = {},
      } = data;

      // Validate required fields
      if (!booking || !traveler || !provider) {
        throw new Error('Booking, traveler, and provider are required');
      }

      // Check if active lock already exists for this booking
      const existingLock = await ExchangeRateLock.getActiveLock(booking);
      if (existingLock) {
        logger.warn(`⚠️ Active lock already exists for booking ${booking}`);
        return {
          success: false,
          error: 'Active lock already exists for this booking',
          lock: existingLock,
        };
      }

      // Get current exchange rate
      const rateResult = await exchangeRateService.getRateWithConversion(
        1, // Base amount
        displayCurrency,
        baseCurrency
      );

      if (!rateResult.success) {
        throw new Error(`Failed to get exchange rate: ${rateResult.error}`);
      }

      const lockedRate = rateResult.rate;
      const inverseRate = 1 / lockedRate;

      // Calculate converted amount
      const convertedAmount = originalAmount * lockedRate;
      const settlementAmount = originalAmount * lockedRate; // Using same rate for settlement

      // Calculate expiry
      const lockExpiry = expiresAt || new Date(Date.now() + this.DEFAULT_LOCK_DURATION * 60 * 1000);

      // Create lock
      const lock = await ExchangeRateLock.createLock({
        booking,
        traveler,
        provider,
        baseCurrency,
        displayCurrency,
        settlementCurrency,
        lockedRate,
        originalAmount,
        convertedAmount,
        settlementAmount,
        expiresAt: lockExpiry,
        source,
        createdBy,
        metadata: {
          ...metadata,
          inverseRate,
          rateSource: rateResult.source,
          effectiveDate: rateResult.effectiveDate,
          createdAt: new Date(),
        },
      });

      logger.info(`🔒 Rate lock created: ${lock.lockId} for booking ${booking}`);
      
      // Schedule expiration cleanup
      this.scheduleLockCleanup(lock);

      return {
        success: true,
        lock,
        rate: {
          lockedRate,
          inverseRate,
          displayCurrency,
          baseCurrency,
          settlementCurrency,
          expiresAt: lockExpiry,
        },
      };

    } catch (error) {
      logger.error('❌ Error creating rate lock:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a rate lock from payment data
   */
  async createLockFromPayment(payment) {
    try {
      const booking = await Booking.findById(payment.booking)
        .populate('user', 'name email')
        .populate('provider', 'name email businessName');

      if (!booking) {
        throw new Error('Booking not found');
      }

      return await this.createRateLock({
        booking: booking._id,
        traveler: booking.user._id,
        provider: booking.provider._id,
        baseCurrency: payment.currency || 'RWF',
        displayCurrency: payment.currency || 'USD',
        settlementCurrency: payment.settlementCurrency || 'RWF',
        originalAmount: payment.amount,
        source: 'payment',
        createdBy: booking.user._id,
        metadata: {
          paymentId: payment._id,
          paymentAmount: payment.amount,
          paymentCurrency: payment.currency,
        },
      });

    } catch (error) {
      logger.error('❌ Error creating lock from payment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // RATE LOCK VALIDATION
  // =========================

  /**
   * Validate a rate lock
   */
  async validateLock(lockId) {
    try {
      const lock = await ExchangeRateLock.findOne({ lockId });
      if (!lock) {
        return {
          valid: false,
          reason: 'Lock not found',
        };
      }

      const verification = lock.verify();
      if (!verification.valid) {
        return {
          valid: false,
          reason: verification.reason,
          lock,
        };
      }

      return {
        valid: true,
        lock,
      };
    } catch (error) {
      logger.error('❌ Error validating lock:', error);
      return {
        valid: false,
        reason: error.message,
      };
    }
  }

  /**
   * Validate lock for payment
   */
  async validateLockForPayment(lockId, paymentAmount) {
    try {
      const result = await this.validateLock(lockId);
      if (!result.valid) {
        return result;
      }

      const lock = result.lock;

      // Verify amount matches
      if (lock.originalAmount !== paymentAmount) {
        return {
          valid: false,
          reason: `Amount mismatch: lock amount ${lock.originalAmount}, payment amount ${paymentAmount}`,
          lock,
        };
      }

      return {
        valid: true,
        lock,
        rate: {
          lockedRate: lock.lockedRate,
          inverseRate: lock.inverseRate,
          displayCurrency: lock.displayCurrency,
          baseCurrency: lock.baseCurrency,
        },
      };
    } catch (error) {
      logger.error('❌ Error validating lock for payment:', error);
      return {
        valid: false,
        reason: error.message,
      };
    }
  }

  // =========================
  // RATE LOCK USAGE
  // =========================

  /**
   * Use a rate lock for payment
   */
  async useLockForPayment(lockId, paymentId) {
    try {
      const lock = await ExchangeRateLock.findOne({ lockId });
      if (!lock) {
        return {
          success: false,
          error: 'Lock not found',
        };
      }

      const validation = await this.validateLock(lockId);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason,
        };
      }

      // Mark lock as used
      await lock.markAsUsed(paymentId, {
        usedAt: new Date(),
        status: 'used',
      });

      logger.info(`✅ Rate lock ${lockId} used for payment ${paymentId}`);
      return {
        success: true,
        lock,
        rate: {
          lockedRate: lock.lockedRate,
          inverseRate: lock.inverseRate,
          displayCurrency: lock.displayCurrency,
          baseCurrency: lock.baseCurrency,
          settlementCurrency: lock.settlementCurrency,
        },
      };
    } catch (error) {
      logger.error('❌ Error using lock for payment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get lock rate for refund
   */
  async getLockForRefund(bookingId) {
    try {
      const lock = await ExchangeRateLock.findOne({
        booking: bookingId,
        status: 'used',
      }).sort({ lockedAt: -1 });

      if (!lock) {
        // If no used lock, try to find active lock
        const activeLock = await ExchangeRateLock.findOne({
          booking: bookingId,
          status: 'active',
        }).sort({ lockedAt: -1 });

        if (activeLock) {
          return {
            success: true,
            lock: activeLock,
            rate: activeLock.lockedRate,
            rateInfo: {
              lockedRate: activeLock.lockedRate,
              inverseRate: activeLock.inverseRate,
              displayCurrency: activeLock.displayCurrency,
              baseCurrency: activeLock.baseCurrency,
            },
          };
        }

        // If no lock exists, use current rate
        const currentRate = await exchangeRateService.getRate('USD', 'RWF');
        return {
          success: true,
          lock: null,
          rate: currentRate?.rate || 1,
          rateInfo: {
            lockedRate: currentRate?.rate || 1,
            inverseRate: 1 / (currentRate?.rate || 1),
            displayCurrency: 'USD',
            baseCurrency: 'RWF',
          },
        };
      }

      return {
        success: true,
        lock,
        rate: lock.lockedRate,
        rateInfo: {
          lockedRate: lock.lockedRate,
          inverseRate: lock.inverseRate,
          displayCurrency: lock.displayCurrency,
          baseCurrency: lock.baseCurrency,
        },
      };
    } catch (error) {
      logger.error('❌ Error getting lock for refund:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // RATE LOCK MANAGEMENT
  // =========================

  /**
   * Extend a rate lock
   */
  async extendLock(lockId, minutes = 30, userId = null) {
    try {
      const lock = await ExchangeRateLock.findOne({ lockId });
      if (!lock) {
        return {
          success: false,
          error: 'Lock not found',
        };
      }

      if (lock.status !== 'active') {
        return {
          success: false,
          error: `Cannot extend lock with status: ${lock.status}`,
        };
      }

      // Check extension limits
      const extensions = lock.metadata?.extensions || 0;
      if (extensions >= this.MAX_LOCK_EXTENSIONS) {
        return {
          success: false,
          error: `Maximum lock extensions (${this.MAX_LOCK_EXTENSIONS}) reached`,
        };
      }

      await lock.extendLock(minutes, userId);

      // Update metadata with extension count
      lock.metadata = {
        ...lock.metadata,
        extensions: extensions + 1,
        extensionHistory: [
          ...(lock.metadata?.extensionHistory || []),
          {
            extendedAt: new Date(),
            extendedBy: userId,
            minutes,
            newExpiry: lock.expiresAt,
          },
        ],
      };
      await lock.save();

      logger.info(`⏰ Rate lock ${lockId} extended by ${minutes} minutes`);
      return {
        success: true,
        lock,
        newExpiry: lock.expiresAt,
        extensionsUsed: extensions + 1,
      };
    } catch (error) {
      logger.error('❌ Error extending lock:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancel a rate lock
   */
  async cancelLock(lockId, reason, userId = null) {
    try {
      const lock = await ExchangeRateLock.findOne({ lockId });
      if (!lock) {
        return {
          success: false,
          error: 'Lock not found',
        };
      }

      if (lock.status === 'used') {
        return {
          success: false,
          error: 'Cannot cancel a used lock',
        };
      }

      await lock.cancel(reason, userId, {
        cancelledAt: new Date(),
      });

      logger.info(`🚫 Rate lock ${lockId} cancelled: ${reason}`);
      return {
        success: true,
        lock,
      };
    } catch (error) {
      logger.error('❌ Error cancelling lock:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mark lock as refunded
   */
  async markLockAsRefunded(lockId, refundLockId, refundAmount) {
    try {
      const lock = await ExchangeRateLock.findOne({ lockId });
      if (!lock) {
        return {
          success: false,
          error: 'Lock not found',
        };
      }

      if (lock.status !== 'used' && lock.status !== 'active') {
        return {
          success: false,
          error: `Cannot mark lock as refunded with status: ${lock.status}`,
        };
      }

      await lock.markAsRefunded(refundLockId, refundAmount, {
        refundedAt: new Date(),
      });

      logger.info(`🔄 Rate lock ${lockId} marked as refunded`);
      return {
        success: true,
        lock,
      };
    } catch (error) {
      logger.error('❌ Error marking lock as refunded:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // RATE LOCK CLEANUP
  // =========================

  /**
   * Schedule lock cleanup
   */
  scheduleLockCleanup(lock) {
    const timeUntilExpiry = lock.expiresAt - Date.now();
    if (timeUntilExpiry > 0) {
      setTimeout(async () => {
        try {
          await this.cleanupExpiredLock(lock.lockId);
        } catch (error) {
          logger.error(`❌ Error cleaning up lock ${lock.lockId}:`, error);
        }
      }, timeUntilExpiry + 1000);
    }
  }

  /**
   * Cleanup expired lock
   */
  async cleanupExpiredLock(lockId) {
    try {
      const lock = await ExchangeRateLock.findOne({ lockId });
      if (!lock) return;

      if (lock.status === 'active' && lock.expiresAt < new Date()) {
        lock.status = 'expired';
        lock.metadata = {
          ...lock.metadata,
          expiredAt: new Date(),
        };
        await lock.save();
        logger.info(`🧹 Rate lock ${lockId} expired and cleaned up`);
      }
    } catch (error) {
      logger.error(`❌ Error cleaning up lock ${lockId}:`, error);
    }
  }

  /**
   * Cleanup all expired locks
   */
  async cleanupExpiredLocks() {
    try {
      const expired = await ExchangeRateLock.getExpiredLocks();
      let count = 0;

      for (const lock of expired) {
        lock.status = 'expired';
        lock.metadata = {
          ...lock.metadata,
          expiredAt: new Date(),
        };
        await lock.save();
        count++;
      }

      logger.info(`🧹 Cleaned up ${count} expired rate locks`);
      return {
        success: true,
        cleaned: count,
      };
    } catch (error) {
      logger.error('❌ Error cleaning up expired locks:', error);
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
   * Get lock by ID
   */
  async getLock(lockId) {
    try {
      const lock = await ExchangeRateLock.findOne({ lockId })
        .populate('booking', 'bookingCode user')
        .populate('traveler', 'name email')
        .populate('provider', 'name email businessName')
        .lean();

      if (!lock) {
        return {
          success: false,
          error: 'Lock not found',
        };
      }

      return {
        success: true,
        lock,
      };
    } catch (error) {
      logger.error('❌ Error getting lock:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get lock for booking
   */
  async getLockForBooking(bookingId) {
    try {
      const lock = await ExchangeRateLock.getActiveLock(bookingId);
      if (!lock) {
        return {
          success: false,
          error: 'No active lock found for this booking',
        };
      }

      return {
        success: true,
        lock,
        rate: {
          lockedRate: lock.lockedRate,
          inverseRate: lock.inverseRate,
          displayCurrency: lock.displayCurrency,
          baseCurrency: lock.baseCurrency,
          settlementCurrency: lock.settlementCurrency,
          expiresAt: lock.expiresAt,
          timeRemaining: lock.timeRemaining,
        },
      };
    } catch (error) {
      logger.error('❌ Error getting lock for booking:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all locks for a provider
   */
  async getProviderLocks(providerId, options = {}) {
    try {
      const { status = null, page = 1, limit = 20 } = options;
      const filter = { provider: providerId };
      if (status) filter.status = status;

      const skip = (page - 1) * limit;

      const [locks, total] = await Promise.all([
        ExchangeRateLock.find(filter)
          .populate('booking', 'bookingCode')
          .populate('traveler', 'name email')
          .sort({ lockedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ExchangeRateLock.countDocuments(filter),
      ]);

      return {
        success: true,
        locks,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('❌ Error getting provider locks:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get lock statistics
   */
  async getStats() {
    try {
      const stats = await ExchangeRateLock.getStats();
      const byCurrencyPair = await ExchangeRateLock.getByCurrencyPair();

      return {
        success: true,
        stats: {
          ...stats,
          byCurrencyPair,
        },
      };
    } catch (error) {
      logger.error('❌ Error getting lock stats:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get active locks count
   */
  async getActiveLocksCount() {
    try {
      const count = await ExchangeRateLock.countDocuments({
        status: 'active',
        expiresAt: { $gt: new Date() },
      });

      return {
        success: true,
        count,
      };
    } catch (error) {
      logger.error('❌ Error getting active locks count:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // UTILITY METHODS
  // =========================

  /**
   * Get rate for display
   */
  getDisplayRate(lock) {
    return {
      rate: lock.lockedRate,
      display: `1 ${lock.displayCurrency} = ${lock.lockedRate} ${lock.baseCurrency}`,
      inverse: `1 ${lock.baseCurrency} = ${lock.inverseRate} ${lock.displayCurrency}`,
    };
  }

  /**
   * Format lock information for response
   */
  formatLockResponse(lock) {
    return {
      lockId: lock.lockId,
      status: lock.status,
      rate: {
        lockedRate: lock.lockedRate,
        inverseRate: lock.inverseRate,
        displayCurrency: lock.displayCurrency,
        baseCurrency: lock.baseCurrency,
        settlementCurrency: lock.settlementCurrency,
      },
      amounts: {
        original: lock.originalAmount,
        converted: lock.convertedAmount,
        settlement: lock.settlementAmount,
        formatted: {
          original: `${lock.originalAmount} ${lock.displayCurrency}`,
          converted: `${lock.convertedAmount} ${lock.baseCurrency}`,
          settlement: `${lock.settlementAmount} ${lock.settlementCurrency}`,
        },
      },
      timing: {
        lockedAt: lock.lockedAt,
        expiresAt: lock.expiresAt,
        timeRemaining: lock.timeRemaining,
        timeRemainingMinutes: lock.timeRemainingMinutes,
        isExpired: lock.isExpired,
        isValid: lock.isValid,
      },
      booking: lock.booking,
      traveler: lock.traveler,
      provider: lock.provider,
    };
  }

  /**
   * Validate rate for payment
   */
  validateRateForPayment(amount, currency, lock) {
    if (!lock) {
      return {
        valid: false,
        reason: 'No rate lock provided',
      };
    }

    if (lock.displayCurrency !== currency) {
      return {
        valid: false,
        reason: `Currency mismatch: lock currency ${lock.displayCurrency}, payment currency ${currency}`,
      };
    }

    // Allow small differences due to rounding
    const diff = Math.abs(lock.originalAmount - amount);
    if (diff > 0.01) {
      return {
        valid: false,
        reason: `Amount mismatch: lock amount ${lock.originalAmount}, payment amount ${amount}`,
      };
    }

    return {
      valid: true,
    };
  }
}

// =========================
// ✅ SINGLETON EXPORT
// =========================

const rateLockService = new RateLockService();

// Run cleanup every hour
setInterval(() => {
  rateLockService.cleanupExpiredLocks().catch(error => {
    logger.error('❌ Rate lock cleanup error:', error);
  });
}, 60 * 60 * 1000);

export default rateLockService;