// backend/src/controllers/paymentController.js
// ✅ COMPLETE REFACTORED - Clean separation of concerns
// ✅ Delegates to paymentService for all payment operations
// ✅ Removed duplicate wallet/withdrawal functions (moved to walletController)
// ✅ Removed duplicate earnings functions (moved to earningController)
// ✅ ENHANCED PAGINATION - Added search, filters, sorting, date ranges, amount ranges
// ✅ Proper pagination metadata (hasNext, hasPrev, totalPages)
// ✅ Added filters object in response

import Stripe from "stripe";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Earning from "../models/Earning.js";
import { createNotification } from "../utils/notificationService.js";
import paymentService from "../services/paymentService.js";
import currencyService from "../services/currencyService.js";
import settlementService from "../services/settlementService.js";
import { PAYMENT_STATUS } from "../services/paymentProvider.interface.js";
import { generateReceiptNumber } from "../utils/receiptUtils.js";
import { exportToCSV } from "../utils/exportUtils.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  maxNetworkRetries: 3,
});

// =========================
// ✅ STRIPE STATUS MAP
// =========================

const STRIPE_STATUS_MAP = {
  'succeeded': 'paid',
  'requires_payment_method': 'pending',
  'requires_confirmation': 'pending',
  'requires_action': 'pending',
  'processing': 'processing',
  'canceled': 'failed',
  'failed': 'failed',
  'complete': 'paid',
  'expired': 'failed',
  'open': 'pending',
  'paid': 'paid',
  'unpaid': 'pending',
  'no_payment_required': 'pending',
};

const mapStripeStatus = (stripeStatus) => {
  return STRIPE_STATUS_MAP[stripeStatus] || 'pending';
};

// =========================
// ✅ CURRENCY FORMATTING HELPER
// =========================

const formatCurrency = (amount, currencyCode) => {
  if (!amount && amount !== 0) return '0.00';
  if (!currencyCode) currencyCode = 'USD';
  
  try {
    if (currencyService && typeof currencyService.formatAmount === 'function') {
      return currencyService.formatAmount(amount, currencyCode);
    }
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  } catch (error) {
    return `${amount} ${currencyCode}`;
  }
};

// ============================================================
// ✅ CREATE CHECKOUT SESSION - Delegates to paymentService
// ============================================================

export const createCheckoutSession = async (req, res) => {
  try {
    const { 
      bookingId, 
      providerId = 'stripe', 
      paymentMethod = 'card',
      currency
    } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required"
      });
    }

    // ✅ Fetch and validate booking
    const booking = await Booking.findById(bookingId)
      .populate("listing", "title price location currency")
      .populate("user", "name email preferredCurrency")
      .populate("provider", "name email preferredCurrency");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // ✅ Authorization check
    if (booking.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot pay for this booking"
      });
    }

    // ✅ Validate booking state
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Booking already paid"
      });
    }

    // ✅ Validate listing exists
    if (!booking.listing) {
      return res.status(404).json({
        success: false,
        message: "No experience associated with this booking."
      });
    }

    // ✅ Determine payment currency
    let paymentCurrency = currency || booking.displayCurrency || booking.currency || 'USD';
    const isSupported = await currencyService.isCurrencyActive(paymentCurrency);
    if (!isSupported) {
      paymentCurrency = await currencyService.getDefaultCurrency().then(c => c?.code || 'USD');
    }

    // ✅ Build URLs
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const successUrl = `${clientUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`;
    const cancelUrl = `${clientUrl}/payment-cancel?booking_id=${booking._id}`;

    // ✅ Get exchange rate
    const exchangeRate = await currencyService.getExchangeRate(paymentCurrency, 'USD');
    const displayRate = exchangeRate?.rate || 1;
    const displayAmount = booking.totalPrice * displayRate;

    // ✅ Delegate to paymentService
    const result = await paymentService.createPayment({
      bookingId: booking._id,
      providerId: providerId,
      userId: req.user._id,
      currency: paymentCurrency,
      paymentMethod: paymentMethod,
      description: `${booking.listing.title} - Booking #${booking.bookingCode}`,
      metadata: {
        entityType: 'listing',
        entityTitle: booking.listing.title,
        numberOfPeople: booking.numberOfPeople || 1,
        bookingCode: booking.bookingCode,
        displayCurrency: paymentCurrency,
        displayAmount: displayAmount,
        exchangeRate: displayRate,
      },
      successUrl: successUrl,
      cancelUrl: cancelUrl,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || "Failed to create payment"
      });
    }

    res.json({
      success: true,
      url: result.payment.paymentUrl || result.providerResult?.paymentUrl,
      sessionId: result.payment.providerReference,
      paymentId: result.payment.id,
      provider: providerId,
      status: result.payment.status,
      currency: paymentCurrency,
      amount: booking.totalPrice,
      exchangeRate: displayRate,
      displayAmount: displayAmount,
      settlementCurrency: result.payment.settlementCurrency,
      settlementAmount: result.payment.settlementAmount,
    });

  } catch (error) {
    console.error("❌ Create Checkout Session Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment session"
    });
  }
};

