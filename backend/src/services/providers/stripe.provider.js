// backend/src/services/providers/stripe.provider.js
// ✅ FIXED - Convert ObjectIds to strings in metadata

import Stripe from "stripe";
import {
  PaymentProviderInterface,
  PAYMENT_STATUS,
  WEBHOOK_EVENTS,
  PROVIDER_ERRORS,
} from "../paymentProvider.interface.js";

/**
 * Stripe Payment Provider
 * 
 * Implements the PaymentProviderInterface for Stripe.
 * Wraps existing Stripe integration to maintain backward compatibility.
 * All existing Stripe functionality remains unchanged.
 */
class StripeProvider extends PaymentProviderInterface {
  constructor(config = {}) {
    super();

    this._config = config;
    this._providerId = 'stripe';
    this._providerName = 'Stripe';
    this._supportedCurrencies = ['USD', 'EUR', 'GBP', 'RWF'];
    this._isTestMode = config.testMode || process.env.NODE_ENV !== 'production';
    this._isEnabled = true;
    this._apiKey = config.secretKey || process.env.STRIPE_SECRET_KEY;

    // ✅ Initialize Stripe SDK with latest API version
    this.stripe = new Stripe(this._apiKey, {
      apiVersion: '2025-02-24.acacia', // ✅ Updated to latest stable
      maxNetworkRetries: 3,
    });

    this.webhookSecret = config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
    this.publishableKey = config.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY;

    console.log('💳 Stripe Provider initialized');
    console.log(`📌 Test Mode: ${this._isTestMode}`);
    console.log(`📌 Publishable Key: ${this.publishableKey ? '✓ Set' : '✗ Not Set'}`);
  }

  // ─── Required Getter Overrides ─────────────────────────────────

  get providerId() {
    return this._providerId;
  }

  get providerName() {
    return this._providerName;
  }

  get supportedCurrencies() {
    return this._supportedCurrencies;
  }

  get isTestMode() {
    return this._isTestMode;
  }

  get isEnabled() {
    return this._isEnabled && !!this._apiKey;
  }

  // ─── Core Payment Methods ──────────────────────────────────────

