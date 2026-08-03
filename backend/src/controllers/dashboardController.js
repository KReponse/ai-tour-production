// backend/src/controllers/dashboardController.js
// ✅ COMPLETE - Provider Dashboard with Real MongoDB Aggregation
// ✅ No fake data, no hardcoded statistics
// ✅ All data from database aggregation

import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Earning from "../models/Earning.js";
import Listing from "../models/Listing.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import ProviderRequest from "../models/ProviderRequest.js";

// ============================================================
// ✅ GET PROVIDER DASHBOARD STATS
// ============================================================

export const getProviderDashboardStats = async (req, res) => {
  try {
    const providerId = req.user._id;

    // =========================
    // REVENUE STATS
    // =========================
    const revenueStats = await Payment.aggregate([
      {
        $match: {
          provider: providerId,
          status: "paid"
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalCommission: { $sum: "$platformFee" },
          netEarnings: { $sum: "$providerAmount" },
          totalPayments: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // TODAY'S REVENUE
    // =========================
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRevenue = await Payment.aggregate([
      {
        $match: {
          provider: providerId,
          status: "paid",
          paidAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // MONTHLY REVENUE
    // =========================
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          provider: providerId,
          status: "paid",
          paidAt: { $gte: monthStart, $lt: monthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // BOOKING STATS
    // =========================
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          provider: providerId
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // LISTING STATS
    // =========================
    const listingStats = await Listing.aggregate([
      {
        $match: {
          provider: providerId
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // PAYMENT STATUS STATS
    // =========================
    const paymentStatusStats = await Payment.aggregate([
      {
        $match: {
          provider: providerId
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // REVIEW STATS
    // =========================
    // Get all listing IDs for this provider
    const listings = await Listing.find({ provider: providerId }).select("_id");
    const listingIds = listings.map(l => l._id);

    const reviewStats = await Review.aggregate([
      {
        $match: {
          listing: { $in: listingIds },
          status: "approved"
        }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" }
        }
      }
    ]);

    // =========================
    // EARNING STATS
    // =========================
    const earningStats = await Earning.aggregate([
      {
        $match: {
          provider: providerId
        }
      },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$netAmount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // RECENT PAYMENTS
    // =========================
    const recentPayments = await Payment.find({
      provider: providerId
    })
      .populate("traveler", "name email avatar")
      .populate("booking", "bookingCode")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // =========================
    // RECENT BOOKINGS
    // =========================
    const recentBookings = await Booking.find({
      provider: providerId
    })
      .populate("user", "name email avatar")
      .populate("listing", "title coverImage")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // =========================
    // COMPILE DASHBOARD DATA
    // =========================
    const dashboardData = {
      revenue: {
        total: revenueStats[0]?.totalRevenue || 0,
        net: revenueStats[0]?.netEarnings || 0,
        commission: revenueStats[0]?.totalCommission || 0,
        today: todayRevenue[0]?.total || 0,
        todayCount: todayRevenue[0]?.count || 0,
        month: monthlyRevenue[0]?.total || 0,
        monthCount: monthlyRevenue[0]?.count || 0
      },
      bookings: {
        total: bookingStats.reduce((sum, s) => sum + s.count, 0),
        confirmed: bookingStats.find(s => s._id === "confirmed")?.count || 0,
        pending: bookingStats.find(s => s._id === "pending_payment")?.count || 0,
        paid: bookingStats.find(s => s._id === "paid")?.count || 0,
        completed: bookingStats.find(s => s._id === "completed")?.count || 0,
        cancelled: bookingStats.find(s => s._id === "cancelled")?.count || 0,
        inProgress: bookingStats.find(s => s._id === "in_progress")?.count || 0,
        reviewEligible: bookingStats.find(s => s._id === "review_eligible")?.count || 0
      },
      listings: {
        total: listingStats.reduce((sum, s) => sum + s.count, 0),
        approved: listingStats.find(s => s._id === "approved")?.count || 0,
        pending: listingStats.find(s => s._id === "pending")?.count || 0,
        rejected: listingStats.find(s => s._id === "rejected")?.count || 0,
        suspended: listingStats.find(s => s._id === "suspended")?.count || 0
      },
      payments: {
        total: paymentStatusStats.reduce((sum, s) => sum + s.count, 0),
        paid: paymentStatusStats.find(s => s._id === "paid")?.count || 0,
        pending: paymentStatusStats.find(s => s._id === "pending")?.count || 0,
        processing: paymentStatusStats.find(s => s._id === "processing")?.count || 0,
        failed: paymentStatusStats.find(s => s._id === "failed")?.count || 0,
        refunded: paymentStatusStats.find(s => s._id === "refunded")?.count || 0
      },
      reviews: {
        total: reviewStats[0]?.totalReviews || 0,
        averageRating: Math.round((reviewStats[0]?.averageRating || 0) * 10) / 10
      },
      earnings: {
        available: earningStats.find(s => s._id === "available")?.total || 0,
        pending: earningStats.find(s => s._id === "pending")?.total || 0,
        withdrawn: earningStats.find(s => s._id === "withdrawn")?.total || 0,
        refunded: earningStats.find(s => s._id === "refunded")?.total || 0
      },
      recentPayments: recentPayments.map(p => ({
        _id: p._id,
        amount: p.amount,
        status: p.status,
        traveler: p.traveler,
        booking: p.booking,
        paidAt: p.paidAt,
        createdAt: p.createdAt
      })),
      recentBookings: recentBookings.map(b => ({
        _id: b._id,
        status: b.status,
        totalPrice: b.totalPrice,
        user: b.user,
        listing: b.listing,
        startDate: b.startDate,
        createdAt: b.createdAt
      }))
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error("❌ Get provider dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard stats"
    });
  }
};

// ============================================================
// ✅ GET PROVIDER REVENUE CHART DATA
// ============================================================

export const getProviderRevenueChart = async (req, res) => {
  try {
    const providerId = req.user._id;
    const { period = "monthly" } = req.query;

    let dateFormat = {};
    let groupBy = {};

    switch (period) {
      case "daily":
        dateFormat = {
          year: { $year: "$paidAt" },
          month: { $month: "$paidAt" },
          day: { $dayOfMonth: "$paidAt" }
        };
        groupBy = {
          year: "$_id.year",
          month: "$_id.month",
          day: "$_id.day"
        };
        break;
      case "weekly":
        dateFormat = {
          year: { $year: "$paidAt" },
          week: { $week: "$paidAt" }
        };
        groupBy = {
          year: "$_id.year",
          week: "$_id.week"
        };
        break;
      case "monthly":
      default:
        dateFormat = {
          year: { $year: "$paidAt" },
          month: { $month: "$paidAt" }
        };
        groupBy = {
          year: "$_id.year",
          month: "$_id.month"
        };
        break;
    }

    const revenueData = await Payment.aggregate([
      {
        $match: {
          provider: providerId,
          status: "paid"
        }
      },
      {
        $group: {
          _id: dateFormat,
          revenue: { $sum: "$amount" },
          commission: { $sum: "$platformFee" },
          net: { $sum: "$providerAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    // Format data for chart
    const chartData = revenueData.map(item => {
      let label = "";
      if (period === "daily") {
        label = `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`;
      } else if (period === "weekly") {
        label = `Week ${item._id.week}, ${item._id.year}`;
      } else {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        label = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      }

      return {
        label,
        revenue: item.revenue,
        commission: item.commission,
        net: item.net,
        count: item.count
      };
    });

    res.json({
      success: true,
      data: {
        period,
        chartData
      }
    });

  } catch (error) {
    console.error("❌ Get provider revenue chart error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch revenue chart data"
    });
  }
};

// ============================================================
// ✅ GET PROVIDER TOP LISTINGS
// ============================================================

export const getProviderTopListings = async (req, res) => {
  try {
    const providerId = req.user._id;
    const { limit = 10 } = req.query;

    // Get all listings for this provider
    const listings = await Listing.find({ provider: providerId })
      .select("_id title coverImage price averageRating totalReviews totalBookings totalRevenue")
      .lean();

    // Get booking counts for each listing
    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          provider: providerId,
          listing: { $in: listings.map(l => l._id) }
        }
      },
      {
        $group: {
          _id: "$listing",
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" }
        }
      }
    ]);

    // Get review counts for each listing
    const listingIds = listings.map(l => l._id);
    const reviewCounts = await Review.aggregate([
      {
        $match: {
          listing: { $in: listingIds },
          status: "approved"
        }
      },
      {
        $group: {
          _id: "$listing",
          count: { $sum: 1 },
          average: { $avg: "$rating" }
        }
      }
    ]);

    // Combine data
    const topListings = listings.map(listing => {
      const bookings = bookingCounts.find(b => b._id.toString() === listing._id.toString());
      const reviews = reviewCounts.find(r => r._id.toString() === listing._id.toString());

      return {
        _id: listing._id,
        title: listing.title,
        coverImage: listing.coverImage,
        price: listing.price,
        totalBookings: bookings?.count || 0,
        totalRevenue: bookings?.revenue || 0,
        totalReviews: reviews?.count || 0,
        averageRating: Math.round((reviews?.average || listing.averageRating || 0) * 10) / 10,
        status: listing.status
      };
    });

    // Sort by revenue and limit
    const sorted = topListings
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: sorted
    });

  } catch (error) {
    console.error("❌ Get provider top listings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch top listings"
    });
  }
};

// ============================================================
// ✅ GET PROVIDER RECENT ACTIVITY
// ============================================================

export const getProviderRecentActivity = async (req, res) => {
  try {
    const providerId = req.user._id;
    const { limit = 20 } = req.query;

    // Get recent bookings
    const recentBookings = await Booking.find({ provider: providerId })
      .populate("user", "name email avatar")
      .populate("listing", "title coverImage")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Get recent payments
    const recentPayments = await Payment.find({ provider: providerId })
      .populate("traveler", "name email avatar")
      .populate("booking", "bookingCode")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Get recent reviews
    const listings = await Listing.find({ provider: providerId }).select("_id");
    const listingIds = listings.map(l => l._id);

    const recentReviews = await Review.find({
      listing: { $in: listingIds },
      status: "approved"
    })
      .populate("user", "name email avatar")
      .populate("listing", "title coverImage")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Combine and sort all activities
    const activities = [];

    recentBookings.forEach(b => {
      activities.push({
        type: "booking",
        _id: b._id,
        title: b.listing?.title || "Booking",
        user: b.user,
        status: b.status,
        amount: b.totalPrice,
        date: b.createdAt,
        data: b
      });
    });

    recentPayments.forEach(p => {
      activities.push({
        type: "payment",
        _id: p._id,
        title: `Payment #${p.booking?.bookingCode || p._id}`,
        user: p.traveler,
        status: p.status,
        amount: p.amount,
        date: p.createdAt,
        data: p
      });
    });

    recentReviews.forEach(r => {
      activities.push({
        type: "review",
        _id: r._id,
        title: `Review for ${r.listing?.title || "Listing"}`,
        user: r.user,
        rating: r.rating,
        date: r.createdAt,
        data: r
      });
    });

    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const limited = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limited
    });

  } catch (error) {
    console.error("❌ Get provider recent activity error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch recent activity"
    });
  }
};

// ============================================================
// ✅ GET ADMIN DASHBOARD STATS
// ============================================================

export const getAdminDashboardStats = async (req, res) => {
  try {
    // =========================
    // USER STATS
    // =========================
    const userStats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] }
          },
          verified: {
            $sum: { $cond: [{ $eq: ["$isEmailVerified", true] }, 1, 0] }
          }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();

    // =========================
    // REVENUE STATS
    // =========================
    const revenueStats = await Payment.aggregate([
      {
        $match: { status: "paid" }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalCommission: { $sum: "$platformFee" },
          totalPayments: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // TODAY'S REVENUE
    // =========================
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRevenue = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          paidAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // BOOKING STATS
    // =========================
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalBookings = bookingStats.reduce((sum, s) => sum + s.count, 0);

    // =========================
    // LISTING STATS
    // =========================
    const listingStats = await Listing.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalListings = listingStats.reduce((sum, s) => sum + s.count, 0);

    // =========================
    // PAYMENT STATS
    // =========================
    const paymentStatusStats = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // PROVIDER REQUEST STATS
    // =========================
    const providerRequestStats = await ProviderRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // REVIEW STATS
    // =========================
    const reviewStats = await Review.aggregate([
      {
        $match: { status: "approved" }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" }
        }
      }
    ]);

    // =========================
    // RECENT ACTIVITY
    // =========================
    const recentUsers = await User.find()
      .select("name email role avatar createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentBookings = await Booking.find()
      .populate("user", "name email")
      .populate("listing", "title")
      .populate("provider", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentPayments = await Payment.find()
      .populate("traveler", "name email")
      .populate("provider", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // =========================
    // COMPILE ADMIN DASHBOARD
    // =========================
    const dashboardData = {
      users: {
        total: totalUsers,
        travelers: userStats.find(s => s._id === "traveler")?.count || 0,
        providers: userStats.find(s => s._id === "provider")?.count || 0,
        admins: userStats.find(s => s._id === "admin")?.count || 0,
        active: userStats.reduce((sum, s) => sum + (s.active || 0), 0),
        verified: userStats.reduce((sum, s) => sum + (s.verified || 0), 0)
      },
      revenue: {
        total: revenueStats[0]?.totalRevenue || 0,
        commission: revenueStats[0]?.totalCommission || 0,
        net: (revenueStats[0]?.totalRevenue || 0) - (revenueStats[0]?.totalCommission || 0),
        today: todayRevenue[0]?.total || 0,
        todayCount: todayRevenue[0]?.count || 0
      },
      bookings: {
        total: totalBookings,
        confirmed: bookingStats.find(s => s._id === "confirmed")?.count || 0,
        pending: bookingStats.find(s => s._id === "pending_payment")?.count || 0,
        paid: bookingStats.find(s => s._id === "paid")?.count || 0,
        completed: bookingStats.find(s => s._id === "completed")?.count || 0,
        cancelled: bookingStats.find(s => s._id === "cancelled")?.count || 0
      },
      listings: {
        total: totalListings,
        approved: listingStats.find(s => s._id === "approved")?.count || 0,
        pending: listingStats.find(s => s._id === "pending")?.count || 0,
        rejected: listingStats.find(s => s._id === "rejected")?.count || 0,
        suspended: listingStats.find(s => s._id === "suspended")?.count || 0
      },
      payments: {
        total: paymentStatusStats.reduce((sum, s) => sum + s.count, 0),
        paid: paymentStatusStats.find(s => s._id === "paid")?.count || 0,
        pending: paymentStatusStats.find(s => s._id === "pending")?.count || 0,
        processing: paymentStatusStats.find(s => s._id === "processing")?.count || 0,
        failed: paymentStatusStats.find(s => s._id === "failed")?.count || 0,
        refunded: paymentStatusStats.find(s => s._id === "refunded")?.count || 0
      },
      providerRequests: {
        total: providerRequestStats.reduce((sum, s) => sum + s.count, 0),
        pending: providerRequestStats.find(s => s._id === "pending")?.count || 0,
        approved: providerRequestStats.find(s => s._id === "approved")?.count || 0,
        rejected: providerRequestStats.find(s => s._id === "rejected")?.count || 0
      },
      reviews: {
        total: reviewStats[0]?.totalReviews || 0,
        averageRating: Math.round((reviewStats[0]?.averageRating || 0) * 10) / 10
      },
      recentActivity: {
        users: recentUsers,
        bookings: recentBookings,
        payments: recentPayments
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error("❌ Get admin dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admin dashboard stats"
    });
  }
};

// ============================================================
// ✅ GET PLATFORM STATS (Public/Overview)
// ============================================================

export const getPlatformStats = async (req, res) => {
  try {
    const [totalUsers, totalListings, totalBookings, totalReviews, totalPayments] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Listing.countDocuments({ status: "approved" }),
      Booking.countDocuments({ status: { $in: ["confirmed", "paid", "completed"] } }),
      Review.countDocuments({ status: "approved" }),
      Payment.countDocuments({ status: "paid" })
    ]);

    const revenueStats = await Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const avgRating = await Review.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, avg: { $avg: "$rating" } } }
    ]);

    const topProviders = await User.aggregate([
      { $match: { role: "provider" } },
      {
        $lookup: {
          from: "listings",
          localField: "_id",
          foreignField: "provider",
          as: "listings"
        }
      },
      {
        $addFields: {
          listingCount: { $size: "$listings" }
        }
      },
      { $sort: { listingCount: -1 } },
      { $limit: 5 },
      { $project: { name: 1, email: 1, avatar: 1, listingCount: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        users: totalUsers,
        listings: totalListings,
        bookings: totalBookings,
        reviews: totalReviews,
        payments: totalPayments,
        totalRevenue: revenueStats[0]?.total || 0,
        averageRating: Math.round((avgRating[0]?.avg || 0) * 10) / 10,
        topProviders
      }
    });

  } catch (error) {
    console.error("❌ Get platform stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch platform stats"
    });
  }
};

// ============================================================
// ✅ GET PROVIDER PERFORMANCE METRICS
// ============================================================

export const getProviderPerformanceMetrics = async (req, res) => {
  try {
    const providerId = req.user._id;

    // Get all listings
    const listings = await Listing.find({ provider: providerId }).select("_id");
    const listingIds = listings.map(l => l._id);

    // Response time (average time from booking to confirmation)
    const responseTime = await Booking.aggregate([
      {
        $match: {
          provider: providerId,
          status: { $in: ["confirmed", "paid", "completed"] }
        }
      },
      {
        $project: {
          responseTime: {
            $subtract: ["$updatedAt", "$createdAt"]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageResponseTime: { $avg: "$responseTime" }
        }
      }
    ]);

    // Cancellation rate
    const cancellationStats = await Booking.aggregate([
      {
        $match: { provider: providerId }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalBookings = cancellationStats.reduce((sum, s) => sum + s.count, 0);
    const cancelledCount = cancellationStats.find(s => s._id === "cancelled")?.count || 0;
    const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;

    // Review sentiment (average rating distribution)
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          listing: { $in: listingIds },
          status: "approved"
        }
      },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Completion rate
    const completedCount = cancellationStats.find(s => s._id === "completed")?.count || 0;
    const completionRate = totalBookings > 0 ? (completedCount / totalBookings) * 100 : 0;

    res.json({
      success: true,
      data: {
        responseTime: {
          average: responseTime[0]?.averageResponseTime || 0,
          formatted: responseTime[0]?.averageResponseTime 
            ? `${Math.round(responseTime[0].averageResponseTime / (1000 * 60 * 60))} hours` 
            : "N/A"
        },
        cancellationRate: Math.round(cancellationRate * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10,
        ratingDistribution: ratingDistribution.map(r => ({
          rating: r._id,
          count: r.count
        })),
        totalBookings,
        completedBookings: completedCount,
        cancelledBookings: cancelledCount
      }
    });

  } catch (error) {
    console.error("❌ Get provider performance metrics error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch performance metrics"
    });
  }
};

// ============================================================
// ✅ GET DASHBOARD QUICK STATS (Minimal)
// ============================================================

export const getDashboardQuickStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let data = {};

    if (userRole === "provider") {
      // Provider quick stats
      const [bookings, earnings, reviews, listings] = await Promise.all([
        Booking.countDocuments({ 
          provider: userId, 
          status: { $in: ["pending_payment", "paid", "confirmed"] } 
        }),
        Earning.aggregate([
          { $match: { provider: userId, status: "available" } },
          { $group: { _id: null, total: { $sum: "$netAmount" } } }
        ]),
        Review.countDocuments({ 
          listing: { $in: await Listing.find({ provider: userId }).distinct("_id") },
          status: "approved" 
        }),
        Listing.countDocuments({ provider: userId, status: "approved" })
      ]);

      data = {
        pendingBookings: bookings,
        availableEarnings: earnings[0]?.total || 0,
        totalReviews: reviews,
        activeListings: listings
      };

    } else if (userRole === "admin") {
      // Admin quick stats
      const [users, bookings, listings, payments] = await Promise.all([
        User.countDocuments({ isActive: true }),
        Booking.countDocuments({ status: "pending_payment" }),
        Listing.countDocuments({ status: "pending" }),
        Payment.countDocuments({ status: "pending" })
      ]);

      data = {
        totalUsers: users,
        pendingBookings: bookings,
        pendingListings: listings,
        pendingPayments: payments
      };

    } else {
      // Traveler quick stats
      const [bookings, payments] = await Promise.all([
        Booking.countDocuments({ 
          user: userId, 
          status: { $in: ["pending_payment", "paid", "confirmed", "in_progress"] } 
        }),
        Payment.countDocuments({ 
          traveler: userId, 
          status: "paid" 
        })
      ]);

      data = {
        activeBookings: bookings,
        totalPayments: payments
      };
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error("❌ Get dashboard quick stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch quick stats"
    });
  }
};

// ============================================================
// ✅ GET TRAVELER DASHBOARD STATS
// ============================================================

export const getTravelerDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // =========================
    // BOOKING STATS
    // =========================
    const bookingStats = await Booking.aggregate([
      {
        $match: { user: userId }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // =========================
    // PAYMENT STATS
    // =========================
    const paymentStats = await Payment.aggregate([
      {
        $match: { traveler: userId }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$amount" }
        }
      }
    ]);

    // =========================
    // REVIEW STATS
    // =========================
    const reviewStats = await Review.aggregate([
      {
        $match: { user: userId, status: "approved" }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" }
        }
      }
    ]);

    // =========================
    // RECENT BOOKINGS
    // =========================
    const recentBookings = await Booking.find({ user: userId })
      .populate("listing", "title coverImage location")
      .populate("provider", "name avatar")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // =========================
    // UPCOMING BOOKINGS
    // =========================
    const now = new Date();
    const upcomingBookings = await Booking.find({
      user: userId,
      startDate: { $gte: now },
      status: { $in: ["confirmed", "paid", "pending_payment"] }
    })
      .populate("listing", "title coverImage location")
      .populate("provider", "name avatar")
      .sort({ startDate: 1 })
      .limit(5)
      .lean();

    // =========================
    // COMPILE DATA
    // =========================
    const dashboardData = {
      bookings: {
        total: bookingStats.reduce((sum, s) => sum + s.count, 0),
        confirmed: bookingStats.find(s => s._id === "confirmed")?.count || 0,
        pending: bookingStats.find(s => s._id === "pending_payment")?.count || 0,
        paid: bookingStats.find(s => s._id === "paid")?.count || 0,
        completed: bookingStats.find(s => s._id === "completed")?.count || 0,
        cancelled: bookingStats.find(s => s._id === "cancelled")?.count || 0,
        inProgress: bookingStats.find(s => s._id === "in_progress")?.count || 0
      },
      payments: {
        total: paymentStats.reduce((sum, s) => sum + s.count, 0),
        paid: paymentStats.find(s => s._id === "paid")?.count || 0,
        pending: paymentStats.find(s => s._id === "pending")?.count || 0,
        failed: paymentStats.find(s => s._id === "failed")?.count || 0,
        refunded: paymentStats.find(s => s._id === "refunded")?.count || 0,
        totalSpent: paymentStats.find(s => s._id === "paid")?.total || 0
      },
      reviews: {
        total: reviewStats[0]?.totalReviews || 0,
        averageRating: Math.round((reviewStats[0]?.averageRating || 0) * 10) / 10
      },
      recentBookings: recentBookings,
      upcomingBookings: upcomingBookings
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error("❌ Get traveler dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch traveler dashboard stats"
    });
  }
};

// ============================================================
// ✅ GET PROVIDER DASHBOARD SUMMARY (Compact)
// ============================================================

export const getProviderDashboardSummary = async (req, res) => {
  try {
    const providerId = req.user._id;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayBookings,
      todayRevenue,
      pendingBookings,
      availableEarnings,
      totalListings,
      totalReviews
    ] = await Promise.all([
      Booking.countDocuments({
        provider: providerId,
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      Payment.aggregate([
        {
          $match: {
            provider: providerId,
            status: "paid",
            paidAt: { $gte: today, $lt: tomorrow }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Booking.countDocuments({
        provider: providerId,
        status: { $in: ["pending_payment", "paid"] }
      }),
      Earning.aggregate([
        { $match: { provider: providerId, status: "available" } },
        { $group: { _id: null, total: { $sum: "$netAmount" } } }
      ]),
      Listing.countDocuments({ provider: providerId, status: "approved" }),
      Review.countDocuments({
        listing: { $in: await Listing.find({ provider: providerId }).distinct("_id") },
        status: "approved"
      })
    ]);

    res.json({
      success: true,
      data: {
        todayBookings,
        todayRevenue: todayRevenue[0]?.total || 0,
        pendingBookings,
        availableEarnings: availableEarnings[0]?.total || 0,
        totalListings,
        totalReviews
      }
    });

  } catch (error) {
    console.error("❌ Get provider dashboard summary error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard summary"
    });
  }
};