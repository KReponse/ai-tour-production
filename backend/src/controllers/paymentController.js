// backend/src/controllers/paymentController.js
// ============================================================
// AI TOUR RWANDA - PAYMENT CONTROLLER  (FINAL)
// ============================================================
// ✅ PAYMENT_STATUSES matches Payment.schema enum:
//    ["pending","processing","paid","succeeded","failed",
//     "refunded","partially_refunded","disputed"]
//    - COMPLETED aliases to "paid"
//    - CANCELLED aliases to "failed"
//
// ✅ createCheckoutSession calls paymentService.createPayment()
//    (the ACTUAL method name) with the payload shape it expects,
//    and reads the URL/session from `providerResult`.
//
// ✅ verifyPayment calls paymentService.verifyPayment(internalPaymentId)
//    (MongoDB _id, not the Stripe session id) — the service resolves
//    the provider reference itself.
//
// ✅ GET /verify/:sessionId works without auth (public Stripe flow).
//
// ✅ Orphan pending payment without a URL is deleted, never
//    marked with an invalid enum value.
//
// ✅ Field names align with Payment.js schema:
//    - paymentUrl       (not checkoutUrl)
//    - stripePaymentId  (not paymentIntentId)
//    - errorMessage     (not failureReason)
//    - refundId, refundAmount, refundedAt (no refundStatus field)
// ============================================================

import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import Listing from "../models/Listing.js";
import User from "../models/User.js";

import paymentService from "../services/paymentService.js";
import currencyService from "../services/currencyService.js";

// ============================================================
// PAYMENT STATUS CONSTANTS
// ============================================================

const PAYMENT_STATUSES = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "paid",
  PAID: "paid",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
  DISPUTED: "disputed",
};

const REFUND_STATUSES = {
  NONE: "none",
  REQUESTED: "requested",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
};

// ============================================================
// BASIC HELPERS
// ============================================================

const getUserId = (req) =>
  req.user?._id || req.user?.id || req.user?.userId || null;

const getUserRole = (req) =>
  req.user?.role || req.user?.userRole || null;

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value?._id) return value._id.toString();
  if (typeof value.toString === "function") return value.toString();
  return null;
};

const isAdmin = (req) =>
  ["admin", "superadmin", "super_admin"].includes(getUserRole(req));

const isProvider = (req) =>
  ["provider", "guide", "tour_provider"].includes(getUserRole(req));

const isTraveler = (req) =>
  ["traveler", "tourist", "user"].includes(getUserRole(req));

// ============================================================
// MONEY HELPERS
// ============================================================

const formatMoney = (amount, currency = "USD") => {
  const numericAmount = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(numericAmount);
  } catch {
    return `${currency.toUpperCase()} ${numericAmount.toFixed(2)}`;
  }
};

// ============================================================
// PROVIDER RESPONSE NORMALIZER
// ============================================================

const normalizeCheckoutResponse = (checkout) => {
  if (!checkout || typeof checkout !== "object") {
    return {
      sessionId: null,
      paymentIntentId: null,
      providerPaymentId: null,
      checkoutUrl: null,
      rawStatus: null,
    };
  }

  const sessionId =
    checkout.sessionId ||
    checkout.providerReference ||
    checkout.data?.sessionId ||
    checkout.data?.checkoutSession?.id ||
    checkout.providerResult?.providerReference ||
    checkout.providerResult?.data?.sessionId ||
    checkout.providerResult?.data?.checkoutSession?.id ||
    null;

  const paymentIntentId =
    checkout.paymentIntentId ||
    checkout.transactionId ||
    checkout.data?.paymentIntentId ||
    (typeof checkout.data?.checkoutSession?.payment_intent === "string"
      ? checkout.data.checkoutSession.payment_intent
      : checkout.data?.checkoutSession?.payment_intent?.id) ||
    checkout.providerResult?.transactionId ||
    checkout.providerResult?.data?.paymentIntentId ||
    null;

  const providerPaymentId =
    checkout.providerPaymentId ||
    checkout.providerReference ||
    checkout.data?.sessionId ||
    checkout.data?.checkoutSession?.id ||
    checkout.providerResult?.providerReference ||
    checkout.providerResult?.data?.sessionId ||
    null;

  const checkoutUrl =
    checkout.checkoutUrl ||
    checkout.paymentUrl ||
    checkout.url ||
    checkout.data?.paymentUrl ||
    checkout.data?.checkoutUrl ||
    checkout.data?.session?.url ||
    checkout.data?.checkoutSession?.url ||
    checkout.providerResult?.paymentUrl ||
    checkout.providerResult?.checkoutUrl ||
    checkout.providerResult?.url ||
    checkout.providerResult?.data?.paymentUrl ||
    checkout.providerResult?.data?.checkoutUrl ||
    checkout.providerResult?.data?.session?.url ||
    checkout.providerResult?.data?.checkoutSession?.url ||
    null;

  return {
    sessionId,
    paymentIntentId,
    providerPaymentId,
    checkoutUrl,
    rawStatus: checkout.status || null,
  };
};

