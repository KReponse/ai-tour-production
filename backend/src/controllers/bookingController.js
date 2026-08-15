// backend/src/controllers/bookingController.js
// ============================================================
// AI TOUR - BOOKING CONTROLLER
// ============================================================
// PRODUCTION FIX
// - Authentication is required for booking creation
// - Email verification is NOT required to create a booking
// - Provider/admin permissions remain protected
// - Provider ownership is checked before booking actions
// - Booking status transitions are validated
// - Pagination, search, filters and sorting supported
// - Listing media fields are populated
// - Notifications are protected from breaking booking operations
// - ✅ FIXED: Date normalization for same-day bookings
// ============================================================

import Booking from "../models/Booking.js";
import Listing from "../models/Listing.js";
import { createNotification } from "../utils/notificationService.js";


// ============================================================
// HELPERS
// ============================================================

const getEntity = async (listingId) => {
  if (!listingId) return null;

  const listing = await Listing.findById(listingId);

  if (!listing) return null;

  return {
    entity: listing,
    type: "listing",
    id: listing._id,
    providerId: listing.provider,
    price: listing.price,
    title: listing.title,
  };
};


// ============================================================
// BOOKING STATUS TRANSITIONS
// ============================================================

const validateBookingStatusTransition = (currentStatus, newStatus) => {
  const transitions = {
    draft: [
      "pending_payment",
      "cancelled",
    ],

    pending_payment: [
      "paid",
      "cancelled",
      "failed_payment",
      "rejected",
    ],

    paid: [
      "confirmed",
      "cancelled",
      "rejected",
    ],

    confirmed: [
      "in_progress",
      "cancelled",
    ],

    in_progress: [
      "completed",
    ],

    completed: [
      "review_eligible",
    ],

    review_eligible: [],

    cancelled: [],

    failed_payment: [],

    rejected: [],
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
};


// ============================================================
// ✅ DATE NORMALIZATION HELPER
// ============================================================

const normalizeBookingDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};


// ============================================================
// CREATE BOOKING
// ============================================================
// IMPORTANT:
// Email verification is intentionally NOT checked here.
//
// Required:
// - authenticated user
//
// Not required:
// - verified email
//
// This fixes:
// 403 "Please verify your email address first"
// ============================================================

