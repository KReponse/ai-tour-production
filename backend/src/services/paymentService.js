// backend/src/services/paymentService.js
// ✅ COMPLETE FIXED - Added missing listing field to payment creation
// ✅ COMPLETE FIXED - providerData Map handling to prevent Mongoose internal object errors
// ✅ Multi-Currency Support with Settlement Integration
// ✅ Fixed: All metadata values are plain strings, not Mongoose objects
// ✅ Added: Currency conversion and settlement processing
// ✅ Added: Multi-currency payment creation

import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Earning from "../models/Earning.js";
import User from "../models/User.js";
import axios from 'axios';
import { createNotification } from "../utils/notificationService.js";
import paymentConfig, {
  getEnabledProviders,
  providerSupportsCurrency,
  getDefaultCurrency,
  calculateCommission,
  formatCurrency,
} from "../config/payment.config.js";
import { PAYMENT_STATUS, WEBHOOK_EVENTS } from "./paymentProvider.interface.js";
import currencyService from "./currencyService.js";
import exchangeRateService from "./exchangeRateService.js";
import settlementService from "./settlementService.js";

// ─── Provider Imports ────────────────────────────────────────────
import StripeProvider from "./providers/stripe.provider.js";

class PaymentService {
  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  initializeProviders() {
    const providerConfigs = paymentConfig.providers;

    if (providerConfigs.stripe.enabled) {
      try {
        this.providers.set('stripe', new StripeProvider(providerConfigs.stripe.config));
        console.log('✅ Stripe provider initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Stripe provider:', error.message);
      }
    }

    console.log(`💰 Payment Service initialized with ${this.providers.size} provider(s)`);
  }