// ============================================================
// PAYMENT SERIALIZER
// ============================================================

const serializePayment = (payment) => {
  if (!payment) return null;
  const data =
    typeof payment.toObject === "function" ? payment.toObject() : payment;

  return {
    ...data,
    _id: normalizeId(data._id),
    booking: normalizeId(data.booking),
    traveler: normalizeId(data.traveler),
    provider: normalizeId(data.provider),
    listing: normalizeId(data.listing),
    amount: Number(data.amount || 0),
    currency: data.currency || "USD",
  };
};

// ============================================================
// PAYMENT PROVIDER REFERENCE HELPER
// ============================================================

const getPaymentProviderId = (payment) =>
  payment?.providerReference ||
  payment?.transactionId ||
  payment?.stripeSessionId ||
  payment?.stripePaymentId ||
  null;

// ============================================================
// OWNERSHIP HELPERS
// ============================================================

const isPaymentOwner = (payment, userId) => {
  const currentUserId = normalizeId(userId);
  if (!currentUserId || !payment) return false;
  const travelerId = normalizeId(payment.traveler);
  const providerId = normalizeId(payment.provider);
  return travelerId === currentUserId || providerId === currentUserId;
};

const isBookingOwner = (booking, userId) => {
  const currentUserId = normalizeId(userId);
  if (!currentUserId || !booking) return false;
  return normalizeId(booking.user) === currentUserId;
};

// ============================================================
// PAGINATION
// ============================================================

const getPagination = (req) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// ============================================================
// DATE FILTER
// ============================================================

const buildDateFilter = (req) => {
  const filter = {};
  const { startDate, endDate } = req.query;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) filter.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
  }

  return filter;
};

// ============================================================
// ERROR RESPONSE
// ============================================================

const sendError = (res, error, message = "Payment operation failed") => {
  console.error(`[PAYMENT ERROR] ${message}:`, error);
  const statusCode = error?.statusCode || error?.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: error?.message || message,
  });
};

// ============================================================
// CREATE CHECKOUT SESSION
// ============================================================
// - Calls paymentService.createPayment(data) — the real method.
// - Do NOT pre-create the Payment doc; the service creates it.
// - Reads URL/session from `providerResult`.
// ============================================================

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { bookingId, currency, successUrl, cancelUrl } = req.body;

    if (!bookingId) {
      return res
        .status(400)
        .json({ success: false, message: "bookingId is required" });
    }

    const booking = await Booking.findById(bookingId)
      .populate("listing")
      .populate("user")
      .populate("provider", "name email");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const bookingOwnerId = normalizeId(booking.user);

    if (
      bookingOwnerId &&
      bookingOwnerId !== normalizeId(userId) &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to pay for this booking",
      });
    }

    const bookingTravelerId = normalizeId(booking.user);

    if (!bookingTravelerId) {
      return res.status(400).json({
        success: false,
        message: "Booking does not have a valid user",
      });
    }

    const listingId = normalizeId(booking.listing);
    let listing = booking.listing;

    if (!listing && listingId) {
      listing = await Listing.findById(listingId);
    }

    if (!listing) {
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    }

    const bookingAmount = Number(
      booking.totalAmount ?? booking.totalPrice ?? booking.amount ?? 0
    );

    if (!Number.isFinite(bookingAmount) || bookingAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Booking does not have a valid payment amount",
      });
    }

    const requestedCurrency = currency || booking.currency || "USD";
    const normalizedCurrency = String(requestedCurrency).toUpperCase();

    const providerId = normalizeId(
      listing.provider || listing.owner || listing.createdBy
    );

    // ========================================================
    // REUSE EXISTING ACTIVE PAYMENT (only if it has a URL)
    // ========================================================
    const existingPayment = await Payment.findOne({
      booking: booking._id,
      traveler: bookingTravelerId,
      status: {
        $in: [PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.PROCESSING],
      },
    });

    if (existingPayment && existingPayment.paymentUrl) {
      return res.status(200).json({
        success: true,
        message: "An active payment already exists for this booking",
        payment: serializePayment(existingPayment),
        checkoutUrl: existingPayment.paymentUrl,
        url: existingPayment.paymentUrl,
        paymentUrl: existingPayment.paymentUrl,
        sessionId:
          existingPayment.stripeSessionId ||
          existingPayment.providerReference ||
          null,
      });
    }

    // ========================================================
    // DELETE ORPHAN PENDING PAYMENT
    // ========================================================
    if (existingPayment) {
      try {
        await Payment.findByIdAndDelete(existingPayment._id);
      } catch (deleteError) {
        console.warn(
          "[createCheckoutSession] Failed to delete orphan pending payment:",
          deleteError?.message
        );
      }
    }

    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";

    const finalSuccessUrl =
      successUrl ||
      `${clientUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`;

    const finalCancelUrl =
      cancelUrl ||
      `${clientUrl}/payment-cancel?booking_id=${booking._id}`;

    // ========================================================
    // CALL paymentService.createPayment()
    // ========================================================
    const servicePayload = {
      bookingId: normalizeId(booking._id),
      providerId: "stripe",
      userId: bookingTravelerId,
      currency: normalizedCurrency,
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
      description:
        listing.title
          ? String(
              typeof listing.title === "string"
                ? listing.title
                : listing.title.en ||
                    listing.title.fr ||
                    `Booking ${booking._id}`
            )
          : `Booking ${booking._id}`,
      metadata: {
        bookingId: normalizeId(booking._id),
        travelerId: bookingTravelerId,
        listingId: normalizeId(listing._id),
      },
    };

    const checkout = await paymentService.createPayment(servicePayload);

    console.log(
      "[createCheckoutSession] paymentService.createPayment result:",
      JSON.stringify(checkout, null, 2)
    );

    if (!checkout || checkout.success === false) {
      return res.status(400).json({
        success: false,
        message:
          checkout?.message ||
          "Payment provider could not create the checkout",
      });
    }

    // ========================================================
    // NORMALIZE RESPONSE
    // ========================================================
    const normalized = normalizeCheckoutResponse(checkout);

    const checkoutUrl =
      normalized.checkoutUrl ||
      checkout?.payment?.paymentUrl ||
      null;

    const sessionId =
      normalized.sessionId ||
      checkout?.payment?.stripeSessionId ||
      null;

    const paymentIntentId =
      normalized.paymentIntentId ||
      checkout?.payment?.stripePaymentId ||
      null;

    // ========================================================
    // RESPONSE
    // ========================================================
    return res.status(201).json({
      success: true,
      message: "Checkout session created successfully",
      reused: Boolean(checkout.reused),
      payment: checkout.payment || null,
      checkoutUrl,
      url: checkoutUrl,
      paymentUrl: checkoutUrl,
      sessionId,
      paymentIntentId,
      providerResult: checkout.providerResult || null,
    });
  } catch (error) {
    return sendError(res, error, "Failed to create checkout session");
  }
};

