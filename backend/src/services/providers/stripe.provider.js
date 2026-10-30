// backend/src/services/providers/stripe.provider.js

import Stripe from "stripe";
import paymentProviderInterface from "../paymentProvider.interface.js";

class StripeProvider extends paymentProviderInterface {
  constructor(config = {}) {
    super(config);

    // ============================================================
    // PROVIDER IDENTITY
    // ============================================================

    this._providerId = "stripe";
    this._providerName = "Stripe";

    this._supportedCurrencies = [
      "USD",
      "EUR",
      "GBP",
      "RWF",
    ];

    this._isTestMode =
      typeof config.testMode === "boolean"
        ? config.testMode
        : process.env.NODE_ENV !== "production";

    this._isEnabled = config.enabled === true;

    // The base interface exposes config through a getter.
    // Store it through the private field instead.
    this._config = config;

    // ============================================================
    // STRIPE CONFIG
    // ============================================================

    const stripeConfig = config.config || {};

    this._apiKey =
      stripeConfig.secretKey ||
      process.env.STRIPE_SECRET_KEY ||
      "";

    this._publishableKey =
      stripeConfig.publishableKey ||
      process.env.STRIPE_PUBLISHABLE_KEY ||
      "";

    this._webhookSecret =
      stripeConfig.webhookSecret ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      "";

    this._apiVersion =
      stripeConfig.apiVersion ||
      "";

    // ============================================================
    // STRIPE CLIENT
    // ============================================================

    this.stripe = this._apiKey
      ? new Stripe(
          this._apiKey,
          this._apiVersion
            ? {
                apiVersion: this._apiVersion,
              }
            : undefined
        )
      : null;

    // ============================================================
    // ZERO-DECIMAL CURRENCIES
    // ============================================================

    this.zeroDecimalCurrencies = new Set([
      "BIF",
      "CLP",
      "DJF",
      "GNF",
      "JPY",
      "KMF",
      "KRW",
      "MGA",
      "PYG",
      "RWF",
      "UGX",
      "VND",
      "VUV",
      "XAF",
      "XOF",
      "XPF",
    ]);

    // ============================================================
    // STARTUP LOGGING
    // ============================================================

    console.log("💳 Stripe Provider initialized");

    console.log(
      `📌 Enabled: ${this._isEnabled}`
    );

    console.log(
      `📌 Test Mode: ${this._isTestMode}`
    );

    console.log(
      `📌 Secret Key: ${
        this._apiKey ? "✓ Set" : "✗ Missing"
      }`
    );

    console.log(
      `📌 Publishable Key: ${
        this._publishableKey
          ? "✓ Set"
          : "✗ Missing"
      }`
    );

    console.log(
      `📌 Webhook Secret: ${
        this._webhookSecret
          ? "✓ Set"
          : "✗ Missing"
      }`
    );
  }

  // ============================================================
  // CURRENCY HELPERS
  // ============================================================

  normalizeCurrency(currency) {
    return String(currency || "USD")
      .trim()
      .toUpperCase();
  }

  isCurrencySupported(currency) {
    return this._supportedCurrencies.includes(
      this.normalizeCurrency(currency)
    );
  }

  convertToStripeAmount(amount, currency) {
    const normalizedCurrency =
      this.normalizeCurrency(currency);

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      throw new Error(
        "Invalid payment amount"
      );
    }

    if (
      this.zeroDecimalCurrencies.has(
        normalizedCurrency
      )
    ) {
      return Math.round(numericAmount);
    }