  getProvider(providerId) {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Payment provider "${providerId}" not found`);
    }
    if (!provider.isEnabled) {
      throw new Error(`Payment provider "${providerId}" is not enabled`);
    }
    return provider;
  }

  getEnabledProviders() {
    const providers = [];
    for (const [id, provider] of this.providers) {
      if (provider.isEnabled) {
        providers.push({
          id,
          name: provider.providerName,
          supportedCurrencies: provider.supportedCurrencies,
          isTestMode: provider.isTestMode,
        });
      }
    }
    return providers;
  }

  // ─── Core Payment Methods ──────────────────────────────────────

  /**
   * Create a new payment with multi-currency support
   */
  async createPayment(data) {
    const {
      bookingId,
      providerId,
      userId,
      currency,
      successUrl,
      cancelUrl,
      metadata = {},
    } = data;

    try {
      console.log(`💰 Creating payment for booking: ${bookingId} via ${providerId}`);

      // ─── 1. Validate booking ────────────────────────────────────
      const booking = await Booking.findById(bookingId)
        .populate('user', 'name email preferredCurrency')
        .populate('listing', 'title price currency _id')  // ✅ Ensure listing._id is populated
        .populate('provider', 'name email preferredCurrency');

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.paymentStatus === 'paid') {
        throw new Error('Booking already paid');
      }

      // ✅ CRITICAL: Validate that booking has a listing
      if (!booking.listing) {
        console.error('❌ Booking has no listing:', bookingId);
        throw new Error('Booking is missing listing information. Cannot create payment.');
      }

      // ─── 2. Get payment provider ───────────────────────────────
      const provider = this.getProvider(providerId);
      
      // ─── 3. Determine payment currency ──────────────────────────
      // Priority: User specified > Booking currency > User preference > Default
      let paymentCurrency = currency || booking.currency || getDefaultCurrency();
      
      // Validate currency is supported by provider
      if (!provider.supportedCurrencies.includes(paymentCurrency)) {
        console.warn(`Provider "${providerId}" does not support "${paymentCurrency}", using default`);
        paymentCurrency = getDefaultCurrency();
      }

      // ─── 4. Get exchange rate for settlement ────────────────────
      // Get provider's preferred settlement currency
      const providerSettlementCurrency = await settlementService.getProviderSettlementCurrency(
        booking.provider._id
      );

      // Get exchange rate for settlement
      let exchangeRate = 1;
      let settlementAmount = 0;
      if (paymentCurrency !== providerSettlementCurrency) {
        const rateResult = await exchangeRateService.getRateWithConversion(
          1,
          paymentCurrency,
          providerSettlementCurrency
        );
        if (rateResult.success) {
          exchangeRate = rateResult.rate;
        }
      }

      // ─── 5. Calculate payment details ──────────────────────────
      const amount = booking.totalPrice;
      const commission = calculateCommission(amount);
      const providerAmount = amount - commission;
      
      // Calculate settlement amount
      settlementAmount = providerAmount * exchangeRate;

      // ─── 6. Get entity details ─────────────────────────────────
      const entity = booking.listing;
      const entityTitle = entity?.title || 'Experience';

      // ─── 7. ✅ Ensure all IDs are strings ──────────────────────
      const safeUserId = userId ? userId.toString() : booking.user._id.toString();
      const safeBookingId = booking._id.toString();
      const safeProviderId = booking.provider ? booking.provider._id.toString() : null;
      const safeListingId = booking.listing._id.toString();  // ✅ Critical

      // ─── 8. Create payment record with ALL required fields ───
      const payment = await Payment.create({
        // ✅ REQUIRED FIELDS - ALL NOW PROVIDED
        traveler: safeUserId,
        booking: safeBookingId,
        provider: safeProviderId,
        listing: safeListingId,  // ✅ CRITICAL FIX - This was missing!
        
        // Amounts
        amount: amount,
        currency: paymentCurrency,
        platformFee: commission,
        providerAmount: providerAmount,
        paymentMethod: providerId,
        status: PAYMENT_STATUS.PENDING,
        
        // Multi-currency fields
        originalCurrency: paymentCurrency,
        originalAmount: amount,
        exchangeRate: exchangeRate,
        convertedAmount: settlementAmount,
        settlementCurrency: providerSettlementCurrency,
        settlementAmount: settlementAmount,
        
        // ✅ Plain object metadata - no Mongoose objects
        metadata: {
          bookingId: safeBookingId,
          entityType: 'listing',
          entityTitle: entityTitle,
          numberOfPeople: booking.numberOfPeople || 1,
          ...metadata,
        },
      });

      // ─── 9. ✅ Ensure all metadata values are strings ──────────
      const safeMetadata = {
        bookingId: safeBookingId,
        paymentId: payment._id.toString(),
        userId: safeUserId,
        providerId: safeProviderId || '',
        listingId: safeListingId,  // ✅ Added
        entityType: 'listing',
        entityTitle: entityTitle,
        numberOfPeople: String(booking.numberOfPeople || 1),
        currency: paymentCurrency,
        originalAmount: String(amount),
        exchangeRate: String(exchangeRate),
        settlementCurrency: providerSettlementCurrency,
        settlementAmount: String(settlementAmount),
        ...Object.fromEntries(
          Object.entries(metadata).map(([key, value]) => [
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          ])
        ),
      };

      // ─── 10. Create provider payment ────────────────────────────
      const providerData = {
        bookingId: safeBookingId,
        userId: safeUserId,
        paymentId: payment._id.toString(),
        amount: amount,
        currency: paymentCurrency,
        description: `${entityTitle} - Booking #${booking.bookingCode}`,
        successUrl: successUrl || `${process.env.CLIENT_URL}/payment-success?payment_id=${payment._id}`,
        cancelUrl: cancelUrl || `${process.env.CLIENT_URL}/payment-cancel?payment_id=${payment._id}`,
        webhookUrl: `${process.env.API_URL}/api/payments/webhook/${providerId}`,
        customerEmail: booking.user?.email || '',
        userEmail: booking.user?.email || '',
        metadata: safeMetadata,
      };

