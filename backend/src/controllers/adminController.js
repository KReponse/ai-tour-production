// backend/src/controllers/adminController.js
// ✅ COMPLETE FIXED - Changed 'user' to 'traveler' in Payment populations

import ProviderRequest from "../models/ProviderRequest.js";
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Booking from "../models/Booking.js";
import Earning from "../models/Earning.js";
import Payment from '../models/Payment.js';
import Activity from '../models/Activity.js';
import { createNotification } from "../utils/notificationService.js";

/* ================= GET PROVIDER REQUESTS ================= */

export const getProviderRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const requests = await ProviderRequest.find(filter)
      .populate("user", "name email role verificationStatus")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await ProviderRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      requests,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET PROVIDER REQUEST BY ID ================= */

export const getProviderRequestById = async (req, res) => {
  try {
    const request = await ProviderRequest.findById(req.params.id)
      .populate("user", "name email profileImage phone");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= APPROVE PROVIDER REQUEST ================= */

export const approveProviderRequest = async (req, res) => {
  try {
    const request = await ProviderRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    request.status = "approved";
    await request.save();

    const user = await User.findById(request.user);

    if (user) {
      user.role = "PROVIDER";
      user.verificationStatus = "approved";
      user.providerApprovedDate = new Date();
      await user.save();

      await createNotification({
        recipient: user._id,
        sender: req.user._id,
        type: 'system_alert',
        title: 'Provider Approved ✅',
        message: "Congratulations! Your provider account has been approved. You can now create tours.",
        data: { requestId: request._id },
        link: `/provider/dashboard`
      });

      const io = req.app.get('io');
      if (io) {
        io.to(user._id.toString()).emit('newNotification', {
          title: 'Provider Approved ✅',
          message: "Congratulations! Your provider account has been approved.",
          type: 'system_alert',
          data: { requestId: request._id }
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Provider approved successfully",
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= REJECT PROVIDER REQUEST ================= */

export const rejectProviderRequest = async (req, res) => {
  try {
    const request = await ProviderRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    const { adminNotes } = req.body;

    request.status = "rejected";
    request.adminNotes = adminNotes || "";
    await request.save();

    const user = await User.findById(request.user);

    if (user) {
      user.role = "USER";
      user.verificationStatus = "rejected";
      await user.save();

      await createNotification({
        recipient: user._id,
        sender: req.user._id,
        type: 'system_alert',
        title: 'Provider Request Rejected ❌',
        message: `Your provider application was rejected. Reason: ${request.adminNotes}`,
        data: { requestId: request._id },
        link: `/provider/request`
      });

      const io = req.app.get('io');
      if (io) {
        io.to(user._id.toString()).emit('newNotification', {
          title: 'Provider Request Rejected ❌',
          message: `Your provider application was rejected.`,
          type: 'system_alert',
          data: { requestId: request._id }
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Provider request rejected",
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= UPDATE PROVIDER REQUEST STATUS ================= */

export const updateProviderRequestStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    const request = await ProviderRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Provider request not found"
      });
    }

    request.status = status;
    request.adminNotes = adminNotes || "";
    await request.save();

    const user = await User.findById(request.user);

    if (user) {
      if (status === "approved") {
        user.role = "PROVIDER";
        user.verificationStatus = "approved";
        user.providerApprovedDate = new Date();
        await user.save();

        await createNotification({
          recipient: user._id,
          sender: req.user._id,
          type: 'system_alert',
          title: 'Provider Approved ✅',
          message: "Your provider account has been approved. You can now create tours.",
          data: { requestId: request._id },
          link: `/provider/dashboard`
        });
      }

      if (status === "rejected") {
        user.role = "USER";
        user.verificationStatus = "rejected";
        await user.save();

        await createNotification({
          recipient: user._id,
          sender: req.user._id,
          type: 'system_alert',
          title: 'Provider Request Rejected ❌',
          message: `Your provider request was rejected. Reason: ${adminNotes || "No reason provided"}`,
          data: { requestId: request._id },
          link: `/provider/request`
        });
      }

      if (status === "needs_information") {
        user.verificationStatus = "needs_information";
        await user.save();

        await createNotification({
          recipient: user._id,
          sender: req.user._id,
          type: 'system_alert',
          title: 'More Information Required',
          message: `Please provide additional information. Reason: ${adminNotes || "Missing information"}`,
          data: { requestId: request._id },
          link: `/provider/request`
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Provider request status updated",
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================
GET ALL TOURS (Admin) - UPDATED to use Listing
========================= */

export const getAllToursAdmin = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { 
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    };
    if (status) filter.status = status;

    const listings = await Listing.find(filter)
      .populate("provider", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Listing.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: listings.length,
      tours: listings,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================
APPROVE TOUR (Admin) - UPDATED to use Listing
========================= */

export const approveTourAdmin = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    listing.status = "approved";
    listing.approvedAt = new Date();
    await listing.save();

    await createNotification({
      recipient: listing.provider,
      sender: req.user._id,
      type: 'listing_approved',
      title: 'Tour Approved ✅',
      message: `Your tour "${listing.title}" has been approved and is now visible to travelers.`,
      data: { listingId: listing._id },
      link: `/provider/listings/${listing._id}`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(listing.provider.toString()).emit('newNotification', {
        title: 'Tour Approved ✅',
        message: `Your tour "${listing.title}" has been approved.`,
        type: 'listing_approved',
        data: { listingId: listing._id }
      });
    }

    res.json({
      success: true,
      message: "Tour approved successfully",
      tour: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================
REJECT TOUR (Admin) - UPDATED to use Listing
========================= */

export const rejectTourAdmin = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    const { reason } = req.body;

    listing.status = "rejected";
    listing.rejectionReason = reason;
    await listing.save();

    await createNotification({
      recipient: listing.provider,
      sender: req.user._id,
      type: 'listing_rejected',
      title: 'Tour Rejected ❌',
      message: `Your tour "${listing.title}" has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
      data: { listingId: listing._id },
      link: `/provider/listings/${listing._id}`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(listing.provider.toString()).emit('newNotification', {
        title: 'Tour Rejected ❌',
        message: `Your tour "${listing.title}" has been rejected.`,
        type: 'listing_rejected',
        data: { listingId: listing._id }
      });
    }

    res.json({
      success: true,
      message: "Tour rejected successfully",
      tour: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================
ADMIN DASHBOARD STATS - UPDATED to use Listing
========================= */

export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalListings,
      approvedListings,
      pendingListings,
      rejectedListings,
      suspendedListings,
      
      totalProviders,
      totalTravelers,
      totalAdmins,
      
      pendingProviderRequests,
      approvedProviderRequests,
      rejectedProviderRequests,
      
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      
      totalRevenue,
      totalEarnings
    ] = await Promise.all([
      Listing.countDocuments({ 
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Listing.countDocuments({ 
        status: "approved",
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Listing.countDocuments({ 
        status: "pending",
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Listing.countDocuments({ 
        status: "rejected",
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Listing.countDocuments({ 
        status: "suspended",
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      
      User.countDocuments({ role: "provider" }),
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "admin" }),
      
      ProviderRequest.countDocuments({ status: "pending" }),
      ProviderRequest.countDocuments({ status: "approved" }),
      ProviderRequest.countDocuments({ status: "rejected" }),
      
      Booking.countDocuments(),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({ status: "pending_payment" }),
      Booking.countDocuments({ status: "cancelled" }),
      
      Booking.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } }
      ]),
      Earning.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      stats: {
        listings: {
          total: totalListings,
          approved: approvedListings,
          pending: pendingListings,
          rejected: rejectedListings,
          suspended: suspendedListings
        },
        users: {
          providers: totalProviders,
          travelers: totalTravelers,
          admins: totalAdmins
        },
        providerRequests: {
          pending: pendingProviderRequests,
          approved: approvedProviderRequests,
          rejected: rejectedProviderRequests
        },
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          pending: pendingBookings,
          cancelled: cancelledBookings
        },
        revenue: {
          totalRevenue: totalRevenue[0]?.total || 0,
          totalEarnings: totalEarnings[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================
GET RECENT ACTIVITIES - UPDATED to use Listing
========================= */

export const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentBookings = await Booking.find()
      .populate('user', 'name')
      .populate('listing', 'title')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const recentProviderRequests = await ProviderRequest.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const activities = [];

    recentBookings.forEach(booking => {
      activities.push({
        id: booking._id,
        type: 'booking',
        title: `New Booking: ${booking.listing?.title || 'Experience'}`,
        user: booking.user?.name || 'Anonymous',
        status: booking.status,
        createdAt: booking.createdAt,
        icon: '📅'
      });
    });

    recentProviderRequests.forEach(request => {
      activities.push({
        id: request._id,
        type: 'provider_request',
        title: `Provider Application: ${request.businessName || 'New Provider'}`,
        user: request.user?.name || 'Anonymous',
        status: request.status,
        createdAt: request.createdAt,
        icon: '👤'
      });
    });

    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      activities: activities.slice(0, parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/// =========================
// ✅ GET PAYMENT ANALYTICS - FIXED: changed 'user' to 'traveler'
// =========================
export const getPaymentAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue,
      totalPayments,
      totalFees,
      recentPayments,
      monthlyRevenue,
      lastMonthRevenue,
      activeUsers,
      totalProviders,
      totalBookings
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      Payment.countDocuments({ status: 'paid' }),
      
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } }
      ]),
      
      // ✅ FIXED: Changed 'user' to 'traveler'
      Payment.find({ status: 'paid' })
        .populate('traveler', 'name email profileImage')
        .populate('booking', 'bookingCode')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      
      Payment.aggregate([
        {
          $match: {
            status: 'paid',
            paidAt: { $gte: startOfMonth, $lte: now }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      Payment.aggregate([
        {
          $match: {
            status: 'paid',
            paidAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      User.countDocuments({
        lastActive: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      
      User.countDocuments({ role: 'provider' }),
      
      Booking.countDocuments()
    ]);

    const currentMonthTotal = monthlyRevenue[0]?.total || 0;
    const lastMonthTotal = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = lastMonthTotal > 0 
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;

    const currentMonthPayments = await Payment.countDocuments({
      status: 'paid',
      paidAt: { $gte: startOfMonth, $lte: now }
    });
    const lastMonthPayments = await Payment.countDocuments({
      status: 'paid',
      paidAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });
    const paymentGrowth = lastMonthPayments > 0 
      ? ((currentMonthPayments - lastMonthPayments) / lastMonthPayments) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalPayments: totalPayments || 0,
        totalFees: totalFees[0]?.total || 0,
        activeUsers: activeUsers || 0,
        totalProviders: totalProviders || 0,
        totalBookings: totalBookings || 0,
        recentPayments: recentPayments || [],
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        paymentGrowth: Math.round(paymentGrowth * 10) / 10,
        feeGrowth: 10,
        userGrowth: 5.7,
        monthlyRevenue: currentMonthTotal,
        lastMonthRevenue: lastMonthTotal
      }
    });
  } catch (error) {
    console.error('❌ Error fetching payment analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment analytics'
    });
  }
};

// =========================
// ✅ GET PAYMENT DETAILS (Admin) - FIXED: changed 'user' to 'traveler'
// =========================
export const getPaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    // ✅ FIXED: Changed 'user' to 'traveler'
    const payment = await Payment.findById(id)
      .populate('traveler', 'name email profileImage')
      .populate('provider', 'name email profileImage')
      .populate('booking', 'bookingCode status totalPrice startDate');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('❌ Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment details'
    });
  }
};

// =========================
// ✅ GET ALL PAYMENTS (Admin) - FIXED: changed 'user' to 'traveler'
// =========================
export const getPaymentsList = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    // ✅ FIXED: Changed 'user' to 'traveler'
    const payments = await Payment.find(filter)
      .populate('traveler', 'name email profileImage')
      .populate('booking', 'bookingCode totalPrice')
      .populate('provider', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      payments,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('❌ Error fetching payments list:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payments'
    });
  }
};

// =========================
// ✅ GET PAYMENT STATS (Admin)
// =========================
export const getPaymentStats = async (req, res) => {
  try {
    const [
      totalRevenue,
      pendingPayments,
      refundedPayments,
      failedPayments,
      paidPayments,
      dailyRevenue
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'refunded' }),
      Payment.countDocuments({ status: 'failed' }),
      Payment.countDocuments({ status: 'paid' }),
      Payment.aggregate([
        {
          $match: {
            status: 'paid',
            paidAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingPayments: pendingPayments || 0,
        refundedPayments: refundedPayments || 0,
        failedPayments: failedPayments || 0,
        paidPayments: paidPayments || 0,
        dailyRevenue: dailyRevenue || []
      }
    });
  } catch (error) {
    console.error('❌ Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment stats'
    });
  }
};