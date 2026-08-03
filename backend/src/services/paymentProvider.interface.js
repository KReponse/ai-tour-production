// backend/src/services/paymentProvider.interface.js
// ✅ FIXED - Proper config handling with private property

/**
 * Payment Provider Interface
 * 
 * All payment providers must implement this interface.
 * This ensures consistent behavior across all payment methods.
 */
export class PaymentProviderInterface {
  constructor(config = {}) {
    // ✅ Store config as a private property
    this._config = config || {};
    this._providerId = null;
    this._providerName = null;
    this._supportedCurrencies = [];
    this._isTestMode = false;
    this._isEnabled = false;
  }

  // ─── Required Properties ──────────────────────────────────────

  /**
   * Unique identifier for the provider
   * Example: 'stripe', 'momo', 'airtel'
   */
  get providerId() {
    return this._providerId;
  }

  /**
   * Display name for the provider
   * Example: 'Stripe', 'MTN Mobile Money'
   */
  get providerName() {
    return this._providerName;
  }

  /**
   * Supported currency codes
   * Example: ['USD', 'RWF', 'EUR']
   */
  get supportedCurrencies() {
    return this._supportedCurrencies || [];
  }

  /**
   * Whether the provider is in test mode
   */
  get isTestMode() {
    return this._isTestMode || false;
  }

  /**
   * Whether the provider is enabled
   */
  get isEnabled() {
    return this._isEnabled || false;
  }

  /**
   * Provider configuration (read-only)
   */
  get config() {
    return this._config || {};
  }

  // ─── Core Payment Methods ──────────────────────────────────────

  async createPayment(data) {
    throw new Error('createPayment() must be implemented');
  }

  async verifyPayment(paymentId, options = {}) {
    throw new Error('verifyPayment() must be implemented');
  }

  async getPaymentStatus(paymentId) {
    throw new Error('getPaymentStatus() must be implemented');
  }

  async refundPayment(paymentId, amount = null, reason = '', options = {}) {
    throw new Error('refundPayment() must be implemented');
  }

  async handleWebhook(req) {
    throw new Error('handleWebhook() must be implemented');
  }

  async verifyWebhookSignature(req, signature, secret) {
    throw new Error('verifyWebhookSignature() must be implemented');
  }

  // ─── Optional Methods ──────────────────────────────────────────

  async cancelPayment(paymentId, reason = '') {
    throw new Error('cancelPayment() must be implemented if supported');
  }

  async getPaymentMethod(paymentMethodId) {
    throw new Error('getPaymentMethod() must be implemented if supported');
  }

  async listPaymentMethods(userId) {
    throw new Error('listPaymentMethods() must be implemented if supported');
  }

  async savePaymentMethod(userId, paymentMethodData) {
    throw new Error('savePaymentMethod() must be implemented if supported');
  }

  // ─── Helper Methods ────────────────────────────────────────────

  formatAmount(amount, currency = 'USD') {
    return amount;
  }

  getMetadata(data) {
    return {};
  }

  generateReference(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}${timestamp}${random}`.toUpperCase();
  }

  handleError(error, context = '') {
    console.error(`❌ ${this.providerName || 'Provider'} Error [${context}]:`, error.message);
    
    return {
      success: false,
      error: error.message,
      code: error.code || 'PROVIDER_ERROR',
      context: context,
      provider: this.providerId,
      timestamp: new Date().toISOString(),
    };
  }

  log(action, data, level = 'info') {
    const logPrefix = `[${this.providerName || 'Provider'}] ${action}`;
    const logData = {
      provider: this.providerId,
      action,
      data,
      timestamp: new Date().toISOString(),
    };
    
    if (level === 'error') {
      console.error(`❌ ${logPrefix}:`, logData);
    } else if (level === 'warn') {
      console.warn(`⚠️ ${logPrefix}:`, logData);
    } else {
      console.log(`📌 ${logPrefix}:`, logData);
    }
  }
}

// ─── Payment Status Constants ────────────────────────────────────

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  EXPIRED: 'expired',
  REQUIRES_ACTION: 'requires_action',
};

// ─── Webhook Event Types ─────────────────────────────────────────

export const WEBHOOK_EVENTS = {
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_EXPIRED: 'payment.expired',
  REFUND_SUCCEEDED: 'refund.succeeded',
  REFUND_FAILED: 'refund.failed',
  PAYMENT_REQUIRES_ACTION: 'payment.requires_action',
};

// ─── Provider Error Codes ────────────────────────────────────────

export const PROVIDER_ERRORS = {
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  REFUND_NOT_ALLOWED: 'REFUND_NOT_ALLOWED',
  REFUND_AMOUNT_EXCEEDS: 'REFUND_AMOUNT_EXCEEDS',
  WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

export default PaymentProviderInterface;