export const createBooking = async (req, res) => {
  try {
    console.log("============================================");
    console.log("📌 CREATE BOOKING");
    console.log("============================================");

    console.log(
      "📌 User:",
      req.user
        ? {
            id: req.user._id,
            email: req.user.email,
            role: req.user.role,
            isEmailVerified: req.user.isEmailVerified,
          }
        : "No user"
    );

    console.log("📌 Body:", req.body);

    const user = req.user;

    // ----------------------------------------------------------
    // Authentication
    // ----------------------------------------------------------

    if (!user) {
      console.log("❌ No authenticated user");

      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ----------------------------------------------------------
    // Providers cannot create traveler bookings
    // ----------------------------------------------------------

    if (user.role === "provider") {
      return res.status(403).json({
        success: false,
        message:
          "Providers cannot create bookings. Please use traveler account.",
      });
    }

    console.log(
      "✅ Booking allowed. Email verification status:",
      user.isEmailVerified
    );

    // ----------------------------------------------------------
    // Request data
    // ----------------------------------------------------------

    const {
      listingId,
      startDate,
      endDate,
      numberOfPeople = 1,
      specialRequests,
    } = req.body;

    console.log("📌 listingId:", listingId);
    console.log("📌 startDate:", startDate);
    console.log("📌 endDate:", endDate);
    console.log("📌 numberOfPeople:", numberOfPeople);

    // ----------------------------------------------------------
    // Validate listing ID
    // ----------------------------------------------------------

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "listingId is required",
      });
    }

    // ----------------------------------------------------------
    // Validate number of people
    // ----------------------------------------------------------

    const peopleCount = Number(numberOfPeople);

    if (!Number.isFinite(peopleCount) || peopleCount < 1) {
      return res.status(400).json({
        success: false,
        message: "numberOfPeople must be at least 1",
      });
    }

    // ----------------------------------------------------------
    // Get listing
    // ----------------------------------------------------------

    const entity = await getEntity(listingId);

    console.log(
      "📌 Entity:",
      entity
        ? {
            id: entity.id,
            title: entity.title,
            providerId: entity.providerId,
            price: entity.price,
          }
        : "Not found"
    );

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: "Experience not found",
      });
    }

    // ----------------------------------------------------------
    // Validate provider
    // ----------------------------------------------------------

    if (!entity.providerId) {
      console.error(
        "❌ Listing has no provider:",
        listingId
      );

      return res.status(400).json({
        success: false,
        message:
          "This experience is not properly configured. Provider information is missing.",
      });
    }

    // ==========================================================
    // ✅ FIXED: Date Normalization
    // ==========================================================

    const start = normalizeBookingDate(startDate);
    let end = normalizeBookingDate(endDate);

    console.log("📅 Normalized start:", start);
    console.log("📅 Normalized end:", end);

    // ✅ Validate start date
    if (!start) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date",
      });
    }

    // ✅ Check if start date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be in the past",
      });
    }

    // ✅ If no end date, set to start + 1 day
    if (!end) {
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      console.log("📅 No end date provided, set to:", end);
    }

    // ✅ If same day, make it a 1-day booking (end = start + 1 day)
    if (end.getTime() === start.getTime()) {
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      console.log("📅 Same day booking, set end to:", end);
    }

    // ✅ Only reject if end is truly before start
    if (end < start) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    console.log("📅 Final dates - start:", start, "end:", end);

    // ==========================================================
    // End of date fix
    // ==========================================================

    // ----------------------------------------------------------
    // Duplicate booking check
    // ----------------------------------------------------------

    const hasActive = await Booking.hasActiveBooking(
      user._id,
      entity.id,
      "listing"
    );

    if (hasActive) {
      const activeBooking = await Booking.getActiveBooking(
        user._id,
        entity.id,
        "listing"
      );

      return res.status(409).json({
        success: false,
        message:
          "You already have an active booking for this experience.",

        activeBooking: activeBooking
          ? {
              id: activeBooking._id,
              status: activeBooking.status,
              createdAt: activeBooking.createdAt,
            }
          : null,
      });
    }

    // ----------------------------------------------------------
    // Calculate total price
    // ----------------------------------------------------------

    const price = Number(entity.price || 0);

    const totalPrice = price * peopleCount;

    console.log("📌 price:", price);
    console.log("📌 people:", peopleCount);
    console.log("📌 totalPrice:", totalPrice);

    // ----------------------------------------------------------
    // Booking data
    // ----------------------------------------------------------

    const bookingData = {
      user: user._id,

      provider: entity.providerId,

      listing: entity.id,

      numberOfPeople: peopleCount,

      totalPrice,

      startDate: start,

      endDate: end,

      specialRequests:
        specialRequests || null,

      status: "pending_payment",

      paymentStatus: "unpaid",

      duplicateCheckPerformed: true,
    };

    console.log("📌 Creating booking:", bookingData);

    // ----------------------------------------------------------
    // Create booking
    // ----------------------------------------------------------

    const booking = await Booking.create(
      bookingData
    );

    console.log(
      "✅ Booking created:",
      booking._id
    );

    // ----------------------------------------------------------
    // Populate listing
    // ----------------------------------------------------------

    await booking.populate(
      "listing",
      "title location price coverImage coverMedia coverMediaType galleryImages videos slug"
    );

    // ----------------------------------------------------------
    // Populate provider
    // ----------------------------------------------------------

    await booking.populate(
      "provider",
      "name email profileImage"
    );

    // ----------------------------------------------------------
    // Notification
    // ----------------------------------------------------------

    try {
      await createNotification({
        recipient: entity.providerId,

        type: "booking_created",

        title: "New Booking Request",

        message: `${user.name || user.email} has requested to book your experience "${entity.title}"`,

        data: {
          bookingId: booking._id,
        },
      });
    } catch (notificationError) {
      console.warn(
        "⚠️ Booking created but notification failed:",
        notificationError.message
      );
    }

    // ----------------------------------------------------------
    // Response
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        "Booking created successfully. Please complete payment.",

      booking,

      requiresPayment: true,

      checkoutUrl:
        `/payment/${booking._id}`,
    });

  } catch (error) {
    console.error(
      "❌ CREATE BOOKING ERROR:",
      error
    );

    console.error(
      "❌ Error stack:",
      error.stack
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create booking",
    });
  }
};


// ============================================================
// GET MY BOOKINGS
// ============================================================

