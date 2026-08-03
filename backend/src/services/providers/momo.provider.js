// backend/src/services/providers/momo.provider.js
// ✅ NEW - MTN Mobile Money Provider (Placeholder)

import {
  PaymentProviderInterface,
  PAYMENT_STATUS,
  WEBHOOK_EVENTS,
  PROVIDER_ERRORS,
} from "../paymentProvider.interface.js";

/**
 * MTN Mobile Money Provider
 * 
 * Implements the PaymentProviderInterface for MTN Mobile Money.
 * This is a placeholder implementation with the complete architecture
 * ready for actual API integration.
 * 
 * API credentials will be added when available:
 * - MTN_MOMO_API_KEY
 * - MTN_MOMO_API_SECRET
 * - MTN_MOMO_ENVIRONMENT
 * - MTN_MOMO_COLLECTION_ACCOUNT
 * - MTN_MOMO_CALLBACK_URL
 * 
 * Reference: https://momodeveloper.mtn.com/
 */
class MomoProvider extends PaymentProviderInterface {
  constructor(config = {}) {
    super(config);

    // ─── Provider Identity ──────────────────────────────────────
    this._providerId = 'momo';
    this._providerName = 'MTN Mobile Money';
    this._supportedCurrencies = ['RWF', 'USD'];
    this._isTestMode = config.environment !== 'production' || false;
    this._isEnabled = false; // Disabled until credentials are provided

    // ─── Store configuration ────────────────────────────────────
    this.apiKey = config.apiKey || process.env.MTN_MOMO_API_KEY;
    this.apiSecret = config.apiSecret || process.env.MTN_MOMO_API_SECRET;
    this.environment = config.environment || process.env.MTN_MOMO_ENVIRONMENT || 'sandbox';
    this.collectionAccount = config.collectionAccount || process.env.MTN_MOMO_COLLECTION_ACCOUNT;
    this.callbackUrl = config.callbackUrl || process.env.MTN_MOMO_CALLBACK_URL;

    // ─── API Base URLs ──────────────────────────────────────────
    this.apiBaseUrl = this.environment === 'production'
      ? 'https://api.mtn.com/momo/v1_0'
      : 'https://sandbox.mtn.com/momo/v1_0';

    console.log(`📱 MTN MoMo Provider initialized (${this.environment} mode)`);
    console.log(`📌 API Key: ${this.apiKey ? '✓ Set' : '✗ Not Set'}`);
    console.log(`📌 API Secret: ${this.apiSecret ? '✓ Set' : '✗ Not Set'}`);
    console.log(`📌 Collection Account: ${this.collectionAccount ? '✓ Set' : '✗ Not Set'}`);
    console.log(`📌 Status: ${this._isEnabled ? 'Enabled' : 'Disabled (credentials required)'}`);
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
    return this._isEnabled && !!this.apiKey && !!this.apiSecret;
  }

  // ─── Core Payment Methods ──────────────────────────────────────

  /**
   * Create an MTN MoMo payment
   * 
   * MTN MoMo Payment Flow:
   * 1. Create payment reference
   * 2. Request payment collection
   * 3. User approves on their phone
   * 4. Webhook confirms payment
   */
  async createPayment(data) {
    try {
      this.log('createPayment', { 
        bookingId: data.bookingId, 
        amount: data.amount,
        currency: data.currency 
      });

      // ─── Validate provider is enabled ──────────────────────────
      if (!this.isEnabled) {
        throw new Error('MTN MoMo provider is not configured. Please set API credentials.');
      }

      // ─── Validate data ──────────────────────────────────────────
      if (!data.bookingId) {
        throw new Error('bookingId is required');
      }
      if (!data.amount || data.amount <= 0) {
        throw new Error('Valid amount is required');
      }

      // ─── Validate currency ──────────────────────────────────────
      const currency = data.currency || 'RWF';
      if (!this.supportedCurrencies.includes(currency)) {
        throw new Error(`Currency "${currency}" is not supported by MTN MoMo`);
      }

      // ─── Generate payment reference ─────────────────────────────
      const paymentReference = this.generateReference('MOMO');
      const externalId = `${data.bookingId}_${Date.now()}`;

      // ─── Prepare payment data ───────────────────────────────────
      const paymentData = {
        amount: this.formatAmount(data.amount, currency),
        currency: currency,
        externalId: externalId,
        payer: {
          partyIdType: 'MSISDN', // Mobile number
          partyId: data.phoneNumber || data.payerPhone || '', // Will be provided by user
        },
        payerMessage: data.description || 'AI Tour Rwanda Payment',
        payeeNote: `Booking #${data.bookingId}`,
        callbackUrl: data.webhookUrl || this.callbackUrl || `${process.env.API_URL}/api/payments/webhook/momo`,
      };

      this.log('createPayment', { 
        paymentReference, 
        externalId, 
        amount: paymentData.amount 
      });

      // ─── TODO: Call MTN MoMo API to request payment ────────────
      // const result = await this.requestPayment(paymentData);
      // return this.formatPaymentResponse(result);

      // ─── Placeholder response (API integration pending) ────────
      return {
        success: true,
        paymentId: paymentReference,
        status: PAYMENT_STATUS.PENDING,
        paymentUrl: null, // MoMo uses USSD/push notification, not a URL
        metadata: {
          reference: paymentReference,
          externalId: externalId,
          amount: data.amount,
          currency: currency,
          phoneNumber: data.phoneNumber || data.payerPhone,
          // In production, this would include the transaction ID from MTN
          transactionId: null,
          paymentRequestId: null,
          // User will receive a USSD push notification on their phone
          instructions: 'You will receive a payment request on your MTN Mobile Money. Please approve it to complete payment.',
        },
      };

    } catch (error) {
      this.log('createPayment', error, 'error');
      return this.handleError(error, 'createPayment');
    }
  }

