// backend/src/controllers/rateLockController.js
// ✅ NEW - Rate Lock Controller for Production-Grade Financial System

import ExchangeRateLock from "../models/ExchangeRateLock.js";
import rateLockService from "../services/rateLockService.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { createNotification } from "../utils/notificationService.js";

// ============================================================
// ✅ CREATE RATE LOCK
// ============================================================

export const createRateLock = async (req, res) => {
  try {
    const {
      bookingId,
      displayCurrency = 'USD',
      baseCurrency = 'RWF',
      settlementCurrency = 'RWF',
      expiresAt,
      metadata = {},
    } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required',
      });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('user', 'name email')
      .populate('provider', 'name email businessName');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user owns this booking or is admin
    const isOwner = booking.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get original amount from booking
    const originalAmount = booking.totalPrice || 0;

    if (originalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Booking total amount must be greater than 0',
      });
    }

    const result = await rateLockService.createRateLock({
      booking: bookingId,
      traveler: booking.user._id,
      provider: booking.provider._id,
      baseCurrency,
      displayCurrency,
      settlementCurrency,
      originalAmount,
      expiresAt,
      source: 'checkout',
      createdBy: req.user._id,
      metadata: {
        ...metadata,
        bookingCode: booking.bookingCode,
        createdBy: req.user.email,
      },
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    // Create notification for traveler
    await createNotification({
      recipient: booking.user._id,
      type: 'rate_lock_created',
      title: 'Exchange Rate Locked 🔒',
      message: `Your exchange rate has been locked at ${result.rate.lockedRate} ${displayCurrency}/${baseCurrency} for booking ${booking.bookingCode}.`,
      data: {
        lockId: result.lock.lockId,
        bookingId: booking._id,
        rate: result.rate.lockedRate,
        expiresAt: result.rate.expiresAt,
      },
      link: `/bookings/${booking._id}`,
    });

    res.status(201).json({
      success: true,
      message: 'Rate lock created successfully',
      lock: result.lock,
      rate: result.rate,
    });
  } catch (error) {
    console.error('❌ Error creating rate lock:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create rate lock',
    });
  }
};

// ============================================================
// ✅ GET RATE LOCK
// ============================================================

export const getRateLock = async (req, res) => {
  try {
    const { lockId } = req.params;

    const result = await rateLockService.getLock(lockId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    const lock = result.lock;

    // Check access
    const isTraveler = lock.traveler._id.toString() === req.user._id.toString();
    const isProvider = lock.provider._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isTraveler && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      lock: rateLockService.formatLockResponse(lock),
    });
  } catch (error) {
    console.error('❌ Error getting rate lock:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get rate lock',
    });
  }
};

// ============================================================
// ✅ GET RATE LOCK FOR BOOKING
// ============================================================

export const getRateLockForBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Get booking to verify ownership
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isOwner = booking.user.toString() === req.user._id.toString();
    const isProvider = booking.provider.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const result = await rateLockService.getLockForBooking(bookingId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      lock: rateLockService.formatLockResponse(result.lock),
      rate: result.rate,
    });
  } catch (error) {
    console.error('❌ Error getting rate lock for booking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get rate lock for booking',
    });
  }
};

// ============================================================
// ✅ GET PROVIDER RATE LOCKS
// ============================================================

export const getProviderRateLocks = async (req, res) => {
  try {
    const providerId = req.user._id;
    const { page = 1, limit = 20, status = null } = req.query;

    const result = await rateLockService.getProviderLocks(providerId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error getting provider rate locks:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get provider rate locks',
    });
  }
};

// ============================================================
// ✅ EXTEND RATE LOCK
// ============================================================

