// backend/src/services/settlementService.js
// ============================================================
// AI TOUR RWANDA
// FINAL PRODUCTION-SAFE SETTLEMENT SERVICE
//
// FLOW
//
// Payment paid
//      ↓
// Settlement calculated
//      ↓
// Provider earning created/updated
//      ↓
// Provider earning becomes available
//      ↓
// Provider requests withdrawal
//      ↓
// ONLY exact requested earning amounts are reserved
//      ↓
// Admin approves withdrawal
//      ↓
// External payout happens outside this service
//      ↓
// Withdrawal marked paid
//      ↓
// ONLY reserved earning allocations are finalized
//
// MVP POLICY
//
// - Platform commission = 0%
// - Provider receives 100% of provider amount
// - Withdrawal is independent from original payment
// - Failed withdrawal NEVER refunds payment
// - Earning.currency is authoritative settlement currency
// - Earning strict schema is respected
// - Settlement metadata is stored in Earning.metadata
// - Only supported Withdrawal statuses are used
// - No unsupported fields are written to Earning
// ============================================================

import Currency from "../models/Currency.js";
import Earning from "../models/Earning.js";
import Payment from "../models/Payment.js";
import Withdrawal from "../models/Withdrawal.js";
import User from "../models/User.js";

import exchangeRateService from "./exchangeRateService.js";
import { currencyConfig } from "../config/currency.config.js";

// ============================================================
// LOGGER
// ============================================================

let logger;

try {
  const loggerModule = await import("../config/logger.js");

  logger =
    loggerModule.default ||
    loggerModule.logger ||
    loggerModule;
} catch (error) {
  logger = {
    info: (...args) => console.log("ℹ️", ...args),
    warn: (...args) => console.warn("⚠️", ...args),
    error: (...args) => console.error("❌", ...args),
    debug: (...args) => console.debug("🔍", ...args),
  };
}

// ============================================================
// CONSTANTS
// ============================================================

const WITHDRAWAL_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  PAID: "paid",
  REJECTED: "rejected",
});

const EARNING_STATUS = Object.freeze({
  PENDING: "pending",
  AVAILABLE: "available",
  WITHDRAWN: "withdrawn",
  FAILED: "failed",
  REFUNDED: "refunded",
});

const SETTLEMENT_STATUS = Object.freeze({
  PENDING: "pending",
  SETTLED: "settled",
  FAILED: "failed",
});

const DEFAULT_SETTLEMENT_CURRENCIES = Object.freeze([
  "RWF",
  "USD",
  "EUR",
  "GBP",
]);

const DEFAULT_MIN_WITHDRAWAL = Object.freeze({
  RWF: 1000,
  USD: 1,
  EUR: 1,
  GBP: 1,
});

const DEFAULT_MAX_WITHDRAWAL = Object.freeze({
  RWF: 10000000,
  USD: 10000000,
  EUR: 10000000,
  GBP: 10000000,
});

const ALLOWED_WITHDRAWAL_METHODS = new Set([
  "mobile_money",
  "bank",
  "bank_transfer",
]);

// ============================================================
// HELPERS
// ============================================================

function normalizeCurrency(currency, fallback = "RWF") {
  const value = String(currency || fallback)
    .trim()
    .toUpperCase();

  return value || fallback;
}

function normalizeWithdrawalMethod(method) {
  const value = String(method || "")
    .trim()
    .toLowerCase();

  if (value === "bank") {
    return "bank_transfer";
  }

  return value;
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : fallback;
}

function roundMoney(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function getObjectIdValue(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    value._id
  ) {
    return value._id;
  }

  return value;
}

function getStringId(value) {
  const id = getObjectIdValue(value);

  return id ? String(id) : null;
}

function ensureMetadataMap(document) {
  if (!document.metadata) {
    document.metadata = new Map();
  }

  if (!(document.metadata instanceof Map)) {
    document.metadata = new Map(
      Object.entries(document.metadata)
    );
  }

  return document.metadata;
}

function getMetadataValue(document, key, fallback = null) {
  if (!document?.metadata) {
    return fallback;
  }

  if (document.metadata instanceof Map) {
    const value = document.metadata.get(key);

    return value ?? fallback;
  }

  return document.metadata[key] ?? fallback;
}

function setMetadataValue(document, key, value) {
  const metadata = ensureMetadataMap(document);
  metadata.set(key, value);
}

