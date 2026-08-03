// backend/src/controllers/bookingController.js
// ✅ COMPLETE FIXED - Enhanced pagination with search, filters, sorting
// ✅ Added comprehensive filter options
// ✅ Added proper pagination metadata
// ✅ Fixed cancelBooking to properly handle reason
// ✅ FIXED: Populate all listing media fields (coverMedia, coverMediaType, galleryImages, videos)

import Booking from "../models/Booking.js";
import Listing from "../models/Listing.js";
import { createNotification } from "../utils/notificationService.js";

// =========================
// ✅ HELPERS
// =========================

const getEntity = async (listingId) => {
  if (!listingId) return null;
  
  const listing = await Listing.findById(listingId);
  if (!listing) return null;
  
  return {
    entity: listing,
    type: 'listing',
    id: listingId,
    providerId: listing.provider,
    price: listing.price,
    title: listing.title
  };
};

const validateBookingStatusTransition = (currentStatus, newStatus) => {
  const transitions = {
    'draft': ['pending_payment', 'cancelled'],
    'pending_payment': ['paid', 'cancelled', 'failed_payment'],
    'paid': ['confirmed', 'cancelled'],
    'confirmed': ['in_progress', 'cancelled'],
    'in_progress': ['completed'],
    'completed': ['review_eligible'],
    'review_eligible': [],
    'cancelled': [],
    'failed_payment': [],
    'rejected': []
  };
  
  return transitions[currentStatus]?.includes(newStatus) || false;
};

const canModifyBooking = (user, booking) => {
  if (user.role === 'admin') return true;
  if (booking.user.toString() === user._id.toString()) return true;
  if (user.role === 'provider' && booking.provider.toString() === user._id.toString()) return true;
  return false;
};

// =========================
// ✅ CREATE BOOKING
// =========================

export const createBooking = async (req, res) => {
  try {
    console.log('📌 createBooking called');
    console.log('📌 req.user:', req.user ? req.user.email : 'No user');
    console.log('📌 req.body:', req.body);
    
    const user = req.user;
    
    if (!user) {
      console.log('❌ No user found in request');
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (user.role === 'provider') {
      return res.status(403).json({
        success: false,
        message: "Providers cannot create bookings. Please use traveler account."
      });
    }

    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
    
    if (!isDevelopment && !user.isEmailVerified) {
      console.log('❌ Email not verified for user:', user.email);
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address first'
      });
    }

    if (isDevelopment) {
      console.log('ℹ️ Development mode - Skipping email verification for:', user.email);
    }

    const {
      listingId,
      startDate,
      endDate,
      numberOfPeople = 1,
      specialRequests
    } = req.body;

    console.log('📌 listingId:', listingId);
    console.log('📌 startDate:', startDate);
    console.log('📌 numberOfPeople:', numberOfPeople);

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "listingId is required"
      });
    }

    const entity = await getEntity(listingId);
    console.log('📌 Entity found:', entity ? entity.title : 'Not found');
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: "Experience not found"
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start);
    end.setDate(end.getDate() + 1);

    if (start < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Start date must be in the future"
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date"
      });
    }

    const hasActive = await Booking.hasActiveBooking(
      user._id,
      entity.id,
      'listing'
    );

    if (hasActive) {
      const activeBooking = await Booking.getActiveBooking(
        user._id,
        entity.id,
        'listing'
      );
      
      return res.status(409).json({
        success: false,
        message: `You already have an active booking for this experience.`,
        activeBooking: {
          id: activeBooking._id,
          status: activeBooking.status,
          createdAt: activeBooking.createdAt
        }
      });
    }

    const totalPrice = (entity.price || 0) * numberOfPeople;
    console.log('📌 totalPrice:', totalPrice);

    const bookingData = {
      user: user._id,
      provider: entity.providerId,
      numberOfPeople,
      totalPrice: totalPrice || 100,
      startDate: start,
      endDate: end,
      specialRequests: specialRequests || null,
      status: "pending_payment",
      paymentStatus: "unpaid",
      duplicateCheckPerformed: true,
      listing: entity.id
    };

    const booking = await Booking.create(bookingData);
    console.log('✅ Booking created:', booking._id);

    // ✅ FIXED: Populate ALL listing fields including media
    await booking.populate('listing', 'title location price coverImage coverMedia coverMediaType galleryImages videos slug');
    await booking.populate('provider', 'name email');

    try {
      await createNotification({
        recipient: entity.providerId,
        type: 'booking_created',
        title: 'New Booking Request',
        message: `${user.name} has requested to book your experience "${entity.title}"`,
        data: { bookingId: booking._id }
      });
    } catch (notifError) {
      console.warn('⚠️ Notification error:', notifError.message);
    }

    res.status(201).json({
      success: true,
      message: "Booking created successfully. Please complete payment.",
      booking,
      requiresPayment: true,
      checkoutUrl: `/payment/${booking._id}`
    });

  } catch (error) {
    console.error("❌ Create booking error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create booking"
    });
  }
};