  /**
   * Create a Stripe Checkout Session
   */
  async createPayment(data) {
    try {
      this.log('createPayment', { bookingId: data.bookingId, amount: data.amount });

      // ─── Validate data ──────────────────────────────────────────
      if (!data.bookingId) {
        throw new Error('bookingId is required');
      }
      if (!data.amount || data.amount <= 0) {
        throw new Error('Valid amount is required');
      }

      // ─── Format amount for Stripe ──────────────────────────────
      const amountInCents = Math.round(data.amount * 100);

      // ─── ✅ Convert ObjectIds to strings for metadata ──────────
      const safeMetadata = {
        bookingId: data.bookingId?.toString() || '',
        paymentId: data.paymentId?.toString() || '',
        userId: data.userId?.toString() || '',
        source: 'ai-tour-platform',
        ...data.metadata,
      };

      // ─── Build product metadata ─────────────────────────────────
      const productData = {
        name: data.description || 'AI Tour Experience',
        description: `Booking #${data.bookingId}`,
        metadata: safeMetadata, // ✅ All values are now strings
      };

      // ─── Build line items ───────────────────────────────────────
      const lineItems = [
        {
          price_data: {
            currency: data.currency?.toLowerCase() || 'usd',
            product_data: productData,
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ];

      // ─── Create Checkout Session ────────────────────────────────
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: lineItems,
        metadata: safeMetadata, // ✅ All values are strings
        success_url: data.successUrl || `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: data.cancelUrl || `${process.env.CLIENT_URL}/payment-cancel?session_id={CHECKOUT_SESSION_ID}`,
        customer_email: data.customerEmail || data.userEmail,
        client_reference_id: data.bookingId?.toString() || '',
        billing_address_collection: 'auto',
        shipping_address_collection: {
          allowed_countries: ['RW', 'US', 'GB', 'CA', 'KE', 'UG', 'TZ'],
        },
        payment_method_types: ['card', 'link'],
        automatic_tax: {
          enabled: false,
        },
        custom_fields: [
          {
            key: 'booking_id',
            label: {
              type: 'custom',
              custom: 'Booking ID',
            },
            type: 'text',
            optional: true,
          },
        ],
      });

      this.log('createPayment', { sessionId: session.id, url: session.url });

      return {
        success: true,
        paymentId: session.id,
        status: PAYMENT_STATUS.PENDING,
        paymentUrl: session.url,
        metadata: {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          clientSecret: session.client_secret,
        },
      };

    } catch (error) {
      this.log('createPayment', error, 'error');
      return this.handleError(error, 'createPayment');
    }
  }

  /**
   * Verify a Stripe payment
   */
  async verifyPayment(paymentId, options = {}) {
    try {
      this.log('verifyPayment', { paymentId });

      let session;
      let paymentIntent;

      // Try as session ID first (Checkout Session)
      try {
        session = await this.stripe.checkout.sessions.retrieve(paymentId);
        if (session) {
          paymentIntent = await this.stripe.paymentIntents.retrieve(session.payment_intent);
        }
      } catch (error) {
        // Not a session, try as payment intent
        try {
          paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
        } catch (e) {
          throw new Error(`Payment not found: ${paymentId}`);
        }
      }

      if (!paymentIntent) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      const statusMap = {
        'succeeded': PAYMENT_STATUS.SUCCEEDED,
        'requires_payment_method': PAYMENT_STATUS.PENDING,
        'requires_confirmation': PAYMENT_STATUS.PENDING,
        'requires_action': PAYMENT_STATUS.REQUIRES_ACTION,
        'processing': PAYMENT_STATUS.PROCESSING,
        'requires_capture': PAYMENT_STATUS.PROCESSING,
        'canceled': PAYMENT_STATUS.CANCELLED,
      };

      const status = statusMap[paymentIntent.status] || PAYMENT_STATUS.PENDING;

      const result = {
        success: status === PAYMENT_STATUS.SUCCEEDED,
        status: status,
        transactionId: paymentIntent.id,
        data: {
          paymentIntent: paymentIntent,
          session: session || null,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          customer: paymentIntent.customer,
          paymentMethod: paymentIntent.payment_method,
          charges: paymentIntent.charges,
        },
      };

      this.log('verifyPayment', { status, transactionId: paymentIntent.id });

      return result;

    } catch (error) {
      this.log('verifyPayment', error, 'error');
      return this.handleError(error, 'verifyPayment');
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    try {
      this.log('getPaymentStatus', { paymentId });

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      const statusMap = {
        'succeeded': PAYMENT_STATUS.SUCCEEDED,
        'requires_payment_method': PAYMENT_STATUS.PENDING,
        'requires_confirmation': PAYMENT_STATUS.PENDING,
        'requires_action': PAYMENT_STATUS.REQUIRES_ACTION,
        'processing': PAYMENT_STATUS.PROCESSING,
        'requires_capture': PAYMENT_STATUS.PROCESSING,
        'canceled': PAYMENT_STATUS.CANCELLED,
      };

      return {
        success: true,
        status: statusMap[paymentIntent.status] || PAYMENT_STATUS.PENDING,
        data: {
          paymentIntent: paymentIntent,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          customer: paymentIntent.customer,
        },
      };

    } catch (error) {
      this.log('getPaymentStatus', error, 'error');
      return this.handleError(error, 'getPaymentStatus');
    }
  }

  /**
   * Process a refund
   */
  async refundPayment(paymentId, amount = null, reason = '', options = {}) {
    try {
      this.log('refundPayment', { paymentId, amount, reason });

      let paymentIntent;
      try {
        const session = await this.stripe.checkout.sessions.retrieve(paymentId);
        if (session && session.payment_intent) {
          paymentIntent = await this.stripe.paymentIntents.retrieve(session.payment_intent);
        }
      } catch (error) {
        try {
          paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
        } catch (e) {
          throw new Error(`Payment not found: ${paymentId}`);
        }
      }

      if (!paymentIntent) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment cannot be refunded. Status: ${paymentIntent.status}`);
      }

      const refundAmount = amount ? Math.round(amount * 100) : paymentIntent.amount;

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntent.id,
        amount: refundAmount,
        reason: reason ? 'requested_by_customer' : undefined,
        metadata: {
          paymentId: options.paymentId?.toString() || '',
          bookingId: options.bookingId?.toString() || '',
          reason: reason || 'No reason provided',
        },
      });

      this.log('refundPayment', { refundId: refund.id, amount: refundAmount / 100 });