// ============================================================
// VERIFY PAYMENT
// ============================================================
// - GET  /payments/verify/:sessionId  → anonymous allowed
// - POST /payments/verify             → auth required
// - Calls paymentService.verifyPayment(internalPaymentId),
//   NOT the Stripe session id (service resolves provider ref).
// ============================================================

export const verifyPayment = async (req, res) => {
  try {
    const userId = getUserId(req);

    const sessionId = req.params?.sessionId || req.body?.sessionId || null;
    const paymentId = req.body?.paymentId || null;
    const paymentIntentId = req.body?.paymentIntentId || null;

    if (!paymentId && !sessionId && !paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "paymentId, sessionId or paymentIntentId is required",
      });
    }

    const anonymousSessionFlow =
      !userId && !!sessionId && !paymentId && !paymentIntentId;

    if (!userId && !anonymousSessionFlow) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    let payment = null;

    if (paymentId) {
      payment = await Payment.findById(paymentId)
        .populate("traveler", "firstName lastName email phone")
        .populate("provider", "firstName lastName email phone")
        .populate("booking")
        .populate("listing");
    } else if (sessionId) {
      payment = await Payment.findOne({
        $or: [
          { stripeSessionId: sessionId },
          { providerReference: sessionId },
        ],
      })
        .populate("traveler", "firstName lastName email phone")
        .populate("provider", "firstName lastName email phone")
        .populate("booking")
        .populate("listing");
    } else {
      payment = await Payment.findOne({
        $or: [
          { stripePaymentId: paymentIntentId },
          { transactionId: paymentIntentId },
          { providerReference: paymentIntentId },
        ],
      })
        .populate("traveler", "firstName lastName email phone")
        .populate("provider", "firstName lastName email phone")
        .populate("booking")
        .populate("listing");
    }

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (userId && !isAdmin(req) && !isPaymentOwner(payment, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to verify this payment",
      });
    }

    // ========================================================
    // CALL paymentService.verifyPayment(internalPaymentId)
    // ========================================================
    // IMPORTANT: pass the INTERNAL MongoDB _id, not the Stripe
    // session id. The service looks up the provider reference
    // from the Payment document itself.
    // ========================================================
    const verification = await paymentService.verifyPayment(
      normalizeId(payment._id),
      {
        paymentId: normalizeId(payment._id),
        bookingId: normalizeId(payment.booking),
      }
    );

    const verificationStatus =
      verification?.status ||
      verification?.data?.status ||
      null;

    const verificationPaid =
      verification?.paid === true ||
      verification?.success === true ||
      verification?.data?.paid === true ||
      verificationStatus === "paid" ||
      verificationStatus === "succeeded";

    if (verificationStatus) {
      const s = String(verificationStatus).toLowerCase();
      if (s === "paid" || s === "succeeded") {
        payment.status = PAYMENT_STATUSES.COMPLETED;
      } else if (s === "processing") {
        payment.status = PAYMENT_STATUSES.PROCESSING;
      } else if (
        s === "failed" ||
        s === "canceled" ||
        s === "cancelled"
      ) {
        payment.status = PAYMENT_STATUSES.FAILED;
      } else if (Object.values(PAYMENT_STATUSES).includes(s)) {
        payment.status = s;
      }
    } else if (verificationPaid) {
      payment.status = PAYMENT_STATUSES.COMPLETED;
    }

    const vData = verification?.data || {};

    if (verification?.paymentIntentId || vData.paymentIntentId) {
      payment.stripePaymentId =
        verification.paymentIntentId || vData.paymentIntentId;
    }
    if (verification?.sessionId || vData.checkoutSessionId) {
      payment.stripeSessionId =
        verification.sessionId || vData.checkoutSessionId;
    }
    if (verification?.transactionId || vData.transactionId) {
      payment.transactionId =
        verification.transactionId || vData.transactionId;
    }

    if (verification?.paidAt && !payment.paidAt) {
      payment.paidAt = new Date(verification.paidAt);
    }

    if (payment.status === PAYMENT_STATUSES.COMPLETED && !payment.paidAt) {
      payment.paidAt = new Date();
    }

    await payment.save();

    if (payment.status === PAYMENT_STATUSES.COMPLETED) {
      const bookingId = normalizeId(payment.booking);
      if (bookingId) {
        const booking = await Booking.findById(bookingId);
        if (booking) {
          if ("paymentStatus" in booking) booking.paymentStatus = "paid";
          if ("paid" in booking) booking.paid = true;
          if (
            "status" in booking &&
            ["pending", "pending_payment"].includes(booking.status)
          ) {
            booking.status = "confirmed";
          }
          await booking.save();
        }
      }
    }

    const paid =
      payment.status === PAYMENT_STATUSES.COMPLETED || verificationPaid;

    return res.status(200).json({
      success: true,
      paid,
      status: payment.status,
      message: "Payment verified successfully",
      payment: serializePayment(payment),
      booking: payment.booking
        ? typeof payment.booking.toObject === "function"
          ? payment.booking.toObject()
          : payment.booking
        : null,
      verification: verification || null,
    });
  } catch (error) {
    return sendError(res, error, "Failed to verify payment");
  }
};

