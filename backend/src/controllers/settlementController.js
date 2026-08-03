// backend/src/controllers/settlementController.js
// ✅ FIXED - Added alias methods for frontend compatibility

import Settlement from "../models/Settlement.js";
import settlementQueueService from "../services/settlementQueueService.js";
import ledgerService from "../services/ledgerService.js";
import { createNotification } from "../utils/notificationService.js";

// ============================================================
// ✅ GET SETTLEMENTS (Admin)
// ============================================================

export const getSettlements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = null,
      providerId = null,
      startDate = null,
      endDate = null,
      search = null,
    } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (providerId) filter.provider = providerId;
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

    if (search) {
      filter.$or = [
        { settlementId: { $regex: search, $options: 'i' } },
        { 'provider.name': { $regex: search, $options: 'i' } },
        { 'provider.businessName': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [settlements, total] = await Promise.all([
      Settlement.find(filter)
        .populate('provider', 'name email businessName')
        .populate('payment', 'transactionId amount currency status')
        .populate('booking', 'bookingCode')
        .populate('wallet', 'balances currency')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Settlement.countDocuments(filter),
    ]);

    // Get summary
    const summary = await Settlement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalNetAmount: { $sum: '$netAmount' },
          totalFee: { $sum: '$settlementFee' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      settlements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: summary[0] || {
        totalAmount: 0,
        totalNetAmount: 0,
        totalFee: 0,
        count: 0,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching settlements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch settlements',
    });
  }
};

// ✅ ALIAS for frontend compatibility
export const getAllSettlements = getSettlements;

// ============================================================
// ✅ GET SETTLEMENT BY ID
// ============================================================

export const getSettlement = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await settlementQueueService.getSettlement(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      settlement: result.settlement,
    });
  } catch (error) {
    console.error('❌ Error fetching settlement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch settlement',
    });
  }
};

// ✅ ALIAS for frontend compatibility
export const getSettlementById = getSettlement;

// ============================================================
// ✅ GET PROVIDER SETTLEMENTS
// ============================================================

export const getProviderSettlements = async (req, res) => {
  try {
    const providerId = req.user._id;
    const { page = 1, limit = 20, status = null, startDate = null, endDate = null } = req.query;

    const result = await settlementQueueService.getProviderSettlements(providerId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      startDate,
      endDate,
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
    console.error('❌ Error fetching provider settlements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch provider settlements',
    });
  }
};

// ============================================================
// ✅ CREATE SETTLEMENT (Admin)
// ============================================================

export const createSettlement = async (req, res) => {
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
      metadata = {},
    } = req.body;

    if (!paymentId || !providerId || !bookingId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID, provider ID, booking ID, and amount are required',
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create settlements',
      });
    }

    const result = await settlementQueueService.createSettlement({
      paymentId,
      providerId,
      bookingId,
      amount,
      currency: currency || 'RWF',
      exchangeRateUsed: exchangeRateUsed || 1,
      settlementFee,
      netAmount: netAmount || amount - settlementFee,
      scheduledDate,
      paymentMethod: paymentMethod || 'bank_transfer',
      createdBy: req.user._id,
      metadata: {
        ...metadata,
        createdBy: req.user.email,
        createdByAdmin: true,
      },
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    // Log action
    console.log(`📊 Admin ${req.user.email} created settlement: ${result.settlement.settlementId}`);

    res.status(201).json({
      success: true,
      message: 'Settlement created successfully',
      settlement: result.settlement,
    });
  } catch (error) {
    console.error('❌ Error creating settlement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create settlement',
    });
  }
};

// ============================================================
// ✅ CREATE BULK SETTLEMENTS (Admin)
// ============================================================