export const getMyBookings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      status,
      search,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = req.query;

    const pageNum = Math.max(
      1,
      parseInt(page) || 1
    );

    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit) || 20)
    );

    const filter = {
      user: req.user._id,
    };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.$gte =
          new Date(startDate);
      }

      if (endDate) {
        filter.createdAt.$lte =
          new Date(endDate);
      }
    }

    // Search booking code directly.
    // Listing title/location search is handled after population.
    if (search && search.trim()) {
      filter.bookingCode = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    const skip =
      (pageNum - 1) * limitNum;

    const sortOrder =
      order === "asc" ? 1 : -1;

    const validSortFields = [
      "createdAt",
      "startDate",
      "totalPrice",
      "status",
    ];

    const sortField =
      validSortFields.includes(sort)
        ? sort
        : "createdAt";

    const [bookings, total] =
      await Promise.all([
        Booking.find(filter)
          .populate(
            "listing",
            "title location price coverImage coverMedia coverMediaType galleryImages videos slug"
          )
          .populate(
            "provider",
            "name email profileImage"
          )
          .sort({
            [sortField]: sortOrder,
          })
          .skip(skip)
          .limit(limitNum)
          .lean(),

        Booking.countDocuments(filter),
      ]);

    return res.json({
      success: true,

      data: bookings,

      pagination: {
        total,

        page: pageNum,

        limit: limitNum,

        totalPages:
          Math.ceil(
            total / limitNum
          ),

        hasNext:
          pageNum * limitNum < total,

        hasPrev:
          pageNum > 1,
      },

      filters: {
        status,
        search,
        sort: sortField,
        order,
        startDate,
        endDate,
      },
    });

  } catch (error) {
    console.error(
      "❌ Get my bookings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch bookings",
    });
  }
};


// ============================================================
// GET BOOKING BY ID
// ============================================================

export const getBookingById = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const booking =
      await Booking.findById(
        req.params.id
      )
        .populate(
          "listing",
          "title location price coverImage coverMedia coverMediaType galleryImages videos slug provider"
        )
        .populate(
          "user",
          "name email profileImage"
        )
        .populate(
          "provider",
          "name email profileImage"
        )
        .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const bookingUserId =
      booking.user?._id?.toString() ||
      booking.user?.toString();

    const bookingProviderId =
      booking.provider?._id?.toString() ||
      booking.provider?.toString();

    const currentUserId =
      req.user._id.toString();

    const isAuthorized =
      bookingUserId === currentUserId ||
      bookingProviderId === currentUserId ||
      req.user.role === "admin";

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to view this booking",
      });
    }

    return res.json({
      success: true,
      booking,
    });

  } catch (error) {
    console.error(
      "❌ Get booking by id error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch booking",
    });
  }
};


// ============================================================
// CANCEL BOOKING
// ============================================================

export const cancelBooking = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { reason } =
      req.body || {};

    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isOwner =
      booking.user.toString() ===
      req.user._id.toString();

    const isAdmin =
      req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to cancel this booking",
      });
    }

    if (
      booking.status === "cancelled" ||
      booking.status === "completed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Booking cannot be cancelled because it is already ${booking.status}`,
      });
    }

    const cancellationReason =
      reason ||
      "User requested cancellation";

    await booking.cancelBooking(
      cancellationReason,
      req.user._id
    );

    try {
      await createNotification({
        recipient: booking.provider,

        type: "booking_cancelled",

        title: "Booking Cancelled",

        message:
          `${req.user.name || req.user.email} has cancelled their booking. Reason: ${cancellationReason}`,

        data: {
          bookingId: booking._id,
        },
      });
    } catch (notificationError) {
      console.warn(
        "⚠️ Cancellation notification failed:",
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message:
        "Booking cancelled successfully",
      booking,
    });

  } catch (error) {
    console.error(
      "❌ Cancel booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to cancel booking",
    });
  }
};


// ============================================================
// PROVIDER BOOKINGS
// ============================================================