// =========================
// ✅ MY BOOKINGS - ENHANCED
// =========================

export const getMyBookings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const {
      status,
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = req.query;

    const filter = { user: req.user._id };
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Search
    if (search && search.trim()) {
      filter.$or = [
        { bookingCode: { $regex: search, $options: 'i' } },
        { 'listing.title': { $regex: search, $options: 'i' } },
        { 'listing.location': { $regex: search, $options: 'i' } },
      ];
    }
    
    // Date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Validate sort field
    const validSortFields = ['createdAt', 'startDate', 'totalPrice', 'status'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';

    // ✅ FIXED: Populate ALL listing fields including media
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('listing', 'title location price coverImage coverMedia coverMediaType galleryImages videos slug')
        .populate('provider', 'name email profileImage')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: bookings,
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
        order,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("❌ Get my bookings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch bookings"
    });
  }
};

// =========================
// ✅ GET BOOKING BY ID
// =========================

export const getBookingById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // ✅ FIXED: Populate ALL listing fields including media
    const booking = await Booking.findById(req.params.id)
      .populate('listing', 'title location price coverImage coverMedia coverMediaType galleryImages videos provider')
      .populate('user', 'name email profileImage')
      .populate('provider', 'name email profileImage')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const isAuthorized = 
      booking.user._id.toString() === req.user._id.toString() ||
      booking.provider._id.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this booking"
      });
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error("❌ Get booking by id error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch booking"
    });
  }
};

// =========================
// ✅ CANCEL BOOKING - FIXED
// =========================

export const cancelBooking = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const { reason } = req.body;
    
    console.log('📌 Cancelling booking with reason:', reason);
    console.log('📌 User ID:', req.user._id);
    
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const isAuthorized = 
      booking.user.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to cancel this booking"
      });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled because it is already ${booking.status}`
      });
    }

    const cancellationReason = reason || 'User requested cancellation';
    await booking.cancelBooking(cancellationReason, req.user._id);

    try {
      await createNotification({
        recipient: booking.provider,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `${req.user.name} has cancelled their booking. Reason: ${cancellationReason}`,
        data: { bookingId: booking._id }
      });
    } catch (notifError) {
      console.warn('⚠️ Notification error:', notifError.message);
    }

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      booking
    });
  } catch (error) {
    console.error("❌ Cancel booking error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel booking"
    });
  }
};

// =========================
// ✅ PROVIDER BOOKINGS - ENHANCED
// =========================

export const getProviderBookings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Provider account required."
      });
    }

    const {
      status,
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = req.query;

    const filter = { provider: req.user._id };
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (search && search.trim()) {
      filter.$or = [
        { bookingCode: { $regex: search, $options: 'i' } },
        { 'listing.title': { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
      ];
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Validate sort field
    const validSortFields = ['createdAt', 'startDate', 'totalPrice', 'status'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';

    // ✅ FIXED: Populate ALL listing fields including media
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('user', 'name email profileImage')
        .populate('listing', 'title location price coverImage coverMedia coverMediaType galleryImages videos slug')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: bookings,
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
        order,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("❌ Get provider bookings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch bookings"
    });
  }
};

// =========================
// ✅ CONFIRM BOOKING
// =========================

export const confirmBooking = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Provider account required."
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const isAuthorized = 
      booking.provider.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to confirm this booking"
      });
    }

    if (booking.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be confirmed. Current status: ${booking.status}. Must be 'paid'.`
      });
    }

    await booking.confirmBooking();

    try {
      await createNotification({
        recipient: booking.user,
        type: 'booking_confirmed',
        title: 'Booking Confirmed!',
        message: `Your booking has been confirmed by the provider. Get ready for your experience!`,
        data: { bookingId: booking._id }
      });
    } catch (notifError) {
      console.warn('⚠️ Notification error:', notifError.message);
    }

    res.json({
      success: true,
      message: "Booking confirmed successfully",
      booking
    });
  } catch (error) {
    console.error("❌ Confirm booking error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm booking"
    });
  }
};

