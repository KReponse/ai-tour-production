// backend/src/services/webhookIdempotencyService.js
// ✅ NEW - Webhook Idempotency Service for Production-Grade Financial System

import WebhookEvent from "../models/WebhookEvent.js";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import crypto from "crypto";

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

class WebhookIdempotencyService {
  constructor() {
    this.PROVIDERS = {
      STRIPE: 'stripe',
      MOMO: 'momo',
      AIRTEL: 'airtel',
      PAYPAL: 'paypal',
      FLUTTERWAVE: 'flutterwave',
      PAYSTACK: 'paystack',
    };

    this.EVENT_TYPES = {
      PAYMENT_SUCCEEDED: 'payment.succeeded',
      PAYMENT_FAILED: 'payment.failed',
      PAYMENT_REFUNDED: 'payment.refunded',
      PAYMENT_PENDING: 'payment.pending',
      CHARGEBACK_RECEIVED: 'chargeback.received',
      CHARGEBACK_RESOLVED: 'chargeback.resolved',
      CHECKOUT_COMPLETED: 'checkout.completed',
      CHECKOUT_EXPIRED: 'checkout.expired',
      SUBSCRIPTION_CREATED: 'subscription.created',
      SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
    };

    this.logger = logger;
    
    logger.info(`✅ Webhook Idempotency Service initialized`);
    logger.info(`📊 Supported providers: ${Object.values(this.PROVIDERS).join(', ')}`);
  }

  // =========================
  // IDEMPOTENCY CHECK
  // =========================

  /**
   * Check if an event has already been processed
   */
  async isEventProcessed(eventId, provider) {
    try {
      const event = await WebhookEvent.findOne({ eventId, provider });
      
      if (!event) {
        return {
          processed: false,
          event: null,
        };
      }

      // If event is processed or ignored, return as processed
      const isProcessed = event.status === 'processed' || event.status === 'ignored';
      
      return {
        processed: isProcessed,
        event,
        status: event.status,
        processedAt: event.processedAt,
      };
    } catch (error) {
      logger.error('❌ Error checking if event is processed:', error);
      return {
        processed: false,
        error: error.message,
      };
    }
  }

