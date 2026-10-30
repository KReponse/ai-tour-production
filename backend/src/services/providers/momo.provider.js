// backend/src/services/providers/momo.provider.js
// MTN Mobile Money provider for AI Tour Rwanda
//
// Production responsibilities:
// - OAuth access-token management
// - Request-to-Pay / Collection
// - Payment status polling
// - Disbursement / transfer
// - Provider response normalization
// - No fake payment success
// - No fake webhook signature validation
//
// IMPORTANT:
// MTN MoMo callbacks are asynchronous. Request-to-Pay returns 202 first,
// and the final transaction status must be obtained from the callback
// and/or the provider status endpoint.
//
// Official docs:
// https://momodeveloper.mtn.com/

import crypto from "crypto";

import {
  PaymentProviderInterface,
  PAYMENT_STATUS,
  WEBHOOK_EVENTS,
  PROVIDER_ERRORS,
} from "../paymentProvider.interface.js";

class MomoProvider extends PaymentProviderInterface {
  constructor(config = {}) {
    super(config);

    // ─────────────────────────────────────────────────────────────
    // Provider identity
    // ─────────────────────────────────────────────────────────────

    this._providerId = "momo";
    this._providerName = "MTN Mobile Money";

    // Rwanda production MVP is RWF-first.
    this._supportedCurrencies = ["RWF"];

    this.environment =
      config.environment ||
      process.env.MTN_MOMO_ENVIRONMENT ||
      "sandbox";

    this._isTestMode = this.environment !== "production";

    this._isEnabled =
      String(
        config.enabled ??
          process.env.MTN_MOMO_ENABLED ??
          "false"
      ).toLowerCase() === "true";

    // ─────────────────────────────────────────────────────────────
    // Credentials
    // ─────────────────────────────────────────────────────────────

    this.apiUser =
      config.apiUser ||
      process.env.MTN_MOMO_API_USER ||
      "";

    this.apiKey =
      config.apiKey ||
      process.env.MTN_MOMO_API_KEY ||
      "";

    this.subscriptionKey =
      config.subscriptionKey ||
      process.env.MTN_MOMO_SUBSCRIPTION_KEY ||
      process.env.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY ||
      "";

    this.disbursementSubscriptionKey =
      config.disbursementSubscriptionKey ||
      process.env.MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY ||
      "";

    this.callbackUrl =
      config.callbackUrl ||
      process.env.MTN_MOMO_CALLBACK_URL ||
      "";

    this.disbursementCallbackUrl =
      config.disbursementCallbackUrl ||
      process.env.MTN_MOMO_DISBURSEMENT_CALLBACK_URL ||
      this.callbackUrl;

    // Optional aggregator transfer type.
    //
    // Only send this when explicitly configured. MTN documents
    // transferType as required for Aggregator APIs, not necessarily
    // for every standard MoMo integration.
    this.transferType =
      config.transferType ||
      process.env.MTN_MOMO_TRANSFER_TYPE ||
      null;

    // ─────────────────────────────────────────────────────────────
    // MTN endpoints
    // ─────────────────────────────────────────────────────────────

    const sandboxBase =
      config.sandboxBaseUrl ||
      process.env.MTN_MOMO_SANDBOX_BASE_URL ||
      "https://sandbox.momodeveloper.mtn.com";

    const productionBase =
      config.productionBaseUrl ||
      process.env.MTN_MOMO_PRODUCTION_BASE_URL ||
      "https://momodeveloper.mtn.com";

    this.baseUrl =
      this.environment === "production"
        ? productionBase.replace(/\/+$/, "")
        : sandboxBase.replace(/\/+$/, "");

    this.collectionBaseUrl = this.baseUrl;
    this.disbursementBaseUrl = this.baseUrl;

    // OAuth token cache.
    this._accessToken = null;
    this._accessTokenExpiresAt = 0;

    // Prevent concurrent token requests from generating unnecessary
    // access tokens.
    this._tokenPromise = null;

    // ─────────────────────────────────────────────────────────────
    // Operational settings
    // ─────────────────────────────────────────────────────────────

    this.requestTimeoutMs = Number(
      config.requestTimeoutMs ||
        process.env.MTN_MOMO_REQUEST_TIMEOUT_MS ||
        15000
    );

    this.maxRetries = Number(
      config.maxRetries ||
        process.env.MTN_MOMO_MAX_RETRIES ||
        2
    );

    this.retryDelayMs = Number(
      config.retryDelayMs ||
        process.env.MTN_MOMO_RETRY_DELAY_MS ||
        500
    );

    console.log(
      `📱 MTN MoMo Provider initialized (${this.environment} mode)`
    );

    console.log(
      `📌 Enabled: ${this._isEnabled ? "Yes" : "No"}`
    );

    console.log(
      `📌 API User: ${this.apiUser ? "✓ Set" : "✗ Not Set"}`
    );

    console.log(
      `📌 API Key: ${this.apiKey ? "✓ Set" : "✗ Not Set"}`
    );

    console.log(
      `📌 Subscription Key: ${
        this.subscriptionKey ? "✓ Set" : "✗ Not Set"
      }`
    );

    console.log(
      `📌 Callback URL: ${
        this.callbackUrl ? "✓ Set" : "✗ Not Set"
      }`
    );

    console.log(
      `📌 Status: ${
        this.isEnabled
          ? "Enabled"
          : "Disabled"
      }`
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Interface getters
  // ─────────────────────────────────────────────────────────────

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
    return (
      this._isEnabled &&
      Boolean(this.apiUser) &&
      Boolean(this.apiKey) &&
      Boolean(this.subscriptionKey)
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Configuration validation
  // ─────────────────────────────────────────────────────────────

  validateConfiguration({ requireDisbursement = false } = {}) {
    const missing = [];

    if (!this.apiUser) {
      missing.push("MTN_MOMO_API_USER");
    }

    if (!this.apiKey) {
      missing.push("MTN_MOMO_API_KEY");
    }

    if (!this.subscriptionKey) {
      missing.push("MTN_MOMO_SUBSCRIPTION_KEY");
    }

    if (requireDisbursement && !this.disbursementSubscriptionKey) {
      missing.push("MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY");
    }

    if (this.environment === "production" && !this.callbackUrl) {
      missing.push("MTN_MOMO_CALLBACK_URL");
    }

    if (missing.length > 0) {
      const error = new Error(
        `MTN MoMo is not fully configured. Missing: ${missing.join(", ")}`
      );

      error.code = "CONFIGURATION_ERROR";

      throw error;
    }

    return true;
  }

  assertEnabled(options = {}) {
    if (!this.isEnabled) {
      const error = new Error(
        "MTN MoMo provider is disabled or not fully configured."
      );

      error.code = "PROVIDER_DISABLED";

      throw error;
    }

    this.validateConfiguration(options);
  }

  // ─────────────────────────────────────────────────────────────
  // Access token
  // ─────────────────────────────────────────────────────────────

  async getAccessToken() {
    this.assertEnabled();

    const now = Date.now();

    // Keep a safety margin before actual expiry.
    if (
      this._accessToken &&
      now < this._accessTokenExpiresAt - 30000
    ) {
      return this._accessToken;
    }

    if (this._tokenPromise) {
      return this._tokenPromise;
    }

    this._tokenPromise = this._requestAccessToken();

    try {
      return await this._tokenPromise;
    } finally {
      this._tokenPromise = null;
    }
  }

  async _requestAccessToken() {
    const credentials = Buffer.from(
      `${this.apiUser}:${this.apiKey}`
    ).toString("base64");

    const response = await this._fetchWithTimeout(
      `${this.collectionBaseUrl}/collection/token/`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Ocp-Apim-Subscription-Key": this.subscriptionKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "",
      }
    );

    const payload = await this._readResponse(response);

    if (!response.ok) {
      const error = new Error(
        payload?.message ||
          payload?.error_description ||
          `MTN token request failed with HTTP ${response.status}`
      );

      error.code =
        payload?.code ||
        payload?.error ||
        `HTTP_${response.status}`;

      error.httpStatus = response.status;
      error.providerResponse = payload;

      throw error;
    }

    if (!payload?.access_token) {
      const error = new Error(
        "MTN MoMo token response did not contain access_token."
      );

      error.code = "INVALID_TOKEN_RESPONSE";
      error.providerResponse = payload;

      throw error;
    }

    const expiresInSeconds = Number(
      payload.expires_in || 3600
    );

    this._accessToken = payload.access_token;

    this._accessTokenExpiresAt =
      Date.now() +
      Math.max(expiresInSeconds - 60, 60) * 1000;

    return this._accessToken;
  }

  // ─────────────────────────────────────────────────────────────
  // Create payment
  // ─────────────────────────────────────────────────────────────

  async createPayment(data = {}) {
    try {
      this.assertEnabled();

      const bookingId = data.bookingId;

      if (!bookingId) {
        throw this.createProviderError(
          "bookingId is required",
          "VALIDATION_ERROR"
        );
      }

      const amount = Number(data.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw this.createProviderError(
          "Valid payment amount is required.",
          "INVALID_AMOUNT"
        );
      }

      const currency = String(
        data.currency || "RWF"
      ).toUpperCase();

      if (!this.supportedCurrencies.includes(currency)) {
        throw this.createProviderError(
          `Currency "${currency}" is not supported by MTN MoMo Rwanda.`,
          "UNSUPPORTED_CURRENCY"
        );
      }

      const payerPhone = this.normalizePhoneNumber(
        data.phoneNumber ||
          data.payerPhone ||
          data.phone
      );

      if (!payerPhone) {
        throw this.createProviderError(
          "A valid MTN Mobile Money phone number is required.",
          "INVALID_PAYER_PHONE"
        );
      }

      const referenceId =
        data.referenceId ||
        crypto.randomUUID();

      const externalId =
        data.externalId ||
        `AITOUR-${String(bookingId)}`;

      const paymentData = {
        amount: this.formatAmount(amount, currency),
        currency,
        externalId,
        payer: {
          partyIdType: "MSISDN",
          partyId: payerPhone,
        },
        payerMessage:
          data.description ||
          "AI Tour Rwanda Booking",
        payeeNote:
          data.payeeNote ||
          `AI Tour Booking ${bookingId}`,
      };

      if (this.transferType) {
        paymentData.transferType =
          this.transferType;
      }

      const accessToken =
        await this.getAccessToken();

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key":
          this.subscriptionKey,
        "X-Target-Environment":
          this.environment,
        "X-Reference-Id":
          referenceId,
        "Content-Type":
          "application/json",
      };

      const response =
        await this._requestWithRetry(
          `${this.collectionBaseUrl}/collection/v1_0/requesttopay`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(paymentData),
          }
        );

      // MTN Request-to-Pay normally returns 202.
      if (
        response.status !== 202 &&
        response.status !== 200
      ) {
        const payload =
          await this._readResponse(response);

        const error = new Error(
          payload?.message ||
            `MTN Request-to-Pay failed with HTTP ${response.status}`
        );

        error.code =
          payload?.code ||
          `HTTP_${response.status}`;

        error.httpStatus =
          response.status;

        error.providerResponse =
          payload;

        throw error;
      }

      return {
        success: true,
        paymentId: referenceId,
        status: PAYMENT_STATUS.PENDING,
        paymentUrl: null,
        metadata: {
          provider: "momo",
          referenceId,
          externalId,
          amount,
          providerAmount:
            paymentData.amount,
          currency,
          phoneNumber: payerPhone,
          bookingId,
          transactionId: null,
          instructions:
            "Approve the MTN Mobile Money payment request on your phone.",
          initiatedAt:
            new Date().toISOString(),
        },
      };
    } catch (error) {
      this.log(
        "createPayment",
        this.sanitizeError(error),
        "error"
      );

      return this.handleError(
        error,
        "createPayment"
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Verify payment
  // ─────────────────────────────────────────────────────────────

  async verifyPayment(
    paymentId,
    options = {}
  ) {
    try {
      this.assertEnabled();

      if (!paymentId) {
        throw this.createProviderError(
          "paymentId is required.",
          "VALIDATION_ERROR"
        );
      }

      const result =
        await this.getPayment(paymentId);

      return this.formatVerificationResponse(
        result,
        options
      );
    } catch (error) {
      this.log(
        "verifyPayment",
        this.sanitizeError(error),
        "error"
      );

      return this.handleError(
        error,
        "verifyPayment"
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Get payment status
  // ─────────────────────────────────────────────────────────────

  async getPaymentStatus(paymentId) {
    try {
      this.assertEnabled();

      const result =
        await this.getPayment(paymentId);

      return {
        success: true,
        status: this.mapApiStatus(
          result?.status
        ),
        data: {
          paymentId,
          referenceId: paymentId,
          providerStatus:
            result?.status || null,
          amount:
            result?.amount || null,
          currency:
            result?.currency || null,
          externalId:
            result?.externalId || null,
          payer:
            result?.payer || null,
          reason:
            result?.reason || null,
          raw: result,
        },
      };
    } catch (error) {
      this.log(
        "getPaymentStatus",
        this.sanitizeError(error),
        "error"
      );

      return this.handleError(
        error,
        "getPaymentStatus"
      );
    }
  }

  async getPayment(paymentId) {
    this.assertEnabled();

    if (!paymentId) {
      throw this.createProviderError(
        "paymentId is required.",
        "VALIDATION_ERROR"
      );
    }

    const accessToken =
      await this.getAccessToken();

    const response =
      await this._requestWithRetry(
        `${this.collectionBaseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(
          paymentId
        )}`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Ocp-Apim-Subscription-Key":
              this.subscriptionKey,
            "X-Target-Environment":
              this.environment,
          },
        }
      );

    const payload =
      await this._readResponse(response);

    if (!response.ok) {
      const error = new Error(
        payload?.message ||
          `MTN payment status request failed with HTTP ${response.status}`
      );

      error.code =
        payload?.code ||
        `HTTP_${response.status}`;

      error.httpStatus =
        response.status;

      error.providerResponse =
        payload;

      throw error;
    }

    return payload;
  }

  // ─────────────────────────────────────────────────────────────
  // Refund
  // ─────────────────────────────────────────────────────────────

  async refundPayment(
    paymentId,
    amount = null,
    reason = "",
    options = {}
  ) {
    try {
      this.assertEnabled({
        requireDisbursement: true,
      });

      if (!paymentId) {
        throw this.createProviderError(
          "paymentId is required.",
          "VALIDATION_ERROR"
        );
      }

      const refundAmount =
        Number(amount);

      if (
        !Number.isFinite(refundAmount) ||
        refundAmount <= 0
      ) {
        throw this.createProviderError(
          "A valid refund amount is required.",
          "INVALID_AMOUNT"
        );
      }

      /*
       * IMPORTANT:
       * Do not pretend that a disbursement is a completed refund.
       *
       * MTN refund/disbursement is asynchronous.
       * We create a provider transfer and return PENDING.
       * paymentService must wait for the final provider status
       * before changing Payment to refunded.
       */

      const referenceId =
        options.referenceId ||
        crypto.randomUUID();

      const externalId =
        options.externalId ||
        `REFUND-${String(paymentId)}`;

      const currency =
        String(
          options.currency || "RWF"
        ).toUpperCase();

      const recipientPhone =
        this.normalizePhoneNumber(
          options.phoneNumber ||
            options.payerPhone ||
            options.recipientPhone
        );

      if (!recipientPhone) {
        throw this.createProviderError(
          "Refund recipient phone number is required.",
          "INVALID_RECIPIENT_PHONE"
        );
      }

      const transferData = {
        amount:
          this.formatAmount(
            refundAmount,
            currency
          ),
        currency,
        externalId,
        payee: {
          partyIdType: "MSISDN",
          partyId: recipientPhone,
        },
        payerMessage:
          reason ||
          "AI Tour Rwanda Refund",
        payeeNote:
          `Refund for payment ${paymentId}`,
      };

      if (this.transferType) {
        transferData.transferType =
          this.transferType;
      }

      const accessToken =
        await this.getAccessToken();

      const headers = {
        Authorization:
          `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key":
          this.disbursementSubscriptionKey,
        "X-Target-Environment":
          this.environment,
        "X-Reference-Id":
          referenceId,
        "Content-Type":
          "application/json",
      };

      const response =
        await this._requestWithRetry(
          `${this.disbursementBaseUrl}/disbursement/v1_0/transfer`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(
              transferData
            ),
          }
        );

      if (
        response.status !== 202 &&
        response.status !== 200
      ) {
        const payload =
          await this._readResponse(response);

        const error = new Error(
          payload?.message ||
            `MTN refund transfer failed with HTTP ${response.status}`
        );

        error.code =
          payload?.code ||
          `HTTP_${response.status}`;

        error.httpStatus =
          response.status;

        error.providerResponse =
          payload;

        throw error;
      }

      return {
        success: true,
        refundId: referenceId,
        status:
          PAYMENT_STATUS.PENDING,
        data: {
          paymentId,
          refundId: referenceId,
          transactionId: referenceId,
          amount: refundAmount,
          currency,
          externalId,
          recipientPhone,
          reason,
          initiatedAt:
            new Date().toISOString(),
        },
      };
    } catch (error) {
      this.log(
        "refundPayment",
        this.sanitizeError(error),
        "error"
      );

      return this.handleError(
        error,
        "refundPayment"
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Provider payout / disbursement
  // ─────────────────────────────────────────────────────────────

  async createPayout(data = {}) {
    try {
      this.assertEnabled({
        requireDisbursement: true,
      });

      const amount =
        Number(data.amount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw this.createProviderError(
          "Valid payout amount is required.",
          "INVALID_AMOUNT"
        );
      }

      const currency =
        String(
          data.currency || "RWF"
        ).toUpperCase();

      if (
        !this.supportedCurrencies.includes(
          currency
        )
      ) {
        throw this.createProviderError(
          `Currency "${currency}" is not supported by MTN MoMo Rwanda.`,
          "UNSUPPORTED_CURRENCY"
        );
      }

      const recipientPhone =
        this.normalizePhoneNumber(
          data.phoneNumber ||
            data.recipientPhone ||
            data.accountNumber
        );

      if (!recipientPhone) {
        throw this.createProviderError(
          "Provider MTN Mobile Money number is required.",
          "INVALID_RECIPIENT_PHONE"
        );
      }

      const referenceId =
        data.referenceId ||
        crypto.randomUUID();

      const externalId =
        data.externalId ||
        `PAYOUT-${String(
          data.withdrawalId ||
            data.providerId ||
            Date.now()
        )}`;

      const transferData = {
        amount:
          this.formatAmount(
            amount,
            currency
          ),
        currency,
        externalId,
        payee: {
          partyIdType: "MSISDN",
          partyId: recipientPhone,
        },
        payerMessage:
          data.payerMessage ||
          "AI Tour Rwanda Provider Payout",
        payeeNote:
          data.payeeNote ||
          "AI Tour Rwanda provider earnings",
      };

      if (this.transferType) {
        transferData.transferType =
          this.transferType;
      }

      const accessToken =
        await this.getAccessToken();

      const headers = {
        Authorization:
          `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key":
          this.disbursementSubscriptionKey,
        "X-Target-Environment":
          this.environment,
        "X-Reference-Id":
          referenceId,
        "Content-Type":
          "application/json",
      };

      const response =
        await this._requestWithRetry(
          `${this.disbursementBaseUrl}/disbursement/v1_0/transfer`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(
              transferData
            ),
          }
        );

      if (
        response.status !== 202 &&
        response.status !== 200
      ) {
        const payload =
          await this._readResponse(response);

        const error = new Error(
          payload?.message ||
            `MTN payout failed with HTTP ${response.status}`
        );

        error.code =
          payload?.code ||
          `HTTP_${response.status}`;

        error.httpStatus =
          response.status;

        error.providerResponse =
          payload;

        throw error;
      }

      return {
        success: true,
        payoutId: referenceId,
        status:
          PAYMENT_STATUS.PENDING,
        metadata: {
          provider: "momo",
          referenceId,
          externalId,
          amount,
          currency,
          phoneNumber: recipientPhone,
          withdrawalId:
            data.withdrawalId || null,
          providerId:
            data.providerId || null,
          initiatedAt:
            new Date().toISOString(),
        },
      };
    } catch (error) {
      this.log(
        "createPayout",
        this.sanitizeError(error),
        "error"
      );

      return this.handleError(
        error,
        "createPayout"
      );
    }
  }

  async getPayoutStatus(referenceId) {
    try {
      this.assertEnabled({
        requireDisbursement: true,
      });

      if (!referenceId) {
        throw this.createProviderError(
          "referenceId is required.",
          "VALIDATION_ERROR"
        );
      }

      const accessToken =
        await this.getAccessToken();

      const response =
        await this._requestWithRetry(
          `${this.disbursementBaseUrl}/disbursement/v1_0/transfer/${encodeURIComponent(
            referenceId
          )}`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              "Ocp-Apim-Subscription-Key":
                this.disbursementSubscriptionKey,
              "X-Target-Environment":
                this.environment,
            },
          }
        );

      const payload =
        await this._readResponse(response);

      if (!response.ok) {
        const error = new Error(
          payload?.message ||
            `MTN payout status request failed with HTTP ${response.status}`
        );

        error.code =
          payload?.code ||
          `HTTP_${response.status}`;

        error.httpStatus =
          response.status;

        error.providerResponse =
          payload;

        throw error;
      }

      return {
        success: true,
        payoutId: referenceId,
        status:
          this.mapApiStatus(
            payload?.status
          ),
        providerStatus:
          payload?.status || null,
        data: payload,
      };
    } catch (error) {
      this.log(
        "getPayoutStatus",
        this.sanitizeError(error),
        "error"
      );

      return this.handleError(
        error,
        "getPayoutStatus"
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Webhook / callback
  // ─────────────────────────────────────────────────────────────

  async handleWebhook(req) {
    try {
      this.log(
        "handleWebhook",
        {
          method: req?.method,
          path: req?.path,
        },
        "info"
      );

      /*
       * MTN's documented callback mechanism is not equivalent to
       * Stripe's signed webhook model.
       *
       * Do NOT invent an HMAC signature scheme.
       *
       * Security must instead rely on:
       * - HTTPS in production
       * - registered callback host
       * - known provider endpoint
       * - reference ID lookup
       * - provider status verification
       *
       * The callback itself must NEVER be trusted blindly for
       * financial settlement. paymentService should verify the
       * transaction status with MTN before marking Payment PAID.
       */

      const event =
        req?.body || {};

      const referenceId =
        event.referenceId ||
        event.reference ||
        event.paymentId ||
        event.transactionId ||
        null;

      const providerStatus =
        String(
          event.status ||
            event.transactionStatus ||
            ""
        ).toUpperCase();

      this.log(
        "webhook",
        {
          referenceId,
          providerStatus,
        },
        "info"
      );

      if (!referenceId) {
        return {
          success: false,
          error:
            "MTN callback did not contain a usable reference ID.",
          code:
            "MISSING_REFERENCE_ID",
          provider:
            this.providerId,
        };
      }

      /*
       * Do not immediately mark paid here.
       *
       * Return a normalized event to paymentService.
       * paymentService can then call verifyPayment(referenceId).
       */

      const mappedStatus =
        this.mapApiStatus(
          providerStatus
        );

      let eventName =
        "unknown";

      if (
        mappedStatus ===
        PAYMENT_STATUS.SUCCEEDED
      ) {
        eventName =
          WEBHOOK_EVENTS.PAYMENT_SUCCEEDED;
      } else if (
        mappedStatus ===
        PAYMENT_STATUS.FAILED
      ) {
        eventName =
          WEBHOOK_EVENTS.PAYMENT_FAILED;
      } else if (
        providerStatus ===
        "CANCELLED"
      ) {
        eventName =
          WEBHOOK_EVENTS.PAYMENT_FAILED;
      }

      return {
        success: true,
        event: eventName,
        data: {
          paymentId: referenceId,
          referenceId,
          transactionId:
            event.transactionId ||
            event.financialTransactionId ||
            referenceId,
          amount:
            event.amount || null,
          currency:
            event.currency || "RWF",
          status:
            mappedStatus,
          providerStatus,
          externalId:
            event.externalId || null,
          raw: event,
        },
        metadata: {
          provider: "momo",
          referenceId,
        },
      };
    } catch (error) {
      this.log(
        "handleWebhook",
        this.sanitizeError(error),
        "error"
      );

      return this.handleError(
        error,
        "handleWebhook"
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Callback validation
  // ─────────────────────────────────────────────────────────────

  async verifyWebhookSignature(
    req,
    signature = null,
    secret = null
  ) {
    /*
     * Do NOT return true merely because this is production.
     *
     * MTN MoMo callback security should not be implemented using
     * an invented HMAC scheme.
     *
     * If your MTN contract/onboarding supplies a signed callback
     * mechanism, implement that exact documented scheme here.
     */

    if (!this.isTestMode) {
      return {
        valid: false,
        verified: false,
        reason:
          "MTN callback signature verification is not configured. Provider status verification is required before settlement.",
      };
    }

    return {
      valid: true,
      verified: false,
      testMode: true,
      reason:
        "Sandbox callback accepted for processing; final financial state must still be verified against MTN status.",
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Polling helper
  // ─────────────────────────────────────────────────────────────

  async waitForPaymentStatus(
    paymentId,
    {
      timeoutMs = 60000,
      intervalMs = 3000,
    } = {}
  ) {
    const startedAt =
      Date.now();

    while (
      Date.now() - startedAt <
      timeoutMs
    ) {
      const result =
        await this.getPaymentStatus(
          paymentId
        );

      if (
        result.status ===
          PAYMENT_STATUS.SUCCEEDED ||
        result.status ===
          PAYMENT_STATUS.FAILED ||
        result.status ===
          PAYMENT_STATUS.CANCELLED ||
        result.status ===
          PAYMENT_STATUS.EXPIRED
      ) {
        return result;
      }

      await this.sleep(
        intervalMs
      );
    }

    return {
      success: true,
      status:
        PAYMENT_STATUS.PENDING,
      paymentId,
      timedOut: true,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Amount handling
  // ─────────────────────────────────────────────────────────────

  formatAmount(
    amount,
    currency = "RWF"
  ) {
    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      throw new Error(
        "Amount must be greater than zero."
      );
    }

    /*
     * MTN Request-to-Pay examples send RWF as a normal amount,
     * e.g. "1000", not "100000" as a smallest-unit integer.
     *
     * Keep two decimals for currencies that support them, although
     * this Rwanda MVP currently only enables RWF.
     */
    if (
      currency.toUpperCase() ===
      "RWF"
    ) {
      return String(
        Math.round(numericAmount)
      );
    }

    return numericAmount.toFixed(2);
  }

  // ─────────────────────────────────────────────────────────────
  // Phone normalization
  // ─────────────────────────────────────────────────────────────

  normalizePhoneNumber(
    phoneNumber
  ) {
    if (!phoneNumber) {
      return null;
    }

    let phone =
      String(phoneNumber)
        .trim()
        .replace(/[^\d+]/g, "");

    // Rwanda local 07xxxxxxxx -> 2507xxxxxxxx
    if (
      /^07\d{8}$/.test(phone)
    ) {
      phone =
        `250${phone.slice(1)}`;
    }

    // +2507xxxxxxxx -> 2507xxxxxxxx
    if (
      /^\+2507\d{8}$/.test(phone)
    ) {
      phone =
        phone.slice(1);
    }

    // 2507xxxxxxxx
    if (
      /^2507\d{8}$/.test(phone)
    ) {
      return phone;
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // Response normalization
  // ─────────────────────────────────────────────────────────────

  formatPaymentResponse(
    apiResponse,
    referenceId
  ) {
    return {
      success: true,
      paymentId:
        referenceId ||
        apiResponse?.referenceId,
      status:
        this.mapApiStatus(
          apiResponse?.status
        ),
      paymentUrl: null,
      metadata: {
        provider: "momo",
        referenceId:
          referenceId ||
          apiResponse?.referenceId ||
          null,
        externalId:
          apiResponse?.externalId ||
          null,
        transactionId:
          apiResponse?.transactionId ||
          null,
        status:
          apiResponse?.status ||
          null,
      },
    };
  }

  formatVerificationResponse(
    apiResponse,
    options = {}
  ) {
    const status =
      this.mapApiStatus(
        apiResponse?.status
      );

    return {
      success:
        status ===
        PAYMENT_STATUS.SUCCEEDED,

      status,

      transactionId:
        apiResponse?.financialTransactionId ||
        apiResponse?.transactionId ||
        options.transactionId ||
        null,

      data: {
        paymentId:
          apiResponse?.referenceId ||
          options.paymentId ||
          null,

        referenceId:
          options.paymentId ||
          apiResponse?.referenceId ||
          null,

        status,

        providerStatus:
          apiResponse?.status ||
          null,

        amount:
          apiResponse?.amount ||
          options.amount ||
          null,

        currency:
          apiResponse?.currency ||
          options.currency ||
          "RWF",

        externalId:
          apiResponse?.externalId ||
          null,

        payer:
          apiResponse?.payer ||
          null,

        reason:
          apiResponse?.reason ||
          null,

        verifiedAt:
          new Date().toISOString(),
      },
    };
  }

  formatRefundResponse(
    apiResponse
  ) {
    return {
      success: true,
      refundId:
        apiResponse?.referenceId ||
        apiResponse?.refundId ||
        null,

      status:
        this.mapApiStatus(
          apiResponse?.status
        ),

      data: {
        paymentId:
          apiResponse?.originalPaymentId ||
          null,

        amount:
          apiResponse?.amount ||
          null,

        currency:
          apiResponse?.currency ||
          "RWF",

        reference:
          apiResponse?.referenceId ||
          null,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Status mapping
  // ─────────────────────────────────────────────────────────────

  mapApiStatus(
    apiStatus
  ) {
    const status =
      String(
        apiStatus || ""
      ).toUpperCase();

    const statusMap = {
      PENDING:
        PAYMENT_STATUS.PENDING,

      PROCESSING:
        PAYMENT_STATUS.PROCESSING,

      SUCCESSFUL:
        PAYMENT_STATUS.SUCCEEDED,

      SUCCEEDED:
        PAYMENT_STATUS.SUCCEEDED,

      SUCCESS:
        PAYMENT_STATUS.SUCCEEDED,

      FAILED:
        PAYMENT_STATUS.FAILED,

      FAILURE:
        PAYMENT_STATUS.FAILED,

      CANCELLED:
        PAYMENT_STATUS.CANCELLED,

      CANCELED:
        PAYMENT_STATUS.CANCELLED,

      TIMEOUT:
        PAYMENT_STATUS.EXPIRED,

      EXPIRED:
        PAYMENT_STATUS.EXPIRED,
    };

    return (
      statusMap[status] ||
      PAYMENT_STATUS.PENDING
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Metadata
  // ─────────────────────────────────────────────────────────────

  getMetadata(data = {}) {
    return {
      provider: "momo",
      bookingId:
        data.bookingId ||
        data.booking_id ||
        null,

      paymentId:
        data.paymentId ||
        data.payment_id ||
        null,

      userId:
        data.userId ||
        data.user_id ||
        null,

      phoneNumber:
        data.phoneNumber ||
        data.phone_number ||
        null,

      externalId:
        data.externalId ||
        null,

      source:
        "mtn-momo",
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Error handling
  // ─────────────────────────────────────────────────────────────

  createProviderError(
    message,
    code = "UNKNOWN_ERROR"
  ) {
    const error =
      new Error(message);

    error.code = code;

    return error;
  }

  handleError(
    error,
    context = ""
  ) {
    let errorCode =
      PROVIDER_ERRORS.UNKNOWN_ERROR;

    let errorMessage =
      error?.message ||
      "An unknown MTN MoMo error occurred.";

    const providerCode =
      String(
        error?.code || ""
      ).toUpperCase();

    if (
      providerCode.includes(
        "AUTH"
      ) ||
      error?.httpStatus === 401
    ) {
      errorCode =
        PROVIDER_ERRORS.AUTHENTICATION_FAILED;

      errorMessage =
        "MTN MoMo authentication failed. Check API User, API Key and subscription credentials.";
    } else if (
      providerCode.includes(
        "INSUFFICIENT"
      )
    ) {
      errorCode =
        PROVIDER_ERRORS.INSUFFICIENT_FUNDS;

      errorMessage =
        "Insufficient funds to process the MTN MoMo transaction.";
    } else if (
      providerCode.includes(
        "NOT_FOUND"
      ) ||
      error?.httpStatus === 404
    ) {
      errorCode =
        PROVIDER_ERRORS.PAYMENT_NOT_FOUND;

      errorMessage =
        "The MTN MoMo transaction could not be found.";
    } else if (
      error?.httpStatus === 429 ||
      providerCode.includes(
        "RATE"
      )
    ) {
      errorCode =
        PROVIDER_ERRORS.RATE_LIMIT_EXCEEDED;

      errorMessage =
        "MTN MoMo rate limit exceeded. Please retry later.";
    }

    this.log(
      "handleError",
      {
        context,
        errorCode,
        errorMessage,
        providerHttpStatus:
          error?.httpStatus || null,
      },
      "error"
    );

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      context,
      provider:
        this.providerId,
      timestamp:
        new Date().toISOString(),

      // Never expose credentials.
      originalError:
        this.sanitizeError(error),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // HTTP helpers
  // ─────────────────────────────────────────────────────────────

  async _requestWithRetry(
    url,
    options = {}
  ) {
    let lastError = null;

    for (
      let attempt = 0;
      attempt <= this.maxRetries;
      attempt += 1
    ) {
      try {
        const response =
          await this._fetchWithTimeout(
            url,
            options
          );

        /*
         * Do not retry client validation errors.
         * Retry transient server/rate-limit errors.
         */
        if (
          response.status < 500 &&
          response.status !== 429
        ) {
          return response;
        }

        if (
          attempt >=
          this.maxRetries
        ) {
          return response;
        }

        await this.sleep(
          this.retryDelayMs *
            Math.pow(2, attempt)
        );
      } catch (error) {
        lastError = error;

        if (
          attempt >=
          this.maxRetries
        ) {
          throw error;
        }

        await this.sleep(
          this.retryDelayMs *
            Math.pow(2, attempt)
        );
      }
    }

    throw (
      lastError ||
      new Error(
        "MTN MoMo request failed."
      )
    );
  }

  async _fetchWithTimeout(
    url,
    options = {}
  ) {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        this.requestTimeoutMs
      );

    try {
      return await fetch(
        url,
        {
          ...options,
          signal:
            controller.signal,
        }
      );
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        const timeoutError =
          new Error(
            "MTN MoMo request timed out."
          );

        timeoutError.code =
          "TIMEOUT";

        throw timeoutError;
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async _readResponse(
    response
  ) {
    const text =
      await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        raw: text,
      };
    }
  }

  sanitizeError(error) {
    if (!error) {
      return null;
    }

    return {
      name:
        error.name || "Error",

      message:
        error.message || "Unknown error",

      code:
        error.code || null,

      httpStatus:
        error.httpStatus || null,
    };
  }

  sleep(ms) {
    return new Promise(
      (resolve) =>
        setTimeout(resolve, ms)
    );
  }
}

export default MomoProvider;