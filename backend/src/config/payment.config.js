// backend/src/config/payment.config.js
// ✅ NEW - Centralized payment configuration

/**
 * Payment Configuration
 * 
 * All payment-related settings are centralized here.
 * This allows easy configuration without modifying business logic.
 * 
 * Environment Variables:
 * - PLATFORM_COMMISSION_PERCENTAGE: Commission rate for AI Tour (default: 10)
 * - DEFAULT_CURRENCY: Default currency for transactions (default: USD)
 * - PAYMENT_PROVIDERS: Comma-separated list of enabled providers
 */

export const paymentConfig = {
  // ─── Commission Configuration ──────────────────────────────────
  commission: {
    // ✅ AI Tour's platform commission percentage
    // Can be overridden by env: PLATFORM_COMMISSION_PERCENTAGE
    defaultPercentage: parseInt(process.env.PLATFORM_COMMISSION_PERCENTAGE) || 10,
    
    // ✅ Commission calculation rules
    rules: {
      // Minimum commission amount (in default currency)
      minCommission: 1,
      // Maximum commission amount (in default currency)
      maxCommission: 1000,
      // Round commission to nearest cent
      roundTo: 2,
    },
    
    // ✅ Commission distribution
    distribution: {
      platform: 100, // 100% of commission goes to platform
      // Future: could split between platform and referral partners
    },
  },

  // ─── Currency Configuration ────────────────────────────────────
  currencies: {
    // Default currency for all transactions
    default: process.env.DEFAULT_CURRENCY || 'USD',
    
    // Supported currencies
    supported: ['USD', 'RWF', 'EUR', 'GBP'],
    
    // Currency exchange rates (relative to USD)
    // Format: { currencyCode: rateToUSD }
    // Example: 1 USD = 1100 RWF
    rates: {
      USD: 1,
      RWF: 1100,
      EUR: 0.85,
      GBP: 0.73,
    },
    
    // Currency symbols for display
    symbols: {
      USD: '$',
      RWF: 'FRw',
      EUR: '€',
      GBP: '£',
    },
    
    // Currency decimal places
    decimals: {
      USD: 2,
      RWF: 0,
      EUR: 2,
      GBP: 2,
    },
  },

  // ─── Payment Provider Configuration ────────────────────────────
  providers: {
    // ✅ Stripe - Credit/Debit Cards
    stripe: {
      enabled: true,
      priority: 1, // Lower number = higher priority
      name: 'Stripe',
      icon: 'credit-card',
      description: 'Pay with credit or debit card',
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      testMode: process.env.NODE_ENV !== 'production',
      config: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      },
    },
    
    // ✅ MTN Mobile Money - Rwanda
    momo: {
      enabled: process.env.MTN_MOMO_ENABLED === 'true' || false,
      priority: 2,
      name: 'MTN Mobile Money',
      icon: 'mobile',
      description: 'Pay with MTN Mobile Money',
      supportedCurrencies: ['RWF', 'USD'],
      testMode: process.env.MTN_MOMO_ENVIRONMENT === 'sandbox',
      config: {
        apiKey: process.env.MTN_MOMO_API_KEY,
        apiSecret: process.env.MTN_MOMO_API_SECRET,
        environment: process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
        collectionAccount: process.env.MTN_MOMO_COLLECTION_ACCOUNT,
        disbursementAccount: process.env.MTN_MOMO_DISBURSEMENT_ACCOUNT,
        callbackUrl: process.env.MTN_MOMO_CALLBACK_URL,
      },
    },
    
    // ✅ Airtel Money - Rwanda
    airtel: {
      enabled: process.env.AIRTEL_ENABLED === 'true' || false,
      priority: 3,
      name: 'Airtel Money',
      icon: 'mobile',
      description: 'Pay with Airtel Money',
      supportedCurrencies: ['RWF', 'USD'],
      testMode: process.env.AIRTEL_ENVIRONMENT === 'sandbox',
      config: {
        apiKey: process.env.AIRTEL_API_KEY,
        apiSecret: process.env.AIRTEL_API_SECRET,
        environment: process.env.AIRTEL_ENVIRONMENT || 'sandbox',
        collectionAccount: process.env.AIRTEL_COLLECTION_ACCOUNT,
        callbackUrl: process.env.AIRTEL_CALLBACK_URL,
      },
    },
    
    // ✅ Visa / Mastercard (via Stripe)
    cards: {
      enabled: true,
      priority: 4,
      name: 'Visa / Mastercard',
      icon: 'credit-card',
      description: 'Pay with Visa or Mastercard',
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      testMode: process.env.NODE_ENV !== 'production',
      config: {
        // Uses Stripe under the hood
        provider: 'stripe',
      },
    },
    
    // ✅ PayPal
    paypal: {
      enabled: process.env.PAYPAL_ENABLED === 'true' || false,
      priority: 5,
      name: 'PayPal',
      icon: 'paypal',
      description: 'Pay with PayPal account',
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      testMode: process.env.PAYPAL_ENVIRONMENT === 'sandbox',
      config: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
      },
    },
    
    // ✅ Bank Transfer
    bankTransfer: {
      enabled: process.env.BANK_TRANSFER_ENABLED === 'true' || false,
      priority: 6,
      name: 'Bank Transfer',
      icon: 'building',
      description: 'Pay via bank transfer',
      supportedCurrencies: ['RWF', 'USD', 'EUR', 'GBP'],
      testMode: true, // Bank transfers are always manual
      config: {
        accountName: process.env.BANK_ACCOUNT_NAME || 'AI Tour Rwanda',
        accountNumber: process.env.BANK_ACCOUNT_NUMBER,
        bankName: process.env.BANK_NAME,
        routingNumber: process.env.BANK_ROUTING_NUMBER,
        swiftCode: process.env.BANK_SWIFT_CODE,
        iban: process.env.BANK_IBAN,
        instructions: process.env.BANK_TRANSFER_INSTRUCTIONS || 
          'Please include your booking code as reference when making the transfer.',
      },
    },
  },

  // ─── Provider Priority Order ───────────────────────────────────
  // This determines which providers are shown first to users
  providerPriority: [
    'stripe',
    'momo',
    'airtel',
    'cards',
    'paypal',
    'bankTransfer',
  ],

  // ─── Wallet Configuration ──────────────────────────────────────
  wallet: {
    // Minimum balance required for withdrawal
    minWithdrawalAmount: 1000, // In RWF
    
    // Maximum withdrawal amount per request
    maxWithdrawalAmount: 10000000, // In RWF
    
    // Withdrawal processing fee
    withdrawalFee: 0, // Percentage or fixed amount
    
    // Settlement days (business days)
    settlementDays: 3,
    
    // Auto-withdrawal threshold (if enabled)
    autoWithdrawalThreshold: null, // In RWF, null = disabled
  },

  // ─── Webhook Configuration ─────────────────────────────────────
  webhooks: {
    // Retry attempts for failed webhooks
    maxRetries: 3,
    
    // Retry delay (in milliseconds)
    retryDelay: 5000,
    
    // Webhook timeout (in milliseconds)
    timeout: 30000,
  },

  // ─── Security Configuration ────────────────────────────────────
  security: {
    // Require 3D Secure for cards
    require3DSecure: true,
    
    // Enable fraud detection
    fraudDetection: true,
    
    // Maximum transaction amount before manual review
    maxTransactionAmount: 10000, // In USD
  },

  // ─── Feature Flags ─────────────────────────────────────────────
  features: {
    // Allow partial refunds
    partialRefunds: true,
    
    // Allow payment method changes after booking
    changePaymentMethod: false,
    
    // Enable multi-currency display
    multiCurrencyDisplay: true,
    
    // Show estimated fees before payment
    showFeesBeforePayment: true,
  },
};