// =========================
// ✅ REJECT BOOKING
// =========================

export const rejectBooking = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Provider account required."
      });
    }

    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const isAuthorized = 
      booking.provider.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to reject this booking"
      });
    }

    if (booking.status !== 'pending_payment' && booking.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be rejected. Current status: ${booking.status}`
      });
    }

    const rejectReason = reason || 'No reason provided';
    await booking.rejectBooking(rejectReason);

    if (booking.paymentStatus === 'paid') {
      booking.paymentStatus = 'refunded';
      await booking.save();
    }

    try {
      await createNotification({
        recipient: booking.user,
        type: 'booking_rejected',
        title: 'Booking Rejected',
        message: `Your booking has been rejected. Reason: ${rejectReason}`,
        data: { bookingId: booking._id }
      });
    } catch (notifError) {
      console.warn('⚠️ Notification error:', notifError.message);
    }

    res.json({
      success: true,
      message: "Booking rejected",
      booking
    });
  } catch (error) {
    console.error("❌ Reject booking error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject booking"
    });
  }
};

// =========================
// ✅ COMPLETE BOOKING
// =========================

export const completeBooking = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Provider account required."
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const isAuthorized = 
      booking.provider.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to complete this booking"
      });
    }

    if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be completed. Current status: ${booking.status}. Must be 'confirmed' or 'in_progress'.`
      });
    }

    await booking.completeBooking();

    try {
      await createNotification({
        recipient: booking.user,
        type: 'booking_completed',
        title: 'Trip Completed!',
        message: `Your experience has been completed. Please leave a review!`,
        data: { bookingId: booking._id }
      });
    } catch (notifError) {
      console.warn('⚠️ Notification error:', notifError.message);
    }

    res.json({
      success: true,
      message: "Booking completed successfully",
      booking
    });
  } catch (error) {
    console.error("❌ Complete booking error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to complete booking"
    });
  }
};

// =========================
// ✅ PROVIDER ANALYTICS
// =========================

export const getProviderAnalytics = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Provider account required."
      });
    }

    const providerId = req.user._id;

    const [
      totalBookings,
      paidBookings,
      completedBookings,
      totalRevenue,
      totalTravelers
    ] = await Promise.all([
      Booking.countDocuments({ provider: providerId }),
      Booking.countDocuments({ provider: providerId, status: 'paid' }),
      Booking.countDocuments({ provider: providerId, status: 'completed' }),
      Booking.aggregate([
        { $match: { provider: providerId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Booking.aggregate([
        { $match: { provider: providerId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$numberOfPeople' } } }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        totalBookings,
        paidBookings,
        completedBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalTravelers: totalTravelers[0]?.total || 0,
        pendingConfirmations: await Booking.countDocuments({ 
          provider: providerId, 
          status: 'paid' 
        })
      }
    });
  } catch (error) {
    console.error("❌ Get provider analytics error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch analytics"
    });
  }
};

// =========================
// ✅ PROVIDER EARNINGS
// =========================

export const getProviderEarnings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Provider account required."
      });
    }

    const providerId = req.user._id;

    const bookings = await Booking.find({
      provider: providerId,
      status: 'completed'
    });

    const totalEarnings = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const totalBookings = bookings.length;
    const averageBookingValue = totalBookings > 0 ? totalEarnings / totalBookings : 0;

    res.json({
      success: true,
      totalEarnings,
      totalBookings,
      averageBookingValue,
      bookings: bookings.slice(0, 10)
    });
  } catch (error) {
    console.error("❌ Get provider earnings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch earnings"
    });
  }
};

// =========================
// ✅ PROVIDER TRAVELERS
// =========================

