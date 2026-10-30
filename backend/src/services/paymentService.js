// backend/src/services/paymentService.js
//
// AI TOUR RWANDA
// FINAL PAYMENT SERVICE
//
// MVP PAYMENT POLICY
// ------------------
// - Platform commission = 0%
// - Provider receives 100% of successful payment
// - Frontend NEVER confirms payment
// - Provider/server verification is the source of truth
// - Canonical internal success status = "paid"
// - Payment verification is idempotent
// - Webhooks are idempotent
// - One Earning document per successful payment
// - Settlement failure NEVER reverses a successful payment
// - Refund is finalized ONLY after provider confirmation
//
// FLOW
// ----
// Booking
//   ↓
// Payment pending
//   ↓
// Provider checkout / Request-to-Pay
//   ↓
// Server/provider verification
//   ↓
// Payment = paid
//   ↓
// Booking = paid
//   ↓
// Earning = available
//   ↓
// Settlement
//   ↓
// Withdrawal / payout
//

import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Earning from "../models/Earning.js";

import { createNotification } from "../utils/notificationService.js";

import paymentConfig, {
  getDefaultCurrency,
} from "../config/payment.config.js";

import {
  PAYMENT_STATUS,
} from "./paymentProvider.interface.js";

import currencyService from "./currencyService.js";
import exchangeRateService from "./exchangeRateService.js";
import settlementService from "./settlementService.js";

import StripeProvider from "./providers/stripe.provider.js";
import MomoProvider from "./providers/momo.provider.js";
import AirtelProvider from "./providers/airtel.provider.js";

// ============================================================
// CONSTANTS
// ============================================================

const STATUS = Object.freeze({
  PENDING:
    PAYMENT_STATUS?.PENDING ||
    "pending",

  PROCESSING:
    PAYMENT_STATUS?.PROCESSING ||
    "processing",

  // Production success state.
  PAID: "paid",

  FAILED:
    PAYMENT_STATUS?.FAILED ||
    "failed",

  REFUNDED:
    PAYMENT_STATUS?.REFUNDED ||
    "refunded",

  PARTIALLY_REFUNDED:
    PAYMENT_STATUS?.PARTIALLY_REFUNDED ||
    "partially_refunded",
});

const ACTIVE_STATUSES = new Set([
  STATUS.PENDING,
  STATUS.PROCESSING,
]);

const REFUNDABLE_STATUSES = new Set([
  STATUS.PAID,
  STATUS.PARTIALLY_REFUNDED,
]);

const TERMINAL_BOOKING_STATUSES = new Set([
  "cancelled",
  "rejected",
  "completed",
  "review_eligible",
]);

const CHECKOUT_REUSE_WINDOW_MS =
  30 * 60 * 1000;

// ============================================================
// BASIC HELPERS
// ============================================================

const safeString = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
};