// ============================================================
// ✅ VERIFY PAYMENT - Delegates to paymentService
// ============================================================

export const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required"
      });
    }

    console.log('🔍 Verifying payment for session:', sessionId);

    // ✅ Find payment
    let payment = await Payment.findOne({
      $or: [
        { stripeSessionId: sessionId },
        { providerReference: sessionId }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    // ✅ If already paid, return early
    if (payment.status === 'paid') {
      const booking = await Booking.findById(payment.booking)
        .populate('listing', 'title price location');
      
      return res.json({
        success: true,
        alreadyProcessed: true,
        paymentStatus: 'paid',
        currency: payment.currency,
        amount: payment.amount,
        settlementCurrency: payment.settlementCurrency,
        settlementAmount: payment.settlementAmount,
        exchangeRate: payment.exchangeRate,
        booking: booking ? {
          _id: booking._id,
          status: booking.status,
          totalPrice: booking.totalPrice,
          bookingCode: booking.bookingCode,
          numberOfPeople: booking.numberOfPeople,
          startDate: booking.startDate,
        } : null,
      });
    }

    // ✅ Check booking status
    const bookingCheck = await Booking.findById(payment.booking);
    if (bookingCheck && bookingCheck.paymentStatus === 'paid') {
      payment.status = 'paid';
      await payment.save();
      
      return res.json({
        success: true,
        alreadyProcessed: true,
        paymentStatus: 'paid',
        currency: payment.currency,
        amount: payment.amount,
        settlementCurrency: payment.settlementCurrency,
        settlementAmount: payment.settlementAmount,
        booking: {
          _id: bookingCheck._id,
          status: bookingCheck.status,
          totalPrice: bookingCheck.totalPrice,
          bookingCode: bookingCheck.bookingCode,
        },
      });
    }

    // ✅ Verify with Stripe
    let session;
    let paymentIntent;
    
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log(`✅ Stripe session: ${session.id}, status: ${session.status}, payment_status: ${session.payment_status}`);
      
      if (session.payment_intent) {
        paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
        console.log(`✅ Payment intent: ${paymentIntent.id}, status: ${paymentIntent.status}`);
      }
    } catch (stripeError) {
      console.error('❌ Stripe retrieval error:', stripeError.message);
      return res.status(500).json({
        success: false,
        message: "Failed to verify payment with Stripe"
      });
    }

    // ✅ Check if payment was successful
    const isSuccessful = 
      (paymentIntent && paymentIntent.status === 'succeeded') ||
      (session && session.payment_status === 'paid') ||
      (session && session.status === 'complete');

    if (!isSuccessful) {
      const stripeStatus = paymentIntent?.status || session?.payment_status || session?.status || 'unknown';
      const mappedStatus = mapStripeStatus(stripeStatus);
      
      payment.status = mappedStatus;
      payment.errorMessage = `Payment not successful. Stripe status: ${stripeStatus}`;
      await payment.save();
      
      return res.status(400).json({
        success: false,
        message: `Payment not successful. Status: ${stripeStatus}`,
        paymentStatus: mappedStatus,
        currency: payment.currency,
      });
    }

    // ✅ Update payment
    const paymentIntentId = paymentIntent?.id || session?.payment_intent || null;
    
    payment.status = 'paid';
    payment.stripePaymentId = paymentIntentId;
    payment.transactionId = paymentIntentId || sessionId;
    payment.paidAt = new Date();
    payment.providerAmount = payment.amount - (payment.platformFee || 0);
    payment.providerReference = sessionId;
    await payment.save();

    // ✅ Update booking
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      booking.paymentId = paymentIntentId;
      booking.paidAt = new Date();
      booking.displayCurrency = payment.currency;
      booking.displayTotal = payment.amount;
      await booking.save();
    }

    // ✅ Process settlement and create earning
    if (booking) {
      await paymentService.handleSuccessfulPayment(payment, { 
        transactionId: paymentIntentId,
        data: { paymentIntent }
      });
    }

    console.log(`✅ Payment verified and processed: ${payment.booking}`);

    const finalBooking = await Booking.findById(payment.booking)
      .populate('listing', 'title price location');

    res.json({
      success: true,
      paymentStatus: 'paid',
      bookingStatus: finalBooking?.status || 'confirmed',
      currency: payment.currency,
      amount: payment.amount,
      settlementCurrency: payment.settlementCurrency,
      settlementAmount: payment.settlementAmount,
      exchangeRate: payment.exchangeRate,
      booking: finalBooking ? {
        _id: finalBooking._id,
        status: finalBooking.status,
        totalPrice: finalBooking.totalPrice,
        bookingCode: finalBooking.bookingCode,
        numberOfPeople: finalBooking.numberOfPeople,
        startDate: finalBooking.startDate,
        listing: finalBooking.listing || null,
        displayCurrency: finalBooking.displayCurrency || payment.currency,
        displayTotal: finalBooking.displayTotal || payment.amount,
      } : null,
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.paymentMethod,
        paidAt: payment.paidAt,
        settlementCurrency: payment.settlementCurrency,
        settlementAmount: payment.settlementAmount,
      }
    });

  } catch (error) {
    console.error("❌ Verify Payment Error:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify payment"
    });
  }
};