  /**
   * Verify an MTN MoMo payment
   */
  async verifyPayment(paymentId, options = {}) {
    try {
      this.log('verifyPayment', { paymentId });

      // ─── Validate provider is enabled ──────────────────────────
      if (!this.isEnabled) {
        throw new Error('MTN MoMo provider is not configured. Please set API credentials.');
      }

      // ─── TODO: Call MTN MoMo API to get payment status ────────
      // const result = await this.getPaymentStatus(paymentId);
      // return this.formatVerificationResponse(result);

      // ─── Placeholder response (API integration pending) ────────
      const status = PAYMENT_STATUS.PENDING;
      
      return {
        success: true,
        status: status,
        transactionId: null,
        data: {
          paymentId: paymentId,
          status: status,
          amount: options.amount || 0,
          currency: options.currency || 'RWF',
          reference: paymentId,
          verifiedAt: new Date().toISOString(),
        },
      };

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

      if (!this.isEnabled) {
        throw new Error('MTN MoMo provider is not configured. Please set API credentials.');
      }

      // ─── TODO: Call MTN MoMo API ───────────────────────────────
      // const result = await this.getPayment(paymentId);
      // return this.formatStatusResponse(result);

      // ─── Placeholder response ───────────────────────────────────
      return {
        success: true,
        status: PAYMENT_STATUS.PENDING,
        data: {
          paymentId: paymentId,
          reference: paymentId,
          status: 'PENDING',
        },
      };

    } catch (error) {
      this.log('getPaymentStatus', error, 'error');
      return this.handleError(error, 'getPaymentStatus');
    }
  }

  /**
   * Process a refund (if supported)
   * 
   * Note: MTN MoMo refunds are typically manual or require
   * additional approval. This is a placeholder.
   */
  async refundPayment(paymentId, amount = null, reason = '', options = {}) {
    try {
      this.log('refundPayment', { paymentId, amount, reason });

      if (!this.isEnabled) {
        throw new Error('MTN MoMo provider is not configured. Please set API credentials.');
      }

      // ─── Check if refund is supported ──────────────────────────
      // MTN MoMo refunds usually require manual processing
      // or a separate disbursement API

      // ─── TODO: Call MTN MoMo refund/disbursement API ──────────
      // const result = await this.requestRefund(paymentId, amount);
      // return this.formatRefundResponse(result);

      // ─── Placeholder response ───────────────────────────────────
      const refundId = this.generateReference('REF');

      return {
        success: true,
        refundId: refundId,
        status: 'pending',
        data: {
          paymentId: paymentId,
          amount: amount || 0,
          currency: 'RWF',
          reference: refundId,
          // Note: Refunds may take 1-3 business days
          estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          message: 'Refund request submitted. Please allow 1-3 business days for processing.',
        },
      };

    } catch (error) {
      this.log('refundPayment', error, 'error');
      return this.handleError(error, 'refundPayment');
    }
  }

