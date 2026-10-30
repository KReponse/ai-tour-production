// backend/src/config/payment.config.js
//
// AI TOUR RWANDA
// CENTRALIZED PAYMENT CONFIGURATION
//
// MVP PAYMENT POLICY
// ------------------
// - Platform commission = 0%
// - Provider receives 100% of successful payment
// - Frontend NEVER confirms payment
// - Backend/provider confirmation is the source of truth
// - Stripe is the active card payment provider for MVP
// - Payment currency and settlement currency are separate concepts
//

// ============================================================
// ENVIRONMENT HELPERS
// ============================================================

const parseBoolean = (
  value,
  fallback = false
) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    return fallback;
  }

  return [
    'true',
    '1',
    'yes',
    'on',
  ].includes(
    String(value)
      .trim()
      .toLowerCase()
  );
};

const parsePercentage = (
  value,
  fallback = 0
) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return fallback;
  }

  return Math.min(
    Math.max(parsed, 0),
    100
  );
};

const normalizeCurrency = (
  currency
) => {
  return String(
    currency || ''
  )
    .trim()
    .toUpperCase();
};

// ============================================================
// COMMISSION
// ============================================================

const commissionPercentage =
  parsePercentage(
    process.env.PLATFORM_COMMISSION_PERCENTAGE,
    0
  );

// ============================================================
// DEFAULT CURRENCY
// ============================================================

const defaultCurrency =
  normalizeCurrency(
    process.env.DEFAULT_CURRENCY ||
      'USD'
  );

// ============================================================
// STRIPE CONFIGURATION
// ============================================================

const stripeSecretKey =
  String(
    process.env.STRIPE_SECRET_KEY ||
      ''
  ).trim();

const stripePublishableKey =
  String(
    process.env.STRIPE_PUBLISHABLE_KEY ||
      ''
  ).trim();

const stripeWebhookSecret =
  String(
    process.env.STRIPE_WEBHOOK_SECRET ||
      ''
  ).trim();

/**
 * Explicit Stripe test mode.
 *
 * Preferred:
 *
 * STRIPE_TEST_MODE=true
 *
 * Fallback:
 * infer from sk_test_ / sk_live_ key prefix.
 */
const stripeTestMode =
  process.env.STRIPE_TEST_MODE !==
  undefined
    ? parseBoolean(
        process.env.STRIPE_TEST_MODE,
        false
      )
    : stripeSecretKey.startsWith(
        'sk_test_'
      );

const stripeIsTestKey =
  stripeSecretKey.startsWith(
    'sk_test_'
  );

const stripeIsLiveKey =
  stripeSecretKey.startsWith(
    'sk_live_'
  );

const stripeKeyMismatch =
  stripeSecretKey &&
  (
    (
      stripeTestMode &&
      !stripeIsTestKey
    ) ||
    (
      !stripeTestMode &&
      !stripeIsLiveKey
    )
  );

if (stripeKeyMismatch) {
  console.warn(
    '⚠️ Stripe mode/key mismatch detected.'
  );

  console.warn(
    `⚠️ STRIPE_TEST_MODE=${stripeTestMode}`
  );

  console.warn(
    `⚠️ Secret key type=${
      stripeIsTestKey
        ? 'test'
        : stripeIsLiveKey
          ? 'live'
          : 'unknown'
    }`
  );

  console.warn(
    '⚠️ Use sk_test_... with STRIPE_TEST_MODE=true for local testing.'
  );
}

// ============================================================
// PAYMENT CONFIG
// ============================================================