      const providerResult = await provider.createPayment(providerData);

      // ─── 11. Update payment with provider data ─────────────────
      payment.providerReference = providerResult.paymentId;
      
      // ✅ FIXED: Ensure providerData is a plain object, not Mongoose document
      const safeProviderData = providerResult.metadata || {};
      payment.providerData = typeof safeProviderData === 'object' 
        ? JSON.parse(JSON.stringify(safeProviderData))
        : {};
      
      payment.status = providerResult.status || PAYMENT_STATUS.PENDING;
      
      if (providerResult.paymentUrl) {
        payment.paymentUrl = providerResult.paymentUrl;
      }

      await payment.save();

      // ─── 12. Update booking status ─────────────────────────────
      booking.paymentStatus = 'pending';
      booking.status = 'pending_payment';
      booking.displayCurrency = paymentCurrency;
      booking.displayTotal = amount;
      await booking.save();

      console.log(`✅ Payment created: ${payment._id} (Provider: ${providerId})`);
      console.log(`📊 Currency: ${paymentCurrency} | Settlement: ${providerSettlementCurrency} @ ${exchangeRate}`);
      console.log(`📦 Listing: ${entityTitle} (${safeListingId})`);

      return {
        success: true,
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          provider: providerId,
          paymentUrl: providerResult.paymentUrl,
          providerReference: providerResult.paymentId,
          settlementCurrency: payment.settlementCurrency,
          settlementAmount: payment.settlementAmount,
          exchangeRate: payment.exchangeRate,
        },
        providerResult,
      };

    } catch (error) {
      console.error('❌ Payment creation error:', error.message);
      throw error;
    }
  }

  /**
   * Verify payment with multi-currency handling
   */
  async verifyPayment(paymentId, providerId = null) {
    try {
      console.log(`🔍 Verifying payment: ${paymentId}`);

      const payment = await Payment.findById(paymentId)
        .populate('traveler', 'name email')
        .populate('booking');

      if (!payment) {
        throw new Error('Payment not found');
      }

      const provider = this.getProvider(providerId || payment.paymentMethod);
      
      const result = await provider.verifyPayment(
        payment.providerReference,
        { paymentId: payment._id }
      );

      if (result.status === PAYMENT_STATUS.SUCCEEDED || result.status === PAYMENT_STATUS.COMPLETED) {
        await this.handleSuccessfulPayment(payment, result);
      } else if (result.status === PAYMENT_STATUS.FAILED) {
        await this.handleFailedPayment(payment, result);
      } else {
        payment.status = result.status;
        // ✅ FIXED: Safe providerData update
        const safeData = result.data ? JSON.parse(JSON.stringify(result.data)) : null;
        const existingProviderData = payment.providerData instanceof Map 
          ? Object.fromEntries(payment.providerData) 
          : (payment.providerData || {});
        payment.providerData = {
          ...existingProviderData,
          verification: safeData,
        };
        await payment.save();
      }

      return {
        success: true,
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          provider: payment.paymentMethod,
          settlementCurrency: payment.settlementCurrency,
          settlementAmount: payment.settlementAmount,
        },
        verification: result,
      };

    } catch (error) {
      console.error('❌ Payment verification error:', error.message);
      throw error;
    }
  }

  /**
   * Get payment status with currency info
   */
  async getPaymentStatus(paymentId) {
    try {
      const payment = await Payment.findById(paymentId)
        .select('status amount currency paymentMethod providerReference createdAt updatedAt settlementCurrency settlementAmount exchangeRate');

      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        success: true,
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          provider: payment.paymentMethod,
          providerReference: payment.providerReference,
          settlementCurrency: payment.settlementCurrency,
          settlementAmount: payment.settlementAmount,
          exchangeRate: payment.exchangeRate,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        },
      };

    } catch (error) {
      console.error('❌ Get payment status error:', error.message);
      throw error;
    }
  }

  /**
   * Refund payment with currency handling
   */
  async refundPayment(paymentId, amount = null, reason = '') {
    try {
      console.log(`💸 Processing refund for payment: ${paymentId}`);

      const payment = await Payment.findById(paymentId)
        .populate('booking', 'bookingCode status')
        .populate('traveler', 'name email');

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== PAYMENT_STATUS.SUCCEEDED && payment.status !== PAYMENT_STATUS.COMPLETED) {
        throw new Error(`Payment cannot be refunded. Current status: ${payment.status}`);
      }

      if (payment.refundId) {
        throw new Error('Payment already refunded');
      }

      const provider = this.getProvider(payment.paymentMethod);
      
      const refundAmount = amount || payment.amount;
      const result = await provider.refundPayment(
        payment.providerReference,
        refundAmount,
        reason,
        { 
          paymentId: payment._id.toString(),
          bookingId: payment.booking?._id?.toString() || '',
        }
      );

      if (result.success) {
        payment.status = refundAmount === payment.amount ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED;
        payment.refundId = result.refundId;
        payment.refundAmount = refundAmount;
        payment.refundedAt = new Date();
        await payment.save();

        const booking = payment.booking;
        if (booking) {
          booking.status = 'cancelled';
          booking.refundAmount = refundAmount;
          booking.refundedAt = new Date();
          booking.refundId = result.refundId;
          booking.cancellationReason = reason || 'Refund requested';
          await booking.save();
        }

        await createNotification({
          recipient: payment.traveler._id,
          sender: payment.provider,
          type: 'refund_processed',
          title: 'Refund Processed 💸',
          message: `Refund of ${currencyService.formatAmount(refundAmount, payment.currency)} processed for booking ${booking?.bookingCode || ''}`,
          data: { paymentId: payment._id, bookingId: booking?._id },
          link: `/my-payments/${payment._id}`,
        });

        console.log(`✅ Refund processed: ${payment._id} (${result.refundId})`);

        return {
          success: true,
          refund: {
            id: result.refundId,
            amount: refundAmount,
            currency: payment.currency,
            status: payment.status,
            processedAt: payment.refundedAt,
          },
          payment: {
            id: payment._id,
            status: payment.status,
          },
        };
      }

      throw new Error('Refund failed');

    } catch (error) {
      console.error('❌ Refund error:', error.message);
      throw error;
    }
  }

  /**
   * Handle webhook with multi-currency support
   */
  async handleWebhook(providerId, req) {
    try {
      console.log(`📥 Webhook received for provider: ${providerId}`);

      const provider = this.getProvider(providerId);
      const result = await provider.handleWebhook(req);

      if (result.success) {
        console.log(`✅ Webhook processed: ${providerId} - ${result.event}`);

        switch (result.event) {
          case WEBHOOK_EVENTS.PAYMENT_SUCCEEDED:
            await this.handleSuccessfulPaymentByProvider(result.data, providerId);
            break;
          case WEBHOOK_EVENTS.PAYMENT_FAILED:
            await this.handleFailedPaymentByProvider(result.data, providerId);
            break;
          case WEBHOOK_EVENTS.REFUND_SUCCEEDED:
            await this.handleRefundWebhook(result.data, providerId);
            break;
          default:
            console.log(`ℹ️ Unhandled webhook event: ${result.event}`);
        }

        return {
          success: true,
          event: result.event,
          handled: true,
        };
      }

      return result;

    } catch (error) {
      console.error('❌ Webhook handling error:', error.message);
      throw error;
    }
  }

  // ─── Internal Handlers ─────────────────────────────────────────

  /**
   * Handle successful payment with settlement
   * ✅ FIXED: Proper providerData Map handling
   * ✅ FIXED: Status mapping to 'paid' instead of 'succeeded'
   */
  async handleSuccessfulPayment(payment, verificationResult) {
    try {
      console.log(`✅ Processing successful payment: ${payment._id}`);

      // ✅ FIXED: Use 'paid' status (matches Payment model enum)
      payment.status = 'paid';
      payment.paidAt = new Date();
      
      // ✅ FIXED: Safely handle providerData to prevent Map errors
      // Extract existing providerData safely
      const existingProviderData = payment.providerData instanceof Map 
        ? Object.fromEntries(payment.providerData) 
        : (payment.providerData || {});
      
      // Create safe verification data (plain object, no Mongoose internals)
      const verificationData = verificationResult.data || {};
      const safeVerification = typeof verificationData === 'object' 
        ? JSON.parse(JSON.stringify(verificationData))
        : verificationData;
      
      // Merge safely
      payment.providerData = {
        ...existingProviderData,
        verification: safeVerification,
        verifiedAt: new Date().toISOString(),
      };
      
      if (verificationResult.transactionId) {
        payment.transactionId = verificationResult.transactionId;
      }
      
      // ✅ Save payment
      await payment.save();

      const booking = await Booking.findById(payment.booking)
        .populate('provider', 'name email preferredCurrency');

      if (booking) {
        booking.paymentStatus = 'paid';
        booking.status = 'paid';
        booking.paidAt = new Date();
        booking.paymentId = verificationResult.transactionId || payment.providerReference;
        await booking.save();

        // ─── Process settlement ──────────────────────────────────
        const settlementResult = await settlementService.processSettlement(
          payment._id,
          booking.provider._id
        );

        // ─── Create earning record ──────────────────────────────
        const earning = await Earning.create({
          provider: booking.provider._id,
          booking: booking._id,
          payment: payment._id,
          amount: payment.providerAmount,
          platformFee: payment.platformFee,
          netAmount: payment.providerAmount,
          bookingType: 'listing',
          status: 'available',
          paymentId: verificationResult.transactionId || payment.providerReference,
          settlementCurrency: settlementResult.success ? settlementResult.settlement.settlementCurrency : payment.currency,
          settlementAmount: settlementResult.success ? settlementResult.settlement.settlementAmount : payment.providerAmount,
          settlementExchangeRate: settlementResult.success ? settlementResult.settlement.exchangeRate : 1,
          settlementFee: settlementResult.success ? settlementResult.settlement.fee : 0,
        });

        await this.sendPaymentNotifications(payment, booking, earning);

        console.log(`✅ Payment completed: ${payment._id}, Earning: ${earning._id}`);
        console.log(`📊 Settlement: ${settlementResult.success ? 'Completed' : 'Failed'}`);
      }

    } catch (error) {
      console.error('❌ Handle successful payment error:', error.message);
      throw error;
    }
  }

  async handleSuccessfulPaymentByProvider(data, providerId) {
    try {
      const { paymentId } = data.metadata || {};
      if (!paymentId) {
        console.warn('⚠️ No paymentId in webhook data');
        return;
      }

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        console.warn(`⚠️ Payment not found: ${paymentId}`);
        return;
      }

      if (payment.status === 'paid' || payment.status === PAYMENT_STATUS.SUCCEEDED) {
        console.log(`ℹ️ Payment already processed: ${paymentId}`);
        return;
      }

      await this.handleSuccessfulPayment(payment, { data });
    } catch (error) {
      console.error('❌ Webhook payment success handler error:', error.message);
    }
  }

  async handleFailedPayment(payment, result) {
    try {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.errorMessage = result.error || 'Payment failed';
      
      // ✅ FIXED: Safe providerData update
      const existingProviderData = payment.providerData instanceof Map 
        ? Object.fromEntries(payment.providerData) 
        : (payment.providerData || {});
      
      const failureData = result.data ? JSON.parse(JSON.stringify(result.data)) : null;
      
      payment.providerData = {
        ...existingProviderData,
        failure: failureData,
        failedAt: new Date().toISOString(),
      };
      
      await payment.save();

      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.status = 'failed_payment';
        booking.adminNotes = `Payment failed: ${payment.errorMessage}`;
        await booking.save();
      }

      console.log(`❌ Payment failed: ${payment._id} - ${payment.errorMessage}`);

    } catch (error) {
      console.error('❌ Handle failed payment error:', error.message);
    }
  }

  async handleFailedPaymentByProvider(data, providerId) {
    try {
      const { paymentId } = data.metadata || {};
      if (!paymentId) return;

      const payment = await Payment.findById(paymentId);
      if (!payment) return;

      if (payment.status === PAYMENT_STATUS.FAILED) return;

      await this.handleFailedPayment(payment, { data });
    } catch (error) {
      console.error('❌ Webhook payment failure handler error:', error.message);
    }
  }

  async handleRefundWebhook(data, providerId) {
    try {
      const { paymentId } = data.metadata || {};
      if (!paymentId) return;

      const payment = await Payment.findById(paymentId);
      if (!payment) return;

      if (payment.status === PAYMENT_STATUS.REFUNDED) return;

      payment.status = PAYMENT_STATUS.REFUNDED;
      payment.refundId = data.refundId;
      payment.refundAmount = data.amount || payment.amount;
      payment.refundedAt = new Date();
      await payment.save();

      console.log(`✅ Refund processed via webhook: ${payment._id}`);

    } catch (error) {
      console.error('❌ Webhook refund handler error:', error.message);
    }
  }

  /**
   * Send payment notifications with currency formatting
   */
  async sendPaymentNotifications(payment, booking, earning) {
    try {
      const entity = booking.listing;
      const entityTitle = entity?.title || 'Experience';

      const formattedAmount = currencyService.formatAmount(payment.amount, payment.currency);
      const formattedProviderAmount = currencyService.formatAmount(
        payment.providerAmount, 
        payment.settlementCurrency || payment.currency
      );

      await createNotification({
        recipient: booking.user,
        sender: booking.provider,
        type: 'payment_success',
        title: 'Payment Successful ✅',
        message: `Your payment of ${formattedAmount} for "${entityTitle}" was successful!`,
        data: { 
          bookingId: booking._id.toString(),
          paymentId: payment._id.toString(),
          earningId: earning?._id?.toString() || null,
          currency: payment.currency,
          amount: payment.amount,
        },
        link: `/my-bookings/${booking._id}`,
      });

      await createNotification({
        recipient: booking.provider,
        sender: booking.user,
        type: 'payment_received',
        title: 'Payment Received 💰',
        message: `You received ${formattedProviderAmount} for "${entityTitle}"`,
        data: { 
          bookingId: booking._id.toString(),
          paymentId: payment._id.toString(),
          earningId: earning?._id?.toString() || null,
          commission: payment.platformFee,
          currency: payment.settlementCurrency || payment.currency,
          amount: payment.providerAmount,
        },
        link: `/provider/earnings`,
      });

      console.log(`📧 Payment notifications sent for booking: ${booking._id}`);
    } catch (error) {
      console.error('❌ Send payment notifications error:', error.message);
    }
  }

  /**
   * Get payment with currency conversion
   */
  async getPaymentWithConversion(paymentId, targetCurrency) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('traveler', 'name email')
        .populate('provider', 'name email businessName')
        .populate('booking');

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Convert amount to target currency
      const conversion = await currencyService.convertAmount(
        payment.amount,
        payment.currency,
        targetCurrency
      );

      return {
        success: true,
        payment: {
          ...payment.toObject(),
          convertedAmount: conversion.convertedAmount,
          convertedCurrency: targetCurrency,
          exchangeRate: conversion.rate,
        },
      };
    } catch (error) {
      console.error('❌ Get payment with conversion error:', error.message);
      throw error;
    }
  }
}

const paymentService = new PaymentService();
export default paymentService;