export const getProviderBookings = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      req.user.role !== "provider" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Provider account required.",
      });
    }

    const {
      status,
      search,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = req.query;

    const pageNum = Math.max(
      1,
      parseInt(page) || 1
    );

    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit) || 20)
    );

    const filter = {
      provider: req.user._id,
    };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.$gte =
          new Date(startDate);
      }

      if (endDate) {
        filter.createdAt.$lte =
          new Date(endDate);
      }
    }

    if (
      search &&
      search.trim()
    ) {
      filter.bookingCode = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    const skip =
      (pageNum - 1) * limitNum;

    const sortOrder =
      order === "asc" ? 1 : -1;

    const validSortFields = [
      "createdAt",
      "startDate",
      "totalPrice",
      "status",
    ];

    const sortField =
      validSortFields.includes(sort)
        ? sort
        : "createdAt";

    const [bookings, total] =
      await Promise.all([
        Booking.find(filter)
          .populate(
            "user",
            "name email profileImage"
          )
          .populate(
            "listing",
            "title location price coverImage coverMedia coverMediaType galleryImages videos slug"
          )
          .sort({
            [sortField]: sortOrder,
          })
          .skip(skip)
          .limit(limitNum)
          .lean(),

        Booking.countDocuments(filter),
      ]);

    return res.json({
      success: true,

      data: bookings,

      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages:
          Math.ceil(
            total / limitNum
          ),
        hasNext:
          pageNum * limitNum < total,
        hasPrev:
          pageNum > 1,
      },

      filters: {
        status,
        search,
        sort: sortField,
        order,
        startDate,
        endDate,
      },
    });

  } catch (error) {
    console.error(
      "❌ Get provider bookings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch bookings",
    });
  }
};


// ============================================================
// CONFIRM BOOKING
// ============================================================

export const confirmBooking = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      req.user.role !== "provider" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Provider account required.",
      });
    }

    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const authorized =
      booking.provider.toString() ===
        req.user._id.toString() ||
      req.user.role === "admin";

    if (!authorized) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to confirm this booking",
      });
    }

    if (booking.status !== "paid") {
      return res.status(400).json({
        success: false,
        message:
          `Booking cannot be confirmed. Current status: ${booking.status}. Must be 'paid'.`,
      });
    }

    await booking.confirmBooking();

    try {
      await createNotification({
        recipient: booking.user,

        type: "booking_confirmed",

        title: "Booking Confirmed!",

        message:
          "Your booking has been confirmed by the provider. Get ready for your experience!",

        data: {
          bookingId: booking._id,
        },
      });
    } catch (notificationError) {
      console.warn(
        "⚠️ Confirmation notification failed:",
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message:
        "Booking confirmed successfully",
      booking,
    });

  } catch (error) {
    console.error(
      "❌ Confirm booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to confirm booking",
    });
  }
};


// ============================================================
// REJECT BOOKING
// ============================================================

export const rejectBooking = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      req.user.role !== "provider" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Provider account required.",
      });
    }

    const { reason } =
      req.body || {};

    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const authorized =
      booking.provider.toString() ===
        req.user._id.toString() ||
      req.user.role === "admin";

    if (!authorized) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to reject this booking",
      });
    }

    if (
      booking.status !== "pending_payment" &&
      booking.status !== "paid"
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Booking cannot be rejected. Current status: ${booking.status}`,
      });
    }

    const rejectReason =
      reason || "No reason provided";

    await booking.rejectBooking(
      rejectReason
    );

    if (
      booking.paymentStatus === "paid"
    ) {
      booking.paymentStatus =
        "refunded";

      await booking.save();
    }

    try {
      await createNotification({
        recipient: booking.user,

        type: "booking_rejected",

        title: "Booking Rejected",

        message:
          `Your booking has been rejected. Reason: ${rejectReason}`,

        data: {
          bookingId: booking._id,
        },
      });
    } catch (notificationError) {
      console.warn(
        "⚠️ Rejection notification failed:",
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message: "Booking rejected",
      booking,
    });

  } catch (error) {
    console.error(
      "❌ Reject booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to reject booking",
    });
  }
};


// ============================================================
// COMPLETE BOOKING
// ============================================================

export const completeBooking = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      req.user.role !== "provider" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Provider account required.",
      });
    }

    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const authorized =
      booking.provider.toString() ===
        req.user._id.toString() ||
      req.user.role === "admin";

    if (!authorized) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to complete this booking",
      });
    }

    if (
      booking.status !== "confirmed" &&
      booking.status !== "in_progress"
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Booking cannot be completed. Current status: ${booking.status}. Must be 'confirmed' or 'in_progress'.`,
      });
    }

    await booking.completeBooking();

    try {
      await createNotification({
        recipient: booking.user,

        type: "booking_completed",

        title: "Trip Completed!",

        message:
          "Your experience has been completed. Please leave a review!",

        data: {
          bookingId: booking._id,
        },
      });
    } catch (notificationError) {
      console.warn(
        "⚠️ Completion notification failed:",
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message:
        "Booking completed successfully",
      booking,
    });

  } catch (error) {
    console.error(
      "❌ Complete booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to complete booking",
    });
  }
};