  /**
   * Handle MTN MoMo webhook
   */
  async handleWebhook(req) {
    try {
      this.log('handleWebhook', { 
        method: req.method, 
        path: req.path,
        headers: req.headers,
      });

      if (!this.isEnabled) {
        throw new Error('MTN MoMo provider is not configured. Please set API credentials.');
      }

      const rawBody = req.body;

      // ─── TODO: Verify webhook signature ────────────────────────
      // The signature is usually in the request headers
      // const signature = req.headers['x-mtn-signature'];
      // const isValid = await this.verifyWebhookSignature(req, signature, this.apiSecret);

      // ─── Process webhook ────────────────────────────────────────
      const event = rawBody;
      const eventType = event.status || event.type || event.eventType;

      this.log('webhook', { eventType, data: event });

      let result = {
        success: true,
        event: null,
        data: null,
        metadata: {},
      };

      // ─── Handle different event types ──────────────────────────
      switch (eventType) {
        case 'payment.successful':
        case 'PAYMENT_SUCCESSFUL':
          result.event = WEBHOOK_EVENTS.PAYMENT_SUCCEEDED;
          result.data = {
            paymentId: event.reference || event.paymentId,
            transactionId: event.transactionId || event.id,
            amount: event.amount || 0,
            currency: event.currency || 'RWF',
            metadata: event.metadata || {},
          };
          result.metadata = event.metadata || {};
          break;

        case 'payment.failed':
        case 'PAYMENT_FAILED':
          result.event = WEBHOOK_EVENTS.PAYMENT_FAILED;
          result.data = {
            paymentId: event.reference || event.paymentId,
            error: event.errorMessage || 'Payment failed',
            metadata: event.metadata || {},
          };
          result.metadata = event.metadata || {};
          break;

        case 'refund.successful':
        case 'REFUND_SUCCESSFUL':
          result.event = WEBHOOK_EVENTS.REFUND_SUCCEEDED;
          result.data = {
            paymentId: event.originalPaymentId || event.paymentId,
            refundId: event.refundId || event.id,
            amount: event.amount || 0,
            currency: event.currency || 'RWF',
            metadata: event.metadata || {},
          };
          result.metadata = event.metadata || {};
          break;

        default:
          result.event = eventType || 'unknown';
          result.data = event;
          result.metadata = event.metadata || {};
          this.log('webhook', { event: eventType, message: 'Unhandled event type' }, 'warn');
      }

      return result;

    } catch (error) {
      this.log('handleWebhook', error, 'error');
      return this.handleError(error, 'handleWebhook');
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(req, signature, secret) {
    try {
      // ─── MTN MoMo uses HMAC-SHA256 for signatures ──────────────
      // The signature is typically: HMAC-SHA256(requestBody + secret)
      // This is a placeholder until the actual signature method is known
      
      if (!signature) {
        this.log('verifyWebhookSignature', { message: 'No signature provided' }, 'warn');
        return false;
      }

      // ─── TODO: Implement actual signature verification ─────────
      // const crypto = await import('crypto');
      // const expected = crypto
      //   .createHmac('sha256', secret)
      //   .update(JSON.stringify(req.body))
      //   .digest('hex');
      // return signature === expected;

      // ─── Placeholder: always return true in test mode ─────────
      if (this.isTestMode) {
        this.log('verifyWebhookSignature', { message: 'Test mode: Skipping signature verification' }, 'warn');
        return true;
      }

      return true;

    } catch (error) {
      this.log('verifyWebhookSignature', error, 'error');
      return false;
    }
  }

  // ─── Helper Methods ─────────────────────────────────────────────

  /**
   * Format amount for MTN MoMo
   */
  formatAmount(amount, currency = 'RWF') {
    // MTN MoMo expects amounts in the smallest currency unit
    const decimals = currency === 'RWF' ? 0 : 2;
    return Math.round(amount * Math.pow(10, decimals));
  }

  /**
   * Get provider-specific metadata
   */
  getMetadata(data) {
    return {
      bookingId: data.bookingId || data.booking_id,
      paymentId: data.paymentId || data.payment_id,
      userId: data.userId || data.user_id,
      phoneNumber: data.phoneNumber || data.phone_number,
      source: 'mtn-momo',
    };
  }

  // ─── API Integration Methods (To Be Implemented) ───────────────

  /**
   * Request payment from MTN MoMo API
   * 
   * MTN MoMo API Reference:
   * POST /collection/v1_0/requesttopay
   * Headers: X-Reference-Id, X-Target-Environment, Ocp-Apim-Subscription-Key
   */
  async requestPayment(paymentData) {
    // TODO: Implement actual API call to MTN MoMo
    // const headers = {
    //   'X-Reference-Id': paymentData.referenceId,
    //   'X-Target-Environment': this.environment,
    //   'Ocp-Apim-Subscription-Key': this.apiKey,
    //   'Authorization': `Bearer ${this.accessToken}`,
    // };
    // const response = await fetch(`${this.apiBaseUrl}/collection/v1_0/requesttopay`, {
    //   method: 'POST',
    //   headers,
    //   body: JSON.stringify({
    //     amount: paymentData.amount,
    //     currency: paymentData.currency,
    //     externalId: paymentData.externalId,
    //     payer: {
    //       partyIdType: 'MSISDN',
    //       partyId: paymentData.payer.partyId,
    //     },
    //     payerMessage: paymentData.payerMessage,
    //     payeeNote: paymentData.payeeNote,
    //   }),
    // });
    // return await response.json();

    throw new Error('requestPayment() not yet implemented - API integration pending');
  }

  /**
   * Get payment status from MTN MoMo API
   */
  async getPayment(paymentId) {
    // TODO: Implement actual API call to MTN MoMo
    // const response = await fetch(
    //   `${this.apiBaseUrl}/collection/v1_0/requesttopay/${paymentId}`,
    //   { headers }
    // );
    // return await response.json();

    throw new Error('getPayment() not yet implemented - API integration pending');
  }

  /**
   * Request refund/disbursement from MTN MoMo API
   */
  async requestRefund(paymentId, amount) {
    // TODO: Implement actual API call to MTN MoMo
    // MTN MoMo uses the disbursement API for refunds
    // POST /disbursement/v1_0/transfer

    throw new Error('requestRefund() not yet implemented - API integration pending');
  }

  /**
   * Format payment response from MTN MoMo API
   */
  formatPaymentResponse(apiResponse) {
    return {
      success: true,
      paymentId: apiResponse.referenceId || apiResponse.reference,
      status: this.mapApiStatus(apiResponse.status),
      paymentUrl: null,
      metadata: {
        reference: apiResponse.referenceId,
        externalId: apiResponse.externalId,
        transactionId: apiResponse.transactionId,
        status: apiResponse.status,
      },
    };
  }

  /**
   * Format verification response
   */
  formatVerificationResponse(apiResponse) {
    return {
      success: apiResponse.status === 'SUCCESSFUL',
      status: this.mapApiStatus(apiResponse.status),
      transactionId: apiResponse.transactionId,
      data: {
        paymentId: apiResponse.referenceId,
        status: apiResponse.status,
        amount: apiResponse.amount,
        currency: apiResponse.currency,
        reference: apiResponse.referenceId,
        verifiedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Format refund response
   */
  formatRefundResponse(apiResponse) {
    return {
      success: true,
      refundId: apiResponse.referenceId || apiResponse.refundId,
      status: this.mapApiStatus(apiResponse.status),
      data: {
        paymentId: apiResponse.originalPaymentId,
        amount: apiResponse.amount,
        currency: apiResponse.currency,
        reference: apiResponse.referenceId,
      },
    };
  }

  /**
   * Map MTN MoMo API status to our status
   */
  mapApiStatus(apiStatus) {
    const statusMap = {
      'PENDING': PAYMENT_STATUS.PENDING,
      'SUCCESSFUL': PAYMENT_STATUS.SUCCEEDED,
      'FAILED': PAYMENT_STATUS.FAILED,
      'CANCELLED': PAYMENT_STATUS.CANCELLED,
      'TIMEOUT': PAYMENT_STATUS.EXPIRED,
      'PROCESSING': PAYMENT_STATUS.PROCESSING,
    };
    return statusMap[apiStatus] || PAYMENT_STATUS.PENDING;
  }

  /**
   * Handle provider error with MTN MoMo specific error codes
   */
  handleError(error, context = '') {
    let errorCode = PROVIDER_ERRORS.UNKNOWN_ERROR;
    let errorMessage = error.message || 'An unknown error occurred';

    // ─── Map MTN MoMo error codes ────────────────────────────────
    if (error.code === 'AUTHENTICATION_FAILED') {
      errorCode = PROVIDER_ERRORS.AUTHENTICATION_FAILED;
      errorMessage = 'MTN MoMo authentication failed. Please check API credentials.';
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorCode = PROVIDER_ERRORS.INSUFFICIENT_FUNDS;
      errorMessage = 'Insufficient funds to process payment.';
    } else if (error.code === 'PAYEE_NOT_FOUND') {
      errorCode = PROVIDER_ERRORS.PAYMENT_NOT_FOUND;
      errorMessage = 'Payee account not found.';
    } else if (error.code === 'PAYER_NOT_FOUND') {
      errorCode = PROVIDER_ERRORS.PAYMENT_NOT_FOUND;
      errorMessage = 'Payer mobile number not found.';
    } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
      errorCode = PROVIDER_ERRORS.RATE_LIMIT_EXCEEDED;
      errorMessage = 'Rate limit exceeded. Please try again later.';
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

export default MomoProvider;