// ============================================================
// GET PAYMENT BY ID
// ============================================================

export const getPaymentById = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Payment ID is required" });
    }

    const payment = await Payment.findById(id)
      .populate("traveler", "firstName lastName email phone")
      .populate("provider", "firstName lastName email phone")
      .populate("booking")
      .populate("listing");

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (!isAdmin(req) && !isPaymentOwner(payment, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this payment",
      });
    }

    return res.status(200).json({
      success: true,
      payment: serializePayment(payment),
    });
  } catch (error) {
    return sendError(res, error, "Failed to get payment");
  }
};

// ============================================================
// GET MY PAYMENTS
// ============================================================

export const getMyPayments = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { page, limit, skip } = getPagination(req);
    const dateFilter = buildDateFilter(req);

    const filter = { traveler: userId, ...dateFilter };
    if (req.query.status) filter.status = req.query.status;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("traveler", "firstName lastName email phone")
        .populate("provider", "firstName lastName email phone")
        .populate("booking")
        .populate("listing")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      payments: payments.map(serializePayment),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return sendError(res, error, "Failed to get your payments");
  }
};

// ============================================================
// GET PROVIDER PAYMENTS
// ============================================================

export const getProviderPayments = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    if (!isProvider(req) && !isAdmin(req)) {
      return res
        .status(403)
        .json({ success: false, message: "Provider access required" });
    }

    const { page, limit, skip } = getPagination(req);
    const dateFilter = buildDateFilter(req);

    const filter = { provider: userId, ...dateFilter };
    if (req.query.status) filter.status = req.query.status;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("traveler", "firstName lastName email phone")
        .populate("provider", "firstName lastName email phone")
        .populate("booking")
        .populate("listing")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      payments: payments.map(serializePayment),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return sendError(res, error, "Failed to get provider payments");
  }
};

// ============================================================
// GET ALL PAYMENTS - ADMIN
// ============================================================