// ============================================================
// ✅ GET MY PAYMENTS (Traveler) - ENHANCED
// ============================================================

export const getMyPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search, 
      sort = '-createdAt',
      currency,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = req.query;

    const filter = { traveler: req.user._id };
    if (status && status !== "all") filter.status = status;
    if (currency) filter.currency = currency.toUpperCase();
    
    // Date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Amount range
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    // Search
    if (search && search.trim()) {
      const bookingIds = await Booking.find({
        $or: [
          { bookingCode: { $regex: search, $options: "i" } },
          { "listing.title": { $regex: search, $options: "i" } },
        ],
      }).distinct("_id");

      filter.$or = [
        { booking: { $in: bookingIds } },
        { transactionId: { $regex: search, $options: "i" } },
        { stripePaymentId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Validate sort field
    const validSortFields = ['createdAt', 'amount', 'status', 'paidAt'];
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'createdAt';

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("traveler", "name email profileImage")
        .populate("provider", "name email businessName")
        .populate("booking", "bookingCode startDate endDate totalPrice status numberOfPeople")
        .populate({
          path: "booking",
          populate: {
            path: "listing",
            select: "title coverImage price location slug currency"
          }
        })
        .sort({ [finalSortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    const processedPayments = payments.map(payment => {
      const processed = { ...payment };
      if (payment.booking?.listing) {
        processed.listing = payment.booking.listing;
      }
      processed.formattedAmount = formatCurrency(payment.amount, payment.currency);
      processed.formattedSettlementAmount = formatCurrency(
        payment.settlementAmount, 
        payment.settlementCurrency || payment.currency
      );
      return processed;
    });

    res.json({
      success: true,
      data: processedPayments,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
      filters: {
        status,
        search,
        sort,
        currency,
        startDate,
        endDate,
        minAmount,
        maxAmount,
      },
    });
  } catch (error) {
    console.error("❌ Get my payments error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET PAYMENT BY ID
// ============================================================

export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    const payment = await Payment.findById(id)
      .populate("traveler", "name email phone profileImage")
      .populate("booking", "bookingCode startDate endDate totalPrice status numberOfPeople")
      .populate("provider", "name email businessName phone")
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const isOwner = payment.traveler?._id?.toString() === req.user._id.toString();
    const isProvider = payment.provider?._id?.toString() === req.user._id.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this payment",
      });
    }

    const bookingWithListing = await Booking.findById(payment.booking)
      .populate("listing", "title coverImage price location slug currency");

    const paymentWithListing = {
      ...payment,
      listing: bookingWithListing?.listing || null,
      formattedAmount: formatCurrency(payment.amount, payment.currency),
      formattedSettlementAmount: formatCurrency(
        payment.settlementAmount, 
        payment.settlementCurrency || payment.currency
      ),
      formattedPlatformFee: formatCurrency(payment.platformFee, payment.currency),
      formattedProviderAmount: formatCurrency(
        payment.providerAmount, 
        payment.settlementCurrency || payment.currency
      ),
    };

    const refundHistory = payment.refundId
      ? await Payment.find({
          refundId: payment.refundId,
        }).sort({ createdAt: -1 })
      : [];

    res.json({
      success: true,
      payment: paymentWithListing,
      refundHistory,
      permissions: {
        canRefund: isAdmin || (isOwner && payment.status === "paid"),
        canDownload: true,
        canView: true,
      },
    });
  } catch (error) {
    console.error("❌ Get payment by id error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET PROVIDER PAYMENTS - ENHANCED
// ============================================================

export const getProviderPayments = async (req, res) => {
  try {
    const providerId = req.user._id;
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
      currency,
      sort = '-createdAt',
      minAmount,
      maxAmount,
    } = req.query;

    const filter = { provider: providerId };

    if (status && status !== "all") filter.status = status;
    if (currency) filter.currency = currency.toUpperCase();

    if (search && search.trim()) {
      filter.$or = [
        { transactionId: { $regex: search, $options: "i" } },
        { "traveler.name": { $regex: search, $options: "i" } },
        { "booking.bookingCode": { $regex: search, $options: "i" } },
        { "booking.listing.title": { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.paidAt = {};
      if (startDate) filter.paidAt.$gte = new Date(startDate);
      if (endDate) filter.paidAt.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Validate sort field
    const validSortFields = ['createdAt', 'amount', 'status', 'paidAt'];
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'createdAt';

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("traveler", "name email profileImage")
        .populate("provider", "name email businessName")
        .populate("booking", "bookingCode startDate totalPrice status numberOfPeople")
        .populate({
          path: "booking",
          populate: {
            path: "listing",
            select: "title coverImage price location slug currency"
          }
        })
        .sort({ [finalSortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    const processedPayments = payments.map(payment => {
      const processed = { ...payment };
      if (payment.booking?.listing) {
        processed.listing = payment.booking.listing;
      }
      processed.formattedAmount = formatCurrency(payment.amount, payment.currency);
      processed.formattedSettlementAmount = formatCurrency(
        payment.settlementAmount, 
        payment.settlementCurrency || payment.currency
      );
      return processed;
    });

    const stats = await calculateProviderStats(providerId);

    res.json({
      success: true,
      data: processedPayments,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
      stats,
      filters: {
        status,
        search,
        sort,
        currency,
        startDate,
        endDate,
        minAmount,
        maxAmount,
      },
    });
  } catch (error) {
    console.error("❌ Get provider payments error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET ADMIN PAYMENTS - ENHANCED
// ============================================================

export const getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
      provider,
      currency,
      sort = '-createdAt',
      minAmount,
      maxAmount,
    } = req.query;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (currency) filter.currency = currency.toUpperCase();

    if (search && search.trim()) {
      filter.$or = [
        { transactionId: { $regex: search, $options: "i" } },
        { "traveler.name": { $regex: search, $options: "i" } },
        { "provider.name": { $regex: search, $options: "i" } },
        { "booking.bookingCode": { $regex: search, $options: "i" } },
        { "booking.listing.title": { $regex: search, $options: "i" } },
      ];
    }

    if (provider) {
      filter.provider = provider;
    }

    if (startDate || endDate) {
      filter.paidAt = {};
      if (startDate) filter.paidAt.$gte = new Date(startDate);
      if (endDate) filter.paidAt.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Validate sort field
    const validSortFields = ['createdAt', 'amount', 'status', 'paidAt'];
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'createdAt';

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("traveler", "name email profileImage")
        .populate("provider", "name email businessName")
        .populate("booking", "bookingCode startDate totalPrice status numberOfPeople")
        .populate({
          path: "booking",
          populate: {
            path: "listing",
            select: "title coverImage price location slug currency"
          }
        })
        .sort({ [finalSortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    const processedPayments = payments.map(payment => {
      const processed = { ...payment };
      if (payment.booking?.listing) {
        processed.listing = payment.booking.listing;
      }
      processed.formattedAmount = formatCurrency(payment.amount, payment.currency);
      processed.formattedSettlementAmount = formatCurrency(
        payment.settlementAmount, 
        payment.settlementCurrency || payment.currency
      );
      return processed;
    });

    const stats = await calculateAdminStats();

    res.json({
      success: true,
      data: processedPayments,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
      stats,
      filters: {
        status,
        search,
        sort,
        currency,
        provider,
        startDate,
        endDate,
        minAmount,
        maxAmount,
      },
    });
  } catch (error) {
    console.error("❌ Get all payments error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET PAYMENT STATS (Traveler)
// ============================================================

export const getPaymentStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [total, paid, pending, failed, refunded] = await Promise.all([
      Payment.countDocuments({ traveler: userId }),
      Payment.countDocuments({ traveler: userId, status: "paid" }),
      Payment.countDocuments({ traveler: userId, status: "pending" }),
      Payment.countDocuments({ traveler: userId, status: "failed" }),
      Payment.countDocuments({ traveler: userId, status: "refunded" }),
    ]);

    const totalAmount = await Payment.aggregate([
      { $match: { traveler: userId, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const currencyBreakdown = await Payment.aggregate([
      { $match: { traveler: userId, status: "paid" } },
      {
        $group: {
          _id: "$currency",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        total,
        paid,
        pending,
        failed,
        refunded,
        totalAmount: totalAmount[0]?.total || 0,
        currencyBreakdown: currencyBreakdown.map(c => ({
          currency: c._id,
          total: c.total,
          count: c.count,
          formatted: formatCurrency(c.total, c._id),
        })),
      },
    });
  } catch (error) {
    console.error("❌ Get payment stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET ADMIN PAYMENT STATS
// ============================================================

export const getAdminPaymentStats = async (req, res) => {
  try {
    const stats = await calculateAdminStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ Get admin payment stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET PROVIDER PAYMENT STATS
// ============================================================

export const getProviderPaymentStats = async (req, res) => {
  try {
    const providerId = req.user._id;
    const stats = await calculateProviderStats(providerId);
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ Get provider payment stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET PAYMENT RECEIPT
// ============================================================

export const getPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id)
      .populate("traveler", "name email")
      .populate("booking", "bookingCode")
      .populate("provider", "name businessName")
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const booking = await Booking.findById(payment.booking)
      .populate("listing", "title");

    const listing = booking?.listing || null;

    const receipt = {
      receiptNumber: payment.receiptNumber || generateReceiptNumber(payment),
      date: payment.paidAt || payment.createdAt,
      traveler: {
        name: payment.traveler?.name || "N/A",
        email: payment.traveler?.email || "N/A",
      },
      provider: {
        name: payment.provider?.businessName || payment.provider?.name || "N/A",
      },
      listing: {
        title: listing?.title || "N/A",
      },
      booking: {
        code: payment.booking?.bookingCode || "N/A",
      },
      payment: {
        amount: payment.amount,
        currency: payment.currency || "USD",
        method: payment.paymentMethod || "stripe",
        status: payment.status,
        transactionId: payment.transactionId || payment.stripePaymentId || "N/A",
        paidAt: payment.paidAt,
        subtotal: payment.amount - (payment.tax || 0) - (payment.serviceFee || 0),
        tax: payment.tax || 0,
        serviceFee: payment.serviceFee || 0,
        total: payment.amount,
      },
    };

    res.json({
      success: true,
      receipt,
    });
  } catch (error) {
    console.error("❌ Get payment receipt error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ DOWNLOAD RECEIPT
// ============================================================

export const downloadReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id)
      .populate("traveler", "name email")
      .populate("booking", "bookingCode")
      .populate("provider", "name businessName")
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const booking = await Booking.findById(payment.booking)
      .populate("listing", "title");

    const listing = booking?.listing || null;

    const receipt = {
      receiptNumber: payment.receiptNumber || generateReceiptNumber(payment),
      date: payment.paidAt || payment.createdAt,
      traveler: {
        name: payment.traveler?.name || "N/A",
        email: payment.traveler?.email || "N/A",
      },
      provider: {
        name: payment.provider?.businessName || payment.provider?.name || "N/A",
      },
      listing: {
        title: listing?.title || "N/A",
      },
      booking: {
        code: payment.booking?.bookingCode || "N/A",
      },
      payment: {
        amount: payment.amount,
        currency: payment.currency || "USD",
        method: payment.paymentMethod || "stripe",
        status: payment.status,
        transactionId: payment.transactionId || payment.stripePaymentId || "N/A",
        paidAt: payment.paidAt,
        subtotal: payment.amount - (payment.tax || 0) - (payment.serviceFee || 0),
        tax: payment.tax || 0,
        serviceFee: payment.serviceFee || 0,
        total: payment.amount,
      },
    };

    res.json({
      success: true,
      receipt,
      downloadUrl: `/api/payments/${id}/download-pdf`,
    });
  } catch (error) {
    console.error("❌ Download receipt error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ REQUEST REFUND (Traveler)
// ============================================================

export const requestRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await Payment.findById(id).populate("booking", "status");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.traveler.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only request refund for your own payments",
      });
    }

    if (payment.status !== "paid") {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be refunded. Current status: ${payment.status}`,
      });
    }

    if (payment.booking?.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed bookings cannot be refunded",
      });
    }

    await createNotification({
      recipient: payment.provider,
      sender: req.user._id,
      type: "refund_request",
      title: "Refund Requested 💸",
      message: `A traveler has requested a refund for booking ${payment.booking?.bookingCode || "N/A"}`,
      data: { paymentId: payment._id },
      link: `/provider/payments/${payment._id}`,
    });

    payment.status = "pending_refund";
    payment.refundReason = reason || "No reason provided";
    payment.refundRequestedAt = new Date();
    await payment.save();

    res.json({
      success: true,
      message: "Refund request submitted successfully",
      payment,
    });
  } catch (error) {
    console.error("❌ Request refund error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ PROCESS REFUND (Admin) - Delegates to paymentService
// ============================================================

export const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findById(id)
      .populate("booking", "bookingCode status")
      .populate("traveler", "name email")
      .populate("provider", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.status !== "paid" && payment.status !== "pending_refund") {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be refunded. Current status: ${payment.status}`,
      });
    }

    const refundAmount = amount || payment.amount;
    let refund;

    // ✅ Delegate to Stripe for processing
    if (payment.stripePaymentId) {
      try {
        refund = await stripe.refunds.create({
          payment_intent: payment.stripePaymentId,
          amount: Math.round(refundAmount * 100),
          reason: "requested_by_customer",
          metadata: {
            paymentId: payment._id.toString(),
            bookingId: payment.booking?._id?.toString() || "N/A",
            reason: reason || "Admin initiated refund",
          },
        });
      } catch (stripeError) {
        console.error("❌ Stripe refund error:", stripeError);
        return res.status(500).json({
          success: false,
          message: "Failed to process refund with payment gateway",
          error: stripeError.message,
        });
      }
    }

    // ✅ Update payment
    payment.status = "refunded";
    payment.refundAmount = refundAmount;
    payment.refundedAt = new Date();
    payment.refundId = refund?.id || "manual_refund";
    payment.refundReason = reason || "Admin initiated refund";
    await payment.save();

    // ✅ Update booking
    if (payment.booking) {
      await Booking.findByIdAndUpdate(payment.booking._id, {
        status: "cancelled",
        refundAmount: refundAmount,
        refundedAt: new Date(),
        refundId: refund?.id || "manual_refund",
      });
    }

    // ✅ Update earning
    const earning = await Earning.findOne({ payment: payment._id });
    if (earning) {
      earning.status = "refunded";
      await earning.save();
    }

    // ✅ Send notifications
    await Promise.all([
      createNotification({
        recipient: payment.traveler,
        sender: req.user._id,
        type: "refund_processed",
        title: "Refund Processed ✅",
        message: `Your refund of ${formatCurrency(refundAmount, payment.currency)} has been processed`,
        data: { paymentId: payment._id },
        link: `/payments/${payment._id}`,
      }),
      createNotification({
        recipient: payment.provider,
        sender: req.user._id,
        type: "refund_processed",
        title: "Refund Processed 💸",
        message: `A refund of ${formatCurrency(refundAmount, payment.currency)} has been processed for booking ${payment.booking?.bookingCode || "N/A"}`,
        data: { paymentId: payment._id },
        link: `/provider/payments/${payment._id}`,
      }),
    ]);

    res.json({
      success: true,
      message: "Refund processed successfully",
      payment,
      refund,
    });
  } catch (error) {
    console.error("❌ Process refund error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ EXPORT PAYMENTS CSV (Admin)
// ============================================================

export const exportPaymentsCSV = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (startDate) filter.paidAt = { $gte: new Date(startDate) };
    if (endDate) filter.paidAt = { ...filter.paidAt, $lte: new Date(endDate) };

    const payments = await Payment.find(filter)
      .populate("traveler", "name email")
      .populate("provider", "name email businessName")
      .populate("booking", "bookingCode")
      .lean();

    const csvData = payments.map((p) => ({
      "Transaction ID": p.transactionId || p.stripePaymentId || "N/A",
      "Booking Code": p.booking?.bookingCode || "N/A",
      Traveler: p.traveler?.name || "N/A",
      "Traveler Email": p.traveler?.email || "N/A",
      Provider: p.provider?.businessName || p.provider?.name || "N/A",
      "Listing Title": p.listing?.title || p.booking?.listing?.title || "N/A",
      Amount: p.amount,
      Currency: p.currency || "USD",
      "Service Fee": p.serviceFee || 0,
      "Platform Fee": p.platformFee || 0,
      "Net Amount": p.providerAmount || p.amount - (p.platformFee || 0),
      Status: p.status,
      "Payment Method": p.paymentMethod || "stripe",
      "Paid At": p.paidAt ? new Date(p.paidAt).toISOString() : "",
      "Refund Amount": p.refundAmount || 0,
      "Refund Reason": p.refundReason || "",
    }));

    const csv = exportToCSV(csvData);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payments-${new Date().toISOString().split("T")[0]}.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export payments CSV error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET PAYMENT ANALYTICS (Admin)
// ============================================================

export const getPaymentAnalytics = async (req, res) => {
  try {
    const { period = "monthly" } = req.query;

    const revenueData = await Payment.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: {
            year: { $year: "$paidAt" },
            month: { $month: "$paidAt" },
            day: { $dayOfMonth: "$paidAt" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const methodData = await Payment.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: "$paymentMethod",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const listingData = await Payment.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: "$listing",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "listings",
          localField: "_id",
          foreignField: "_id",
          as: "listing",
        },
      },
      { $unwind: "$listing" },
    ]);

    const refundStats = await Payment.aggregate([
      { $match: { status: "refunded" } },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: "$refundAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      analytics: {
        revenueData,
        methodData,
        listingData,
        refundStats: {
          totalRefunded: refundStats[0]?.totalRefunded || 0,
          count: refundStats[0]?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get payment analytics error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ STRIPE WEBHOOK
// ============================================================

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({
      success: false,
      message: "Webhook secret not configured"
    });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (error) {
    console.log("❌ Webhook Signature Error:", error.message);
    return res.status(400).json({
      success: false,
      message: `Webhook Error: ${error.message}`
    });
  }

  console.log(`📥 Webhook received: ${event.type}`);

  try {
    const result = await paymentService.handleWebhook('stripe', {
      body: req.body,
      headers: req.headers,
      rawBody: req.rawBody,
      event: event,
    });

    if (result.success) {
      res.json({ received: true, processed: true });
    } else {
      await handleWebhookLegacy(event);
      res.json({ received: true, processed: true });
    }
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    try {
      await handleWebhookLegacy(event);
      res.json({ received: true, processed: true });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: fallbackError.message
      });
    }
  }
};

// =========================
// ✅ LEGACY WEBHOOK HANDLERS
// =========================

const handleWebhookLegacy = async (event) => {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'checkout.session.expired':
      await handleCheckoutExpired(event.data.object);
      break;
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object);
      break;
    default:
      console.log(`ℹ️ Unhandled legacy event type: ${event.type}`);
  }
};

// =========================
// ✅ WEBHOOK HELPERS
// =========================

const handleCheckoutCompleted = async (session) => {
  const bookingId = session.metadata?.bookingId;
  
  console.log(`💰 Payment successful for session: ${session.id}`);
  console.log(`📦 Booking ID: ${bookingId}`);

  if (!bookingId) {
    console.error("❌ No bookingId in session metadata");
    return;
  }

  const booking = await Booking.findById(bookingId)
    .populate('listing', 'title');
    
  if (!booking) {
    console.error("❌ Booking not found:", bookingId);
    return;
  }

  let payment = await Payment.findOne({ booking: bookingId });
  
  if (!payment) {
    payment = await Payment.create({
      traveler: booking.user,
      booking: booking._id,
      provider: booking.provider,
      listing: booking.listing._id,
      amount: booking.totalPrice,
      currency: "USD",
      status: "paid",
      stripeSessionId: session.id,
      stripePaymentId: session.payment_intent,
      transactionId: session.payment_intent,
      paidAt: new Date(),
      paymentMethod: 'stripe',
      source: 'webhook',
      providerReference: session.id,
      platformFee: booking.totalPrice * 0.1,
      providerAmount: booking.totalPrice * 0.9,
      metadata: {
        bookingId: booking._id.toString(),
        entityType: 'listing',
        webhookProcessed: true,
        webhookProcessedAt: new Date().toISOString(),
      }
    });
  } else if (payment.status !== 'paid') {
    payment.status = 'paid';
    payment.stripeSessionId = session.id;
    payment.stripePaymentId = session.payment_intent;
    payment.transactionId = session.payment_intent;
    payment.paidAt = new Date();
    await payment.save();
  }

  await safelyUpdateBooking(bookingId, {
    paymentStatus: "paid",
    status: "confirmed",
    paymentId: session.payment_intent,
    paidAt: new Date()
  });

  const existingEarning = await Earning.findOne({ booking: bookingId });
  if (!existingEarning) {
    await Earning.create({
      provider: booking.provider,
      booking: booking._id,
      payment: payment._id,
      amount: booking.totalPrice * 0.9,
      platformFee: booking.totalPrice * 0.1,
      netAmount: booking.totalPrice * 0.9,
      bookingType: 'listing',
      status: "available",
      paymentId: session.payment_intent,
      paidAt: new Date()
    });
    console.log(`✅ Earning created for booking ${bookingId}`);
  }

  console.log(`✅ Payment processed successfully for booking: ${bookingId}`);
};

const handleCheckoutExpired = async (session) => {
  const bookingId = session.metadata?.bookingId;
  console.log(`⏰ Checkout expired for booking: ${bookingId}`);
  
  if (bookingId) {
    await safelyUpdateBooking(bookingId, {
      status: 'failed_payment',
      adminNotes: 'Payment session expired'
    });
  }
};

const handlePaymentIntentSucceeded = async (paymentIntent) => {
  console.log(`✅ Payment intent succeeded: ${paymentIntent.id}`);
};

const handlePaymentFailed = async (paymentIntent) => {
  console.log(`❌ Payment failed: ${paymentIntent.id}`);
  const bookingId = paymentIntent.metadata?.bookingId;
  
  if (bookingId) {
    await safelyUpdateBooking(bookingId, {
      status: 'failed_payment',
      adminNotes: paymentIntent.last_payment_error?.message || 'Payment failed'
    });
  }
};

const handleChargeRefunded = async (charge) => {
  console.log(`💸 Charge refunded: ${charge.id}`);
  const bookingId = charge.metadata?.bookingId;
  
  if (bookingId) {
    await safelyUpdateBooking(bookingId, {
      paymentStatus: 'refunded',
      status: 'cancelled',
      cancelledAt: new Date(),
      refundAmount: charge.amount_refunded / 100,
      refundedAt: new Date()
    });
    
    const payment = await Payment.findOne({ booking: bookingId });
    if (payment && payment.status === 'paid') {
      payment.status = 'refunded';
      payment.refundAmount = charge.amount_refunded / 100;
      payment.refundedAt = new Date();
      payment.refundId = charge.id;
      await payment.save();
    }
  }
};

// =========================
// ✅ SAFE BOOKING UPDATE
// =========================

const safelyUpdateBooking = async (bookingId, updateData) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      updateData,
      { 
        new: true,
        runValidators: false,
        context: 'query'
      }
    );
    return booking;
  } catch (error) {
    console.warn('⚠️ Could not update booking with validation:', error.message);
    const booking = await Booking.findById(bookingId);
    if (booking) {
      Object.assign(booking, updateData);
      booking.markModified('status');
      booking.markModified('paymentStatus');
      booking.markModified('paidAt');
      booking.markModified('displayCurrency');
      booking.markModified('displayTotal');
      await booking.save({ validateBeforeSave: false });
    }
    return booking;
  }
};

// =========================
// ✅ STATS HELPERS
// =========================

const calculateProviderStats = async (providerId) => {
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const filter = { provider: providerId, status: "paid" };

  const [allPayments, todayPayments, monthPayments, earnings] = await Promise.all([
    Payment.find(filter),
    Payment.find({ ...filter, paidAt: { $gte: startOfToday } }),
    Payment.find({ ...filter, paidAt: { $gte: startOfMonth } }),
    Earning.find({ provider: providerId }),
  ]);

  const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);
  const monthlyRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const platformFees = earnings.reduce((sum, e) => sum + (e.platformFee || 0), 0);
  const netEarnings = totalEarnings - platformFees;

  return {
    totalRevenue,
    todayRevenue,
    monthlyRevenue,
    pendingPayout: earnings.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amount, 0),
    completedPayments: allPayments.length,
    cancelledPayments: await Payment.countDocuments({ provider: providerId, status: "cancelled" }),
    refunds: await Payment.countDocuments({ provider: providerId, status: "refunded" }),
    totalEarnings,
    platformFees,
    netEarnings,
  };
};

const calculateAdminStats = async () => {
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [totalRevenue, todayRevenue, monthlyRevenue, pendingPayments, refunds, totalEarnings, platformFees] =
    await Promise.all([
      Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([
        { $match: { status: "paid", paidAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "paid", paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.countDocuments({ status: "pending" }),
      Payment.countDocuments({ status: "refunded" }),
      Earning.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Earning.aggregate([{ $group: { _id: null, total: { $sum: "$platformFee" } } }]),
    ]);

  return {
    totalRevenue: totalRevenue[0]?.total || 0,
    todayRevenue: todayRevenue[0]?.total || 0,
    monthlyRevenue: monthlyRevenue[0]?.total || 0,
    pendingPayments,
    refunds,
    totalEarnings: totalEarnings[0]?.total || 0,
    platformFees: platformFees[0]?.total || 0,
    netRevenue: (totalRevenue[0]?.total || 0) - (platformFees[0]?.total || 0),
  };
};

// ============================================================
// ✅ REMOVED FUNCTIONS (Now in other controllers)
// ============================================================
// ❌ getProviderEarnings → Moved to earningController
// ❌ getWalletBalance → Moved to walletController
// ❌ requestWithdrawal → Moved to walletController
// ❌ getWithdrawalHistory → Moved to walletController
// ❌ getTransactionHistory → Moved to walletController
// ❌ getCurrencies → Moved to currencyController
// ❌ getExchangeRate → Moved to currencyController
// ❌ getProviderSettlementCurrency → Moved to settlementController
// ❌ updateProviderSettlementCurrency → Moved to settlementController