function isPositiveAmount(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

// ============================================================
// SETTLEMENT SERVICE
// ============================================================

class SettlementService {
  constructor() {
    const settlementConfig =
      currencyConfig?.settlement || {};

    const configuredCurrencies =
      Array.isArray(
        settlementConfig.allowedCurrencies
      )
        ? settlementConfig.allowedCurrencies
        : DEFAULT_SETTLEMENT_CURRENCIES;

    this.defaultSettlementCurrency =
      normalizeCurrency(
        settlementConfig.defaultCurrency ||
          "RWF"
      );

    this.allowedSettlementCurrencies = [
      ...new Set(
        configuredCurrencies
          .map((currency) =>
            normalizeCurrency(currency, "")
          )
          .filter(Boolean)
      ),
    ];

    if (
      this.allowedSettlementCurrencies.length ===
      0
    ) {
      this.allowedSettlementCurrencies = [
        ...DEFAULT_SETTLEMENT_CURRENCIES,
      ];
    }

    this.settlementFees =
      settlementConfig.settlementFees || {};

    this.minSettlementAmounts =
      settlementConfig.minSettlementAmounts || {};

    this.maxSettlementAmounts =
      settlementConfig.maxSettlementAmounts || {};

    logger.info(
      `Settlement Service initialized. Default currency: ${this.defaultSettlementCurrency}`
    );
  }

  // ==========================================================
  // CURRENCY CONFIGURATION
  // ==========================================================

  async isCurrencyAllowedForSettlement(
    currencyCode
  ) {
    try {
      const currency =
        normalizeCurrency(
          currencyCode,
          ""
        );

      if (!currency) {
        return false;
      }

      if (
        !this.allowedSettlementCurrencies.includes(
          currency
        )
      ) {
        return false;
      }

      // ------------------------------------------------------
      // DB CONFIGURATION IS AUTHORITATIVE WHEN PRESENT.
      //
      // If Currency collection is completely empty, use
      // configured fallback currencies so development/MVP does
      // not fail simply because seeding has not happened yet.
      // ------------------------------------------------------

      const currencyDocument =
        await Currency.findOne({
          code: currency,
        }).lean();

      if (!currencyDocument) {
        const existingCurrencyCount =
          await Currency.countDocuments({});

        if (existingCurrencyCount === 0) {
          return true;
        }

        return false;
      }

      return Boolean(
        currencyDocument.isActive !== false &&
          currencyDocument.settlementAllowed !==
            false
      );
    } catch (error) {
      logger.error(
        `Failed to validate settlement currency ${currencyCode}:`,
        error
      );

      return false;
    }
  }

  async getAllowedSettlementCurrencies() {
    try {
      const dbCurrencies =
        await Currency.find({
          isActive: true,
          settlementAllowed: true,
        })
          .sort({
            isDefault: -1,
            code: 1,
          })
          .lean();

      if (dbCurrencies.length > 0) {
        return dbCurrencies.filter((currency) =>
          this.allowedSettlementCurrencies.includes(
            normalizeCurrency(currency.code, "")
          )
        );
      }

      return this.allowedSettlementCurrencies.map(
        (code) => ({
          code,
          isActive: true,
          settlementAllowed: true,
          source: "configuration",
        })
      );
    } catch (error) {
      logger.error(
        "Failed to get allowed settlement currencies:",
        error
      );

      return this.allowedSettlementCurrencies.map(
        (code) => ({
          code,
          isActive: true,
          settlementAllowed: true,
          source: "configuration_fallback",
        })
      );
    }
  }

  // ==========================================================
  // PROVIDER SETTLEMENT CURRENCY
  // ==========================================================

  async getProviderSettlementCurrency(
    providerId
  ) {
    try {
      const providerObjectId =
        getObjectIdValue(providerId);

      if (!providerObjectId) {
        return this.defaultSettlementCurrency;
      }

      const provider =
        await User.findById(providerObjectId)
          .select("preferredCurrency")
          .lean();

      const preferredCurrency =
        normalizeCurrency(
          provider?.preferredCurrency,
          ""
        );

      if (preferredCurrency) {
        const allowed =
          await this.isCurrencyAllowedForSettlement(
            preferredCurrency
          );

        if (allowed) {
          return preferredCurrency;
        }
      }

      return this.defaultSettlementCurrency;
    } catch (error) {
      logger.error(
        "Failed to determine provider settlement currency:",
        error
      );

      return this.defaultSettlementCurrency;
    }
  }

  async updateProviderSettlementCurrency(
    providerId,
    currencyCode
  ) {
    const currency =
      normalizeCurrency(
        currencyCode,
        ""
      );

    if (!currency) {
      throw new Error(
        "Settlement currency is required"
      );
    }

    const allowed =
      await this.isCurrencyAllowedForSettlement(
        currency
      );

    if (!allowed) {
      throw new Error(
        `Currency ${currency} is not allowed for settlement`
      );
    }

    const provider =
      await User.findById(providerId);

    if (!provider) {
      throw new Error(
        "Provider not found"
      );
    }

    provider.preferredCurrency = currency;

    await provider.save();

    logger.info(
      `Provider ${providerId} settlement currency updated to ${currency}`
    );

    return provider;
  }

  // ==========================================================
  // MINIMUM / MAXIMUM AMOUNTS
  // ==========================================================

  getMinSettlementAmount(currency) {
    const code =
      normalizeCurrency(currency);

    const configured =
      toNumber(
        this.minSettlementAmounts[code],
        NaN
      );

    if (Number.isFinite(configured) && configured > 0) {
      return configured;
    }

    const walletConfigured =
      toNumber(
        currencyConfig?.wallet
          ?.minWithdrawalAmount,
        NaN
      );

    if (
      code === "RWF" &&
      Number.isFinite(walletConfigured) &&
      walletConfigured > 0
    ) {
      return walletConfigured;
    }

    return (
      DEFAULT_MIN_WITHDRAWAL[code] || 1
    );
  }

  getMaxSettlementAmount(currency) {
    const code =
      normalizeCurrency(currency);

    const configured =
      toNumber(
        this.maxSettlementAmounts[code],
        NaN
      );

    if (Number.isFinite(configured) && configured > 0) {
      return configured;
    }

    const walletConfigured =
      toNumber(
        currencyConfig?.wallet
          ?.maxWithdrawalAmount,
        NaN
      );

    if (
      Number.isFinite(walletConfigured) &&
      walletConfigured > 0
    ) {
      return walletConfigured;
    }

    return (
      DEFAULT_MAX_WITHDRAWAL[code] ||
      Number.MAX_SAFE_INTEGER
    );
  }

  validateSettlementAmount(
    amount,
    currency
  ) {
    const code =
      normalizeCurrency(currency);

    const numericAmount =
      toNumber(amount, NaN);

    const minAmount =
      this.getMinSettlementAmount(code);

    const maxAmount =
      this.getMaxSettlementAmount(code);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return {
        valid: false,
        message:
          "Amount must be greater than zero",
        minAmount,
        maxAmount,
      };
    }

    if (numericAmount < minAmount) {
      return {
        valid: false,
        message:
          `Minimum amount is ${code} ${minAmount}`,
        minAmount,
        maxAmount,
      };
    }

    if (numericAmount > maxAmount) {
      return {
        valid: false,
        message:
          `Maximum amount is ${code} ${maxAmount}`,
        minAmount,
        maxAmount,
      };
    }

    return {
      valid: true,
      minAmount,
      maxAmount,
    };
  }

  // ==========================================================
  // SETTLEMENT FEE
  // ==========================================================

  calculateSettlementFee(
    amount,
    currency
  ) {
    const code =
      normalizeCurrency(currency);

    const feePercentage =
      toNumber(
        this.settlementFees?.[code],
        0
      );

    const numericAmount =
      toNumber(amount, 0);

    if (
      feePercentage <= 0 ||
      numericAmount <= 0
    ) {
      return 0;
    }

    return roundMoney(
      (numericAmount * feePercentage) / 100
    );
  }

  // ==========================================================
  // CALCULATE SETTLEMENT
  // ==========================================================

  async calculateSettlement(
    payment,
    providerId = null
  ) {
    try {
      if (!payment) {
        throw new Error(
          "Payment is required"
        );
      }

      const resolvedProviderId =
        getObjectIdValue(
          providerId || payment.provider
        );

      if (!resolvedProviderId) {
        throw new Error(
          "Payment provider is required for settlement"
        );
      }

      const providerCurrency =
        normalizeCurrency(
          await this.getProviderSettlementCurrency(
            resolvedProviderId
          )
        );

      const paymentCurrency =
        normalizeCurrency(
          payment.currency,
          "RWF"
        );

      const providerAmount =
        roundMoney(
          toNumber(
            payment.providerAmount ??
              payment.amount,
            0
          )
        );

      if (!isPositiveAmount(providerAmount)) {
        throw new Error(
          "Payment provider amount must be greater than zero"
        );
      }

      // --------------------------------------------------------
      // SAME CURRENCY
      // --------------------------------------------------------

      if (
        paymentCurrency ===
        providerCurrency
      ) {
        const settlementFee =
          this.calculateSettlementFee(
            providerAmount,
            providerCurrency
          );

        return {
          success: true,

          paymentAmount:
            providerAmount,

          paymentCurrency,

          settlementCurrency:
            providerCurrency,

          settlementAmount:
            providerAmount,

          exchangeRate: 1,

          convertedFrom:
            paymentCurrency,

          fee:
            settlementFee,

          // MVP provider commission = 0%.
          providerEarning:
            providerAmount,

          rateSource:
            "same_currency",

          effectiveDate: null,
        };
      }

      // --------------------------------------------------------
      // CURRENCY CONVERSION
      // --------------------------------------------------------

      const rateResult =
        await exchangeRateService.getRateWithConversion(
          providerAmount,
          paymentCurrency,
          providerCurrency
        );

      if (!rateResult?.success) {
        throw new Error(
          `Failed to convert ${paymentCurrency} to ${providerCurrency}`
        );
      }

      const settlementAmount =
        roundMoney(
          toNumber(
            rateResult.convertedAmount,
            0
          )
        );

      if (
        !isPositiveAmount(
          settlementAmount
        )
      ) {
        throw new Error(
          "Converted settlement amount is invalid"
        );
      }

      const settlementFee =
        this.calculateSettlementFee(
          settlementAmount,
          providerCurrency
        );

      return {
        success: true,

        paymentAmount:
          providerAmount,

        paymentCurrency,

        settlementCurrency:
          providerCurrency,

        settlementAmount,

        exchangeRate:
          toNumber(
            rateResult.rate,
            1
          ),

        convertedFrom:
          paymentCurrency,

        fee:
          settlementFee,

        // MVP provider receives the full converted amount.
        providerEarning:
          settlementAmount,

        rateSource:
          rateResult.source ||
          "exchange_rate_service",

        effectiveDate:
          rateResult.effectiveDate ||
          null,
      };
    } catch (error) {
      logger.error(
        "Settlement calculation failed:",
        error
      );

      return {
        success: false,
        error: error.message,
        paymentAmount: 0,
        paymentCurrency:
          normalizeCurrency(
            payment?.currency,
            "RWF"
          ),
        settlementCurrency:
          this.defaultSettlementCurrency,
        settlementAmount: 0,
        exchangeRate: 1,
        fee: 0,
        providerEarning: 0,
      };
    }
  }

  // ==========================================================
  // PROCESS SETTLEMENT
  // ==========================================================

  async processSettlement(
    paymentId,
    providerId = null
  ) {
    let payment = null;

    try {
      payment =
        await Payment.findById(
          paymentId
        );

      if (!payment) {
        throw new Error(
          "Payment not found"
        );
      }

      // ------------------------------------------------------
      // PAYMENT MUST BE PAID
      // ------------------------------------------------------

      if (payment.status !== "paid") {
        throw new Error(
          `Payment must be paid before settlement. Current status: ${payment.status}`
        );
      }

      // ------------------------------------------------------
      // IDEMPOTENCY
      // ------------------------------------------------------

      if (
        payment.settlementStatus ===
        SETTLEMENT_STATUS.SETTLED
      ) {
        const existingEarning =
          await Earning.findOne({
            payment: payment._id,
          });

        return {
          success: true,
          alreadySettled: true,
          payment,
          earning:
            existingEarning || null,
        };
      }

      // ------------------------------------------------------
      // MARK SETTLEMENT PENDING
      // ------------------------------------------------------

      payment.settlementStatus =
        SETTLEMENT_STATUS.PENDING;

      await payment.save();

      const resolvedProviderId =
        getObjectIdValue(
          providerId || payment.provider
        );

      if (!resolvedProviderId) {
        throw new Error(
          "Payment provider is required for settlement"
        );
      }

      const settlement =
        await this.calculateSettlement(
          payment,
          resolvedProviderId
        );

      if (!settlement.success) {
        throw new Error(
          settlement.error ||
            "Settlement calculation failed"
        );
      }

      // ------------------------------------------------------
      // CREATE / UPDATE EARNING FIRST
      // ------------------------------------------------------

      const earning =
        await this.updateEarningForSettlement(
          payment,
          settlement
        );

      if (!earning) {
        throw new Error(
          "Provider earning could not be created or updated"
        );
      }

      // ------------------------------------------------------
      // RECORD SETTLEMENT ON PAYMENT
      // ------------------------------------------------------

      payment.settlementCurrency =
        settlement.settlementCurrency;

      payment.settlementAmount =
        settlement.settlementAmount;

      payment.settlementExchangeRate =
        settlement.exchangeRate;

      payment.settlementFee =
        settlement.fee || 0;

      payment.settlementStatus =
        SETTLEMENT_STATUS.SETTLED;

      payment.settledAt =
        payment.settledAt ||
        new Date();

      await payment.save();

      logger.info(
        `Payment ${paymentId} settled successfully`
      );

      return {
        success: true,
        alreadySettled: false,
        payment,
        settlement,
        earning,
      };
    } catch (error) {
      logger.error(
        `Settlement failed for payment ${paymentId}:`,
        error
      );

      // ------------------------------------------------------
      // IMPORTANT
      //
      // A settlement failure NEVER changes a paid payment
      // into failed/refunded.
      // ------------------------------------------------------

      try {
        await Payment.findByIdAndUpdate(
          paymentId,
          {
            $set: {
              settlementStatus:
                SETTLEMENT_STATUS.FAILED,
            },
          }
        );
      } catch (updateError) {
        logger.error(
          "Failed to record settlement failure:",
          updateError
        );
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // CREATE / UPDATE PROVIDER EARNING
  // ==========================================================

  async updateEarningForSettlement(
    payment,
    settlement
  ) {
    if (!payment) {
      throw new Error(
        "Payment is required"
      );
    }

    if (!settlement?.success) {
      throw new Error(
        "Valid settlement data is required"
      );
    }

    const providerId =
      getObjectIdValue(
        payment.provider
      );

    if (!providerId) {
      throw new Error(
        "Payment provider is required"
      );
    }

    const settlementCurrency =
      normalizeCurrency(
        settlement.settlementCurrency
      );

    const providerAmount =
      roundMoney(
        settlement.providerEarning ??
          settlement.settlementAmount ??
          0
      );

    if (!isPositiveAmount(providerAmount)) {
      throw new Error(
        "Provider earning amount is invalid"
      );
    }

    let earning =
      await Earning.findOne({
        payment: payment._id,
      });

    // --------------------------------------------------------
    // CREATE NEW EARNING
    // --------------------------------------------------------

    if (!earning) {
      earning = new Earning({
        provider:
          providerId,

        booking:
          getObjectIdValue(
            payment.booking
          ),

        payment:
          payment._id,

        amount:
          providerAmount,

        platformFee: 0,

        netAmount:
          providerAmount,

        currency:
          settlementCurrency,

        availableAmount:
          providerAmount,

        bookingType:
          "listing",

        status:
          EARNING_STATUS.AVAILABLE,

        paymentId:
          payment.transactionId ||
          payment.providerReference ||
          payment.stripePaymentId ||
          String(payment._id),

        paidAt:
          payment.paidAt ||
          new Date(),
      });

      setMetadataValue(
        earning,
        "settlementOriginalAmount",
        roundMoney(
          settlement.paymentAmount
        )
      );

      setMetadataValue(
        earning,
        "settlementOriginalCurrency",
        normalizeCurrency(
          settlement.paymentCurrency
        )
      );

      setMetadataValue(
        earning,
        "settlementCurrency",
        settlementCurrency
      );

      setMetadataValue(
        earning,
        "settlementAmount",
        roundMoney(
          settlement.settlementAmount
        )
      );

      setMetadataValue(
        earning,
        "settlementExchangeRate",
        toNumber(
          settlement.exchangeRate,
          1
        )
      );

      setMetadataValue(
        earning,
        "settlementFee",
        roundMoney(
          settlement.fee || 0
        )
      );

      setMetadataValue(
        earning,
        "settlementRateSource",
        settlement.rateSource ||
          "unknown"
      );

      if (settlement.effectiveDate) {
        setMetadataValue(
          earning,
          "settlementEffectiveDate",
          settlement.effectiveDate
        );
      }

      await earning.save();

      logger.info(
        `Earning created for payment ${payment._id}`
      );

      return earning;
    }

    // --------------------------------------------------------
    // EXISTING EARNING
    //
    // NEVER rewrite a financial base after funds have already
    // been withdrawn or refunded.
    // --------------------------------------------------------

    const withdrawnAmount =
      toNumber(
        earning.withdrawnAmount,
        0
      );

    const refundedAmount =
      toNumber(
        earning.refundedAmount,
        0
      );

    const availableAmount =
      toNumber(
        earning.availableAmount,
        0
      );

    const originalAmount =
      toNumber(
        earning.amount,
        0
      );

    const reservedOrUsedAmount =
      Math.max(
        originalAmount -
          availableAmount,
        0
      );

    // --------------------------------------------------------
    // SAFE FINANCIAL SYNCHRONIZATION
    //
    // Only synchronize amount/currency when nothing has already
    // been reserved, withdrawn or refunded.
    // --------------------------------------------------------

    if (
      withdrawnAmount === 0 &&
      refundedAmount === 0 &&
      reservedOrUsedAmount === 0
    ) {
      earning.amount =
        providerAmount;

      earning.platformFee = 0;

      earning.netAmount =
        providerAmount;

      earning.currency =
        settlementCurrency;

      earning.availableAmount =
        providerAmount;

      earning.status =
        EARNING_STATUS.AVAILABLE;
    }

    // --------------------------------------------------------
    // STORE SETTLEMENT INFO IN SUPPORTED METADATA FIELD
    // --------------------------------------------------------

    setMetadataValue(
      earning,
      "settlementOriginalAmount",
      roundMoney(
        settlement.paymentAmount
      )
    );

    setMetadataValue(
      earning,
      "settlementOriginalCurrency",
      normalizeCurrency(
        settlement.paymentCurrency
      )
    );

    setMetadataValue(
      earning,
      "settlementCurrency",
      settlementCurrency
    );

    setMetadataValue(
      earning,
      "settlementAmount",
      roundMoney(
        settlement.settlementAmount
      )
    );

    setMetadataValue(
      earning,
      "settlementExchangeRate",
      toNumber(
        settlement.exchangeRate,
        1
      )
    );

    setMetadataValue(
      earning,
      "settlementFee",
      roundMoney(
        settlement.fee || 0
      )
    );

    setMetadataValue(
      earning,
      "settlementRateSource",
      settlement.rateSource ||
        "unknown"
    );

    if (settlement.effectiveDate) {
      setMetadataValue(
        earning,
        "settlementEffectiveDate",
        settlement.effectiveDate
      );
    }

    await earning.save();

    logger.info(
      `Earning synchronized for payment ${payment._id}`
    );

    return earning;
  }

  // ==========================================================
  // CURRENCY CONVERSION
  // ==========================================================

  async convertEarningAmount(
    amount,
    fromCurrency,
    toCurrency
  ) {
    const numericAmount =
      toNumber(amount, 0);

    const from =
      normalizeCurrency(
        fromCurrency
      );

    const to =
      normalizeCurrency(
        toCurrency
      );

    if (numericAmount < 0) {
      throw new Error(
        "Amount cannot be negative"
      );
    }

    if (from === to) {
      return {
        amount:
          roundMoney(
            numericAmount
          ),

        rate: 1,

        source:
          "same_currency",
      };
    }

    const result =
      await exchangeRateService.getRate(
        from,
        to
      );

    const rate =
      toNumber(
        result?.rate,
        0
      );

    if (rate <= 0) {
      throw new Error(
        `Exchange rate unavailable for ${from}/${to}`
      );
    }

    return {
      amount:
        roundMoney(
          numericAmount * rate
        ),

      rate,

      source:
        result?.source ||
        "exchange_rate_service",
    };
  }

  // ==========================================================
  // GET PROVIDER EARNINGS
  // ==========================================================

  async getProviderEarnings(
    providerId,
    currency = null
  ) {
    try {
      const displayCurrency =
        normalizeCurrency(
          currency ||
            (await this.getProviderSettlementCurrency(
              providerId
            ))
        );

      const earnings =
        await Earning.find({
          provider: providerId,

          status: {
            $in: [
              EARNING_STATUS.AVAILABLE,
              EARNING_STATUS.PENDING,
            ],
          },

          availableAmount: {
            $gt: 0,
          },
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      let total = 0;

      const formattedEarnings = [];

      for (const earning of earnings) {
        const sourceCurrency =
          normalizeCurrency(
            earning.currency,
            this.defaultSettlementCurrency
          );

        const sourceAmount =
          roundMoney(
            toNumber(
              earning.availableAmount,
              0
            )
          );

        let convertedAmount =
          sourceAmount;

        let conversionRate = 1;

        if (
          sourceCurrency !==
          displayCurrency
        ) {
          const conversion =
            await this.convertEarningAmount(
              sourceAmount,
              sourceCurrency,
              displayCurrency
            );

          convertedAmount =
            conversion.amount;

          conversionRate =
            conversion.rate;
        }

        total += convertedAmount;

        formattedEarnings.push({
          ...earning,

          availableAmount:
            sourceAmount,

          convertedAmount:
            roundMoney(
              convertedAmount
            ),

          displayCurrency,

          conversionRate,
        });
      }

      return {
        success: true,

        total:
          roundMoney(total),

        currency:
          displayCurrency,

        earnings:
          formattedEarnings,

        count:
          earnings.length,
      };
    } catch (error) {
      logger.error(
        `Failed to get earnings for provider ${providerId}:`,
        error
      );

      return {
        success: false,
        error: error.message,
        total: 0,
        currency:
          this.defaultSettlementCurrency,
        earnings: [],
        count: 0,
      };
    }
  }

  // ==========================================================
  // GET PROVIDER BALANCE
  // ==========================================================

  async getProviderBalance(
    providerId,
    currency = null
  ) {
    try {
      const balanceCurrency =
        normalizeCurrency(
          currency ||
            (await this.getProviderSettlementCurrency(
              providerId
            ))
        );

      const earnings =
        await Earning.find({
          provider: providerId,

          status: {
            $in: [
              EARNING_STATUS.AVAILABLE,
              EARNING_STATUS.PENDING,
            ],
          },

          availableAmount: {
            $gt: 0,
          },
        }).lean();

      let available = 0;

      for (const earning of earnings) {
        const earningCurrency =
          normalizeCurrency(
            earning.currency,
            this.defaultSettlementCurrency
          );

        let amount =
          roundMoney(
            toNumber(
              earning.availableAmount,
              0
            )
          );

        if (
          earningCurrency !==
          balanceCurrency
        ) {
          const converted =
            await this.convertEarningAmount(
              amount,
              earningCurrency,
              balanceCurrency
            );

          amount =
            converted.amount;
        }

        available += amount;
      }

      // ------------------------------------------------------
      // PENDING / APPROVED WITHDRAWALS ARE INFORMATIONAL.
      //
      // Their money has already been removed from
      // Earning.availableAmount.
      // Therefore DO NOT subtract again.
      // ------------------------------------------------------

      const pendingWithdrawals =
        await Withdrawal.find({
          provider: providerId,

          status: {
            $in: [
              WITHDRAWAL_STATUS.PENDING,
              WITHDRAWAL_STATUS.APPROVED,
            ],
          },
        }).lean();

      let pending = 0;

      for (
        const withdrawal of pendingWithdrawals
      ) {
        const withdrawalCurrency =
          normalizeCurrency(
            withdrawal.currency,
            balanceCurrency
          );

        let amount =
          roundMoney(
            toNumber(
              withdrawal.amount,
              0
            )
          );

        if (
          withdrawalCurrency !==
          balanceCurrency
        ) {
          const converted =
            await this.convertEarningAmount(
              amount,
              withdrawalCurrency,
              balanceCurrency
            );

          amount =
            converted.amount;
        }

        pending += amount;
      }

      const paidWithdrawals =
        await Withdrawal.find({
          provider: providerId,
          status:
            WITHDRAWAL_STATUS.PAID,
        }).lean();

      let withdrawnTotal = 0;

      for (
        const withdrawal of paidWithdrawals
      ) {
        const withdrawalCurrency =
          normalizeCurrency(
            withdrawal.currency,
            balanceCurrency
          );

        let amount =
          roundMoney(
            toNumber(
              withdrawal.amount,
              0
            )
          );

        if (
          withdrawalCurrency !==
          balanceCurrency
        ) {
          const converted =
            await this.convertEarningAmount(
              amount,
              withdrawalCurrency,
              balanceCurrency
            );

          amount =
            converted.amount;
        }

        withdrawnTotal += amount;
      }

      return {
        success: true,

        available:
          roundMoney(
            available
          ),

        pending:
          roundMoney(
            pending
          ),

        withdrawn:
          roundMoney(
            withdrawnTotal
          ),

        // Available + currently reserved.
        // This avoids double-subtracting reserved amounts.
        total:
          roundMoney(
            available + pending
          ),

        currency:
          balanceCurrency,
      };
    } catch (error) {
      logger.error(
        `Failed to get balance for provider ${providerId}:`,
        error
      );

      return {
        success: false,
        error: error.message,
        available: 0,
        pending: 0,
        withdrawn: 0,
        total: 0,
        currency:
          this.defaultSettlementCurrency,
      };
    }
  }

  // ==========================================================
  // GET WITHDRAWABLE EARNINGS
  // ==========================================================

  async getWithdrawableEarnings(
    providerId,
    currency
  ) {
    const settlementCurrency =
      normalizeCurrency(
        currency
      );

    return Earning.find({
      provider: providerId,

      // IMPORTANT:
      // Earning.js uses "currency", not settlementCurrency.
      currency: settlementCurrency,

      status: {
        $in: [
          EARNING_STATUS.AVAILABLE,
          EARNING_STATUS.PENDING,
        ],
      },

      availableAmount: {
        $gt: 0,
      },
    }).sort({
      createdAt: 1,
      _id: 1,
    });
  }

  // ==========================================================
  // RESERVE EXACT EARNINGS FOR WITHDRAWAL
  // ==========================================================

  async reserveEarningsForWithdrawal(
    providerId,
    withdrawalId,
    amount,
    currency,
    transactionReference = null
  ) {
    let remaining =
      roundMoney(amount);

    if (!isPositiveAmount(remaining)) {
      throw new Error(
        "Withdrawal amount must be greater than zero"
      );
    }

    const settlementCurrency =
      normalizeCurrency(
        currency
      );

    const earnings =
      await this.getWithdrawableEarnings(
        providerId,
        settlementCurrency
      );

    if (!earnings.length) {
      throw new Error(
        `No withdrawable earnings found in ${settlementCurrency}`
      );
    }

    const allocations = [];

    try {
      for (const earning of earnings) {
        if (remaining <= 0) {
          break;
        }

        const available =
          roundMoney(
            earning.availableAmount
          );

        if (available <= 0) {
          continue;
        }

        const allocation =
          roundMoney(
            Math.min(
              available,
              remaining
            )
          );

        if (allocation <= 0) {
          continue;
        }

        if (
          typeof earning.reserveForWithdrawal !==
          "function"
        ) {
          throw new Error(
            "Earning model does not support reserveForWithdrawal()"
          );
        }

        await earning.reserveForWithdrawal(
          withdrawalId,
          allocation,
          transactionReference
        );

        allocations.push({
          earningId:
            String(
              earning._id
            ),

          amount:
            allocation,

          currency:
            settlementCurrency,
        });

        remaining =
          roundMoney(
            remaining -
              allocation
          );
      }

      if (remaining > 0) {
        throw new Error(
          `Unable to reserve full withdrawal amount. Missing: ${remaining} ${settlementCurrency}`
        );
      }

      return allocations;
    } catch (error) {
      // ------------------------------------------------------
      // ROLLBACK ONLY THIS WITHDRAWAL'S RESERVATIONS
      // ------------------------------------------------------

      for (
        const allocation of allocations
      ) {
        try {
          const earning =
            await Earning.findById(
              allocation.earningId
            );

          if (
            earning &&
            typeof earning.releaseWithdrawalAllocation ===
              "function"
          ) {
            await earning.releaseWithdrawalAllocation(
              withdrawalId,
              "Withdrawal reservation rollback"
            );
          }
        } catch (rollbackError) {
          logger.error(
            `Failed to rollback earning ${allocation.earningId}:`,
            rollbackError
          );
        }
      }

      throw error;
    }
  }

  // ==========================================================
  // VALIDATE WITHDRAWAL METHOD
  // ==========================================================

  validateWithdrawalMethod(
    method,
    accountDetails,
    currency
  ) {
    const normalizedMethod =
      normalizeWithdrawalMethod(
        method
      );

    if (
      !ALLOWED_WITHDRAWAL_METHODS.has(
        normalizedMethod
      )
    ) {
      return {
        valid: false,
        message:
          `Unsupported withdrawal method: ${method}`,
      };
    }

    const account =
      accountDetails || {};

    if (
      typeof account !==
      "object" ||
      Array.isArray(account)
    ) {
      return {
        valid: false,
        message:
          "Withdrawal account details are required",
      };
    }

    if (
      normalizedMethod ===
      "mobile_money"
    ) {
      const phone =
        account.phone ||
        account.phoneNumber ||
        account.msisdn ||
        account.number;

      if (!phone) {
        return {
          valid: false,
          message:
            "Mobile money phone number is required",
        };
      }

      // Rwanda mobile-money settlement is RWF.
      if (
        normalizeCurrency(currency) !==
        "RWF"
      ) {
        return {
          valid: false,
          message:
            "Mobile money withdrawals must use RWF",
        };
      }
    }

    if (
      normalizedMethod ===
      "bank_transfer"
    ) {
      const accountNumber =
        account.accountNumber ||
        account.bankAccountNumber ||
        account.iban;

      if (!accountNumber) {
        return {
          valid: false,
          message:
            "Bank account number or IBAN is required",
        };
      }

      if (
        !account.accountName &&
        !account.bankAccountName
      ) {
        return {
          valid: false,
          message:
            "Bank account name is required",
        };
      }
    }

    return {
      valid: true,
      method: normalizedMethod,
    };
  }

  // ==========================================================
  // CREATE WITHDRAWAL REQUEST
  // ==========================================================

  async processWithdrawalRequest(
    providerId,
    amount,
    currency,
    method,
    accountDetails
  ) {
    let withdrawal = null;

    try {
      if (!providerId) {
        throw new Error(
          "Provider is required"
        );
      }

      const withdrawalCurrency =
        normalizeCurrency(
          currency
        );

      const withdrawalAmount =
        roundMoney(amount);

      // ------------------------------------------------------
      // CURRENCY
      // ------------------------------------------------------

      const currencyAllowed =
        await this.isCurrencyAllowedForSettlement(
          withdrawalCurrency
        );

      if (!currencyAllowed) {
        throw new Error(
          `Currency ${withdrawalCurrency} is not allowed for withdrawal`
        );
      }

      // ------------------------------------------------------
      // AMOUNT
      // ------------------------------------------------------

      const validation =
        this.validateSettlementAmount(
          withdrawalAmount,
          withdrawalCurrency
        );

      if (!validation.valid) {
        throw new Error(
          validation.message
        );
      }

      // ------------------------------------------------------
      // METHOD
      // ------------------------------------------------------

      const methodValidation =
        this.validateWithdrawalMethod(
          method,
          accountDetails,
          withdrawalCurrency
        );

      if (!methodValidation.valid) {
        throw new Error(
          methodValidation.message
        );
      }

      const normalizedMethod =
        methodValidation.method;

      // ------------------------------------------------------
      // EXACT AVAILABLE BALANCE
      // ------------------------------------------------------

      const withdrawableEarnings =
        await this.getWithdrawableEarnings(
          providerId,
          withdrawalCurrency
        );

      const exactAvailable =
        roundMoney(
          withdrawableEarnings.reduce(
            (sum, earning) =>
              sum +
              toNumber(
                earning.availableAmount,
                0
              ),
            0
          )
        );

      if (
        withdrawalAmount >
        exactAvailable
      ) {
        throw new Error(
          `Insufficient balance. Available: ${withdrawalCurrency} ${exactAvailable}`
        );
      }

      // ------------------------------------------------------
      // CREATE PENDING WITHDRAWAL FIRST
      //
      // This gives the earning reservation a stable withdrawalId.
      // ------------------------------------------------------

      withdrawal =
        new Withdrawal({
          provider:
            providerId,

          amount:
            withdrawalAmount,

          currency:
            withdrawalCurrency,

          method:
            normalizedMethod,

          accountDetails,

          status:
            WITHDRAWAL_STATUS.PENDING,

          fee: 0,

          netAmount:
            withdrawalAmount,

          requestedAt:
            new Date(),
        });

      await withdrawal.save();

      const transactionReference =
        withdrawal.transactionReference ||
        withdrawal.reference ||
        String(
          withdrawal._id
        );

      // ------------------------------------------------------
      // RESERVE EXACT REQUESTED AMOUNT
      // ------------------------------------------------------

      const allocations =
        await this.reserveEarningsForWithdrawal(
          providerId,
          withdrawal._id,
          withdrawalAmount,
          withdrawalCurrency,
          transactionReference
        );

      // ------------------------------------------------------
      // STORE ALLOCATION AUDIT TRAIL IN WITHDRAWAL.metadata
      // ------------------------------------------------------

      setMetadataValue(
        withdrawal,
        "reservationStatus",
        "reserved"
      );

      setMetadataValue(
        withdrawal,
        "allocationCount",
        allocations.length
      );

      setMetadataValue(
        withdrawal,
        "earningAllocations",
        allocations
      );

      setMetadataValue(
        withdrawal,
        "reservationAmount",
        withdrawalAmount
      );

      setMetadataValue(
        withdrawal,
        "reservationCurrency",
        withdrawalCurrency
      );

      await withdrawal.save();

      logger.info(
        `Withdrawal ${withdrawal._id} created with ${allocations.length} earning allocation(s)`
      );

      return {
        success: true,
        withdrawal,
        allocations,
      };
    } catch (error) {
      logger.error(
        `Withdrawal request failed for provider ${providerId}:`,
        error
      );

      // ------------------------------------------------------
      // IMPORTANT
      //
      // If reservation partially succeeded and the caller later
      // failed, release ONLY this withdrawal's allocations.
      // ------------------------------------------------------

      if (withdrawal?._id) {
        try {
          const allocatedEarnings =
            await Earning.find({
              provider: providerId,

              "withdrawalHistory.withdrawal":
                withdrawal._id,
            });

          for (
            const earning of allocatedEarnings
          ) {
            try {
              if (
                typeof earning.releaseWithdrawalAllocation ===
                "function"
              ) {
                await earning.releaseWithdrawalAllocation(
                  withdrawal._id,
                  "Withdrawal request failed during creation"
                );
              }
            } catch (releaseError) {
              logger.error(
                `Failed to release reservation for earning ${earning._id}:`,
                releaseError
              );
            }
          }
        } catch (findError) {
          logger.error(
            "Failed to inspect incomplete withdrawal allocations:",
            findError
          );
        }

        try {
          if (
            typeof withdrawal.reject ===
            "function"
          ) {
            await withdrawal.reject(
              error.message
            );
          } else {
            withdrawal.status =
              WITHDRAWAL_STATUS.REJECTED;

            withdrawal.rejectionReason =
              error.message;

            withdrawal.processedAt =
              new Date();

            await withdrawal.save();
          }
        } catch (rejectError) {
          logger.error(
            "Failed to reject incomplete withdrawal:",
            rejectError
          );
        }
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // GET WITHDRAWAL ALLOCATIONS
  // ==========================================================

  async getWithdrawalAllocations(
    withdrawal
  ) {
    if (!withdrawal) {
      return [];
    }

    const metadataAllocations =
      getMetadataValue(
        withdrawal,
        "earningAllocations",
        null
      );

    if (
      Array.isArray(
        metadataAllocations
      ) &&
      metadataAllocations.length > 0
    ) {
      return metadataAllocations;
    }

    // --------------------------------------------------------
    // BACKWARD-COMPATIBLE FALLBACK:
    // Read exact allocations from Earning.withdrawalHistory.
    // --------------------------------------------------------

    const earnings =
      await Earning.find({
        provider:
          withdrawal.provider,

        "withdrawalHistory.withdrawal":
          withdrawal._id,
      }).lean();

    const allocations = [];

    for (const earning of earnings) {
      const histories =
        Array.isArray(
          earning.withdrawalHistory
        )
          ? earning.withdrawalHistory
          : [];

      for (const history of histories) {
        if (
          String(
            history.withdrawal
          ) ===
          String(
            withdrawal._id
          )
        ) {
          allocations.push({
            earningId:
              String(
                earning._id
              ),

            amount:
              roundMoney(
                history.amount
              ),

            currency:
              normalizeCurrency(
                history.currency ||
                  earning.currency
              ),

            status:
              history.status,
          });
        }
      }
    }

    return allocations;
  }

  // ==========================================================
  // APPROVE WITHDRAWAL
  // ==========================================================

  async approveWithdrawal(
    withdrawalId,
    adminId
  ) {
    try {
      const withdrawal =
        await Withdrawal.findById(
          withdrawalId
        );

      if (!withdrawal) {
        throw new Error(
          "Withdrawal not found"
        );
      }

      if (
        withdrawal.status !==
        WITHDRAWAL_STATUS.PENDING
      ) {
        throw new Error(
          `Withdrawal is ${withdrawal.status}, cannot approve`
        );
      }

      // ------------------------------------------------------
      // Never approve a withdrawal that has lost all of its
      // earning reservations.
      // ------------------------------------------------------

      const allocations =
        await this.getWithdrawalAllocations(
          withdrawal
        );

      if (
        allocations.length === 0
      ) {
        throw new Error(
          "Withdrawal has no reserved earning allocations"
        );
      }

      if (
        typeof withdrawal.approve ===
        "function"
      ) {
        await withdrawal.approve(
          adminId
        );
      } else {
        withdrawal.status =
          WITHDRAWAL_STATUS.APPROVED;

        if (adminId) {
          withdrawal.processedBy =
            adminId;
        }

        withdrawal.processedAt =
          new Date();

        await withdrawal.save();
      }

      setMetadataValue(
        withdrawal,
        "approvalStatus",
        "approved"
      );

      setMetadataValue(
        withdrawal,
        "approvedAt",
        new Date()
      );

      if (adminId) {
        setMetadataValue(
          withdrawal,
          "approvedBy",
          String(adminId)
        );
      }

      await withdrawal.save();

      logger.info(
        `Withdrawal ${withdrawalId} approved`
      );

      return {
        success: true,
        withdrawal,
      };
    } catch (error) {
      logger.error(
        `Failed to approve withdrawal ${withdrawalId}:`,
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // COMPLETE / MARK WITHDRAWAL AS PAID
  // ==========================================================

  async completeWithdrawal(
    withdrawalId,
    reference = null
  ) {
    try {
      const withdrawal =
        await Withdrawal.findById(
          withdrawalId
        );

      if (!withdrawal) {
        throw new Error(
          "Withdrawal not found"
        );
      }

      // ------------------------------------------------------
      // IDEMPOTENCY
      // ------------------------------------------------------

      if (
        withdrawal.status ===
        WITHDRAWAL_STATUS.PAID
      ) {
        return {
          success: true,
          alreadyPaid: true,
          withdrawal,
        };
      }

      if (
        withdrawal.status !==
        WITHDRAWAL_STATUS.APPROVED
      ) {
        throw new Error(
          `Withdrawal is ${withdrawal.status}, cannot complete`
        );
      }

      const transactionReference =
        reference ||
        withdrawal.transactionReference ||
        withdrawal.reference ||
        String(
          withdrawal._id
        );

      // ------------------------------------------------------
      // LOAD EXACT ALLOCATIONS
      // ------------------------------------------------------

      const allocations =
        await this.getWithdrawalAllocations(
          withdrawal
        );

      if (
        allocations.length === 0
      ) {
        throw new Error(
          "Withdrawal has no earning allocations"
        );
      }

      // ------------------------------------------------------
      // VALIDATE EVERY ALLOCATION BEFORE CHANGING
      // WITHDRAWAL STATUS
      // ------------------------------------------------------

      for (
        const allocation of allocations
      ) {
        const earning =
          await Earning.findById(
            allocation.earningId
          );

        if (!earning) {
          throw new Error(
            `Earning ${allocation.earningId} not found`
          );
        }

        const history =
          Array.isArray(
            earning.withdrawalHistory
          )
            ? earning.withdrawalHistory
            : [];

        const matchingHistory =
          history.find(
            (item) =>
              String(
                item.withdrawal
              ) ===
              String(
                withdrawal._id
              )
          );

        if (!matchingHistory) {
          throw new Error(
            `No withdrawal allocation found on earning ${earning._id}`
          );
        }

        if (
          matchingHistory.status ===
            "released" ||
          matchingHistory.status ===
            "failed"
        ) {
          throw new Error(
            `Earning ${earning._id} allocation is already ${matchingHistory.status}`
          );
        }
      }

      // ------------------------------------------------------
      // MARK WITHDRAWAL PAID
      //
      // External payout must already have succeeded before
      // this method is called.
      // ------------------------------------------------------

      if (
        typeof withdrawal.markAsPaid ===
        "function"
      ) {
        await withdrawal.markAsPaid(
          transactionReference
        );
      } else {
        withdrawal.status =
          WITHDRAWAL_STATUS.PAID;

        withdrawal.transactionReference =
          transactionReference;

        withdrawal.paidAt =
          new Date();

        withdrawal.processedAt =
          new Date();

        await withdrawal.save();
      }

      // ------------------------------------------------------
      // FINALIZE ONLY THE EXACT RESERVED ALLOCATIONS
      // ------------------------------------------------------

      const finalizationErrors = [];

      for (
        const allocation of allocations
      ) {
        try {
          const earning =
            await Earning.findById(
              allocation.earningId
            );

          if (!earning) {
            throw new Error(
              `Earning ${allocation.earningId} not found`
            );
          }

          if (
            typeof earning.markWithdrawalAllocationPaid !==
            "function"
          ) {
            throw new Error(
              `Earning ${earning._id} does not support markWithdrawalAllocationPaid()`
            );
          }

          await earning.markWithdrawalAllocationPaid(
            withdrawal._id,
            transactionReference
          );
        } catch (error) {
          finalizationErrors.push({
            earningId:
              allocation.earningId,

            error:
              error.message,
          });
        }
      }

      setMetadataValue(
        withdrawal,
        "payoutFinalizationStatus",
        finalizationErrors.length ===
          0
          ? "complete"
          : "reconciliation_required"
      );

      setMetadataValue(
        withdrawal,
        "payoutFinalizedAt",
        new Date()
      );

      if (
        finalizationErrors.length >
        0
      ) {
        setMetadataValue(
          withdrawal,
          "finalizationErrors",
          finalizationErrors
        );
      }

      await withdrawal.save();

      if (
        finalizationErrors.length >
        0
      ) {
        logger.error(
          `Withdrawal ${withdrawalId} is paid but earning finalization requires reconciliation`,
          finalizationErrors
        );

        return {
          success: true,
          paid: true,
          reconciliationRequired: true,
          withdrawal,
          errors:
            finalizationErrors,
        };
      }

      logger.info(
        `Withdrawal ${withdrawalId} marked as paid and all reserved earning allocations finalized`
      );

      return {
        success: true,
        alreadyPaid: false,
        paid: true,
        withdrawal,
      };
    } catch (error) {
      logger.error(
        `Failed to complete withdrawal ${withdrawalId}:`,
        error
      );

      // IMPORTANT:
      // Do not touch Payment.
      // Do not refund Payment.
      // Do not reverse booking.
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // REJECT WITHDRAWAL
  // ==========================================================

  async rejectWithdrawal(
    withdrawalId,
    reason,
    adminId
  ) {
    try {
      const withdrawal =
        await Withdrawal.findById(
          withdrawalId
        );

      if (!withdrawal) {
        throw new Error(
          "Withdrawal not found"
        );
      }

      if (
        withdrawal.status !==
          WITHDRAWAL_STATUS.PENDING &&
        withdrawal.status !==
          WITHDRAWAL_STATUS.APPROVED
      ) {
        if (
          withdrawal.status ===
          WITHDRAWAL_STATUS.REJECTED
        ) {
          return {
            success: true,
            alreadyRejected: true,
            withdrawal,
          };
        }

        throw new Error(
          `Withdrawal is ${withdrawal.status}, cannot reject`
        );
      }

      // ------------------------------------------------------
      // RELEASE EXACT ALLOCATIONS FIRST
      // ------------------------------------------------------

      const allocatedEarnings =
        await Earning.find({
          provider:
            withdrawal.provider,

          "withdrawalHistory.withdrawal":
            withdrawal._id,
        });

      for (
        const earning of allocatedEarnings
      ) {
        const histories =
          Array.isArray(
            earning.withdrawalHistory
          )
            ? earning.withdrawalHistory
            : [];

        const matchingHistory =
          histories.find(
            (item) =>
              String(
                item.withdrawal
              ) ===
              String(
                withdrawal._id
              )
          );

        if (!matchingHistory) {
          continue;
        }

        // Already released/failed = nothing to release.
        if (
          matchingHistory.status ===
            "released" ||
          matchingHistory.status ===
            "failed"
        ) {
          continue;
        }

        if (
          matchingHistory.status ===
          "paid"
        ) {
          throw new Error(
            `Withdrawal ${withdrawalId} contains an already-paid earning allocation`
          );
        }

        if (
          typeof earning.releaseWithdrawalAllocation !==
          "function"
        ) {
          throw new Error(
            `Earning ${earning._id} does not support releaseWithdrawalAllocation()`
          );
        }

        await earning.releaseWithdrawalAllocation(
          withdrawal._id,
          reason ||
            "Withdrawal rejected"
        );
      }

      // ------------------------------------------------------
      // MARK WITHDRAWAL REJECTED
      // ------------------------------------------------------

      if (
        typeof withdrawal.reject ===
        "function"
      ) {
        await withdrawal.reject(
          reason ||
            "Withdrawal rejected",
          adminId
        );
      } else {
        withdrawal.status =
          WITHDRAWAL_STATUS.REJECTED;

        withdrawal.rejectionReason =
          reason ||
          "Withdrawal rejected";

        if (adminId) {
          withdrawal.processedBy =
            adminId;
        }

        withdrawal.processedAt =
          new Date();

        await withdrawal.save();
      }

      setMetadataValue(
        withdrawal,
        "reservationStatus",
        "released"
      );

      setMetadataValue(
        withdrawal,
        "releasedAt",
        new Date()
      );

      if (adminId) {
        setMetadataValue(
          withdrawal,
          "rejectedBy",
          String(adminId)
        );
      }

      await withdrawal.save();

      logger.info(
        `Withdrawal ${withdrawalId} rejected and exact reservations released`
      );

      return {
        success: true,
        withdrawal,
      };
    } catch (error) {
      logger.error(
        `Failed to reject withdrawal ${withdrawalId}:`,
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================
  // GET WITHDRAWAL HISTORY
  // ==========================================================

  async getWithdrawalHistory(
    providerId,
    options = {}
  ) {
    try {
      const filter = {
        provider: providerId,
      };

      if (options.status) {
        filter.status =
          options.status;
      }

      if (options.currency) {
        filter.currency =
          normalizeCurrency(
            options.currency
          );
      }

      const limit =
        Math.min(
          Math.max(
            toNumber(
              options.limit,
              50
            ),
            1
          ),
          200
        );

      const skip =
        Math.max(
          toNumber(
            options.skip,
            0
          ),
          0
        );

      const withdrawals =
        await Withdrawal.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      const total =
        await Withdrawal.countDocuments(
          filter
        );

      return {
        success: true,
        withdrawals,
        total,
        limit,
        skip,
      };
    } catch (error) {
      logger.error(
        `Failed to get withdrawal history for provider ${providerId}:`,
        error
      );

      return {
        success: false,
        error: error.message,
        withdrawals: [],
        total: 0,
      };
    }
  }

  // ==========================================================
  // GET PENDING WITHDRAWALS
  // ==========================================================

  async getPendingWithdrawals(
    providerId = null
  ) {
    try {
      const filter = {
        status:
          WITHDRAWAL_STATUS.PENDING,
      };

      if (providerId) {
        filter.provider =
          providerId;
      }

      const withdrawals =
        await Withdrawal.find(
          filter
        )
          .sort({
            createdAt: 1,
          })
          .lean();

      return {
        success: true,
        withdrawals,
        count:
          withdrawals.length,
      };
    } catch (error) {
      logger.error(
        "Failed to get pending withdrawals:",
        error
      );

      return {
        success: false,
        error: error.message,
        withdrawals: [],
        count: 0,
      };
    }
  }

  // ==========================================================
  // SETTLEMENT STATISTICS
  // ==========================================================

  async getSettlementStats(
    providerId = null
  ) {
    try {
      const filter =
        providerId
          ? {
              provider: providerId,
              settlementStatus:
                SETTLEMENT_STATUS.SETTLED,
            }
          : {
              settlementStatus:
                SETTLEMENT_STATUS.SETTLED,
            };

      const stats =
        await Payment.aggregate([
          {
            $match: filter,
          },
          {
            $group: {
              _id:
                "$settlementCurrency",

              totalSettled: {
                $sum:
                  "$settlementAmount",
              },

              totalFees: {
                $sum:
                  "$settlementFee",
              },

              count: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ]);

      const totalSettled =
        roundMoney(
          stats.reduce(
            (sum, item) =>
              sum +
              toNumber(
                item.totalSettled,
                0
              ),
            0
          )
        );

      const totalFees =
        roundMoney(
          stats.reduce(
            (sum, item) =>
              sum +
              toNumber(
                item.totalFees,
                0
              ),
            0
          )
        );

      return {
        success: true,

        byCurrency:
          stats,

        totalSettled,

        totalFees,

        netSettled:
          roundMoney(
            totalSettled -
              totalFees
          ),
      };
    } catch (error) {
      logger.error(
        "Failed to get settlement stats:",
        error
      );

      return {
        success: false,
        error: error.message,
        byCurrency: [],
        totalSettled: 0,
        totalFees: 0,
        netSettled: 0,
      };
    }
  }

  // ==========================================================
  // WITHDRAWAL STATISTICS
  // ==========================================================

  async getWithdrawalStats(
    providerId = null
  ) {
    try {
      const filter =
        providerId
          ? {
              provider: providerId,
            }
          : {};

      const stats =
        await Withdrawal.aggregate([
          {
            $match: filter,
          },
          {
            $group: {
              _id:
                "$status",

              total: {
                $sum:
                  "$amount",
              },

              count: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ]);

      const byStatus = {};

      for (
        const item of stats
      ) {
        byStatus[item._id] = {
          total:
            roundMoney(
              item.total
            ),

          count:
            toNumber(
              item.count,
              0
            ),
        };
      }

      return {
        success: true,
        byStatus,
      };
    } catch (error) {
      logger.error(
        "Failed to get withdrawal stats:",
        error
      );

      return {
        success: false,
        error: error.message,
        byStatus: {},
      };
    }
  }
}

// ============================================================
// SINGLETON
// ============================================================

const settlementService =
  new SettlementService();

export default settlementService;