    return Math.round(numericAmount * 100);
  }

  convertFromStripeAmount(amount, currency) {
    const normalizedCurrency =
      this.normalizeCurrency(currency);

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
      return 0;
    }

    if (
      this.zeroDecimalCurrencies.has(
        normalizedCurrency
      )
    ) {
      return numericAmount;
    }

    return numericAmount / 100;
  }

  // ============================================================
  // FRONTEND URL HELPERS
  // ============================================================

  buildDefaultSuccessUrl(bookingId) {
    const clientUrl = (
      process.env.CLIENT_URL ||
      "http://localhost:3000"
    ).replace(/\/+$/, "");

    const encodedBookingId =
      encodeURIComponent(
        String(bookingId || "")
      );

    return (
      `${clientUrl}/payment-success` +
      `?booking_id=${encodedBookingId}` +
      `&session_id={CHECKOUT_SESSION_ID}`
    );
  }

  buildDefaultCancelUrl(bookingId) {
    const clientUrl = (
      process.env.CLIENT_URL ||
      "http://localhost:3000"
    ).replace(/\/+$/, "");

    const encodedBookingId =
      encodeURIComponent(
        String(bookingId || "")
      );

    return (
      `${clientUrl}/payment-cancel` +
      `?booking_id=${encodedBookingId}` +
      `&session_id={CHECKOUT_SESSION_ID}`
    );
  }

  ensureSessionIdInUrl(url) {
    if (!url) {
      return url;
    }

    const stringUrl = String(url);

    if (
      stringUrl.includes(
        "{CHECKOUT_SESSION_ID}"
      )
    ) {
      return stringUrl;
    }

    const separator =
      stringUrl.includes("?")
        ? "&"
        : "?";

    return (
      `${stringUrl}` +
      `${separator}session_id={CHECKOUT_SESSION_ID}`
    );
  }

  // ============================================================
  // CREATE PAYMENT
  // ============================================================

  async createPayment(data = {}) {
    try {
      if (!this.stripe) {
        throw new Error(
          "Stripe is not configured. Missing STRIPE_SECRET_KEY."
        );
      }

      if (!this._isEnabled) {
        throw new Error(
          "Stripe payment provider is disabled."
        );
      }

      const {
        bookingId,
        paymentId,
        userId,
        providerId,
        listingId,
        amount,
        currency = "USD",
        description,
        customerEmail,
        customerName,
        metadata = {},
        successUrl,
        cancelUrl,
      } = data;

      if (!bookingId) {
        throw new Error(
          "bookingId is required"
        );
      }

      if (!paymentId) {
        throw new Error(
          "paymentId is required"
        );
      }

      if (
        amount === undefined ||
        amount === null ||
        Number(amount) <= 0
      ) {
        throw new Error(
          "Valid payment amount is required"
        );
      }

      const normalizedCurrency =
        this.normalizeCurrency(currency);

      if (
        !this.isCurrencySupported(
          normalizedCurrency
        )
      ) {
        throw new Error(
          `Stripe does not support currency: ${normalizedCurrency}`
        );
      }

      const stripeAmount =
        this.convertToStripeAmount(
          amount,
          normalizedCurrency
        );

      const finalSuccessUrl =
        this.ensureSessionIdInUrl(
          successUrl ||
            this.buildDefaultSuccessUrl(
              bookingId
            )
        );

      const finalCancelUrl =
        this.ensureSessionIdInUrl(
          cancelUrl ||
            this.buildDefaultCancelUrl(
              bookingId
            )
        );

      // ========================================================
      // STRIPE METADATA
      // ========================================================

      const safeMetadata = {
        bookingId: String(bookingId),
        paymentId: String(paymentId),

        ...(userId
          ? {
              userId: String(userId),
            }
          : {}),

        ...(providerId
          ? {
              providerId: String(providerId),
            }
          : {}),

        ...(listingId
          ? {
              listingId: String(listingId),
            }
          : {}),
      };

      for (const [key, value] of Object.entries(
        metadata || {}
      )) {
        if (
          value !== undefined &&
          value !== null
        ) {
          safeMetadata[key] = String(value);
        }
      }

      // ========================================================
      // CHECKOUT SESSION
      // ========================================================

      const checkoutSessionParams = {
        mode: "payment",

        payment_method_types: [
          "card",
        ],

        line_items: [
          {
            price_data: {
              currency:
                normalizedCurrency.toLowerCase(),

              product_data: {
                name:
                  description ||
                  `AI Tour Rwanda Booking ${bookingId}`,
              },

              unit_amount: stripeAmount,
            },

            quantity: 1,
          },
        ],

        success_url: finalSuccessUrl,

        cancel_url: finalCancelUrl,

        metadata: safeMetadata,

        payment_intent_data: {
          metadata: safeMetadata,
        },
      };

      if (customerEmail) {
        checkoutSessionParams.customer_email =
          String(customerEmail);
      }

      if (customerName) {
        checkoutSessionParams.metadata.customerName =
          String(customerName);
      }

      console.log(
        "💳 Creating Stripe Checkout Session..."
      );

      console.log(
        `📌 Booking: ${bookingId}`
      );

      console.log(
        `📌 Payment: ${paymentId}`
      );

      console.log(
        `📌 Amount: ${amount} ${normalizedCurrency}`
      );

      console.log(
        `📌 Stripe Amount: ${stripeAmount}`
      );

      console.log(
        `📌 Success URL: ${finalSuccessUrl}`
      );

      console.log(
        `📌 Cancel URL: ${finalCancelUrl}`
      );

      const session =
        await this.stripe.checkout.sessions.create(
          checkoutSessionParams
        );

      if (
        !session?.id ||
        !session?.url
      ) {
        throw new Error(
          "Stripe Checkout Session was created without an id or URL"
        );
      }

      console.log(
        `✅ Stripe Checkout Session created: ${session.id}`
      );

      return {
        success: true,

        provider: this.providerId,

        paymentUrl: session.url,

        providerReference: session.id,

        transactionId:
          session.payment_intent || null,

        status: "pending",

        data: {
          sessionId: session.id,

          checkoutSession: session,

          paymentUrl: session.url,

          amount: Number(amount),

          currency: normalizedCurrency,
        },
      };
    } catch (error) {
      return this.handleError(
        error,
        "createPayment"
      );
    }
  }

  // ============================================================
  // RESOLVE STRIPE REFERENCE
  // ============================================================

  async resolvePaymentIntent(reference) {
    if (!this.stripe) {
      throw new Error(
        "Stripe is not configured"
      );
    }

    if (!reference) {
      throw new Error(
        "Stripe payment reference is required"
      );
    }

    const referenceString =
      String(reference);

    // ----------------------------------------------------------
    // CHECKOUT SESSION
    // ----------------------------------------------------------

    if (
      referenceString.startsWith("cs_")
    ) {
      const session =
        await this.stripe.checkout.sessions.retrieve(
          referenceString,
          {
            expand: [
              "payment_intent",
              "customer",
              "payment_intent.payment_method",
            ],
          }
        );

      const paymentIntent =
        typeof session.payment_intent ===
        "string"
          ? await this.stripe.paymentIntents.retrieve(
              session.payment_intent,
              {
                expand: [
                  "payment_method",
                ],
              }
            )
          : session.payment_intent;

      return {
        session,
        paymentIntent,
      };
    }

    // ----------------------------------------------------------
    // PAYMENT INTENT
    // ----------------------------------------------------------

    if (
      referenceString.startsWith("pi_")
    ) {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(
          referenceString,
          {
            expand: [
              "payment_method",
            ],
          }
        );

      return {
        session: null,
        paymentIntent,
      };
    }

    // ----------------------------------------------------------
    // LAST ATTEMPT AS CHECKOUT SESSION
    // ----------------------------------------------------------

    try {
      const session =
        await this.stripe.checkout.sessions.retrieve(
          referenceString,
          {
            expand: [
              "payment_intent",
              "customer",
              "payment_intent.payment_method",
            ],
          }
        );

      const paymentIntent =
        typeof session.payment_intent ===
        "string"
          ? await this.stripe.paymentIntents.retrieve(
              session.payment_intent,
              {
                expand: [
                  "payment_method",
                ],
              }
            )
          : session.payment_intent;

      return {
        session,
        paymentIntent,
      };
    } catch {
      throw new Error(
        `Unable to resolve Stripe payment reference: ${referenceString}`
      );
    }
  }

  // ============================================================
  // STRIPE STATUS
  // ============================================================

  mapStripeStatus(
    paymentIntent,
    session = null
  ) {
    if (
      session?.payment_status === "paid"
    ) {
      return "paid";
    }

    if (!paymentIntent) {
      return "pending";
    }

    switch (paymentIntent.status) {
      case "succeeded":
        return "paid";

      case "processing":
        return "processing";

      case "requires_payment_method":
        return "failed";

      case "requires_action":
        return "pending";

      case "requires_confirmation":
        return "pending";

      case "requires_capture":
        return "pending";

      case "canceled":
        return "cancelled";

      default:
        return "pending";
    }
  }

  // ============================================================
  // VERIFY PAYMENT
  // ============================================================

  async verifyPayment(paymentReference) {
    try {
      if (!this.stripe) {
        throw new Error(
          "Stripe is not configured"
        );
      }

      const {
        session,
        paymentIntent,
      } =
        await this.resolvePaymentIntent(
          paymentReference
        );

      const status =
        this.mapStripeStatus(
          paymentIntent,
          session
        );

      const currency =
        this.normalizeCurrency(
          paymentIntent?.currency ||
            session?.currency ||
            "USD"
        );

      const stripeAmount =
        paymentIntent?.amount ??
        session?.amount_total ??
        0;

      const amount =
        this.convertFromStripeAmount(
          stripeAmount,
          currency
        );

      const customer =
        session?.customer_details ||
        session?.customer ||
        null;

      const paymentMethod =
        paymentIntent?.payment_method ||
        null;

      const transactionId =
        paymentIntent?.id || null;

      return {
        success: status === "paid",

        provider: this.providerId,

        status,

        transactionId,

        data: {
          paymentIntent,

          session,

          amount,

          currency,

          customer,

          paymentMethod,

          paymentStatus:
            session?.payment_status ||
            null,

          checkoutSessionId:
            session?.id || null,

          paymentIntentId:
            paymentIntent?.id || null,
        },
      };
    } catch (error) {
      return this.handleError(
        error,
        "verifyPayment"
      );
    }
  }

  // ============================================================
  // GET PAYMENT STATUS
  // ============================================================

  async getPaymentStatus(paymentReference) {
    try {
      if (!this.stripe) {
        throw new Error(
          "Stripe is not configured"
        );
      }

      const {
        session,
        paymentIntent,
      } =
        await this.resolvePaymentIntent(
          paymentReference
        );

      const status =
        this.mapStripeStatus(
          paymentIntent,
          session
        );

      const currency =
        this.normalizeCurrency(
          paymentIntent?.currency ||
            session?.currency ||
            "USD"
        );

      const stripeAmount =
        paymentIntent?.amount ??
        session?.amount_total ??
        0;

      const amount =
        this.convertFromStripeAmount(
          stripeAmount,
          currency
        );

      return {
        success: true,

        provider: this.providerId,

        status,

        transactionId:
          paymentIntent?.id || null,

        data: {
          paymentIntent,

          session,

          amount,

          currency,

          checkoutSessionId:
            session?.id || null,

          paymentIntentId:
            paymentIntent?.id || null,

          paymentStatus:
            session?.payment_status ||
            null,
        },
      };
    } catch (error) {
      return this.handleError(
        error,
        "getPaymentStatus"
      );
    }
  }

  // ============================================================
  // REFUND
  // ============================================================

  async refundPayment(
    paymentReference,
    amount = null,
    reason = "requested_by_customer"
  ) {
    try {
      if (!this.stripe) {
        throw new Error(
          "Stripe is not configured"
        );
      }

      const {
        paymentIntent,
      } =
        await this.resolvePaymentIntent(
          paymentReference
        );

      if (!paymentIntent?.id) {
        throw new Error(
          "Stripe PaymentIntent not found"
        );
      }

      if (
        paymentIntent.status !==
        "succeeded"
      ) {
        throw new Error(
          "Only succeeded payments can be refunded"
        );
      }

      const refundParams = {
        payment_intent:
          paymentIntent.id,

        reason:
          reason ===
          "requested_by_customer"
            ? "requested_by_customer"
            : "requested_by_customer",
      };

      if (
        amount !== null &&
        amount !== undefined
      ) {
        const currency =
          this.normalizeCurrency(
            paymentIntent.currency
          );

        refundParams.amount =
          this.convertToStripeAmount(
            amount,
            currency
          );
      }

      const refund =
        await this.stripe.refunds.create(
          refundParams
        );

      return {
        success: true,

        provider: this.providerId,

        status: refund.status,

        transactionId: refund.id,

        data: {
          refund,

          refundId: refund.id,

          paymentIntentId:
            paymentIntent.id,

          amount:
            this.convertFromStripeAmount(
              refund.amount,
              paymentIntent.currency
            ),

          currency:
            this.normalizeCurrency(
              paymentIntent.currency
            ),
        },
      };
    } catch (error) {
      return this.handleError(
        error,
        "refundPayment"
      );
    }
  }

  // ============================================================
  // WEBHOOK SIGNATURE
  // ============================================================

  constructWebhookEvent(
    payload,
    signature,
    webhookSecret = null
  ) {
    if (!this.stripe) {
      throw new Error(
        "Stripe is not configured"
      );
    }

    const secret =
      webhookSecret ||
      this._webhookSecret ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      "";

    if (
      process.env.NODE_ENV ===
        "production" &&
      !secret
    ) {
      throw new Error(
        "STRIPE_WEBHOOK_SECRET is required in production"
      );
    }

    if (!signature) {
      if (
        this._isTestMode &&
        !secret
      ) {
        return typeof payload ===
          "string"
          ? JSON.parse(payload)
          : payload;
      }

      throw new Error(
        "Stripe webhook signature is required"
      );
    }

    if (!secret) {
      throw new Error(
        "Stripe webhook secret is not configured"
      );
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      secret
    );
  }

  // ============================================================
  // METADATA
  // ============================================================

  extractMetadata(object = {}) {
    const metadata =
      object?.metadata || {};

    return {
      bookingId:
        metadata.bookingId ||
        metadata.booking_id ||
        null,

      paymentId:
        metadata.paymentId ||
        metadata.payment_id ||
        null,

      userId:
        metadata.userId ||
        metadata.user_id ||
        null,

      providerId:
        metadata.providerId ||
        metadata.provider_id ||
        null,

      listingId:
        metadata.listingId ||
        metadata.listing_id ||
        null,

      ...metadata,
    };
  }

  // ============================================================
  // WEBHOOK NORMALIZATION
  // ============================================================

  normalizeWebhookEvent(event) {
    const object =
      event?.data?.object || {};

    const metadata =
      this.extractMetadata(object);

    const paymentIntent =
      object?.object ===
      "payment_intent"
        ? object
        : null;

    const session =
      object?.object ===
      "checkout.session"
        ? object
        : null;

    const currency =
      this.normalizeCurrency(
        paymentIntent?.currency ||
          session?.currency ||
          "USD"
      );

    const stripeAmount =
      paymentIntent?.amount ??
      session?.amount_total ??
      0;

    const amount =
      this.convertFromStripeAmount(
        stripeAmount,
        currency
      );

    let normalizedEvent;

    switch (event.type) {
      case "checkout.session.completed":
        normalizedEvent = {
          eventType:
            "payment.completed",

          provider:
            this.providerId,

          providerEventId:
            event.id,

          status:
            session?.payment_status ===
            "paid"
              ? "paid"
              : "pending",

          transactionId:
            paymentIntent?.id ||
            session?.payment_intent ||
            session?.id ||
            null,

          paymentId:
            metadata.paymentId,

          bookingId:
            metadata.bookingId,

          amount,

          currency,

          metadata,

          rawEvent: event,
        };

        break;

      case "payment_intent.succeeded":
        normalizedEvent = {
          eventType:
            "payment.completed",

          provider:
            this.providerId,

          providerEventId:
            event.id,

          status: "paid",

          transactionId:
            paymentIntent?.id || null,

          paymentId:
            metadata.paymentId,

          bookingId:
            metadata.bookingId,

          amount,

          currency,

          metadata,

          rawEvent: event,
        };

        break;

      case "payment_intent.payment_failed":
        normalizedEvent = {
          eventType:
            "payment.failed",

          provider:
            this.providerId,

          providerEventId:
            event.id,

          status: "failed",

          transactionId:
            paymentIntent?.id || null,

          paymentId:
            metadata.paymentId,

          bookingId:
            metadata.bookingId,

          amount,

          currency,

          metadata,

          failureMessage:
            paymentIntent
              ?.last_payment_error
              ?.message ||
            "Stripe payment failed",

          rawEvent: event,
        };

        break;

      case "payment_intent.canceled":
        normalizedEvent = {
          eventType:
            "payment.cancelled",

          provider:
            this.providerId,

          providerEventId:
            event.id,

          status: "cancelled",

          transactionId:
            paymentIntent?.id || null,

          paymentId:
            metadata.paymentId,

          bookingId:
            metadata.bookingId,

          amount,

          currency,

          metadata,

          rawEvent: event,
        };

        break;

      case "charge.refunded":
        normalizedEvent = {
          eventType:
            "payment.refunded",

          provider:
            this.providerId,

          providerEventId:
            event.id,

          status: "refunded",

          transactionId:
            object?.payment_intent ||
            object?.id ||
            null,

          paymentId:
            metadata.paymentId,

          bookingId:
            metadata.bookingId,

          amount,

          currency,

          metadata,

          rawEvent: event,
        };

        break;

      case "charge.refund.updated":
        normalizedEvent = {
          eventType:
            "payment.refund_updated",

          provider:
            this.providerId,

          providerEventId:
            event.id,

          status:
            object?.status ||
            "pending",

          transactionId:
            object?.payment_intent ||
            object?.id ||
            null,

          paymentId:
            metadata.paymentId,

          bookingId:
            metadata.bookingId,

          amount,

          currency,

          metadata,

          rawEvent: event,
        };

        break;

      default:
        normalizedEvent = {
          eventType:
            event.type,

          provider:
            this.providerId,

          providerEventId:
            event.id,

          status: "unknown",

          transactionId:
            paymentIntent?.id ||
            session?.payment_intent ||
            session?.id ||
            object?.id ||
            null,

          paymentId:
            metadata.paymentId,

          bookingId:
            metadata.bookingId,

          amount,

          currency,

          metadata,

          rawEvent: event,
        };
    }

    return normalizedEvent;
  }

  // ============================================================
  // HANDLE WEBHOOK
  // ============================================================

  async handleWebhook(
    payload,
    signature = null
  ) {
    try {
      const event =
        this.constructWebhookEvent(
          payload,
          signature
        );

      console.log(
        `🔔 Stripe webhook received: ${event.type}`
      );

      const normalized =
        this.normalizeWebhookEvent(
          event
        );

      console.log(
        `📌 Normalized event: ${normalized.eventType}`
      );

      if (normalized.bookingId) {
        console.log(
          `📌 Booking: ${normalized.bookingId}`
        );
      }

      if (normalized.paymentId) {
        console.log(
          `📌 Payment: ${normalized.paymentId}`
        );
      }

      return {
        success: true,

        provider: this.providerId,

        eventId: event.id,

        eventType: event.type,

        data: normalized,
      };
    } catch (error) {
      return this.handleError(
        error,
        "handleWebhook"
      );
    }
  }

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  handleError(error, context) {
    console.error(
      `❌ Stripe ${context} error:`,
      error?.message || error
    );

    return {
      success: false,

      provider: this.providerId,

      error:
        error?.message ||
        "Stripe operation failed",

      code:
        error?.code ||
        "STRIPE_ERROR",

      context,

      timestamp:
        new Date().toISOString(),

      originalError: error,
    };
  }

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  async healthCheck() {
    try {
      if (!this.stripe) {
        return {
          success: false,

          provider: this.providerId,

          status: "not_configured",

          message:
            "Stripe secret key is missing",
        };
      }

      await this.stripe.accounts.retrieve();

      return {
        success: true,

        provider: this.providerId,

        status: "healthy",

        testMode:
          this._isTestMode,
      };
    } catch (error) {
      return {
        success: false,

        provider: this.providerId,

        status: "unhealthy",

        error:
          error?.message ||
          "Stripe health check failed",
      };
    }
  }

  // ============================================================
  // PUBLIC CONFIG
  // ============================================================

  getPublicConfig() {
    return {
      id: this.providerId,

      name: this.providerName,

      supportedCurrencies:
        this.supportedCurrencies,

      isEnabled: this.isEnabled,

      isTestMode: this.isTestMode,

      publishableKey:
        this._publishableKey || null,
    };
  }
}

// ============================================================
// EXPORT
// ============================================================
//
// IMPORTANT:
//
// PaymentService creates the provider:
//
// new StripeProvider(configs.stripe)
//
// Therefore we export the CLASS, not an instance.
//

export { StripeProvider };

export default StripeProvider;