export const getProviderTravelers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Provider account required."
      });
    }

    const bookings = await Booking.find({
      provider: req.user._id,
      status: { $in: ['completed', 'confirmed', 'in_progress'] }
    })
    .populate('user', 'name email profileImage')
    .sort({ createdAt: -1 })
    .lean();

    const travelers = bookings.map(booking => ({
      bookingId: booking._id,
      user: booking.user,
      travelers: booking.numberOfPeople || 1,
      travelDate: booking.startDate,
      status: booking.status,
      totalPrice: booking.totalPrice
    }));

    res.json({
      success: true,
      travelers,
      total: travelers.length
    });
  } catch (error) {
    console.error("❌ Get provider travelers error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch travelers"
    });
  }
};

// =========================
// ✅ ADMIN: GET ALL BOOKINGS - ENHANCED
// =========================

export const getAllBookings = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const {
      status,
      provider,
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = req.query;

    const filter = {};
    
    if (status && status !== 'all') filter.status = status;
    if (provider) filter.provider = provider;
    
    if (search && search.trim()) {
      filter.$or = [
        { bookingCode: { $regex: search, $options: 'i' } },
        { 'listing.title': { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
        { 'provider.name': { $regex: search, $options: 'i' } },
      ];
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Validate sort field
    const validSortFields = ['createdAt', 'startDate', 'totalPrice', 'status'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';

    // ✅ FIXED: Populate ALL listing fields including media
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('user', 'name email')
        .populate('listing', 'title location price coverImage coverMedia coverMediaType galleryImages videos')
        .populate('provider', 'name email')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: bookings,
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
        provider,
        search,
        sort,
        order,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("❌ Get all bookings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch bookings"
    });
  }
};

// =========================
// ✅ ADMIN: UPDATE BOOKING STATUS
// =========================

export const updateBookingStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const { status, reason } = req.body;
    const validStatuses = [
      'draft', 'pending_payment', 'paid', 'confirmed', 
      'in_progress', 'completed', 'review_eligible', 
      'cancelled', 'failed_payment', 'rejected'
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    if (!validateBookingStatusTransition(booking.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${booking.status} to ${status}`
      });
    }

    booking.status = status;
    booking.adminNotes = reason || booking.adminNotes;
    await booking.save();

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking
    });
  } catch (error) {
    console.error("❌ Update booking status error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update booking status"
    });
  }
};

// =========================
// ✅ LEGACY: getBookings (alias)
// =========================

export const getBookings = async (req, res) => {
  return getAllBookings(req, res);
};

// =========================
// ✅ CHECK DUPLICATE BOOKING
// =========================

export const checkDuplicateBooking = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const { entityId } = req.params;
    const { entityType = 'listing' } = req.query;

    if (!entityId) {
      return res.status(400).json({
        success: false,
        message: "Entity ID is required"
      });
    }

    const hasActive = await Booking.hasActiveBooking(
      req.user._id,
      entityId,
      entityType
    );

    let activeBooking = null;
    if (hasActive) {
      activeBooking = await Booking.getActiveBooking(
        req.user._id,
        entityId,
        entityType
      );
    }

    res.json({
      success: true,
      canBook: !hasActive,
      hasActive,
      activeBooking: activeBooking ? {
        id: activeBooking._id,
        status: activeBooking.status,
        createdAt: activeBooking.createdAt
      } : null
    });
  } catch (error) {
    console.error("❌ Check duplicate booking error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check booking status"
    });
  }
};

// =========================
// ✅ MARK IN PROGRESS
// =========================

export const markInProgress = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Provider account required."
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const isAuthorized = 
      booking.provider.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this booking"
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be marked in progress. Current status: ${booking.status}. Must be 'confirmed'.`
      });
    }

    booking.status = 'in_progress';
    await booking.save();

    try {
      await createNotification({
        recipient: booking.user,
        type: 'booking_update',
        title: 'Trip is Starting! 🚀',
        message: `Your experience is about to begin. Get ready for an amazing time!`,
        data: { bookingId: booking._id }
      });
    } catch (notifError) {
      console.warn('⚠️ Notification error:', notifError.message);
    }

    res.json({
      success: true,
      message: "Booking marked as in progress",
      booking
    });
  } catch (error) {
    console.error("❌ Mark in progress error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update booking"
    });
  }
};