  /**
   * Process webhook with idempotency
   */
  async processWebhook(data) {
    try {
      const {
        eventId,
        provider,
        paymentId,
        paymentReference,
        eventType,
        eventData,
        signature,
        rawBody,
        rawHeaders,
        ipAddress,
        webhookUrl,
        metadata = {},
      } = data;

      // Validate required fields
      if (!eventId || !provider || !eventType) {
        throw new Error('Event ID, provider, and event type are required');
      }

      // Check if event already exists (idempotency)
      const existing = await this.isEventProcessed(eventId, provider);
      
      if (existing.processed) {
        logger.info(`🔄 Duplicate webhook event detected: ${eventId} (${provider}) - ${existing.status}`);
        return {
          success: true,
          alreadyProcessed: true,
          event: existing.event,
          status: existing.status,
          message: 'Event already processed',
        };
      }

      // Create webhook event record
      const webhookEvent = await WebhookEvent.createFromWebhook({
        eventId,
        provider,
        paymentId,
        paymentReference,
        eventType,
        eventData,
        signature,
        rawBody,
        rawHeaders,
        ipAddress,
        webhookUrl,
        metadata,
      });

      // Mark as processing
      await webhookEvent.markAsProcessing({ processingStartedAt: new Date() });

      // Process the webhook based on event type
      const result = await this.processWebhookEvent(webhookEvent);

      // Mark as processed or failed
      if (result.success) {
        await webhookEvent.markAsProcessed({
          processedAt: new Date(),
          result: result.data,
        });
        logger.info(`✅ Webhook event ${eventId} processed successfully`);
      } else {
        await webhookEvent.markAsFailed(result.error, {
          failedAt: new Date(),
        });
        logger.error(`❌ Webhook event ${eventId} failed: ${result.error}`);
      }

      return {
        success: true,
        alreadyProcessed: false,
        event: webhookEvent,
        processingResult: result,
        status: webhookEvent.status,
      };

    } catch (error) {
      logger.error('❌ Error processing webhook:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process webhook event based on type
   */
  async processWebhookEvent(webhookEvent) {
    try {
      const { provider, eventType, eventData } = webhookEvent;

      switch (provider) {
        case this.PROVIDERS.STRIPE:
          return await this.processStripeEvent(webhookEvent);
        
        case this.PROVIDERS.MOMO:
          return await this.processMoMoEvent(webhookEvent);
        
        case this.PROVIDERS.AIRTEL:
          return await this.processAirtelEvent(webhookEvent);
        
        case this.PROVIDERS.PAYPAL:
          return await this.processPayPalEvent(webhookEvent);
        
        default:
          return {
            success: false,
            error: `Unsupported provider: ${provider}`,
          };
      }
    } catch (error) {
      logger.error('❌ Error processing webhook event:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // PROVIDER-SPECIFIC PROCESSORS
  // =========================

  /**
   * Process Stripe webhook event
   */
  async processStripeEvent(webhookEvent) {
    try {
      const { eventType, eventData, paymentReference } = webhookEvent;
      
      // Find payment by reference
      const payment = await Payment.findOne({ 
        $or: [
          { stripePaymentId: paymentReference },
          { transactionId: paymentReference },
          { stripeSessionId: paymentReference },
        ]
      });

      if (!payment) {
        return {
          success: false,
          error: `Payment not found for reference: ${paymentReference}`,
        };
      }

      // Process based on event type
      switch (eventType) {
        case this.EVENT_TYPES.PAYMENT_SUCCEEDED:
        case this.EVENT_TYPES.CHECKOUT_COMPLETED:
          payment.status = 'paid';
          payment.paidAt = new Date();
          payment.paymentMethod = 'stripe';
          await payment.save();
          
          // Update booking
          const booking = await Booking.findById(payment.booking);
          if (booking) {
            booking.paymentStatus = 'paid';
            booking.status = 'confirmed';
            await booking.save();
          }
          
          return {
            success: true,
            data: {
              payment,
              booking,
              status: 'paid',
            },
          };

        case this.EVENT_TYPES.PAYMENT_FAILED:
          payment.status = 'failed';
          payment.errorMessage = eventData?.error?.message || 'Payment failed';
          await payment.save();
          
          return {
            success: true,
            data: {
              payment,
              status: 'failed',
              error: payment.errorMessage,
            },
          };

        case this.EVENT_TYPES.PAYMENT_REFUNDED:
          payment.status = 'refunded';
          payment.refundId = eventData?.refundId;
          payment.refundAmount = eventData?.amount || payment.amount;
          payment.refundedAt = new Date();
          await payment.save();
          
          return {
            success: true,
            data: {
              payment,
              status: 'refunded',
              refundAmount: payment.refundAmount,
            },
          };

        case this.EVENT_TYPES.CHARGEBACK_RECEIVED:
          payment.status = 'disputed';
          payment.metadata = {
            ...payment.metadata,
            chargebackId: eventData?.chargebackId,
            chargebackReason: eventData?.reason,
          };
          await payment.save();
          
          return {
            success: true,
            data: {
              payment,
              status: 'disputed',
              chargebackId: eventData?.chargebackId,
            },
          };

        default:
          return {
            success: true,
            data: {
              payment,
              eventType,
              message: `Event type ${eventType} received but not processed`,
            },
          };
      }
    } catch (error) {
      logger.error('❌ Error processing Stripe event:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process MoMo webhook event
   */
  async processMoMoEvent(webhookEvent) {
    try {
      const { eventType, eventData, paymentReference } = webhookEvent;
      
      // Find payment by reference
      const payment = await Payment.findOne({
        $or: [
          { transactionId: paymentReference },
          { 'metadata.momoReference': paymentReference },
        ]
      });

      if (!payment) {
        return {
          success: false,
          error: `Payment not found for reference: ${paymentReference}`,
        };
      }

      // Process based on event type
      switch (eventType) {
        case 'payment.success':
          payment.status = 'paid';
          payment.paidAt = new Date();
          payment.paymentMethod = 'momo';
          await payment.save();
          
          // Update booking
          const booking = await Booking.findById(payment.booking);
          if (booking) {
            booking.paymentStatus = 'paid';
            booking.status = 'confirmed';
            await booking.save();
          }
          
          return {
            success: true,
            data: {
              payment,
              booking,
              status: 'paid',
            },
          };

        case 'payment.failed':
          payment.status = 'failed';
          payment.errorMessage = eventData?.message || 'MoMo payment failed';
          await payment.save();
          
          return {
            success: true,
            data: {
              payment,
              status: 'failed',
              error: payment.errorMessage,
            },
          };

        default:
          return {
            success: true,
            data: {
              payment,
              eventType,
              message: `Event type ${eventType} received but not processed`,
            },
          };
      }
    } catch (error) {
      logger.error('❌ Error processing MoMo event:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process Airtel webhook event
   */
  async processAirtelEvent(webhookEvent) {
    try {
      const { eventType, eventData, paymentReference } = webhookEvent;
      
      // Find payment by reference
      const payment = await Payment.findOne({
        $or: [
          { transactionId: paymentReference },
          { 'metadata.airtelReference': paymentReference },
        ]
      });

      if (!payment) {
        return {
          success: false,
          error: `Payment not found for reference: ${paymentReference}`,
        };
      }

      // Process based on event type
      switch (eventType) {
        case 'payment.success':
          payment.status = 'paid';
          payment.paidAt = new Date();
          payment.paymentMethod = 'airtel';
          await payment.save();
          
          // Update booking
          const booking = await Booking.findById(payment.booking);
          if (booking) {
            booking.paymentStatus = 'paid';
            booking.status = 'confirmed';
            await booking.save();
          }
          
          return {
            success: true,
            data: {
              payment,
              booking,
              status: 'paid',
            },
          };

        case 'payment.failed':
          payment.status = 'failed';
          payment.errorMessage = eventData?.message || 'Airtel payment failed';
          await payment.save();
          
          return {
            success: true,
            data: {
              payment,
              status: 'failed',
              error: payment.errorMessage,
            },
          };

        default:
          return {
            success: true,
            data: {
              payment,
              eventType,
              message: `Event type ${eventType} received but not processed`,
            },
          };
      }
    } catch (error) {
      logger.error('❌ Error processing Airtel event:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process PayPal webhook event
   */
  async processPayPalEvent(webhookEvent) {
    try {
      const { eventType, eventData, paymentReference } = webhookEvent;
      
      // Find payment by reference
      const payment = await Payment.findOne({
        $or: [
          { transactionId: paymentReference },
          { 'metadata.paypalReference': paymentReference },
        ]
      });

      if (!payment) {
        return {
          success: false,
          error: `Payment not found for reference: ${paymentReference}`,
        };
      }

      // Process based on event type
      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          payment.status = 'paid';
          payment.paidAt = new Date();
          payment.paymentMethod = 'paypal';
          await payment.save();
          
          // Update booking
          const booking = await Booking.findById(payment.booking);
          if (booking) {
            booking.paymentStatus = 'paid';
            booking.status = 'confirmed';
            await booking.save();
          }
          
          return {
            success: true,
            data: {
              payment,
              booking,
              status: 'paid',
            },
          };

        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.FAILED':
          payment.status = 'failed';
          payment.errorMessage = eventData?.message || 'PayPal payment failed';
          await payment.save();
          
          return {
            success: true,
            data: {
              payment,
              status: 'failed',
              error: payment.errorMessage,
            },
          };

        case 'PAYMENT.CAPTURE.REFUNDED':
          payment.status = 'refunded';
          payment.refundId = eventData?.refundId;
          payment.refundAmount = eventData?.amount || payment.amount;
          payment.refundedAt = new Date();
          await payment.save();
          
          return {
            success: true,
            data: {
              payment,
              status: 'refunded',
              refundAmount: payment.refundAmount,
            },
          };

        default:
          return {
            success: true,
            data: {
              payment,
              eventType,
              message: `Event type ${eventType} received but not processed`,
            },
          };
      }
    } catch (error) {
      logger.error('❌ Error processing PayPal event:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // SIGNATURE VERIFICATION
  // =========================

  /**
   * Verify webhook signature
   */
  verifySignature(signature, payload, secret, provider) {
    try {
      switch (provider) {
        case this.PROVIDERS.STRIPE:
          return this.verifyStripeSignature(signature, payload, secret);
        
        case this.PROVIDERS.PAYPAL:
          return this.verifyPayPalSignature(signature, payload, secret);
        
        default:
          // For providers without signature verification, return true
          return {
            valid: true,
            message: 'Signature verification not implemented for this provider',
          };
      }
    } catch (error) {
      logger.error('❌ Error verifying signature:', error);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify Stripe signature
   */
  verifyStripeSignature(signature, payload, secret) {
    try {
      // Stripe uses HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const isValid = signature === expectedSignature;
      
      return {
        valid: isValid,
        message: isValid ? 'Signature verified' : 'Invalid signature',
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify PayPal signature
   */
  verifyPayPalSignature(signature, payload, secret) {
    try {
      // PayPal uses a different verification method
      // This is a simplified version
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const isValid = signature === expectedSignature;
      
      return {
        valid: isValid,
        message: isValid ? 'Signature verified' : 'Invalid signature',
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  // =========================
  // QUERY METHODS
  // =========================

  /**
   * Get webhook event by ID
   */
  async getEvent(eventId) {
    try {
      const event = await WebhookEvent.findOne({ eventId })
        .populate('paymentId', 'transactionId amount currency status')
        .lean();

      if (!event) {
        return {
          success: false,
          error: 'Event not found',
        };
      }

      return {
        success: true,
        event,
      };
    } catch (error) {
      logger.error('❌ Error getting webhook event:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get events by provider
   */
  async getEventsByProvider(provider, options = {}) {
    try {
      const { status = null, page = 1, limit = 20 } = options;
      const filter = { provider };
      if (status) filter.status = status;

      const skip = (page - 1) * limit;

      const [events, total] = await Promise.all([
        WebhookEvent.find(filter)
          .populate('paymentId', 'transactionId amount currency status')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        WebhookEvent.countDocuments(filter),
      ]);

      return {
        success: true,
        events,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('❌ Error getting events by provider:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get event statistics
   */
  async getStats() {
    try {
      const stats = await WebhookEvent.getStats();
      const byProvider = await WebhookEvent.aggregate([
        {
          $group: {
            _id: '$provider',
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
          },
        },
      ]);

      return {
        success: true,
        stats: {
          ...stats,
          byProvider,
        },
      };
    } catch (error) {
      logger.error('❌ Error getting webhook stats:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get failed events
   */
  async getFailedEvents(options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const result = await WebhookEvent.getFailedEvents({ page, limit });
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      logger.error('❌ Error getting failed events:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get pending events
   */
  async getPendingEvents(limit = 100) {
    try {
      const events = await WebhookEvent.getPendingEvents(limit);
      return {
        success: true,
        events,
      };
    } catch (error) {
      logger.error('❌ Error getting pending events:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Retry failed event
   */
  async retryEvent(eventId) {
    try {
      const event = await WebhookEvent.findOne({ eventId });
      if (!event) {
        return {
          success: false,
          error: 'Event not found',
        };
      }

      if (event.status !== 'failed') {
        return {
          success: false,
          error: `Event is not in failed state (current: ${event.status})`,
        };
      }

      if (!event.canRetry) {
        return {
          success: false,
          error: `Maximum retry attempts reached (${event.maxAttempts})`,
        };
      }

      await event.retry();

      // Process the event again
      const result = await this.processWebhookEvent(event);

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

      return {
        success: true,
        event,
        processingResult: result,
      };
    } catch (error) {
      logger.error('❌ Error retrying event:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cleanup old events
   */
  async cleanupEvents(daysToKeep = 90) {
    try {
      const deleted = await WebhookEvent.cleanup(daysToKeep);
      return {
        success: true,
        deleted,
      };
    } catch (error) {
      logger.error('❌ Error cleaning up events:', error);
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

const webhookIdempotencyService = new WebhookIdempotencyService();

export default webhookIdempotencyService;