      return {
        success: true,
        refundId: refund.id,
        status: refund.status,
        data: {
          refund: refund,
          amount: refundAmount / 100,
          currency: refund.currency,
          created: refund.created,
        },
      };

    } catch (error) {
      this.log('refundPayment', error, 'error');
      return this.handleError(error, 'refundPayment');
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(req) {
    try {
      const sig = req.headers["stripe-signature"];
      const rawBody = req.body;

      if (!sig && !this.webhookSecret) {
        if (this.isTestMode) {
          this.log('handleWebhook', { message: 'Test mode: Skipping signature verification' }, 'warn');
          return this.processWebhookEvent(rawBody);
        }
        throw new Error('Webhook signature verification failed');
      }

      let event;
      try {
        event = this.stripe.webhooks.constructEvent(
          rawBody,
          sig,
          this.webhookSecret
        );
      } catch (error) {
        this.log('handleWebhook', { error: error.message }, 'error');
        throw new Error(`Webhook Error: ${error.message}`);
      }

      return this.processWebhookEvent(event);

    } catch (error) {
      this.log('handleWebhook', error, 'error');
      return this.handleError(error, 'handleWebhook');
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event) {
    this.log('webhook', { type: event.type, id: event.id });

    let result = {
      success: true,
      event: null,
      data: null,
      metadata: {},
    };

    const metadata = event.data.object?.metadata || {};

    switch (event.type) {
      case 'checkout.session.completed':
        result.event = WEBHOOK_EVENTS.PAYMENT_SUCCEEDED;
        result.data = {
          paymentId: event.data.object.id,
          paymentIntentId: event.data.object.payment_intent,
          amount: event.data.object.amount_total / 100,
          currency: event.data.object.currency,
          customer: event.data.object.customer,
          metadata: metadata,
        };
        result.metadata = metadata;
        break;

      case 'payment_intent.succeeded':
        result.event = WEBHOOK_EVENTS.PAYMENT_SUCCEEDED;
        result.data = {
          paymentId: event.data.object.id,
          amount: event.data.object.amount / 100,
          currency: event.data.object.currency,
          customer: event.data.object.customer,
          metadata: metadata,
        };
        result.metadata = metadata;
        break;

      case 'payment_intent.payment_failed':
        result.event = WEBHOOK_EVENTS.PAYMENT_FAILED;
        result.data = {
          paymentId: event.data.object.id,
          error: event.data.object.last_payment_error?.message || 'Payment failed',
          metadata: metadata,
        };
        result.metadata = metadata;
        break;

      case 'charge.refunded':
        result.event = WEBHOOK_EVENTS.REFUND_SUCCEEDED;
        result.data = {
          paymentId: event.data.object.payment_intent,
          refundId: event.data.object.refunds?.data?.[0]?.id || null,
          amount: event.data.object.amount_refunded / 100,
          currency: event.data.object.currency,
          metadata: metadata,
        };
        result.metadata = metadata;
        break;

      default:
        result.event = event.type;
        result.data = event.data.object;
        result.metadata = metadata;
        this.log('webhook', { event: event.type, message: 'Unhandled event type' }, 'warn');
    }

    return result;
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(req, signature, secret) {
    try {
      const payload = req.body;
      const sigHeader = signature || req.headers["stripe-signature"];

      if (!sigHeader) {
        return false;
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        sigHeader,
        secret || this.webhookSecret
      );

      return !!event;

    } catch (error) {
      this.log('verifyWebhookSignature', { error: error.message }, 'error');
      return false;
    }
  }

  // ─── Helper Methods ─────────────────────────────────────────────

  /**
   * Format amount for Stripe (convert to cents)
   */
  formatAmount(amount, currency = 'USD') {
    const decimals = currency === 'RWF' ? 0 : 2;
    return Math.round(amount * Math.pow(10, decimals));
  }

  /**
   * Get provider-specific metadata (all values as strings)
   */
  getMetadata(data) {
    return {
      bookingId: data.bookingId?.toString() || '',
      paymentId: data.paymentId?.toString() || '',
      userId: data.userId?.toString() || '',
      source: 'ai-tour-platform',
    };
  }

  /**
   * Generate a Stripe reference
   */
  generateReference(prefix = 'AIT') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Handle provider error with specific Stripe error codes
   */
  handleError(error, context = '') {
    let errorCode = PROVIDER_ERRORS.UNKNOWN_ERROR;
    let errorMessage = error.message || 'An unknown error occurred';

    if (error.type === 'StripeAuthenticationError') {
      errorCode = PROVIDER_ERRORS.AUTHENTICATION_FAILED;
      errorMessage = 'Stripe authentication failed. Please check your API keys.';
    } else if (error.type === 'StripeRateLimitError') {
      errorCode = PROVIDER_ERRORS.RATE_LIMIT_EXCEEDED;
      errorMessage = 'Stripe rate limit exceeded. Please try again later.';
    } else if (error.type === 'StripeInvalidRequestError') {
      errorCode = PROVIDER_ERRORS.INVALID_AMOUNT;
      errorMessage = error.message || 'Invalid request to Stripe.';
    } else if (error.message?.includes('insufficient funds')) {
      errorCode = PROVIDER_ERRORS.INSUFFICIENT_FUNDS;
      errorMessage = 'Insufficient funds to process payment.';
    } else if (error.message?.includes('already been refunded')) {
      errorCode = PROVIDER_ERRORS.REFUND_NOT_ALLOWED;
      errorMessage = 'Payment has already been refunded.';
    } else if (error.message?.includes('Metadata values must be strings')) {
      errorCode = PROVIDER_ERRORS.INVALID_AMOUNT;
      errorMessage = 'Invalid metadata format. Please ensure all metadata values are strings.';
    }

    this.log('handleError', { errorCode, errorMessage, context }, 'error');

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      context: context,
      provider: this.providerId,
      timestamp: new Date().toISOString(),
      originalError: error.message,
    };
  }
}

export default StripeProvider;