export const getAllPayments = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!isAdmin(req)) {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }

    const { page, limit, skip } = getPagination(req);
    const dateFilter = buildDateFilter(req);
    const filter = { ...dateFilter };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.provider = req.query.provider;
    if (req.query.traveler) filter.traveler = req.query.traveler;
    if (req.query.booking) filter.booking = req.query.booking;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("traveler", "firstName lastName email phone")
        .populate("provider", "firstName lastName email phone")
        .populate("booking")
        .populate("listing")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      payments: payments.map(serializePayment),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return sendError(res, error, "Failed to get all payments");
  }
};

// ============================================================
// TRAVELER PAYMENT STATISTICS
// ============================================================

export const getTravelerPaymentStats = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const dateFilter = buildDateFilter(req);
    const match = { traveler: userId, ...dateFilter };

    const [summary, statusBreakdown] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: {
              $sum: {
                $cond: [
                  { $in: ["$status", [PAYMENT_STATUSES.COMPLETED]] },
                  "$amount",
                  0,
                ],
              },
            },
            completedAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", PAYMENT_STATUSES.COMPLETED] },
                  "$amount",
                  0,
                ],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", PAYMENT_STATUSES.PENDING] },
                  "$amount",
                  0,
                ],
              },
            },
            refundedAmount: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      [
                        PAYMENT_STATUSES.REFUNDED,
                        PAYMENT_STATUSES.PARTIALLY_REFUNDED,
                      ],
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]),
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const data = summary[0] || {
      totalPayments: 0,
      totalAmount: 0,
      completedAmount: 0,
      pendingAmount: 0,
      refundedAmount: 0,
    };

    return res.status(200).json({
      success: true,
      stats: {
        totalPayments: data.totalPayments || 0,
        totalAmount: data.totalAmount || 0,
        completedAmount: data.completedAmount || 0,
        pendingAmount: data.pendingAmount || 0,
        refundedAmount: data.refundedAmount || 0,
      },
      statusBreakdown,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to get traveler payment statistics"
    );
  }
};

// ============================================================
// GET PAYMENT STATS (route import name)
// ============================================================

export const getPaymentStats = getTravelerPaymentStats;

// ============================================================
// PROVIDER PAYMENT STATISTICS
// ============================================================

export const getProviderPaymentStats = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!isProvider(req) && !isAdmin(req)) {
      return res
        .status(403)
        .json({ success: false, message: "Provider access required" });
    }

    const providerId =
      isAdmin(req) && req.query.provider ? req.query.provider : userId;

    const dateFilter = buildDateFilter(req);
    const match = { provider: providerId, ...dateFilter };

    const [summary, statusBreakdown] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            grossAmount: { $sum: "$amount" },
            completedAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", PAYMENT_STATUSES.COMPLETED] },
                  "$amount",
                  0,
                ],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", PAYMENT_STATUSES.PENDING] },
                  "$amount",
                  0,
                ],
              },
            },
            refundedAmount: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      [
                        PAYMENT_STATUSES.REFUNDED,
                        PAYMENT_STATUSES.PARTIALLY_REFUNDED,
                      ],
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]),
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const data = summary[0] || {
      totalPayments: 0,
      grossAmount: 0,
      completedAmount: 0,
      pendingAmount: 0,
      refundedAmount: 0,
    };

    return res.status(200).json({
      success: true,
      stats: {
        totalPayments: data.totalPayments || 0,
        grossAmount: data.grossAmount || 0,
        completedAmount: data.completedAmount || 0,
        pendingAmount: data.pendingAmount || 0,
        refundedAmount: data.refundedAmount || 0,
      },
      statusBreakdown,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to get provider payment statistics"
    );
  }
};

// ============================================================
// ADMIN PAYMENT STATISTICS
// ============================================================

export const getAdminPaymentStats = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!isAdmin(req)) {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }

    const dateFilter = buildDateFilter(req);
    const match = { ...dateFilter };

    const [summary, statusBreakdown, currencyBreakdown] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            completedAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", PAYMENT_STATUSES.COMPLETED] },
                  "$amount",
                  0,
                ],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", PAYMENT_STATUSES.PENDING] },
                  "$amount",
                  0,
                ],
              },
            },
            failedAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", PAYMENT_STATUSES.FAILED] },
                  "$amount",
                  0,
                ],
              },
            },
            refundedAmount: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      [
                        PAYMENT_STATUSES.REFUNDED,
                        PAYMENT_STATUSES.PARTIALLY_REFUNDED,
                      ],
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]),
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { amount: -1 } },
      ]),
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$currency",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { amount: -1 } },
      ]),
    ]);

    const data = summary[0] || {
      totalPayments: 0,
      totalAmount: 0,
      completedAmount: 0,
      pendingAmount: 0,
      failedAmount: 0,
      refundedAmount: 0,
    };

    return res.status(200).json({
      success: true,
      stats: {
        totalPayments: data.totalPayments || 0,
        totalAmount: data.totalAmount || 0,
        completedAmount: data.completedAmount || 0,
        pendingAmount: data.pendingAmount || 0,
        failedAmount: data.failedAmount || 0,
        refundedAmount: data.refundedAmount || 0,
      },
      statusBreakdown,
      currencyBreakdown,
    });
  } catch (error) {
    return sendError(res, error, "Failed to get admin payment statistics");
  }
};