export const createBulkSettlements = async (req, res) => {
  try {
    const { payments, providerId } = req.body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payments array is required',
      });
    }

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID is required',
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create bulk settlements',
      });
    }

    const result = await settlementQueueService.createBulkSettlements(payments, providerId);

    res.status(201).json({
      success: true,
      message: `Created ${result.created} settlements, ${result.failed} failed`,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error creating bulk settlements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create bulk settlements',
    });
  }
};

// ============================================================
// ✅ PROCESS SETTLEMENTS (Admin) - Bulk
// ============================================================

export const processSettlements = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can process settlements',
      });
    }

    const { batchSize = 50 } = req.query;

    const result = await settlementQueueService.processPendingSettlements(parseInt(batchSize));

    res.json({
      success: true,
      message: `Processed ${result.processed} settlements, ${result.failed} failed`,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error processing settlements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process settlements',
    });
  }
};

// ✅ ALIAS for single settlement processing (frontend compatibility)
export const processSettlement = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can process settlements',
      });
    }

    const result = await settlementQueueService.processSettlement(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Settlement processed successfully',
      settlement: result.settlement,
    });
  } catch (error) {
    console.error('❌ Error processing settlement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process settlement',
    });
  }
};

// ============================================================
// ✅ PROCESS PROVIDER SETTLEMENTS (Admin)
// ============================================================

export const processProviderSettlements = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can process settlements',
      });
    }

    const result = await settlementQueueService.processProviderSettlements(providerId);

    res.json({
      success: true,
      message: `Processed ${result.processed || 0} settlements for provider ${providerId}`,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error processing provider settlements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process provider settlements',
    });
  }
};

// ============================================================
// ✅ PROCESS OVERDUE SETTLEMENTS (Admin)
// ============================================================

export const processOverdueSettlements = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can process overdue settlements',
      });
    }

    const result = await settlementQueueService.processOverdueSettlements();

    res.json({
      success: true,
      message: `Processed ${result.processed || 0} overdue settlements`,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error processing overdue settlements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process overdue settlements',
    });
  }
};

// ============================================================
// ✅ RETRY SETTLEMENT (Admin)
// ============================================================

export const retrySettlement = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can retry settlements',
      });
    }

    const result = await settlementQueueService.retrySettlement(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Settlement scheduled for retry',
      settlement: result.settlement,
    });
  } catch (error) {
    console.error('❌ Error retrying settlement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retry settlement',
    });
  }
};

// ============================================================
// ✅ RETRY ALL FAILED SETTLEMENTS (Admin)
// ============================================================

export const retryAllFailedSettlements = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can retry failed settlements',
      });
    }

    const result = await settlementQueueService.retryAllFailedSettlements();

    res.json({
      success: true,
      message: `Retried ${result.retried || 0} failed settlements`,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error retrying failed settlements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retry failed settlements',
    });
  }
};

// ============================================================
// ✅ CANCEL SETTLEMENT (Admin)
// ============================================================

export const cancelSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'No reason provided' } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can cancel settlements',
      });
    }

    const result = await settlementQueueService.cancelSettlement(id, reason, req.user._id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Settlement cancelled successfully',
      settlement: result.settlement,
    });
  } catch (error) {
    console.error('❌ Error cancelling settlement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel settlement',
    });
  }
};

// ============================================================
// ✅ HOLD SETTLEMENT (Admin)
// ============================================================

export const holdSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'No reason provided' } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can hold settlements',
      });
    }

    const result = await settlementQueueService.holdSettlement(id, reason, req.user._id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Settlement placed on hold',
      settlement: result.settlement,
    });
  } catch (error) {
    console.error('❌ Error holding settlement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to hold settlement',
    });
  }
};

// ============================================================
// ✅ RELEASE SETTLEMENT FROM HOLD (Admin)
// ============================================================

export const releaseSettlementFromHold = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can release settlements from hold',
      });
    }

    const result = await settlementQueueService.releaseFromHold(id, req.user._id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Settlement released from hold',
      settlement: result.settlement,
    });
  } catch (error) {
    console.error('❌ Error releasing settlement from hold:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to release settlement from hold',
    });
  }
};