// ============================================================
// MARK BOOKING IN PROGRESS
// ============================================================

export const markInProgress = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      req.user.role !== "provider" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Provider account required.",
      });
    }

    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const authorized =
      booking.provider.toString() ===
        req.user._id.toString() ||
      req.user.role === "admin";

    if (!authorized) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to update this booking",
      });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message:
          `Booking cannot be marked in progress. Current status: ${booking.status}. Must be 'confirmed'.`,
      });
    }

    booking.status =
      "in_progress";

    await booking.save();

    try {
      await createNotification({
        recipient: booking.user,

        type: "booking_update",

        title: "Trip is Starting! 🚀",

        message:
          "Your experience is about to begin. Get ready for an amazing time!",

        data: {
          bookingId: booking._id,
        },
      });
    } catch (notificationError) {
      console.warn(
        "⚠️ In-progress notification failed:",
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message:
        "Booking marked as in progress",
      booking,
    });

  } catch (error) {
    console.error(
      "❌ Mark in progress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to update booking",
    });
  }
};


// ============================================================
// PROVIDER ANALYTICS
// ============================================================

export const getProviderAnalytics = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      req.user.role !== "provider" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Provider account required.",
      });
    }

    const providerId =
      req.user._id;

    const [
      totalBookings,
      paidBookings,
      completedBookings,
      totalRevenue,
      totalTravelers,
    ] = await Promise.all([
      Booking.countDocuments({
        provider: providerId,
      }),

      Booking.countDocuments({
        provider: providerId,
        status: "paid",
      }),

      Booking.countDocuments({
        provider: providerId,
        status: "completed",
      }),

      Booking.aggregate([
        {
          $match: {
            provider: providerId,
            status: "completed",
          },
        },

        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalPrice",
            },
          },
        },
      ]),

      Booking.aggregate([
        {
          $match: {
            provider: providerId,
            status: "completed",
          },
        },

        {
          $group: {
            _id: null,
            total: {
              $sum: "$numberOfPeople",
            },
          },
        },
      ]),
    ]);

    const pendingConfirmations =
      await Booking.countDocuments({
        provider: providerId,
        status: "paid",
      });

    return res.json({
      success: true,

      analytics: {
        totalBookings,

        paidBookings,

        completedBookings,

        totalRevenue:
          totalRevenue[0]?.total || 0,

        totalTravelers:
          totalTravelers[0]?.total || 0,

        pendingConfirmations,
      },
    });

  } catch (error) {
    console.error(
      "❌ Get provider analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch analytics",
    });
  }
};


// ============================================================
// PROVIDER EARNINGS
// ============================================================

export const getProviderEarnings = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      req.user.role !== "provider" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Provider account required.",
      });
    }

    const providerId =
      req.user._id;

    const bookings =
      await Booking.find({
        provider: providerId,
        status: "completed",
      })
        .populate(
          "listing",
          "title location"
        )
        .populate(
          "user",
          "name email profileImage"
        )
        .sort({
          createdAt: -1,
        });

    const totalEarnings =
      bookings.reduce(
        (sum, booking) =>
          sum +
          (booking.totalPrice || 0),
        0
      );

    const totalBookings =
      bookings.length;

    const averageBookingValue =
      totalBookings > 0
        ? totalEarnings /
          totalBookings
        : 0;

    return res.json({
      success: true,

      totalEarnings,

      totalBookings,

      averageBookingValue,

      bookings:
        bookings.slice(0, 10),
    });

  } catch (error) {
    console.error(
      "❌ Get provider earnings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch earnings",
    });
  }
};


// ============================================================
// PROVIDER TRAVELERS
// ============================================================

export const getProviderTravelers = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      req.user.role !== "provider" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Provider account required.",
      });
    }

    const bookings =
      await Booking.find({
        provider: req.user._id,

        status: {
          $in: [
            "completed",
            "confirmed",
            "in_progress",
          ],
        },
      })
        .populate(
          "user",
          "name email profileImage"
        )
        .populate(
          "listing",
          "title location"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    const travelers =
      bookings.map(
        (booking) => ({
          bookingId:
            booking._id,

          user:
            booking.user,

          travelers:
            booking.numberOfPeople ||
            1,

          travelDate:
            booking.startDate,

          status:
            booking.status,

          totalPrice:
            booking.totalPrice,

          listing:
            booking.listing,
        })
      );

    return res.json({
      success: true,

      travelers,

      total:
        travelers.length,
    });

  } catch (error) {
    console.error(
      "❌ Get provider travelers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch travelers",
    });
  }
};