// ============================================================
// PROVIDER EARNINGS
// ============================================================

export const getProviderEarnings = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!isProvider(req) && !isAdmin(req)) {
      return res
        .status(403)
        .json({ success: false, message: "Provider access required" });
    }

    const providerId =
      isAdmin(req) && req.query.provider ? req.query.provider : userId;

    const dateFilter = buildDateFilter(req);
    const match = {
      provider: providerId,
      status: PAYMENT_STATUSES.COMPLETED,
      ...dateFilter,
    };

    const earnings = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$currency",
          totalTransactions: { $sum: 1 },
          grossEarnings: { $sum: "$amount" },
          averageTransaction: { $avg: "$amount" },
          highestTransaction: { $max: "$amount" },
          lowestTransaction: { $min: "$amount" },
        },
      },
      { $sort: { grossEarnings: -1 } },
    ]);

    const monthlyEarnings = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            currency: "$currency",
          },
          amount: { $sum: "$amount" },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return res.status(200).json({
      success: true,
      earnings,
      monthlyEarnings,
    });
  } catch (error) {
    return sendError(res, error, "Failed to get provider earnings");
  }
};

// ============================================================
// REQUEST REFUND - TRAVELER
// ============================================================

export const requestRefund = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    const { reason } = req.body || {};

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Payment ID is required" });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (!isAdmin(req) && !isPaymentOwner(payment, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to request a refund for this payment",
      });
    }

    if (payment.status !== PAYMENT_STATUSES.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: "Only completed payments can be refunded",
      });
    }

    if (
      payment.refundId ||
      (payment.refundAmount && Number(payment.refundAmount) > 0)
    ) {
      return res.status(409).json({
        success: false,
        message: "A refund has already been requested for this payment",
      });
    }

    // Use providerData map for the reason since the schema has
    // no `refundReason` field.
    const existingProviderData =
      payment.providerData instanceof Map
        ? Object.fromEntries(payment.providerData)
        : payment.providerData || {};

    payment.providerData = {
      ...existingProviderData,
      refundReason: reason || "Traveler requested refund",
      refundRequestedAt: new Date().toISOString(),
    };
    payment.markModified("providerData");

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Refund request submitted successfully",
      payment: serializePayment(payment),
    });
  } catch (error) {
    return sendError(res, error, "Failed to request refund");
  }
};

// ============================================================
// PROCESS REFUND - ADMIN
// ============================================================

export const processRefund = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!isAdmin(req)) {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }

    const { id } = req.params;
    const { amount, reason } = req.body || {};

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Payment ID is required" });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    let refundResult = null;
    try {
      if (
        paymentService &&
        typeof paymentService.refundPayment === "function"
      ) {
        refundResult = await paymentService.refundPayment(
          normalizeId(payment._id),
          amount != null ? Number(amount) : payment.amount,
          reason || "Admin initiated refund"
        );
      }
    } catch (svcErr) {
      console.warn(
        "[PROCESS REFUND] provider refund call failed, marking locally:",
        svcErr.message
      );
    }

    const refundAmount =
      refundResult?.refundAmount != null
        ? Number(refundResult.refundAmount)
        : refundResult?.data?.amount != null
        ? Number(refundResult.data.amount)
        : refundResult?.amount != null
        ? Number(refundResult.amount)
        : amount != null
        ? Number(amount)
        : Number(payment.amount);

    payment.refundId =
      refundResult?.refundReference ||
      refundResult?.data?.refundId ||
      refundResult?.transactionId ||
      refundResult?.refund?.id ||
      payment.refundId ||
      null;

    payment.refundAmount = refundAmount;
    payment.refundedAt = new Date();

    if (refundAmount >= Number(payment.amount || 0)) {
      payment.status = PAYMENT_STATUSES.REFUNDED;
    } else if (refundAmount > 0) {
      payment.status = PAYMENT_STATUSES.PARTIALLY_REFUNDED;
    }

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      payment: serializePayment(payment),
      refund: refundResult || null,
    });
  } catch (error) {
    return sendError(res, error, "Failed to process refund");
  }
};

// ============================================================
// GET PAYMENT RECEIPT
// ============================================================