// ─── Helper Functions ────────────────────────────────────────────

/**
 * Get enabled providers in priority order
 */
export const getEnabledProviders = () => {
  const { providers, providerPriority } = paymentConfig;
  return providerPriority
    .filter(name => providers[name] && providers[name].enabled)
    .map(name => ({
      id: name,
      ...providers[name],
    }));
};

/**
 * Check if a provider supports a specific currency
 */
export const providerSupportsCurrency = (providerId, currency) => {
  const provider = paymentConfig.providers[providerId];
  if (!provider || !provider.enabled) return false;
  return provider.supportedCurrencies.includes(currency);
};

/**
 * Get default currency
 */
export const getDefaultCurrency = () => {
  return paymentConfig.currencies.default;
};

/**
 * Get supported currencies
 */
export const getSupportedCurrencies = () => {
  return paymentConfig.currencies.supported;
};

/**
 * Format currency amount for display
 */
export const formatCurrency = (amount, currency) => {
  const symbols = paymentConfig.currencies.symbols;
  const decimals = paymentConfig.currencies.decimals;
  const symbol = symbols[currency] || currency;
  const decimalPlaces = decimals[currency] || 2;
  
  const formatted = amount.toFixed(decimalPlaces);
  
  // Currency symbol placement
  if (currency === 'RWF') {
    return `${formatted} ${symbol}`;
  }
  return `${symbol}${formatted}`;
};

/**
 * Calculate commission amount
 */
export const calculateCommission = (amount, customPercentage = null) => {
  const percentage = customPercentage || paymentConfig.commission.defaultPercentage;
  const commission = (amount * percentage) / 100;
  const { minCommission, maxCommission, roundTo } = paymentConfig.commission.rules;
  
  // Apply min/max limits
  let finalCommission = Math.max(commission, minCommission);
  finalCommission = Math.min(finalCommission, maxCommission);
  
  // Round to specified decimal places
  return Math.round(finalCommission * Math.pow(10, roundTo)) / Math.pow(10, roundTo);
};

export default paymentConfig;