// ============================================================
// ADMIN - GET ALL BOOKINGS
// ============================================================

export const getAllBookings = async (
  req,
  res
) => {
  try {
    if (
      !req.user ||
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required",
      });
    }

    const {
      status,
      provider,
      search,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = req.query;

    const pageNum = Math.max(
      1,
      parseInt(page) || 1
    );

    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit) || 20)
    );

    const filter = {};

    if (
      status &&
      status !== "all"
    ) {
      filter.status = status;
    }

    if (provider) {
      filter.provider = provider;
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.$gte =
          new Date(startDate);
      }

      if (endDate) {
        filter.createdAt.$lte =
          new Date(endDate);
      }
    }

    if (
      search &&
      search.trim()
    ) {
      filter.bookingCode = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    const skip =
      (pageNum - 1) * limitNum;

    const sortOrder =
      order === "asc" ? 1 : -1;

    const validSortFields = [
      "createdAt",
      "startDate",
      "totalPrice",
      "status",
    ];

    const sortField =
      validSortFields.includes(sort)
        ? sort
        : "createdAt";

    const [bookings, total] =
      await Promise.all([
        Booking.find(filter)
          .populate(
            "user",
            "name email profileImage"
          )
          .populate(
            "listing",
            "title location price coverImage coverMedia coverMediaType galleryImages videos slug"
          )
          .populate(
            "provider",
            "name email profileImage"
          )
          .sort({
            [sortField]: sortOrder,
          })
          .skip(skip)
          .limit(limitNum)
          .lean(),

        Booking.countDocuments(filter),
      ]);

    return res.json({
      success: true,

      data: bookings,

      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages:
          Math.ceil(
            total / limitNum
          ),
        hasNext:
          pageNum * limitNum < total,
        hasPrev:
          pageNum > 1,
      },

      filters: {
        status,
        provider,
        search,
        sort: sortField,
        order,
        startDate,
        endDate,
      },
    });

  } catch (error) {
    console.error(
      "❌ Get all bookings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch bookings",
    });
  }
};


// ============================================================
// ADMIN - UPDATE BOOKING STATUS
// ============================================================

export const updateBookingStatus = async (
  req,
  res
) => {
  try {
    if (
      !req.user ||
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required",
      });
    }

    const {
      status,
      reason,
    } = req.body || {};

    const validStatuses = [
      "draft",
      "pending_payment",
      "paid",
      "confirmed",
      "in_progress",
      "completed",
      "review_eligible",
      "cancelled",
      "failed_payment",
      "rejected",
    ];

    if (
      !status ||
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      !validateBookingStatusTransition(
        booking.status,
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Invalid status transition from ${booking.status} to ${status}`,
      });
    }

    booking.status = status;

    booking.adminNotes =
      reason ||
      booking.adminNotes;

    await booking.save();

    return res.json({
      success: true,

      message:
        `Booking status updated to ${status}`,

      booking,
    });

  } catch (error) {
    console.error(
      "❌ Update booking status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to update booking status",
    });
  }
};


// ============================================================
// LEGACY getBookings
// ============================================================

export const getBookings = async (
  req,
  res
) => {
  return getAllBookings(
    req,
    res
  );
};


// ============================================================
// CHECK DUPLICATE BOOKING
// ============================================================

export const checkDuplicateBooking = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      entityId,
    } = req.params;

    const {
      entityType = "listing",
    } = req.query;

    if (!entityId) {
      return res.status(400).json({
        success: false,
        message:
          "Entity ID is required",
      });
    }

    const hasActive =
      await Booking.hasActiveBooking(
        req.user._id,
        entityId,
        entityType
      );

    let activeBooking = null;

    if (hasActive) {
      activeBooking =
        await Booking.getActiveBooking(
          req.user._id,
          entityId,
          entityType
        );
    }

    return res.json({
      success: true,

      canBook:
        !hasActive,

      hasActive,

      activeBooking:
        activeBooking
          ? {
              id:
                activeBooking._id,

              status:
                activeBooking.status,

              createdAt:
                activeBooking.createdAt,
            }
          : null,
    });

  } catch (error) {
    console.error(
      "❌ Check duplicate booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to check booking status",
    });
  }
};


// ============================================================
// EXPORT
// ============================================================

console.log(
  "✅ bookingController.js loaded successfully"
);