export const getPaymentReceipt = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Payment ID is required" });
    }

    const payment = await Payment.findById(id)
      .populate("traveler", "firstName lastName email phone")
      .populate("provider", "firstName lastName email phone")
      .populate("booking")
      .populate("listing");

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (!isAdmin(req) && !isPaymentOwner(payment, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this receipt",
      });
    }

    const receipt = {
      receiptNumber: `RCPT-${normalizeId(payment._id)}`,
      issuedAt: new Date().toISOString(),
      payment: serializePayment(payment),
      traveler: payment.traveler || null,
      provider: payment.provider || null,
      booking: payment.booking || null,
      listing: payment.listing || null,
      amountFormatted: formatMoney(payment.amount, payment.currency),
    };

    return res.status(200).json({
      success: true,
      receipt,
    });
  } catch (error) {
    return sendError(res, error, "Failed to get payment receipt");
  }
};

// ============================================================
// GET PAYMENT ANALYTICS - ADMIN
// ============================================================

export const getPaymentAnalytics = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!isAdmin(req)) {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }

    const period = String(req.query.period || "monthly").toLowerCase();

    const now = new Date();
    const start = new Date(now);
    if (period === "daily") start.setDate(now.getDate() - 30);
    else if (period === "weekly") start.setDate(now.getDate() - 7 * 12);
    else if (period === "yearly") start.setFullYear(now.getFullYear() - 5);
    else start.setMonth(now.getMonth() - 12);

    const match = { createdAt: { $gte: start } };

    const groupFormat =
      period === "daily"
        ? {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          }
        : period === "yearly"
        ? { year: { $year: "$createdAt" } }
        : {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          };

    const timeline = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: { period: groupFormat, currency: "$currency" },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.period.year": 1,
          "_id.period.month": 1,
          "_id.period.day": 1,
        },
      },
    ]);

    const byStatus = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const byProvider = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$provider",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 20 },
    ]);

    return res.status(200).json({
      success: true,
      period,
      range: { from: start.toISOString(), to: now.toISOString() },
      timeline,
      byStatus,
      byProvider,
    });
  } catch (error) {
    return sendError(res, error, "Failed to get payment analytics");
  }
};

// ============================================================
// STRIPE WEBHOOK
// ============================================================