export const extendRateLock = async (req, res) => {
  try {
    const { lockId } = req.params;
    const { minutes = 30 } = req.body;

    const result = await rateLockService.getLock(lockId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    const lock = result.lock;

    // Check access
    const isTraveler = lock.traveler._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isTraveler && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the traveler or admin can extend a rate lock',
      });
    }

    const extendResult = await rateLockService.extendLock(lockId, minutes, req.user._id);

    if (!extendResult.success) {
      return res.status(400).json({
        success: false,
        message: extendResult.error,
      });
    }

    // Create notification
    await createNotification({
      recipient: lock.traveler._id,
      type: 'rate_lock_extended',
      title: 'Rate Lock Extended ⏰',
      message: `Your rate lock has been extended by ${minutes} minutes. New expiry: ${new Date(extendResult.newExpiry).toLocaleString()}`,
      data: {
        lockId: lock.lockId,
        newExpiry: extendResult.newExpiry,
        minutes: minutes,
      },
      link: `/bookings/${lock.booking}`,
    });

    res.json({
      success: true,
      message: `Rate lock extended by ${minutes} minutes`,
      lock: extendResult.lock,
      newExpiry: extendResult.newExpiry,
      extensionsUsed: extendResult.extensionsUsed,
    });
  } catch (error) {
    console.error('❌ Error extending rate lock:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to extend rate lock',
    });
  }
};

// ============================================================
// ✅ CANCEL RATE LOCK
// ============================================================

export const cancelRateLock = async (req, res) => {
  try {
    const { lockId } = req.params;
    const { reason = 'User requested cancellation' } = req.body;

    const result = await rateLockService.getLock(lockId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    const lock = result.lock;

    // Check access
    const isTraveler = lock.traveler._id.toString() === req.user._id.toString();
    const isProvider = lock.provider._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isTraveler && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const cancelResult = await rateLockService.cancelLock(lockId, reason, req.user._id);

    if (!cancelResult.success) {
      return res.status(400).json({
        success: false,
        message: cancelResult.error,
      });
    }

    // Create notification
    await createNotification({
      recipient: lock.traveler._id,
      type: 'rate_lock_cancelled',
      title: 'Rate Lock Cancelled 🚫',
      message: `Your rate lock for booking ${lock.booking?.bookingCode || lock.booking} has been cancelled.`,
      data: {
        lockId: lock.lockId,
        reason,
      },
      link: `/bookings/${lock.booking}`,
    });

    res.json({
      success: true,
      message: 'Rate lock cancelled successfully',
      lock: cancelResult.lock,
    });
  } catch (error) {
    console.error('❌ Error cancelling rate lock:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel rate lock',
    });
  }
};

// ============================================================
// ✅ VALIDATE RATE LOCK (Public)
// ============================================================

export const validateRateLock = async (req, res) => {
  try {
    const { lockId } = req.params;

    const result = await rateLockService.validateLock(lockId);

    res.json({
      success: true,
      valid: result.valid,
      reason: result.reason || null,
      lock: result.lock ? rateLockService.formatLockResponse(result.lock) : null,
    });
  } catch (error) {
    console.error('❌ Error validating rate lock:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to validate rate lock',
    });
  }
};

// ============================================================
// ✅ GET ACTIVE LOCKS COUNT (Public)
// ============================================================

export const getActiveLocksCount = async (req, res) => {
  try {
    const result = await rateLockService.getActiveLocksCount();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error('❌ Error getting active locks count:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get active locks count',
    });
  }
};

// ============================================================
// ✅ GET RATE LOCK STATS (Admin)
// ============================================================

export const getRateLockStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const result = await rateLockService.getStats();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      stats: result.stats,
    });
  } catch (error) {
    console.error('❌ Error getting rate lock stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get rate lock stats',
    });
  }
};

// ============================================================
// ✅ CLEANUP EXPIRED LOCKS (Admin)
// ============================================================

export const cleanupExpiredLocks = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const result = await rateLockService.cleanupExpiredLocks();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: `Cleaned up ${result.cleaned || 0} expired rate locks`,
      cleaned: result.cleaned,
    });
  } catch (error) {
    console.error('❌ Error cleaning up expired locks:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clean up expired locks',
    });
  }
};