const safeNumber = (
  value,
  fallback = 0
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

// ============================================================
// PAYMENT SERVICE
// ============================================================

class PaymentService {
  constructor() {
    this.providers = new Map();

    this.initializeProviders();
  }

  // ==========================================================
  // PROVIDER INITIALIZATION
  // ==========================================================

  initializeProviders() {
    const configs =
      paymentConfig?.providers || {};

    // --------------------------------------------------------
    // STRIPE
    // --------------------------------------------------------

    if (configs.stripe?.enabled) {
      try {
        // IMPORTANT:
        // StripeProvider expects the COMPLETE stripe config:
        //
        // configs.stripe = {
        //   enabled,
        //   testMode,
        //   supportedCurrencies,
        //   config: {
        //     secretKey,
        //     publishableKey,
        //     webhookSecret,
        //     apiVersion
        //   }
        // }
        //
        // Do NOT pass configs.stripe.config here.
        const provider =
          new StripeProvider(
            configs.stripe
          );

        this.providers.set(
          "stripe",
          provider
        );

        console.log(
          "✅ Stripe payment provider initialized"
        );
      } catch (error) {
        console.error(
          "❌ Stripe initialization failed:",
          error.message
        );
      }
    }

    // --------------------------------------------------------
    // MTN MOMO
    // --------------------------------------------------------

    if (configs.momo?.enabled) {
      try {
        const provider =
          new MomoProvider(
            configs.momo.config || {}
          );

        this.providers.set(
          "momo",
          provider
        );

        console.log(
          "✅ MTN MoMo payment provider initialized"
        );
      } catch (error) {
        console.error(
          "❌ MTN MoMo initialization failed:",
          error.message
        );
      }
    }

    // --------------------------------------------------------
    // AIRTEL MONEY
    // --------------------------------------------------------

    if (configs.airtel?.enabled) {
      try {
        const provider =
          new AirtelProvider(
            configs.airtel.config || {}
          );

        this.providers.set(
          "airtel",
          provider
        );

        console.log(
          "✅ Airtel Money payment provider initialized"
        );
      } catch (error) {
        console.error(
          "❌ Airtel initialization failed:",
          error.message
        );
      }
    }

    console.log(
      `💰 Payment Service initialized with ${this.providers.size} provider(s)`
    );
  }

  // ==========================================================
  // PROVIDER ACCESS
  // ==========================================================

  normalizeProviderId(
    providerId
  ) {
    const value =
      safeString(
        providerId
      ).toLowerCase();

    if (
      [
        "card",
        "cards",
        "credit_card",
        "debit_card",
      ].includes(value)
    ) {
      return "stripe";
    }

    return value;
  }

  getProvider(
    providerId = "stripe"
  ) {
    const normalized =
      this.normalizeProviderId(
        providerId
      );

    const provider =
      this.providers.get(
        normalized
      );

    if (!provider) {
      throw new Error(
        `Payment provider "${normalized}" is not available`
      );
    }

    if (
      provider.isEnabled === false
    ) {
      throw new Error(
        `Payment provider "${normalized}" is disabled`
      );
    }

    return provider;
  }

  getEnabledProviders() {
    return Array.from(
      this.providers.entries()
    )
      .filter(
        ([, provider]) =>
          provider &&
          provider.isEnabled !== false
      )
      .map(
        ([id, provider]) => ({
          id,

          name:
            provider.providerName ||
            id,

          supportedCurrencies:
            provider.supportedCurrencies ||
            [],

          isTestMode:
            Boolean(
              provider.isTestMode
            ),
        })
      );
  }

  // ==========================================================
  // GENERAL HELPERS
  // ==========================================================

  normalizeCurrency(
    currency
  ) {
    return (
      safeString(
        currency ||
          getDefaultCurrency() ||
          "USD"
      ).toUpperCase() ||
      "USD"
    );
  }

  roundMoney(
    value
  ) {
    const number =
      Number(value);

    if (
      !Number.isFinite(number)
    ) {
      return 0;
    }

    return (
      Math.round(
        (number +
          Number.EPSILON) *
          100
      ) / 100
    );
  }

  toPlainObject(
    value
  ) {
    if (!value) {
      return {};
    }

    if (
      value instanceof Map
    ) {
      return Object.fromEntries(
        value
      );
    }

    if (
      typeof value !==
      "object"
    ) {
      return {};
    }

    try {
      return JSON.parse(
        JSON.stringify(value)
      );
    } catch {
      return {};
    }
  }

  getPaymentMetadata(
    payment
  ) {
    return this.toPlainObject(
      payment?.metadata
    );
  }

  getProviderData(
    payment
  ) {
    return this.toPlainObject(
      payment?.providerData
    );
  }

  // ==========================================================
  // PROVIDER STATUS NORMALIZATION
  // ==========================================================

  normalizeProviderStatus(
    status
  ) {
    const value =
      safeString(
        status
      ).toLowerCase();

    if (
      [
        "paid",
        "success",
        "successful",
        "succeeded",
        "completed",
        "complete",
      ].includes(value)
    ) {
      return STATUS.PAID;
    }

    if (
      [
        "failed",
        "failure",
        "declined",
        "cancelled",
        "canceled",
        "expired",
      ].includes(value)
    ) {
      return STATUS.FAILED;
    }

    if (
      [
        "processing",
        "in_progress",
        "pending_confirmation",
        "pending",
        "accepted",
        "initiated",
        "requires_action",
        "requires_payment_method",
        "requires_confirmation",
      ].includes(value)
    ) {
      return STATUS.PROCESSING;
    }

    if (
      [
        "refunded",
        "refund_succeeded",
      ].includes(value)
    ) {
      return STATUS.REFUNDED;
    }

    if (
      [
        "partially_refunded",
        "partial_refund",
      ].includes(value)
    ) {
      return STATUS.PARTIALLY_REFUNDED;
    }

    return STATUS.PENDING;
  }

  getProviderReference(
    payment
  ) {
    const providerData =
      this.getProviderData(
        payment
      );

    const metadata =
      this.getPaymentMetadata(
        payment
      );

    return (
      payment?.providerReference ||
      payment?.transactionId ||
      payment?.stripePaymentId ||
      payment?.stripeSessionId ||
      providerData.providerReference ||
      providerData.transactionId ||
      providerData.paymentId ||
      providerData.referenceId ||
      metadata.providerReference ||
      null
    );
  }

  getResultReference(
    result = {}
  ) {
    return (
      result?.providerReference ||
      result?.transactionId ||
      result?.paymentId ||
      result?.referenceId ||
      result?.sessionId ||
      result?.data?.providerReference ||
      result?.data?.transactionId ||
      result?.data?.paymentId ||
      result?.data?.referenceId ||
      null
    );
  }

  getResultPaymentUrl(
    result = {}
  ) {
    return (
      result?.paymentUrl ||
      result?.checkoutUrl ||
      result?.url ||
      result?.data?.paymentUrl ||
      result?.data?.checkoutUrl ||
      null
    );
  }

  // ==========================================================
  // WEBHOOK URL
  // ==========================================================

  buildWebhookUrl(
    providerId
  ) {
    const configured =
      process.env.PAYMENT_WEBHOOK_BASE_URL ||
      process.env.BACKEND_URL ||
      process.env.API_URL ||
      "";

    if (!configured) {
      return null;
    }

    const base =
      configured
        .trim()
        .replace(
          /\/+$/,
          ""
        );

    if (
      base.endsWith(
        "/api"
      )
    ) {
      return `${base}/payments/webhook/${providerId}`;
    }

    return `${base}/api/payments/webhook/${providerId}`;
  }

  // ==========================================================
  // PAYMENT LOOKUPS
  // ==========================================================

  async getPaymentById(
    paymentId
  ) {
    if (!paymentId) {
      throw new Error(
        "Payment ID is required"
      );
    }

    const payment =
      await Payment.findById(
        paymentId
      );

    if (!payment) {
      throw new Error(
        "Payment not found"
      );
    }

    return payment;
  }

  async findPaymentFromProviderData(
    data = {}
  ) {
    const metadata =
      this.toPlainObject(
        data.metadata
      );

    if (
      metadata.paymentId
    ) {
      const payment =
        await Payment.findById(
          metadata.paymentId
        );

      if (payment) {
        return payment;
      }
    }

    const references = [
      data.providerReference,
      data.paymentId,
      data.paymentIntentId,
      data.transactionId,
      data.referenceId,
      data.sessionId,
      data.stripePaymentId,
      data.stripeSessionId,
      data.id,
    ]
      .filter(Boolean)
      .map(String);

    const unique =
      [
        ...new Set(
          references
        ),
      ];

    if (!unique.length) {
      return null;
    }

    const conditions = [];

    for (
      const reference of unique
    ) {
      conditions.push(
        {
          providerReference:
            reference,
        },
        {
          transactionId:
            reference,
        },
        {
          stripePaymentId:
            reference,
        },
        {
          stripeSessionId:
            reference,
        }
      );
    }

    return Payment.findOne({
      $or: conditions,
    });
  }

  async findReusablePayment(
    bookingId,
    providerId
  ) {
    const since =
      new Date(
        Date.now() -
          CHECKOUT_REUSE_WINDOW_MS
      );

    return Payment.findOne({
      booking:
        bookingId,

      paymentMethod:
        providerId,

      status: {
        $in: [
          STATUS.PENDING,
          STATUS.PROCESSING,
        ],
      },

      paymentUrl: {
        $exists: true,
        $ne: null,
      },

      createdAt: {
        $gte: since,
      },
    }).sort({
      createdAt: -1,
    });
  }

  // ==========================================================
  // CREATE PAYMENT
  // ==========================================================

  async createPayment(
    data = {}
  ) {
    const {
      bookingId,
      providerId = "stripe",
      userId,
      currency,
      successUrl,
      cancelUrl,
      metadata = {},
      description,
      payerPhone,
    } = data;

    if (!bookingId) {
      throw new Error(
        "Booking ID is required"
      );
    }

    const normalizedProvider =
      this.normalizeProviderId(
        providerId
      );

    const provider =
      this.getProvider(
        normalizedProvider
      );

    // --------------------------------------------------------
    // LOAD BOOKING
    // --------------------------------------------------------

    const booking =
      await Booking.findById(
        bookingId
      )
        .populate(
          "user",
          "name email preferredCurrency phone phoneNumber"
        )
        .populate(
          "listing",
          "title price currency _id"
        )
        .populate(
          "provider",
          "name email preferredCurrency phone phoneNumber"
        );

    if (!booking) {
      throw new Error(
        "Booking not found"
      );
    }

    if (!booking.user) {
      throw new Error(
        "Booking traveler not found"
      );
    }

    if (!booking.listing) {
      throw new Error(
        "Booking listing not found"
      );
    }

    if (!booking.provider) {
      throw new Error(
        "Booking provider not found"
      );
    }

    // --------------------------------------------------------
    // OWNERSHIP
    // --------------------------------------------------------

    if (
      userId &&
      String(
        booking.user._id
      ) !==
        String(userId)
    ) {
      throw new Error(
        "You are not authorized to pay for this booking"
      );
    }

    // --------------------------------------------------------
    // BOOKING STATE
    // --------------------------------------------------------

    if (
      TERMINAL_BOOKING_STATUSES.has(
        booking.status
      )
    ) {
      throw new Error(
        `Booking cannot be paid in status "${booking.status}"`
      );
    }

    if (
      booking.paymentStatus ===
        STATUS.PAID ||
      booking.status ===
        STATUS.PAID
    ) {
      throw new Error(
        "Booking is already paid"
      );
    }

    // --------------------------------------------------------
    // RECOVER SUCCESSFUL PAYMENT
    // --------------------------------------------------------

    const successfulPayment =
      await Payment.findOne({
        booking:
          booking._id,

        status:
          STATUS.PAID,
      }).sort({
        createdAt: -1,
      });

    if (successfulPayment) {
      await this.handleSuccessfulPayment(
        successfulPayment,
        {
          recovered: true,
          source:
            "createPayment",
        }
      );

      throw new Error(
        "Booking already has a successful payment"
      );
    }

    // --------------------------------------------------------
    // REUSE EXISTING CHECKOUT
    // --------------------------------------------------------

    const reusable =
      await this.findReusablePayment(
        booking._id,
        normalizedProvider
      );

    if (reusable) {
      return {
        success: true,

        reused: true,

        payment:
          this.serializePayment(
            reusable
          ),

        providerResult: {
          success: true,

          paymentId:
            reusable.providerReference,

          paymentUrl:
            reusable.paymentUrl,

          status:
            reusable.status,
        },
      };
    }

    // --------------------------------------------------------
    // ORIGINAL BOOKING MONEY
    // --------------------------------------------------------

    const originalCurrency =
      this.normalizeCurrency(
        booking.currency ||
          booking.listing.currency ||
          getDefaultCurrency()
      );

    const originalAmount =
      this.roundMoney(
        booking.totalPrice
      );

    if (
      originalAmount <= 0
    ) {
      throw new Error(
        "Invalid booking amount"
      );
    }

    // --------------------------------------------------------
    // PAYMENT CURRENCY
    // --------------------------------------------------------

    let paymentCurrency =
      this.normalizeCurrency(
        currency ||
          booking.currency ||
          originalCurrency
      );

    const supportedCurrencies =
      (
        provider.supportedCurrencies ||
        []
      ).map(
        (item) =>
          this.normalizeCurrency(
            item
          )
      );

    if (
      supportedCurrencies.length &&
      !supportedCurrencies.includes(
        paymentCurrency
      )
    ) {
      const defaultCurrency =
        this.normalizeCurrency(
          getDefaultCurrency()
        );

      if (
        supportedCurrencies.includes(
          defaultCurrency
        )
      ) {
        paymentCurrency =
          defaultCurrency;
      } else {
        throw new Error(
          `${normalizedProvider} does not support ${paymentCurrency}`
        );
      }
    }

    // --------------------------------------------------------
    // PAYMENT CURRENCY CONVERSION
    // --------------------------------------------------------

    let paymentAmount =
      originalAmount;

    let paymentExchangeRate =
      1;

    if (
      originalCurrency !==
      paymentCurrency
    ) {
      const conversion =
        await exchangeRateService.getRateWithConversion(
          originalAmount,
          originalCurrency,
          paymentCurrency
        );

      if (
        !conversion?.success ||
        !Number.isFinite(
          Number(
            conversion.convertedAmount
          )
        )
      ) {
        throw new Error(
          `Unable to convert ${originalCurrency} to ${paymentCurrency}`
        );
      }

      paymentExchangeRate =
        safeNumber(
          conversion.rate,
          0
        );

      paymentAmount =
        this.roundMoney(
          conversion.convertedAmount
        );

      if (
        paymentExchangeRate <= 0
      ) {
        throw new Error(
          "Invalid payment exchange rate"
        );
      }
    }

    if (
      paymentAmount <= 0
    ) {
      throw new Error(
        "Invalid payment amount"
      );
    }

    // ========================================================
    // MVP COMMISSION = 0%
    // ========================================================

    const platformFee = 0;

    const providerAmount =
      this.roundMoney(
        paymentAmount
      );

    // ========================================================
    // SETTLEMENT CURRENCY
    // ========================================================

    let settlementCurrency =
      paymentCurrency;

    try {
      const preferred =
        await settlementService.getProviderSettlementCurrency(
          booking.provider._id
        );

      if (preferred) {
        settlementCurrency =
          this.normalizeCurrency(
            preferred
          );
      }
    } catch (error) {
      console.warn(
        "⚠️ Settlement currency lookup failed:",
        error.message
      );

      settlementCurrency =
        paymentCurrency;
    }

    // --------------------------------------------------------
    // SETTLEMENT AMOUNT
    // --------------------------------------------------------

    let settlementAmount =
      providerAmount;

    let settlementRate =
      1;

    if (
      settlementCurrency !==
      paymentCurrency
    ) {
      try {
        const conversion =
          await exchangeRateService.getRateWithConversion(
            providerAmount,
            paymentCurrency,
            settlementCurrency
          );

        if (
          conversion?.success &&
          Number.isFinite(
            Number(
              conversion.convertedAmount
            )
          ) &&
          Number(
            conversion.rate
          ) > 0
        ) {
          settlementAmount =
            this.roundMoney(
              conversion.convertedAmount
            );

          settlementRate =
            Number(
              conversion.rate
            );
        } else {
          settlementCurrency =
            paymentCurrency;

          settlementAmount =
            providerAmount;

          settlementRate =
            1;
        }
      } catch (error) {
        console.warn(
          "⚠️ Settlement conversion failed; keeping payment currency:",
          error.message
        );

        settlementCurrency =
          paymentCurrency;

        settlementAmount =
          providerAmount;

        settlementRate =
          1;
      }
    }

    // ========================================================
    // CLEAN METADATA
    // ========================================================

    const cleanMetadata = {
      ...this.toPlainObject(
        metadata
      ),

      paymentId:
        null,

      bookingId:
        String(
          booking._id
        ),

      listingId:
        String(
          booking.listing._id
        ),

      travelerId:
        String(
          booking.user._id
        ),

      providerUserId:
        String(
          booking.provider._id
        ),

      originalAmount:
        String(
          originalAmount
        ),

      originalCurrency,

      paymentAmount:
        String(
          paymentAmount
        ),

      paymentCurrency,

      paymentExchangeRate:
        String(
          paymentExchangeRate
        ),

      settlementCurrency,

      settlementAmount:
        String(
          settlementAmount
        ),

      settlementRate:
        String(
          settlementRate
        ),

      platformFee:
        "0",

      providerAmount:
        String(
          providerAmount
        ),
    };

    // ========================================================
    // CREATE INTERNAL PAYMENT
    // ========================================================

    const payment =
      await Payment.create({
        traveler:
          booking.user._id,

        provider:
          booking.provider._id,

        booking:
          booking._id,

        listing:
          booking.listing._id,

        amount:
          paymentAmount,

        currency:
          paymentCurrency,

        platformFee:
          0,

        providerAmount,

        settlementCurrency,

        settlementAmount,

        settlementRate,

        paymentMethod:
          normalizedProvider,

        status:
          STATUS.PENDING,

        metadata:
          cleanMetadata,

        providerData: {
          providerId:
            normalizedProvider,

          paymentExchangeRate:
            String(
              paymentExchangeRate
            ),

          payerPhone:
            payerPhone
              ? String(
                  payerPhone
                )
              : undefined,
        },
      });

    // Store internal Payment ID in metadata.
    try {
      payment.metadata.set(
        "paymentId",
        String(
          payment._id
        )
      );

      payment.markModified(
        "metadata"
      );

      await payment.save();
    } catch (error) {
      console.warn(
        "⚠️ Payment metadata update failed:",
        error.message
      );
    }

    // ========================================================
    // PROVIDER REQUEST
    // ========================================================

    const providerPayload = {
      paymentId:
        String(
          payment._id
        ),

      bookingId:
        String(
          booking._id
        ),

      userId:
        String(
          booking.user._id
        ),

      travelerId:
        String(
          booking.user._id
        ),

      providerUserId:
        String(
          booking.provider._id
        ),

      amount:
        paymentAmount,

      currency:
        paymentCurrency,

      description:
        description ||
        `AI Tour payment for ${booking.listing.title}`,

      successUrl,

      cancelUrl,

      payerPhone:
        payerPhone ||
        booking.user.phoneNumber ||
        booking.user.phone ||
        null,

      webhookUrl:
        this.buildWebhookUrl(
          normalizedProvider
        ),

      metadata:
        cleanMetadata,
    };

    let providerResult;

    try {
      providerResult =
        await provider.createPayment(
          providerPayload
        );
    } catch (error) {
      await this.markPaymentCreationFailed(
        payment,
        error
      );

      throw error;
    }

    if (
      !providerResult ||
      providerResult.success ===
        false
    ) {
      const message =
        providerResult?.message ||
        providerResult?.error ||
        "Payment provider could not create the payment";

      await this.markPaymentCreationFailed(
        payment,
        new Error(
          message
        )
      );

      throw new Error(
        message
      );
    }

    // ========================================================
    // SAVE PROVIDER RESULT
    // ========================================================

    const providerReference =
      this.getResultReference(
        providerResult
      );

    const paymentUrl =
      this.getResultPaymentUrl(
        providerResult
      );

    const providerStatus =
      this.normalizeProviderStatus(
        providerResult.status
      );

    const providerData =
      this.toPlainObject(
        providerResult.data ||
          providerResult.providerData
      );

    if (
      providerReference
    ) {
      payment.providerReference =
        String(
          providerReference
        );
    }

    if (
      providerResult.transactionId
    ) {
      payment.transactionId =
        String(
          providerResult.transactionId
        );
    }

    if (
      normalizedProvider ===
      "stripe"
    ) {
      payment.stripeSessionId =
        providerResult.sessionId ||
        providerData.sessionId ||
        payment.stripeSessionId;

      payment.stripePaymentId =
        providerResult.paymentIntentId ||
        providerResult.transactionId ||
        providerData.paymentIntentId ||
        payment.stripePaymentId;
    }

    if (paymentUrl) {
      payment.paymentUrl =
        paymentUrl;
    }

    payment.status =
      providerStatus ===
      STATUS.PAID
        ? STATUS.PAID
        : providerStatus ===
            STATUS.PROCESSING
          ? STATUS.PROCESSING
          : STATUS.PENDING;

    payment.providerData =
      {
        ...providerData,

        providerId:
          normalizedProvider,

        providerReference:
          providerReference
            ? String(
                providerReference
              )
            : undefined,
      };

    payment.markModified(
      "providerData"
    );

    await payment.save();

    // Immediate provider success.
    if (
      payment.status ===
      STATUS.PAID
    ) {
      await this.handleSuccessfulPayment(
        payment,
        {
          source:
            "createPayment",

          providerResult,
        }
      );
    }

    return {
      success: true,

      payment:
        this.serializePayment(
          payment
        ),

      providerResult,
    };
  }

  // ==========================================================
  // VERIFY PAYMENT
  // ==========================================================

  async verifyPayment(
    paymentId,
    options = {}
  ) {
    if (!paymentId) {
      throw new Error(
        "Payment ID is required"
      );
    }

    let payment =
      await Payment.findById(
        paymentId
      );

    if (!payment) {
      payment =
        await this.findPaymentFromProviderData(
          {
            paymentId,
          }
        );
    }

    if (!payment) {
      throw new Error(
        "Payment not found"
      );
    }

    // --------------------------------------------------------
    // ALREADY PAID
    // --------------------------------------------------------

    if (
      payment.status ===
      STATUS.PAID
    ) {
      const earning =
        await this.handleSuccessfulPayment(
          payment,
          {
            recovered: true,

            source:
              "verifyPayment",
          }
        );

      return {
        success: true,

        status:
          STATUS.PAID,

        payment:
          this.serializePayment(
            payment
          ),

        earning,

        alreadyProcessed:
          true,
      };
    }

    // --------------------------------------------------------
    // PROVIDER
    // --------------------------------------------------------

    const providerId =
      this.normalizeProviderId(
        options.providerId ||
          this.getProviderData(
            payment
          ).providerId ||
          payment.paymentMethod
      );

    const provider =
      this.getProvider(
        providerId
      );

    const providerReference =
      this.getProviderReference(
        payment
      );

    if (!providerReference) {
      throw new Error(
        "Payment provider reference is missing"
      );
    }

    // --------------------------------------------------------
    // PROVIDER VERIFICATION
    // --------------------------------------------------------

    let result;

    try {
      result =
        await provider.verifyPayment(
          providerReference,
          options
        );
    } catch (error) {
      console.error(
        "❌ Payment verification failed:",
        error.message
      );

      return {
        success: false,

        status:
          payment.status ||
          STATUS.PENDING,

        payment:
          this.serializePayment(
            payment
          ),

        message:
          error.message ||
          "Payment verification failed",
      };
    }

    if (!result) {
      return {
        success: false,

        status:
          payment.status,

        payment:
          this.serializePayment(
            payment
          ),

        message:
          "Payment provider returned no verification result",
      };
    }

    const providerStatus =
      this.normalizeProviderStatus(
        result.status
      );

    const resultReference =
      this.getResultReference(
        result
      );

    if (
      resultReference &&
      !payment.providerReference
    ) {
      payment.providerReference =
        String(
          resultReference
        );
    }

    const providerData =
      this.toPlainObject(
        result.data ||
          result.providerData
      );

    if (
      Object.keys(
        providerData
      ).length
    ) {
      payment.providerData =
        {
          ...this.getProviderData(
            payment
          ),

          ...providerData,

          providerId,
        };

      payment.markModified(
        "providerData"
      );
    }

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    if (
      providerStatus ===
      STATUS.PAID
    ) {
      payment.status =
        STATUS.PAID;

      payment.platformFee =
        0;

      payment.providerAmount =
        this.roundMoney(
          payment.amount
        );

      await payment.save();

      const earning =
        await this.handleSuccessfulPayment(
          payment,
          {
            source:
              "verifyPayment",

            providerResult:
              result,
          }
        );

      return {
        success: true,

        status:
          STATUS.PAID,

        payment:
          this.serializePayment(
            payment
          ),

        earning,
      };
    }

    // --------------------------------------------------------
    // FAILURE
    // --------------------------------------------------------

    if (
      providerStatus ===
      STATUS.FAILED
    ) {
      await this.handleFailedPayment(
        payment,
        result.message ||
          result.error ||
          "Payment failed"
      );

      return {
        success: false,

        status:
          STATUS.FAILED,

        payment:
          this.serializePayment(
            payment
          ),

        message:
          result.message ||
          result.error ||
          "Payment failed",
      };
    }

    // --------------------------------------------------------
    // STILL PENDING
    // --------------------------------------------------------

    payment.status =
      providerStatus ===
      STATUS.PROCESSING
        ? STATUS.PROCESSING
        : STATUS.PENDING;

    await payment.save();

    return {
      success: false,

      status:
        payment.status,

      payment:
        this.serializePayment(
          payment
        ),

      providerResult:
        result,

      message:
        result.message ||
        "Payment is still pending",
    };
  }

  // ==========================================================
  // SUCCESSFUL PAYMENT
  // ==========================================================

  async handleSuccessfulPayment(
    payment,
    context = {}
  ) {
    if (!payment?._id) {
      throw new Error(
        "Payment is required"
      );
    }

    // Always reload from MongoDB.
    const current =
      await Payment.findById(
        payment._id
      );

    if (!current) {
      throw new Error(
        "Payment not found"
      );
    }

    // A provider result must explicitly confirm success.
    if (
      current.status !==
        STATUS.PAID &&
      context.providerResult
    ) {
      const verifiedStatus =
        this.normalizeProviderStatus(
          context.providerResult.status
        );

      if (
        verifiedStatus !==
        STATUS.PAID
      ) {
        throw new Error(
          "Provider did not confirm successful payment"
        );
      }
    }

    // Never create an earning from a non-paid payment.
    current.status =
      STATUS.PAID;

    // ========================================================
    // ZERO COMMISSION
    // ========================================================

    current.platformFee =
      0;

    current.providerAmount =
      this.roundMoney(
        current.amount
      );

    if (
      !current.settlementCurrency
    ) {
      current.settlementCurrency =
        current.currency;
    }

    if (
      !safeNumber(
        current.settlementAmount,
        0
      )
    ) {
      current.settlementAmount =
        this.roundMoney(
          current.providerAmount
        );
    }

    if (
      !safeNumber(
        current.settlementRate,
        0
      )
    ) {
      current.settlementRate =
        1;
    }

    // --------------------------------------------------------
    // PROVIDER PROCESSING MARKER
    // --------------------------------------------------------

    const providerData =
      this.getProviderData(
        current
      );

    providerData.successProcessedAt =
      new Date().toISOString();

    if (context.source) {
      providerData.successSource =
        String(
          context.source
        );
    }

    if (context.recovered) {
      providerData.successRecovered =
        "true";
    }

    current.providerData =
      providerData;

    current.markModified(
      "providerData"
    );

    await current.save();

    // ========================================================
    // BOOKING
    // ========================================================

    const booking =
      await Booking.findById(
        current.booking
      )
        .populate(
          "listing",
          "title"
        )
        .populate(
          "user",
          "name email"
        )
        .populate(
          "provider",
          "name email"
        );

    if (!booking) {
      throw new Error(
        "Booking for payment not found"
      );
    }

    // Do not resurrect a cancelled/rejected booking.
    if (
      booking.paymentStatus !==
      STATUS.PAID
    ) {
      booking.paymentStatus =
        STATUS.PAID;

      if (
        [
          "draft",
          "pending",
          "pending_payment",
          "failed_payment",
        ].includes(
          booking.status
        )
      ) {
        booking.status =
          "paid";
      }

      booking.payment =
        current._id;

      if (
        "paidAt" in
        booking.schema.paths
      ) {
        booking.paidAt =
          booking.paidAt ||
          new Date();
      }

      await booking.save();
    } else if (
      !booking.payment ||
      String(
        booking.payment
      ) !==
        String(
          current._id
        )
    ) {
      booking.payment =
        current._id;

      await booking.save();
    }

    // ========================================================
    // EARNING
    // ========================================================

    const earning =
      await this.ensureEarning(
        current,
        booking
      );

    // ========================================================
    // SETTLEMENT
    // ========================================================

    try {
      if (
        settlementService &&
        typeof settlementService.processSettlement ===
          "function"
      ) {
        await settlementService.processSettlement(
          current._id
        );
      }
    } catch (error) {
      console.error(
        "⚠️ Settlement failed after successful payment:",
        error.message
      );
    }

    // Reload after settlement.
    const finalEarning =
      (await Earning.findOne({
        payment:
          current._id,
      })) ||
      earning;

    // ========================================================
    // NOTIFICATIONS
    // ========================================================

    await this.sendPaymentNotifications(
      current,
      booking,
      finalEarning
    );

    return finalEarning;
  }

  // ==========================================================
  // IDEMPOTENT EARNING
  // ==========================================================

  async ensureEarning(
    payment,
    booking
  ) {
    const amount =
      this.roundMoney(
        payment.settlementAmount ||
          payment.providerAmount ||
          payment.amount
      );

    if (
      amount <= 0
    ) {
      throw new Error(
        "Cannot create earning with zero amount"
      );
    }

    const currency =
      this.normalizeCurrency(
        payment.settlementCurrency ||
          payment.currency
      );

    // --------------------------------------------------------
    // EXISTING
    // --------------------------------------------------------

    const existing =
      await Earning.findOne({
        payment:
          payment._id,
      });

    if (existing) {
      return existing;
    }

    // --------------------------------------------------------
    // CREATE
    // --------------------------------------------------------

    try {
      return await Earning.create({
        provider:
          booking.provider?._id ||
          booking.provider,

        payment:
          payment._id,

        booking:
          booking._id,

        listing:
          booking.listing?._id ||
          booking.listing,

        amount,

        currency,

        platformFee:
          0,

        netAmount:
          amount,

        availableAmount:
          amount,

        withdrawnAmount:
          0,

        refundedAmount:
          0,

        status:
          "available",

        metadata: {
          paymentCurrency:
            String(
              payment.currency
            ),

          paymentAmount:
            String(
              payment.amount
            ),

          settlementCurrency:
            currency,

          settlementAmount:
            String(
              amount
            ),

          providerAmount:
            String(
              payment.providerAmount ||
                payment.amount
            ),
        },
      });
    } catch (error) {
      if (
        error?.code ===
        11000
      ) {
        const existing =
          await Earning.findOne({
            payment:
              payment._id,
          });

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  // ==========================================================
  // FAILED PAYMENT
  // ==========================================================

  async handleFailedPayment(
    payment,
    reason =
      "Payment failed"
  ) {
    if (!payment?._id) {
      return null;
    }

    const current =
      await Payment.findById(
        payment._id
      );

    if (!current) {
      return null;
    }

    // Never downgrade a successful payment.
    if (
      current.status ===
      STATUS.PAID
    ) {
      return current;
    }

    current.status =
      STATUS.FAILED;

    const providerData =
      this.getProviderData(
        current
      );

    providerData.failureReason =
      safeString(
        reason
      );

    providerData.failedAt =
      new Date().toISOString();

    current.providerData =
      providerData;

    current.markModified(
      "providerData"
    );

    await current.save();

    await Booking.findByIdAndUpdate(
      current.booking,
      {
        $set: {
          paymentStatus:
            "failed",

          status:
            "failed_payment",
        },
      }
    );

    return current;
  }

  // ==========================================================
  // REFUND REQUEST
  // ==========================================================

  async refundPayment(
    paymentId,
    amount = null,
    reason = ""
  ) {
    if (!paymentId) {
      throw new Error(
        "Payment ID is required"
      );
    }

    const payment =
      await Payment.findById(
        paymentId
      );

    if (!payment) {
      throw new Error(
        "Payment not found"
      );
    }

    if (
      !REFUNDABLE_STATUSES.has(
        payment.status
      )
    ) {
      throw new Error(
        `Payment cannot be refunded in status "${payment.status}"`
      );
    }

    const originalAmount =
      this.roundMoney(
        payment.amount
      );

    const alreadyRefunded =
      this.roundMoney(
        payment.refundAmount
      );

    const remaining =
      this.roundMoney(
        originalAmount -
          alreadyRefunded
      );

    if (
      remaining <= 0
    ) {
      throw new Error(
        "Payment has already been fully refunded"
      );
    }

    const requestedAmount =
      amount === null ||
      amount === undefined ||
      amount === ""
        ? remaining
        : this.roundMoney(
            amount
          );

    if (
      requestedAmount <= 0
    ) {
      throw new Error(
        "Refund amount must be greater than zero"
      );
    }

    if (
      requestedAmount >
      remaining
    ) {
      throw new Error(
        "Refund amount exceeds remaining refundable amount"
      );
    }

    const providerId =
      this.normalizeProviderId(
        this.getProviderData(
          payment
        ).providerId ||
          payment.paymentMethod
      );

    const provider =
      this.getProvider(
        providerId
      );

    const providerReference =
      this.getProviderReference(
        payment
      );

    if (!providerReference) {
      throw new Error(
        "Payment provider reference is missing"
      );
    }

    let result;

    try {
      result =
        await provider.refundPayment(
          providerReference,
          requestedAmount,
          reason
        );
    } catch (error) {
      console.error(
        "❌ Refund provider request failed:",
        error.message
      );

      throw error;
    }

    if (
      !result ||
      result.success ===
        false
    ) {
      throw new Error(
        result?.message ||
          result?.error ||
          "Refund request failed"
      );
    }

    const providerStatus =
      this.normalizeProviderStatus(
        result.status
      );

    const refundReference =
      result.refundId ||
      result.providerReference ||
      result.transactionId ||
      result.paymentId ||
      result.data?.refundId ||
      result.data?.transactionId ||
      null;

    const providerData =
      this.getProviderData(
        payment
      );

    providerData.lastRefundRequest =
      new Date().toISOString();

    providerData.refundAmount =
      String(
        requestedAmount
      );

    providerData.refundReason =
      safeString(
        reason
      );

    if (refundReference) {
      providerData.refundReference =
        String(
          refundReference
        );
    }

    payment.providerData =
      providerData;

    payment.markModified(
      "providerData"
    );

    // Do not mark refunded simply because request was made.
    if (
      providerStatus ===
      STATUS.REFUNDED
    ) {
      await this.finalizeRefund(
        payment,
        requestedAmount,
        refundReference,
        reason
      );
    } else {
      await payment.save();
    }

    return {
      success: true,

      status:
        payment.status,

      payment:
        this.serializePayment(
          payment
        ),

      refundReference,

      refundAmount:
        requestedAmount,

      pending:
        ![
          STATUS.REFUNDED,
          STATUS.PARTIALLY_REFUNDED,
        ].includes(
          payment.status
        ),

      providerResult:
        result,
    };
  }

  // ==========================================================
  // FINALIZE CONFIRMED REFUND
  // ==========================================================

  async finalizeRefund(
    payment,
    refundAmount,
    refundReference = null,
    reason = ""
  ) {
    const current =
      await Payment.findById(
        payment._id
      );

    if (!current) {
      throw new Error(
        "Payment not found"
      );
    }

    const originalAmount =
      this.roundMoney(
        current.amount
      );

    const previousRefunded =
      this.roundMoney(
        current.refundAmount
      );

    const requested =
      this.roundMoney(
        refundAmount
      );

    const remaining =
      this.roundMoney(
        originalAmount -
          previousRefunded
      );

    if (
      requested <= 0 ||
      requested >
        remaining
    ) {
      return current;
    }

    const newRefunded =
      this.roundMoney(
        previousRefunded +
          requested
      );

    current.refundAmount =
      newRefunded;

    if (
      refundReference
    ) {
      current.refundId =
        refundReference;
    }

    current.status =
      newRefunded >=
      originalAmount
        ? STATUS.REFUNDED
        : STATUS.PARTIALLY_REFUNDED;

    const providerData =
      this.getProviderData(
        current
      );

    providerData.lastRefundConfirmedAt =
      new Date().toISOString();

    providerData.refundConfirmedAmount =
      String(
        requested
      );

    if (reason) {
      providerData.refundReason =
        String(
          reason
        );
    }

    current.providerData =
      providerData;

    current.markModified(
      "providerData"
    );

    await current.save();

    // ========================================================
    // BOOKING
    // ========================================================

    await Booking.findByIdAndUpdate(
      current.booking,
      {
        $set: {
          paymentStatus:
            current.status ===
            STATUS.REFUNDED
              ? STATUS.REFUNDED
              : STATUS.PARTIALLY_REFUNDED,
        },
      }
    );

    // ========================================================
    // EARNING
    // ========================================================

    const earning =
      await Earning.findOne({
        payment:
          current._id,
      });

    if (earning) {
      try {
        if (
          typeof earning.markAsRefunded ===
          "function"
        ) {
          await earning.markAsRefunded(
            requested
          );
        } else {
          const available =
            safeNumber(
              earning.availableAmount,
              safeNumber(
                earning.amount
              )
            );

          earning.refundedAmount =
            this.roundMoney(
              safeNumber(
                earning.refundedAmount
              ) +
                requested
            );

          earning.availableAmount =
            Math.max(
              0,
              this.roundMoney(
                available -
                  requested
              )
            );

          await earning.save();
        }
      } catch (error) {
        console.error(
          "⚠️ Earning refund accounting failed:",
          error.message
        );
      }
    }

    return current;
  }

  // ==========================================================
  // WEBHOOK
  // ==========================================================

  async handleWebhook(
    providerId,
    req
  ) {
    const normalizedProvider =
      this.normalizeProviderId(
        providerId
      );

    const provider =
      this.getProvider(
        normalizedProvider
      );

    let result;

    try {
      result =
        await provider.handleWebhook(
          req
        );
    } catch (error) {
      console.error(
        `❌ ${normalizedProvider} webhook failed:`,
        error.message
      );

      throw error;
    }

    if (!result) {
      return {
        success: true,
        handled: false,
      };
    }

    const eventType =
      safeString(
        result.eventType ||
          result.type ||
          result.event
      ).toLowerCase();

    const data =
      this.toPlainObject(
        result.data ||
          result.payment ||
          result
      );

    let payment =
      await this.findPaymentFromProviderData(
        data
      );

    if (!payment) {
      payment =
        await this.findPaymentFromProviderData(
          {
            ...data,

            metadata:
              result.metadata ||
              data.metadata,
          }
        );
    }

    // Never invent a Payment from a webhook.
    if (!payment) {
      console.warn(
        `⚠️ ${normalizedProvider} webhook references unknown payment`
      );

      return {
        success: true,

        handled: false,

        unknownPayment:
          true,

        eventType,
      };
    }

    const providerStatus =
      this.normalizeProviderStatus(
        result.status ||
          data.status
      );

    // ========================================================
    // REFUND WEBHOOK
    // ========================================================

    if (
      eventType.includes(
        "refund"
      ) ||
      providerStatus ===
        STATUS.REFUNDED ||
      providerStatus ===
        STATUS.PARTIALLY_REFUNDED
    ) {
      const refundAmount =
        this.roundMoney(
          result.refundAmount ||
            data.refundAmount ||
            data.amount ||
            0
        );

      if (
        refundAmount > 0
      ) {
        await this.finalizeRefund(
          payment,
          refundAmount,
          result.refundId ||
            data.refundId ||
            result.providerReference ||
            data.providerReference ||
            null,
          result.reason ||
            data.reason ||
            ""
        );
      }

      return {
        success: true,

        handled: true,

        eventType,

        paymentId:
          String(
            payment._id
          ),

        status:
          payment.status,
      };
    }

    // ========================================================
    // PAYMENT SUCCESS WEBHOOK
    // ========================================================

    if (
      providerStatus ===
      STATUS.PAID
    ) {
      const reference =
        this.getProviderReference(
          payment
        ) ||
        this.getResultReference(
          result
        ) ||
        this.getResultReference(
          data
        );

      let verified =
        false;

      if (reference) {
        try {
          const verification =
            await provider.verifyPayment(
              reference
            );

          verified =
            this.normalizeProviderStatus(
              verification?.status
            ) ===
            STATUS.PAID;
        } catch (error) {
          console.warn(
            `⚠️ ${normalizedProvider} webhook verification failed:`,
            error.message
          );
        }
      }

      if (!verified) {
        return {
          success: true,

          handled: true,

          paymentVerified:
            false,

          paymentId:
            String(
              payment._id
            ),

          status:
            payment.status,

          message:
            "Webhook received; provider verification required",
        };
      }

      payment.status =
        STATUS.PAID;

      await payment.save();

      const earning =
        await this.handleSuccessfulPayment(
          payment,
          {
            source:
              "webhook",

            providerResult:
              result,
          }
        );

      return {
        success: true,

        handled: true,

        paymentVerified:
          true,

        paymentId:
          String(
            payment._id
          ),

        status:
          STATUS.PAID,

        earningId:
          earning?._id
            ? String(
                earning._id
              )
            : null,
      };
    }

    // ========================================================
    // PAYMENT FAILED WEBHOOK
    // ========================================================

    if (
      providerStatus ===
      STATUS.FAILED
    ) {
      await this.handleFailedPayment(
        payment,
        result.message ||
          data.message ||
          result.error ||
          "Payment failed"
      );

      return {
        success: true,

        handled: true,

        paymentId:
          String(
            payment._id
          ),

        status:
          STATUS.FAILED,
      };
    }

    // ========================================================
    // PAYMENT STILL PENDING
    // ========================================================

    payment.status =
      providerStatus ===
      STATUS.PROCESSING
        ? STATUS.PROCESSING
        : STATUS.PENDING;

    await payment.save();

    return {
      success: true,

      handled: true,

      paymentId:
        String(
          payment._id
        ),

      status:
        payment.status,
    };
  }

  // ==========================================================
  // PAYMENT CONVERSION
  // ==========================================================

  async getPaymentWithConversion(
    paymentId,
    targetCurrency
  ) {
    const payment =
      await Payment.findById(
        paymentId
      )
        .populate(
          "traveler",
          "name email"
        )
        .populate(
          "provider",
          "name email businessName"
        )
        .populate(
          "booking"
        );

    if (!payment) {
      throw new Error(
        "Payment not found"
      );
    }

    const normalizedTarget =
      this.normalizeCurrency(
        targetCurrency
      );

    const paymentCurrency =
      this.normalizeCurrency(
        payment.currency
      );

    if (
      normalizedTarget ===
      paymentCurrency
    ) {
      return {
        success: true,

        payment: {
          ...payment.toObject(),

          convertedAmount:
            payment.amount,

          convertedCurrency:
            normalizedTarget,

          exchangeRate:
            1,
        },
      };
    }

    const conversion =
      await currencyService.convertAmount(
        payment.amount,
        payment.currency,
        normalizedTarget
      );

    if (
      !conversion ||
      !Number.isFinite(
        Number(
          conversion.convertedAmount
        )
      )
    ) {
      throw new Error(
        "Currency conversion failed"
      );
    }

    return {
      success: true,

      payment: {
        ...payment.toObject(),

        convertedAmount:
          conversion.convertedAmount,

        convertedCurrency:
          normalizedTarget,

        exchangeRate:
          conversion.rate,
      },
    };
  }

  // ==========================================================
  // PAYMENT SERIALIZATION
  // ==========================================================

  serializePayment(
    payment
  ) {
    if (!payment) {
      return null;
    }

    const object =
      typeof payment.toObject ===
      "function"
        ? payment.toObject()
        : {
            ...payment,
          };

    const amount =
      this.roundMoney(
        object.amount
      );

    const providerAmount =
      this.roundMoney(
        object.providerAmount ??
          amount
      );

    const settlementAmount =
      this.roundMoney(
        object.settlementAmount ??
          providerAmount
      );

    return {
      ...object,

      id:
        object._id
          ? String(
              object._id
            )
          : object.id,

      paymentId:
        object._id
          ? String(
              object._id
            )
          : object.paymentId,

      status:
        object.status,

      platformFee:
        0,

      amount,

      providerAmount,

      settlementAmount,

      settlementCurrency:
        object.settlementCurrency ||
        object.currency,
    };
  }

  // ==========================================================
  // NOTIFICATIONS
  // ==========================================================

  async sendPaymentNotifications(
    payment,
    booking,
    earning
  ) {
    if (
      !payment ||
      !booking
    ) {
      return;
    }

    const title =
      booking.listing?.title ||
      "Experience";

    const paymentCurrency =
      payment.currency ||
      "USD";

    const settlementCurrency =
      payment.settlementCurrency ||
      paymentCurrency;

    let travelerAmount =
      `${this.roundMoney(
        payment.amount
      )} ${paymentCurrency}`;

    let providerAmount =
      `${this.roundMoney(
        payment.providerAmount ||
          payment.amount
      )} ${settlementCurrency}`;

    // IMPORTANT:
    // currencyService.formatAmount() may be async.
    try {
      const formattedTraveler =
        await currencyService.formatAmount(
          payment.amount,
          paymentCurrency
        );

      if (
        formattedTraveler !==
        undefined
      ) {
        travelerAmount =
          formattedTraveler;
      }
    } catch {
      // Keep fallback.
    }

    try {
      const formattedProvider =
        await currencyService.formatAmount(
          payment.providerAmount ||
            payment.amount,
          settlementCurrency
        );

      if (
        formattedProvider !==
        undefined
      ) {
        providerAmount =
          formattedProvider;
      }
    } catch {
      // Keep fallback.
    }

    // Notification failures must NEVER fail payment.
    try {
      await createNotification({
        recipient:
          booking.user?._id ||
          booking.user,

        sender:
          booking.provider?._id ||
          booking.provider,

        type:
          "payment_success",

        title:
          "Payment Successful",

        message:
          `Your payment of ${travelerAmount} for "${title}" was successful.`,

        data: {
          bookingId:
            String(
              booking._id
            ),

          paymentId:
            String(
              payment._id
            ),

          earningId:
            earning?._id
              ? String(
                  earning._id
                )
              : null,

          currency:
            paymentCurrency,

          amount:
            payment.amount,
        },

        link:
          `/my-bookings/${booking._id}`,
      });
    } catch (error) {
      console.warn(
        "⚠️ Traveler payment notification failed:",
        error.message
      );
    }

    try {
      await createNotification({
        recipient:
          booking.provider?._id ||
          booking.provider,

        sender:
          booking.user?._id ||
          booking.user,

        type:
          "payment_received",

        title:
          "Payment Received",

        message:
          `You received ${providerAmount} for "${title}".`,

        data: {
          bookingId:
            String(
              booking._id
            ),

          paymentId:
            String(
              payment._id
            ),

          earningId:
            earning?._id
              ? String(
                  earning._id
                )
              : null,

          commission:
            0,

          currency:
            settlementCurrency,

          amount:
            payment.providerAmount ||
            payment.amount,
        },

        link:
          "/provider/earnings",
      });
    } catch (error) {
      console.warn(
        "⚠️ Provider payment notification failed:",
        error.message
      );
    }
  }

  // ==========================================================
  // PAYMENT STATS
  // ==========================================================

  async getPaymentStats(
    filters = {}
  ) {
    const query = {};

    if (
      filters.status
    ) {
      query.status =
        filters.status;
    }

    if (
      filters.provider
    ) {
      query.provider =
        filters.provider;
    }

    if (
      filters.providerId
    ) {
      query.provider =
        filters.providerId;
    }

    if (
      filters.bookingId
    ) {
      query.booking =
        filters.bookingId;
    }

    if (
      filters.travelerId
    ) {
      query.traveler =
        filters.travelerId;
    }

    if (
      filters.currency
    ) {
      query.currency =
        this.normalizeCurrency(
          filters.currency
        );
    }

    if (
      filters.startDate ||
      filters.endDate
    ) {
      query.createdAt = {};

      if (
        filters.startDate
      ) {
        query.createdAt.$gte =
          new Date(
            filters.startDate
          );
      }

      if (
        filters.endDate
      ) {
        query.createdAt.$lte =
          new Date(
            filters.endDate
          );
      }
    }

    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      refundedPayments,
      totals,
    ] =
      await Promise.all([
        Payment.countDocuments(
          query
        ),

        Payment.countDocuments({
          ...query,

          status:
            STATUS.PAID,
        }),

        Payment.countDocuments({
          ...query,

          status:
            STATUS.FAILED,
        }),

        Payment.countDocuments({
          ...query,

          status: {
            $in: [
              STATUS.PENDING,
              STATUS.PROCESSING,
            ],
          },
        }),

        Payment.countDocuments({
          ...query,

          status: {
            $in: [
              STATUS.REFUNDED,
              STATUS.PARTIALLY_REFUNDED,
            ],
          },
        }),

        Payment.aggregate([
          {
            $match:
              query,
          },

          {
            $group: {
              _id: null,

              totalAmount: {
                $sum:
                  "$amount",
              },

              successfulAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        STATUS.PAID,
                      ],
                    },

                    "$amount",

                    0,
                  ],
                },
              },

              providerAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        STATUS.PAID,
                      ],
                    },

                    "$providerAmount",

                    0,
                  ],
                },
              },

              platformFee: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        STATUS.PAID,
                      ],
                    },

                    "$platformFee",

                    0,
                  ],
                },
              },

              refundAmount: {
                $sum: {
                  $ifNull: [
                    "$refundAmount",
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

    const row =
      totals[0] || {};

    return {
      success: true,

      stats: {
        totalPayments,

        successfulPayments,

        failedPayments,

        pendingPayments,

        refundedPayments,

        totalAmount:
          this.roundMoney(
            row.totalAmount
          ),

        successfulAmount:
          this.roundMoney(
            row.successfulAmount
          ),

        providerAmount:
          this.roundMoney(
            row.providerAmount
          ),

        platformFee:
          0,

        refundAmount:
          this.roundMoney(
            row.refundAmount
          ),
      },
    };
  }

  // ==========================================================
  // RECOVERY
  // ==========================================================

  async recoverPayment(
    paymentId
  ) {
    const payment =
      await Payment.findById(
        paymentId
      );

    if (!payment) {
      throw new Error(
        "Payment not found"
      );
    }

    if (
      payment.status ===
      STATUS.PAID
    ) {
      const earning =
        await this.handleSuccessfulPayment(
          payment,
          {
            recovered: true,

            source:
              "recoverPayment",
          }
        );

      return {
        success: true,

        status:
          STATUS.PAID,

        payment:
          this.serializePayment(
            payment
          ),

        earning,
      };
    }

    return this.verifyPayment(
      paymentId
    );
  }

  async retryVerification(
    paymentId,
    options = {}
  ) {
    return this.verifyPayment(
      paymentId,
      {
        ...options,

        retry: true,
      }
    );
  }

  // ==========================================================
  // PAYMENT CREATION FAILURE
  // ==========================================================

  async markPaymentCreationFailed(
    payment,
    error
  ) {
    if (!payment?._id) {
      return;
    }

    try {
      payment.status =
        STATUS.FAILED;

      const providerData =
        this.getProviderData(
          payment
        );

      providerData.creationFailure =
        safeString(
          error?.message ||
            "Payment creation failed"
        );

      providerData.creationFailedAt =
        new Date().toISOString();

      payment.providerData =
        providerData;

      payment.markModified(
        "providerData"
      );

      await payment.save();

      await Booking.findByIdAndUpdate(
        payment.booking,
        {
          $set: {
            paymentStatus:
              "failed",

            status:
              "failed_payment",
          },
        }
      );
    } catch (saveError) {
      console.error(
        "❌ Could not persist payment creation failure:",
        saveError.message
      );
    }
  }
}

// ============================================================
// SINGLETON
// ============================================================

const paymentService =
  new PaymentService();

export default paymentService;