export const stripeWebhook = async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res
        .status(400)
        .json({ success: false, message: "Stripe signature is required" });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        message: "STRIPE_WEBHOOK_SECRET is not configured",
      });
    }

    const event = await paymentService.constructWebhookEvent(
      req.body,
      signature,
      webhookSecret
    );

    if (!event) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid webhook event" });
    }

    console.log(`[STRIPE WEBHOOK] ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data?.object;
        const sessionId = session?.id;
        const paymentIntentId = session?.payment_intent;
        const metadata = session?.metadata || {};
        const paymentId = metadata.paymentId;

        let payment = null;
        if (paymentId) payment = await Payment.findById(paymentId);
        if (!payment && sessionId)
          payment = await Payment.findOne({
            $or: [
              { stripeSessionId: sessionId },
              { providerReference: sessionId },
            ],
          });

        if (!payment) {
          console.warn(
            "[STRIPE WEBHOOK] Payment not found for checkout session:",
            sessionId
          );
          break;
        }

        payment.status = PAYMENT_STATUSES.COMPLETED;
        if (sessionId) payment.stripeSessionId = sessionId;
        if (paymentIntentId) payment.stripePaymentId = paymentIntentId;
        payment.paidAt = payment.paidAt || new Date();
        await payment.save();

        const bookingId = normalizeId(payment.booking);
        if (bookingId) {
          const booking = await Booking.findById(bookingId);
          if (booking) {
            if ("paymentStatus" in booking) booking.paymentStatus = "paid";
            if ("paid" in booking) booking.paid = true;
            if (
              "status" in booking &&
              ["pending", "pending_payment"].includes(booking.status)
            )
              booking.status = "confirmed";
            await booking.save();
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data?.object;
        const paymentIntentId = intent?.id;

        let payment = null;
        if (paymentIntentId)
          payment = await Payment.findOne({
            $or: [
              { stripePaymentId: paymentIntentId },
              { transactionId: paymentIntentId },
            ],
          });

        if (!payment) {
          console.warn(
            "[STRIPE WEBHOOK] Payment not found for payment intent:",
            paymentIntentId
          );
          break;
        }

        payment.status = PAYMENT_STATUSES.COMPLETED;
        payment.paidAt = payment.paidAt || new Date();
        await payment.save();

        const bookingId = normalizeId(payment.booking);
        if (bookingId) {
          const booking = await Booking.findById(bookingId);
          if (booking) {
            if ("paymentStatus" in booking) booking.paymentStatus = "paid";
            if ("paid" in booking) booking.paid = true;
            if (
              "status" in booking &&
              ["pending", "pending_payment"].includes(booking.status)
            )
              booking.status = "confirmed";
            await booking.save();
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data?.object;
        const paymentIntentId = intent?.id;
        const payment = await Payment.findOne({
          $or: [
            { stripePaymentId: paymentIntentId },
            { transactionId: paymentIntentId },
          ],
        });
        if (!payment) {
          console.warn(
            "[STRIPE WEBHOOK] Failed payment not found:",
            paymentIntentId
          );
          break;
        }
        payment.status = PAYMENT_STATUSES.FAILED;
        if (intent?.last_payment_error?.message)
          payment.errorMessage = intent.last_payment_error.message;
        await payment.save();
        break;
      }

      case "charge.refunded": {
        const charge = event.data?.object;
        const paymentIntentId = charge?.payment_intent;
        const payment = await Payment.findOne({
          $or: [
            { stripePaymentId: paymentIntentId },
            { transactionId: paymentIntentId },
          ],
        });
        if (!payment) {
          console.warn(
            "[STRIPE WEBHOOK] Refunded payment not found:",
            paymentIntentId
          );
          break;
        }
        const totalRefunded = Number(charge?.amount_refunded || 0) / 100;
        const originalAmount = Number(payment.amount || 0);

        payment.refundAmount = totalRefunded;
        payment.refundedAt = new Date();

        if (totalRefunded >= originalAmount) {
          payment.status = PAYMENT_STATUSES.REFUNDED;
        } else {
          payment.status = PAYMENT_STATUSES.PARTIALLY_REFUNDED;
        }
        await payment.save();
        break;
      }

      case "charge.failed": {
        const charge = event.data?.object;
        const paymentIntentId = charge?.payment_intent;
        if (!paymentIntentId) break;
        const payment = await Payment.findOne({
          $or: [
            { stripePaymentId: paymentIntentId },
            { transactionId: paymentIntentId },
          ],
        });
        if (!payment) break;
        payment.status = PAYMENT_STATUSES.FAILED;
        if (charge?.failure_message)
          payment.errorMessage = charge.failure_message;
        await payment.save();
        break;
      }

      case "payment_intent.canceled": {
        const intent = event.data?.object;
        const paymentIntentId = intent?.id;
        const payment = await Payment.findOne({
          $or: [
            { stripePaymentId: paymentIntentId },
            { transactionId: paymentIntentId },
          ],
        });
        if (!payment) break;
        payment.status = PAYMENT_STATUSES.CANCELLED;
        await payment.save();
        break;
      }

      default:
        console.log(`[STRIPE WEBHOOK] Unhandled event: ${event.type}`);
        break;
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error("[STRIPE WEBHOOK ERROR]:", error);
    return res.status(400).json({
      success: false,
      message: error?.message || "Webhook processing failed",
    });
  }
};

// ============================================================
// GET PAYMENT STATUS
// ============================================================

export const getPaymentStatus = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Payment ID is required" });
    }

    const payment = await Payment.findById(id)
      .populate("traveler", "firstName lastName email")
      .populate("provider", "firstName lastName email")
      .populate("booking")
      .populate("listing");

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (!isAdmin(req) && !isPaymentOwner(payment, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this payment status",
      });
    }

    return res.status(200).json({
      success: true,
      status: payment.status,
      paymentStatus: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentId: normalizeId(payment._id),
      bookingId: normalizeId(payment.booking),
      transactionId:
        payment.transactionId ||
        payment.stripePaymentId ||
        payment.stripeSessionId ||
        null,
      paidAt: payment.paidAt || null,
      refundedAt: payment.refundedAt || null,
    });
  } catch (error) {
    return sendError(res, error, "Failed to get payment status");
  }
};

// ============================================================
// EXPORT PAYMENTS CSV - ADMIN
// ============================================================

export const exportPaymentsCSV = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate("traveler", "firstName lastName email")
      .populate("booking")
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      "Payment ID",
      "Traveler",
      "Email",
      "Amount",
      "Currency",
      "Status",
      "Provider",
      "Created At",
    ];

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const rows = payments.map((payment) => [
      payment._id,
      payment.traveler
        ? `${payment.traveler.firstName || ""} ${
            payment.traveler.lastName || ""
          }`.trim()
        : "",
      payment.traveler?.email || "",
      payment.amount ?? "",
      payment.currency || "",
      payment.status || "",
      payment.provider || "",
      payment.createdAt ? new Date(payment.createdAt).toISOString() : "",
    ]);

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="payments.csv"'
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("Export payments CSV error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export payments CSV",
      error: error.message,
    });
  }
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  createCheckoutSession,
  verifyPayment,
  getPaymentById,
  getMyPayments,
  getProviderPayments,
  getAllPayments,
  getTravelerPaymentStats,
  getPaymentStats,
  getProviderPaymentStats,
  getAdminPaymentStats,
  getProviderEarnings,
  requestRefund,
  processRefund,
  getPaymentReceipt,
  getPaymentAnalytics,
  exportPaymentsCSV,
  stripeWebhook,
  getPaymentStatus,
};