// ✅ ALIAS for frontend compatibility
export const releaseSettlement = releaseSettlementFromHold;

// ============================================================
// ✅ SCHEDULE SETTLEMENT (Admin)
// ============================================================

export const scheduleSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDate } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date is required',
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can schedule settlements',
      });
    }

    const result = await settlementQueueService.scheduleSettlement(
      id,
      new Date(scheduledDate),
      req.user._id
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Settlement scheduled successfully',
      settlement: result.settlement,
    });
  } catch (error) {
    console.error('❌ Error scheduling settlement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to schedule settlement',
    });
  }
};

// ============================================================
// ✅ GET SETTLEMENT STATS (Admin)
// ============================================================

export const getSettlementStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const result = await settlementQueueService.getStats();

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
    console.error('❌ Error fetching settlement stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch settlement stats',
    });
  }
};

// ============================================================
// ✅ GET SETTLEMENT QUEUE STATUS (Admin)
// ============================================================

export const getSettlementQueueStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const result = await settlementQueueService.getQueueStatus();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      queueStatus: result.queueStatus,
    });
  } catch (error) {
    console.error('❌ Error fetching queue status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch queue status',
    });
  }
};

// ============================================================
// ✅ RUN SCHEDULED SETTLEMENT PROCESSING (Admin)
// ============================================================

export const runScheduledProcessing = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const result = await settlementQueueService.runScheduledProcessing();

    res.json({
      success: true,
      message: 'Scheduled processing completed',
      pending: result.pending,
      overdue: result.overdue,
      retry: result.retry,
    });
  } catch (error) {
    console.error('❌ Error running scheduled processing:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to run scheduled processing',
    });
  }
};

// ============================================================
// ✅ EXPORT SETTLEMENTS CSV (Admin)
// ============================================================

export const exportSettlementsCSV = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { status = null, startDate = null, endDate = null, providerId = null } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (providerId) filter.provider = providerId;
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

    const settlements = await Settlement.find(filter)
      .populate('provider', 'name email businessName')
      .populate('payment', 'transactionId amount currency')
      .populate('booking', 'bookingCode')
      .sort({ createdAt: -1 })
      .lean();

    const csvData = settlements.map((s) => ({
      'Settlement ID': s.settlementId,
      Provider: s.provider?.name || s.provider?.businessName || 'N/A',
      'Provider Email': s.provider?.email || 'N/A',
      'Booking Code': s.booking?.bookingCode || 'N/A',
      'Payment ID': s.payment?.transactionId || 'N/A',
      Amount: s.amount,
      Currency: s.currency,
      'Settlement Fee': s.settlementFee,
      'Net Amount': s.netAmount,
      Status: s.status,
      'Scheduled Date': s.scheduledDate ? new Date(s.scheduledDate).toISOString() : '',
      'Processed Date': s.processedDate ? new Date(s.processedDate).toISOString() : '',
      'Completed Date': s.completedDate ? new Date(s.completedDate).toISOString() : '',
      'Payment Method': s.paymentMethod || 'N/A',
      'Created At': s.createdAt ? new Date(s.createdAt).toISOString() : '',
    }));

    const headers = Object.keys(csvData[0] || {});
    let csv = headers.join(',') + '\n';

    csvData.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csv += values.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=settlements-${new Date().toISOString().split('T')[0]}.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error('❌ Error exporting settlements CSV:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export settlements',
    });
  }
};

// ============================================================
// ✅ CLEANUP SETTLEMENTS (Admin)
// ============================================================

export const cleanupSettlements = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { daysToKeep = 90 } = req.query;

    const result = await settlementQueueService.cleanupOldSettlements(parseInt(daysToKeep));

    res.json({
      success: true,
      message: `Cleaned up ${result.deleted || 0} old settlements`,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error cleaning up settlements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clean up settlements',
    });
  }
};