export const paymentConfig = {
  // ============================================================
  // COMMISSION
  // ============================================================

  commission: {
    /**
     * MVP:
     * AI Tour takes 0% platform commission.
     */
    defaultPercentage:
      commissionPercentage,

    rules: {
      minCommission: 0,

      maxCommission: 1000000000,

      roundTo: 2,
    },

    distribution: {
      platform: 100,
    },
  },

  // ============================================================
  // CURRENCIES
  // ============================================================

  currencies: {
    default:
      defaultCurrency,

    supported: [
      'USD',
      'RWF',
      'EUR',
      'GBP',
    ],

    /**
     * These are fallback/reference rates only.
     *
     * Real payment conversion should use:
     * currencyService / exchangeRateService.
     */
    rates: {
      USD: 1,
      RWF: 1100,
      EUR: 0.85,
      GBP: 0.73,
    },

    symbols: {
      USD: '$',
      RWF: 'FRw',
      EUR: '€',
      GBP: '£',
    },

    decimals: {
      USD: 2,
      RWF: 0,
      EUR: 2,
      GBP: 2,
    },
  },

  // ============================================================
  // PAYMENT PROVIDERS
  // ============================================================

  providers: {
    // ==========================================================
    // STRIPE
    // ==========================================================

    stripe: {
      enabled: true,

      priority: 1,

      name: 'Stripe',

      icon: 'credit-card',

      description:
        'Pay securely with credit or debit card',

      /**
       * Keep this aligned with StripeProvider.
       */
      supportedCurrencies: [
        'USD',
        'EUR',
        'GBP',
        'RWF',
      ],

      /**
       * IMPORTANT:
       *
       * Explicit environment variable is preferred.
       *
       * STRIPE_TEST_MODE=true
       */
      testMode:
        stripeTestMode,

      config: {
        secretKey:
          stripeSecretKey,

        publishableKey:
          stripePublishableKey,

        webhookSecret:
          stripeWebhookSecret,

        testMode:
          stripeTestMode,

        apiVersion:
          process.env.STRIPE_API_VERSION ||
          '',
      },
    },

    // ==========================================================
    // MTN MOMO
    // ==========================================================

    momo: {
      enabled:
        process.env.MTN_MOMO_ENABLED ===
        'true',

      priority: 2,

      name:
        'MTN Mobile Money',

      icon: 'mobile',

      description:
        'Pay with MTN Mobile Money',

      supportedCurrencies: [
        'RWF',
        'USD',
      ],

      testMode:
        String(
          process.env.MTN_MOMO_ENVIRONMENT ||
          'sandbox'
        )
          .trim()
          .toLowerCase() ===
        'sandbox',

      config: {
        apiKey:
          process.env.MTN_MOMO_API_KEY,

        apiSecret:
          process.env.MTN_MOMO_API_SECRET,

        environment:
          process.env.MTN_MOMO_ENVIRONMENT ||
          'sandbox',

        collectionAccount:
          process.env.MTN_MOMO_COLLECTION_ACCOUNT,

        disbursementAccount:
          process.env.MTN_MOMO_DISBURSEMENT_ACCOUNT,

        callbackUrl:
          process.env.MTN_MOMO_CALLBACK_URL,
      },
    },

    // ==========================================================
    // AIRTEL MONEY
    // ==========================================================

    airtel: {
      enabled:
        process.env.AIRTEL_ENABLED ===
        'true',

      priority: 3,

      name:
        'Airtel Money',

      icon: 'mobile',

      description:
        'Pay with Airtel Money',

      supportedCurrencies: [
        'RWF',
        'USD',
      ],

      testMode:
        String(
          process.env.AIRTEL_ENVIRONMENT ||
          'sandbox'
        )
          .trim()
          .toLowerCase() ===
        'sandbox',

      config: {
        apiKey:
          process.env.AIRTEL_API_KEY,

        apiSecret:
          process.env.AIRTEL_API_SECRET,

        environment:
          process.env.AIRTEL_ENVIRONMENT ||
          'sandbox',

        collectionAccount:
          process.env.AIRTEL_COLLECTION_ACCOUNT,

        callbackUrl:
          process.env.AIRTEL_CALLBACK_URL,
      },
    },

    // ==========================================================
    // CARDS
    // ==========================================================
    //
    // Stripe already handles card payments.
    //
    // This remains as a compatibility configuration object,
    // but it is NOT exposed as an independent provider.
    //

    cards: {
      enabled: false,

      priority: 4,

      name:
        'Visa / Mastercard',

      icon:
        'credit-card',

      description:
        'Processed securely through Stripe',

      supportedCurrencies: [
        'USD',
        'EUR',
        'GBP',
        'RWF',
      ],

      testMode:
        stripeTestMode,

      config: {
        provider:
          'stripe',
      },
    },

    // ==========================================================
    // PAYPAL
    // ==========================================================

    paypal: {
      enabled:
        process.env.PAYPAL_ENABLED ===
        'true',

      priority: 5,

      name:
        'PayPal',

      icon:
        'paypal',

      description:
        'Pay with PayPal',

      supportedCurrencies: [
        'USD',
        'EUR',
        'GBP',
      ],

      testMode:
        String(
          process.env.PAYPAL_ENVIRONMENT ||
          'sandbox'
        )
          .trim()
          .toLowerCase() ===
        'sandbox',

      config: {
        clientId:
          process.env.PAYPAL_CLIENT_ID,

        clientSecret:
          process.env.PAYPAL_CLIENT_SECRET,

        environment:
          process.env.PAYPAL_ENVIRONMENT ||
          'sandbox',
      },
    },

    // ==========================================================
    // BANK TRANSFER
    // ==========================================================

    bankTransfer: {
      enabled:
        process.env.BANK_TRANSFER_ENABLED ===
        'true',

      priority: 6,

      name:
        'Bank Transfer',

      icon:
        'building',

      description:
        'Pay via bank transfer',

      supportedCurrencies: [
        'RWF',
        'USD',
        'EUR',
        'GBP',
      ],

      testMode: true,

      config: {
        accountName:
          process.env.BANK_ACCOUNT_NAME ||
          'AI Tour Rwanda',

        accountNumber:
          process.env.BANK_ACCOUNT_NUMBER,

        bankName:
          process.env.BANK_NAME,

        routingNumber:
          process.env.BANK_ROUTING_NUMBER,

        swiftCode:
          process.env.BANK_SWIFT_CODE,

        iban:
          process.env.BANK_IBAN,

        instructions:
          process.env.BANK_TRANSFER_INSTRUCTIONS ||
          'Please include your booking code as reference when making the transfer.',
      },
    },
  },

  // ============================================================
  // PROVIDER PRIORITY
  // ============================================================

  providerPriority: [
    'stripe',
    'momo',
    'airtel',
    'cards',
    'paypal',
    'bankTransfer',
  ],

  // ============================================================
  // WALLET / WITHDRAWAL
  // ============================================================

  wallet: {
    minWithdrawalAmount:
      1000,

    maxWithdrawalAmount:
      10000000,

    withdrawalFee:
      0,

    settlementDays:
      3,

    autoWithdrawalThreshold:
      null,
  },

  // ============================================================
  // WEBHOOK
  // ============================================================

  webhooks: {
    maxRetries:
      3,

    retryDelay:
      5000,

    timeout:
      30000,
  },

  // ============================================================
  // SECURITY
  // ============================================================

  security: {
    require3DSecure:
      true,

    fraudDetection:
      true,

    /**
     * Maximum amount in original transaction currency.
     */
    maxTransactionAmount:
      10000,
  },

  // ============================================================
  // FEATURES
  // ============================================================

  features: {
    partialRefunds:
      true,

    changePaymentMethod:
      false,

    multiCurrencyDisplay:
      true,

    /**
     * MVP:
     * Platform commission = 0%.
     */
    showFeesBeforePayment:
      false,
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get enabled configured providers
 * in priority order.
 */
export const getEnabledProviders =
  () => {
    const {
      providers,
      providerPriority,
    } = paymentConfig;

    return providerPriority
      .filter(
        (providerId) =>
          providers[
            providerId
          ] &&
          providers[
            providerId
          ].enabled === true
      )
      .map(
        (providerId) => ({
          id: providerId,
          ...providers[
            providerId
          ],
        })
      );
  };

/**
 * Check provider currency support.
 */
export const providerSupportsCurrency =
  (
    providerId,
    currency
  ) => {
    const provider =
      paymentConfig
        .providers[
          providerId
        ];

    if (
      !provider ||
      provider.enabled !== true
    ) {
      return false;
    }

    const normalizedCurrency =
      normalizeCurrency(
        currency
      );

    return (
      Array.isArray(
        provider.supportedCurrencies
      ) &&
      provider.supportedCurrencies.includes(
        normalizedCurrency
      )
    );
  };

/**
 * Get default currency.
 */
export const getDefaultCurrency =
  () => {
    return paymentConfig
      .currencies
      .default;
  };

/**
 * Get supported currencies.
 */
export const getSupportedCurrencies =
  () => {
    return [
      ...paymentConfig
        .currencies
        .supported,
    ];
  };

/**
 * Format currency for display.
 */
export const formatCurrency = (
  amount,
  currency
) => {
  const safeAmount =
    Number(amount) || 0;

  const normalizedCurrency =
    normalizeCurrency(
      currency
    );

  const symbols =
    paymentConfig
      .currencies
      .symbols;

  const decimals =
    paymentConfig
      .currencies
      .decimals;

  const symbol =
    symbols[
      normalizedCurrency
    ] ||
    normalizedCurrency;

  const decimalPlaces =
    decimals[
      normalizedCurrency
    ] ?? 2;

  const formatted =
    safeAmount.toFixed(
      decimalPlaces
    );

  if (
    normalizedCurrency ===
    'RWF'
  ) {
    return `${formatted} ${symbol}`;
  }

  return `${symbol}${formatted}`;
};

/**
 * Calculate platform commission.
 *
 * MVP:
 * 0%.
 */
export const calculateCommission =
  (
    amount,
    customPercentage = null
  ) => {
    const safeAmount =
      Number(amount);

    if (
      !Number.isFinite(
        safeAmount
      ) ||
      safeAmount <= 0
    ) {
      return 0;
    }

    const percentage =
      customPercentage !== null &&
      customPercentage !== undefined
        ? parsePercentage(
            customPercentage,
            paymentConfig
              .commission
              .defaultPercentage
          )
        : paymentConfig
            .commission
            .defaultPercentage;

    if (
      percentage <= 0
    ) {
      return 0;
    }

    const commission =
      (
        safeAmount *
        percentage
      ) / 100;

    const roundTo =
      paymentConfig
        .commission
        .rules
        .roundTo;

    const multiplier =
      Math.pow(
        10,
        roundTo
      );

    const rounded =
      Math.round(
        commission *
        multiplier
      ) /
      multiplier;

    return Math.min(
      Math.max(
        rounded,
        paymentConfig
          .commission
          .rules
          .minCommission
      ),
      paymentConfig
        .commission
        .rules
        .maxCommission
    );
  };

export default paymentConfig;