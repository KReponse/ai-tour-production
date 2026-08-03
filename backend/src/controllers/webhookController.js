// backend/src/controllers/webhookController.js
// ✅ COMPLETE FIXED - All exports properly defined

import WebhookEvent from "../models/WebhookEvent.js";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import webhookIdempotencyService from "../services/webhookIdempotencyService.js";
import paymentService from "../services/paymentService.js";
import { createNotification } from "../utils/notificationService.js";

// ============================================================
// ✅ HANDLE WEBHOOK (Public)
// ============================================================

export const handleWebhook = async (req, res) => {
  try {
    const provider = req.params.provider || req.baseUrl.split('/').pop();
    const eventId = req.headers['x-event-id'] || 
                    req.headers['stripe-signature'] ||
                    req.headers['x-webhook-id'] ||
                    `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const signature = req.headers['stripe-signature'] || 
                      req.headers['x-signature'] || 
                      req.headers['x-hub-signature'] ||
                      req.headers['authorization'] ||
                      '';

    const rawBody = req.body;
    const rawHeaders = req.headers;

    // Get IP address
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '';

    // Determine event type
    let eventType = req.body?.type || req.body?.event || req.body?.eventType || 'unknown';
    
    // Extract payment reference
    let paymentReference = null;
    let paymentId = null;

    // Stripe
    if (req.body?.data?.object?.id) {
      paymentReference = req.body.data.object.id;
      if (req.body.data.object.metadata?.bookingId) {
        paymentId = req.body.data.object.metadata.bookingId;
      }
    }
    
    // MoMo / Airtel
    if (req.body?.transactionId) {
      paymentReference = req.body.transactionId;
    }
    
    // PayPal
    if (req.body?.resource?.id) {
      paymentReference = req.body.resource.id;
    }

    // Find payment by reference
    if (paymentReference) {
      const payment = await Payment.findOne({
        $or: [
          { stripeSessionId: paymentReference },
          { stripePaymentId: paymentReference },
          { transactionId: paymentReference },
          { 'metadata.momoReference': paymentReference },
          { 'metadata.airtelReference': paymentReference },
          { 'metadata.paypalReference': paymentReference },
        ]
      });
      if (payment) {
        paymentId = payment._id;
      }
    }

    // Process webhook with idempotency
    const result = await webhookIdempotencyService.processWebhook({
      eventId,
      provider,
      paymentId,
      paymentReference,
      eventType,
      eventData: rawBody,
      signature,
      rawBody: JSON.stringify(rawBody),
      rawHeaders,
      ipAddress,
      webhookUrl: req.originalUrl,
      metadata: {
        receivedAt: new Date().toISOString(),
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
      },
    });

    // Always return 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      received: true,
      processed: result.alreadyProcessed ? false : true,
      alreadyProcessed: result.alreadyProcessed,
      eventId,
      status: result.status || 'processed',
    });

  } catch (error) {
    console.error('❌ Webhook handling error:', error);
    // Always return 200 to prevent retries from the provider
    res.status(200).json({
      success: false,
      received: true,
      error: error.message,
    });
  }
};

// ============================================================
// ✅ GET WEBHOOK EVENTS (Admin)
// ============================================================

export const getWebhookEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status = null,
      provider = null,
      eventType = null,
      startDate = null,
      endDate = null,
    } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (provider && provider !== 'all') filter.provider = provider;
    if (eventType && eventType !== 'all') filter.eventType = eventType;
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      WebhookEvent.find(filter)
        .populate('paymentId', 'transactionId amount currency status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      WebhookEvent.countDocuments(filter),
    ]);

    // Get summary
    const summary = await WebhookEvent.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          processed: {
            $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          ignored: {
            $sum: { $cond: [{ $eq: ['$status', 'ignored'] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: summary[0] || {
        total: 0,
        processed: 0,
        failed: 0,
        pending: 0,
        ignored: 0,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching webhook events:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webhook events',
    });
  }
};

// ============================================================
// ✅ GET WEBHOOK EVENT BY ID (Admin)
// ============================================================

export const getWebhookEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await WebhookEvent.findById(id)
      .populate('paymentId', 'transactionId amount currency status')
      .lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Webhook event not found',
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('❌ Error fetching webhook event:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webhook event',
    });
  }
};

// ============================================================
// ✅ GET WEBHOOK EVENTS BY PROVIDER (Admin)
// ============================================================

export const getWebhookEventsByProvider = async (req, res) => {
  try {
    const { provider } = req.params;
    const { page = 1, limit = 50, status = null } = req.query;

    const result = await webhookIdempotencyService.getEventsByProvider(provider, {
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
    console.error('❌ Error fetching webhook events by provider:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webhook events',
    });
  }
};

// ============================================================
// ✅ GET WEBHOOK STATS (Admin)
// ============================================================

export const getWebhookStats = async (req, res) => {
  try {
    const result = await webhookIdempotencyService.getStats();

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
    console.error('❌ Error fetching webhook stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webhook stats',
    });
  }
};

// ============================================================
// ✅ GET FAILED WEBHOOK EVENTS (Admin)
// ============================================================

export const getFailedWebhookEvents = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const result = await webhookIdempotencyService.getFailedEvents({
      page: parseInt(page),
      limit: parseInt(limit),
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
    console.error('❌ Error fetching failed webhook events:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch failed webhook events',
    });
  }
};

// ============================================================
// ✅ VERIFY WEBHOOK SIGNATURE (Admin)
// ============================================================

export const verifyWebhookSignature = async (req, res) => {
  try {
    const { signature, payload, secret, provider = 'stripe' } = req.body;

    if (!signature || !payload || !secret) {
      return res.status(400).json({
        success: false,
        message: 'Signature, payload, and secret are required',
      });
    }

    const result = webhookIdempotencyService.verifySignature(
      signature,
      payload,
      secret,
      provider
    );

    res.json({
      success: true,
      valid: result.valid,
      message: result.message,
      error: result.error || null,
    });
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify signature',
    });
  }
};

// ============================================================
// ✅ RETRY WEBHOOK EVENT (Admin)
// ============================================================

export const retryWebhookEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await WebhookEvent.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Webhook event not found',
      });
    }

    if (event.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: `Event is not in failed state (current: ${event.status})`,
      });
    }

    // Check if can retry
    if (event.attempts >= event.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: `Maximum retry attempts reached (${event.maxAttempts})`,
      });
    }

    // Increment attempts and reset status
    event.attempts += 1;
    event.status = 'pending';
    event.lastAttemptAt = new Date();
    await event.save();

    // Process the event again
    const result = await webhookIdempotencyService.processWebhookEvent(event);

    if (result.success) {
      await event.markAsProcessed({
        processedAt: new Date(),
        result: result.data,
      });
    } else {
      await event.markAsFailed(result.error, {
        failedAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Webhook event retried successfully',
      event,
      processingResult: result,
    });
  } catch (error) {
    console.error('❌ Error retrying webhook event:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retry webhook event',
    });
  }
};

// ============================================================
// ✅ CLEANUP WEBHOOK EVENTS (Admin)
// ============================================================

export const cleanupWebhookEvents = async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.query;

    const result = await webhookIdempotencyService.cleanupEvents(parseInt(daysToKeep));

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: `Cleaned up ${result.deleted || 0} webhook events older than ${daysToKeep} days`,
      deleted: result.deleted,
    });
  } catch (error) {
    console.error('❌ Error cleaning up webhook events:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clean up webhook events',
    });
  }
};

