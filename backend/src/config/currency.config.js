// backend/src/config/currency.config.js
// ✅ NEW - Currency Configuration for Multi-Currency Payment System

import dotenv from 'dotenv';

dotenv.config();

/**
 * Currency Configuration
 * Centralized configuration for all currency-related settings
 * Values can be overridden via environment variables
 */
export const currencyConfig = {
  // =========================
  // SUPPORTED CURRENCIES
  // =========================
  supportedCurrencies: {
    /**
     * Primary currencies supported by the platform
     * Format: { CODE: { symbol, name, decimalPlaces, isDefault, isBase } }
     */
    RWF: {
      code: 'RWF',
      symbol: 'FRw',
      name: 'Rwandan Franc',
      decimalPlaces: 0,
      isDefault: true,
      isBase: true,
      countryCodes: ['RW'],
      paymentMethods: ['momo', 'airtel', 'bank_transfer'],
      settlementAllowed: true,
      platformFeePercentage: 5,
      minPaymentAmount: 0,
      maxPaymentAmount: 10000000,
      minWithdrawalAmount: 1000,
    },
    USD: {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      decimalPlaces: 2,
      isDefault: false,
      isBase: false,
      countryCodes: ['US', 'EC', 'SV', 'PA'],
      paymentMethods: ['stripe', 'card', 'paypal'],
      settlementAllowed: true,
      platformFeePercentage: 10,
      minPaymentAmount: 0.01,
      maxPaymentAmount: 10000,
      minWithdrawalAmount: 10,
    },
    EUR: {
      code: 'EUR',
      symbol: '€',
      name: 'Euro',
      decimalPlaces: 2,
      isDefault: false,
      isBase: false,
      countryCodes: ['EU', 'DE', 'FR', 'IT', 'ES'],
      paymentMethods: ['stripe', 'card', 'paypal'],
      settlementAllowed: true,
      platformFeePercentage: 10,
      minPaymentAmount: 0.01,
      maxPaymentAmount: 10000,
      minWithdrawalAmount: 10,
    },
    GBP: {
      code: 'GBP',
      symbol: '£',
      name: 'British Pound',
      decimalPlaces: 2,
      isDefault: false,
      isBase: false,
      countryCodes: ['GB', 'UK'],
      paymentMethods: ['stripe', 'card', 'paypal'],
      settlementAllowed: true,
      platformFeePercentage: 10,
      minPaymentAmount: 0.01,
      maxPaymentAmount: 10000,
      minWithdrawalAmount: 10,
    },
    KES: {
      code: 'KES',
      symbol: 'KSh',
      name: 'Kenyan Shilling',
      decimalPlaces: 2,
      isDefault: false,
      isBase: false,
      countryCodes: ['KE'],
      paymentMethods: ['momo', 'bank_transfer'],
      settlementAllowed: true,
      platformFeePercentage: 5,
      minPaymentAmount: 1,
      maxPaymentAmount: 500000,
      minWithdrawalAmount: 100,
    },
    UGX: {
      code: 'UGX',
      symbol: 'USh',
      name: 'Ugandan Shilling',
      decimalPlaces: 0,
      isDefault: false,
      isBase: false,
      countryCodes: ['UG'],
      paymentMethods: ['momo', 'bank_transfer'],
      settlementAllowed: true,
      platformFeePercentage: 5,
      minPaymentAmount: 0,
      maxPaymentAmount: 5000000,
      minWithdrawalAmount: 500,
    },
    TZS: {
      code: 'TZS',
      symbol: 'TSh',
      name: 'Tanzanian Shilling',
      decimalPlaces: 0,
      isDefault: false,
      isBase: false,
      countryCodes: ['TZ'],
      paymentMethods: ['momo', 'bank_transfer'],
      settlementAllowed: true,
      platformFeePercentage: 5,
      minPaymentAmount: 0,
      maxPaymentAmount: 5000000,
      minWithdrawalAmount: 500,
    },
  },

  // =========================
  // EXCHANGE RATE CONFIGURATION
  // =========================
  exchangeRate: {
    /**
     * Base currency for all exchange rates
     * All rates are calculated relative to this currency
     */
    baseCurrency: process.env.BASE_CURRENCY || 'RWF',

    /**
     * Default exchange rate provider
     * Options: fixer, openexchangerates, currencyfreaks, exchangerate-api, manual
     */
    defaultProvider: process.env.EXCHANGE_RATE_PROVIDER || 'manual',

    /**
     * API keys for exchange rate providers
     */
    apiKeys: {
      fixer: process.env.FIXER_API_KEY || '',
      openexchangerates: process.env.OPENEXCHANGERATES_API_KEY || '',
      currencyfreaks: process.env.CURRENCYFREAKS_API_KEY || '',
      exchangerateApi: process.env.EXCHANGERATE_API_KEY || '',
    },

    /**
     * Cache duration in seconds
     * How long to cache exchange rates before refreshing
     */
    cacheDuration: parseInt(process.env.EXCHANGE_RATE_CACHE_DURATION) || 3600, // 1 hour default

    /**
     * Rate expiration in days
     * How long a rate is valid before expiring
     */
    rateExpirationDays: parseInt(process.env.EXCHANGE_RATE_EXPIRATION_DAYS) || 7,

    /**
     * Auto-update interval in minutes
     * How often to automatically update rates
     */
    autoUpdateInterval: parseInt(process.env.EXCHANGE_RATE_AUTO_UPDATE_INTERVAL) || 60, // 1 hour

    /**
     * Stale threshold in hours
     * Rate is considered stale after this many hours
     */
    staleThresholdHours: parseInt(process.env.EXCHANGE_RATE_STALE_THRESHOLD) || 24,

    /**
     * Fallback rates if API is unavailable
     * These are only used as a last resort
     */
    fallbackRates: {
      USD: 1450,
      EUR: 1550,
      GBP: 1800,
      KES: 11,
      UGX: 380,
      TZS: 580,
    },

    /**
     * Enable automatic rate updates
     */
    autoUpdateEnabled: process.env.EXCHANGE_RATE_AUTO_UPDATE !== 'false',
  },

  // =========================
  // PAYMENT CONFIGURATION
  // =========================
  payment: {
    /**
     * Default currency for payments
     * If user doesn't select a currency, use this
     */
    defaultCurrency: process.env.PAYMENT_DEFAULT_CURRENCY || 'RWF',

    /**
     * Allowed currencies for payments
     * Only these currencies can be used for payments
     */
    allowedCurrencies: (process.env.PAYMENT_ALLOWED_CURRENCIES || 'RWF,USD,EUR,GBP').split(','),

    /**
     * Platform fee by currency
     * Percentage of payment amount taken as platform fee
     */
    platformFees: {
      RWF: parseFloat(process.env.PLATFORM_FEE_RWF) || 5,
      USD: parseFloat(process.env.PLATFORM_FEE_USD) || 10,
      EUR: parseFloat(process.env.PLATFORM_FEE_EUR) || 10,
      GBP: parseFloat(process.env.PLATFORM_FEE_GBP) || 10,
      KES: parseFloat(process.env.PLATFORM_FEE_KES) || 5,
      UGX: parseFloat(process.env.PLATFORM_FEE_UGX) || 5,
      TZS: parseFloat(process.env.PLATFORM_FEE_TZS) || 5,
    },

    /**
     * Minimum payment amount by currency
     */
    minPaymentAmounts: {
      RWF: parseFloat(process.env.MIN_PAYMENT_RWF) || 0,
      USD: parseFloat(process.env.MIN_PAYMENT_USD) || 0.01,
      EUR: parseFloat(process.env.MIN_PAYMENT_EUR) || 0.01,
      GBP: parseFloat(process.env.MIN_PAYMENT_GBP) || 0.01,
      KES: parseFloat(process.env.MIN_PAYMENT_KES) || 1,
      UGX: parseFloat(process.env.MIN_PAYMENT_UGX) || 0,
      TZS: parseFloat(process.env.MIN_PAYMENT_TZS) || 0,
    },

    /**
     * Maximum payment amount by currency
     */
    maxPaymentAmounts: {
      RWF: parseFloat(process.env.MAX_PAYMENT_RWF) || 10000000,
      USD: parseFloat(process.env.MAX_PAYMENT_USD) || 10000,
      EUR: parseFloat(process.env.MAX_PAYMENT_EUR) || 10000,
      GBP: parseFloat(process.env.MAX_PAYMENT_GBP) || 10000,
      KES: parseFloat(process.env.MAX_PAYMENT_KES) || 500000,
      UGX: parseFloat(process.env.MAX_PAYMENT_UGX) || 5000000,
      TZS: parseFloat(process.env.MAX_PAYMENT_TZS) || 5000000,
    },
  },

  // =========================
  // SETTLEMENT CONFIGURATION
  // =========================
  settlement: {
    /**
     * Default settlement currency for providers
     */
    defaultCurrency: process.env.SETTLEMENT_DEFAULT_CURRENCY || 'RWF',

    /**
     * Allowed settlement currencies
     * Providers can only settle in these currencies
     */
    allowedCurrencies: (process.env.SETTLEMENT_ALLOWED_CURRENCIES || 'RWF,USD,EUR,GBP').split(','),

    /**
     * Settlement fee by currency
     */
    settlementFees: {
      RWF: parseFloat(process.env.SETTLEMENT_FEE_RWF) || 0,
      USD: parseFloat(process.env.SETTLEMENT_FEE_USD) || 0.5,
      EUR: parseFloat(process.env.SETTLEMENT_FEE_EUR) || 0.5,
      GBP: parseFloat(process.env.SETTLEMENT_FEE_GBP) || 0.5,
    },

    /**
     * Minimum settlement amount by currency
     */
    minSettlementAmounts: {
      RWF: parseFloat(process.env.MIN_SETTLEMENT_RWF) || 1000,
      USD: parseFloat(process.env.MIN_SETTLEMENT_USD) || 10,
      EUR: parseFloat(process.env.MIN_SETTLEMENT_EUR) || 10,
      GBP: parseFloat(process.env.MIN_SETTLEMENT_GBP) || 10,
    },
  },

  // =========================
  // DISPLAY CONFIGURATION
  // =========================
  display: {
    /**
     * Default locale for currency formatting
     */
    locale: process.env.CURRENCY_LOCALE || 'en-US',

    /**
     * Currency format options
     */
    format: {
      RWF: {
        locale: 'rw-RW',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
      USD: {
        locale: 'en-US',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      EUR: {
        locale: 'en-EU',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      GBP: {
        locale: 'en-GB',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      KES: {
        locale: 'en-KE',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      UGX: {
        locale: 'en-UG',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
      TZS: {
        locale: 'en-TZ',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    },

    /**
     * Currency symbol positions
     */
    symbolPosition: {
      RWF: 'before',
      USD: 'before',
      EUR: 'before',
      GBP: 'before',
      KES: 'before',
      UGX: 'before',
      TZS: 'before',
    },

    /**
     * Thousands separator
     */
    thousandsSeparator: {
      RWF: ',',
      USD: ',',
      EUR: ',',
      GBP: ',',
      KES: ',',
      UGX: ',',
      TZS: ',',
    },

    /**
     * Decimal separator
     */
    decimalSeparator: {
      RWF: '.',
      USD: '.',
      EUR: '.',
      GBP: '.',
      KES: '.',
      UGX: '.',
      TZS: '.',
    },
  },

  // =========================
  // API CONFIGURATION
  // =========================
  api: {
    /**
     * CORS allowed origins for currency endpoints
     */
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(','),

    /**
     * Rate limit for currency endpoints (requests per minute)
     */
    rateLimits: {
      public: parseInt(process.env.CURRENCY_RATE_LIMIT_PUBLIC) || 60,
      authenticated: parseInt(process.env.CURRENCY_RATE_LIMIT_AUTHENTICATED) || 300,
      admin: parseInt(process.env.CURRENCY_RATE_LIMIT_ADMIN) || 1000,
    },
  },

  // =========================
  // CACHE CONFIGURATION
  // =========================
  cache: {
    /**
     * Redis cache configuration
     */
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB) || 0,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'aitour:currency:',
    },

    /**
     * Cache TTL for different data types (in seconds)
     */
    ttl: {
      exchangeRates: parseInt(process.env.CACHE_TTL_EXCHANGE_RATES) || 3600,
      currencies: parseInt(process.env.CACHE_TTL_CURRENCIES) || 86400,
      userPreference: parseInt(process.env.CACHE_TTL_USER_PREFERENCE) || 3600,
    },

    /**
     * Enable caching
     */
    enabled: process.env.CACHE_ENABLED !== 'false',
  },

  // =========================
  // WEBHOOK CONFIGURATION
  // =========================
  webhooks: {
    /**
     * Webhook endpoints for rate updates
     */
    endpoints: (process.env.CURRENCY_WEBHOOK_ENDPOINTS || '').split(',').filter(Boolean),

    /**
     * Webhook secret for verification
     */
    secret: process.env.CURRENCY_WEBHOOK_SECRET || '',

    /**
     * Enable webhooks
     */
    enabled: process.env.CURRENCY_WEBHOOK_ENABLED === 'true',
  },
};

// =========================
// ✅ HELPER FUNCTIONS
// =========================

/**
 * Get currency configuration by code
 */
export function getCurrencyConfig(code) {
  const upperCode = code.toUpperCase();
  return currencyConfig.supportedCurrencies[upperCode] || null;
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies() {
  return Object.values(currencyConfig.supportedCurrencies);
}

/**
 * Get active currencies (isDefault or isBase)
 */
export function getActiveCurrencies() {
  return Object.values(currencyConfig.supportedCurrencies).filter(
    (c) => c.isDefault || c.isBase || c.isActive !== false
  );
}

/**
 * Check if currency is supported
 */
export function isCurrencySupported(code) {
  return !!currencyConfig.supportedCurrencies[code.toUpperCase()];
}

/**
 * Get platform fee for currency
 */
export function getPlatformFee(code) {
  const upperCode = code.toUpperCase();
  return currencyConfig.payment.platformFees[upperCode] || currencyConfig.payment.platformFees.RWF || 10;
}

/**
 * Get min payment amount for currency
 */
export function getMinPaymentAmount(code) {
  const upperCode = code.toUpperCase();
  return currencyConfig.payment.minPaymentAmounts[upperCode] || currencyConfig.payment.minPaymentAmounts.RWF || 0;
}

/**
 * Get max payment amount for currency
 */
export function getMaxPaymentAmount(code) {
  const upperCode = code.toUpperCase();
  return currencyConfig.payment.maxPaymentAmounts[upperCode] || currencyConfig.payment.maxPaymentAmounts.RWF || 1000000;
}

/**
 * Get settlement fee for currency
 */
export function getSettlementFee(code) {
  const upperCode = code.toUpperCase();
  return currencyConfig.settlement.settlementFees[upperCode] || currencyConfig.settlement.settlementFees.RWF || 0;
}

/**
 * Get currency display format
 */
export function getCurrencyFormat(code) {
  const upperCode = code.toUpperCase();
  return currencyConfig.display.format[upperCode] || currencyConfig.display.format.RWF;
}

/**
 * Get currency symbol position
 */
export function getSymbolPosition(code) {
  const upperCode = code.toUpperCase();
  return currencyConfig.display.symbolPosition[upperCode] || 'before';
}

// =========================
// ✅ EXPORT CONFIG
// =========================

export default currencyConfig;