// backend/src/controllers/analyticsController.js
// ✅ UPDATED - Uses Listing instead of Tour

import User from "../models/User.js";
import Listing from "../models/Listing.js"; // ✅ Changed from Tour
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import Payment from "../models/Payment.js";
import Earning from "../models/Earning.js";
import aiAnalytics from "../ai/utils/aiAnalytics.js";
import aiCache from "../ai/utils/aiCache.js";
import aiProvider from "../ai/providers/providerInterface.js";

/* ================= OVERVIEW ANALYTICS ================= */

export const getOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProviders,
      totalTours,
      totalApprovedTours,
      totalPendingTours,
      totalBookings,
      totalRevenue,
      totalReviews,
      totalEarnings
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'PROVIDER' }),
      Listing.countDocuments({ // ✅ Changed from Tour
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Listing.countDocuments({ // ✅ Changed from Tour
        status: 'approved',
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Listing.countDocuments({ // ✅ Changed from Tour
        status: 'pending',
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Booking.countDocuments(),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Review.countDocuments(),
      Earning.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      success: true,
      overview: {
        totalUsers,
        totalProviders,
        totalTours,
        totalApprovedTours,
        totalPendingTours,
        totalBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalReviews,
        totalEarnings: totalEarnings[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= USER STATISTICS ================= */

export const getUserStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProviders,
      newUsersThisMonth,
      newProvidersThisMonth,
      activeUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'PROVIDER' }),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setDate(1)) }
      }),
      User.countDocuments({
        role: 'PROVIDER',
        createdAt: { $gte: new Date(new Date().setDate(1)) }
      }),
      User.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      success: true,
      userStats: {
        totalUsers,
        totalProviders,
        newUsersThisMonth,
        newProvidersThisMonth,
        activeUsers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= TOUR STATISTICS ================= */

export const getTourStats = async (req, res) => {
  try {
    const [
      totalTours,
      approvedTours,
      pendingTours,
      rejectedTours,
      popularTours,
      topRatedTours
    ] = await Promise.all([
      Listing.countDocuments({ // ✅ Changed from Tour
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Listing.countDocuments({ // ✅ Changed from Tour
        status: 'approved',
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Listing.countDocuments({ // ✅ Changed from Tour
        status: 'pending',
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Listing.countDocuments({ // ✅ Changed from Tour
        status: 'rejected',
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Listing.find({ // ✅ Changed from Tour
        status: 'approved',
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      })
        .sort({ likesCount: -1 })
        .limit(5)
        .populate('provider', 'name')
        .lean(),
      Listing.find({ // ✅ Changed from Tour
        status: 'approved',
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      })
        .sort({ averageRating: -1 })
        .limit(5)
        .populate('provider', 'name')
        .lean()
    ]);

    res.json({
      success: true,
      tourStats: {
        totalTours,
        approvedTours,
        pendingTours,
        rejectedTours,
        popularTours,
        topRatedTours
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= BOOKING STATISTICS ================= */

export const getBookingStats = async (req, res) => {
  try {
    const [
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      rejectedBookings,
      monthlyBookings,
      weeklyBookings,
      todayBookings
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.countDocuments({ status: 'rejected' }),
      Booking.countDocuments({
        createdAt: { $gte: new Date(new Date().setDate(1)) }
      }),
      Booking.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      Booking.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);

    res.json({
      success: true,
      bookingStats: {
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        rejectedBookings,
        monthlyBookings,
        weeklyBookings,
        todayBookings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= REVENUE STATISTICS ================= */

export const getRevenueStats = async (req, res) => {
  try {
    const [
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      todayRevenue,
      pendingRevenue,
      platformFee
    ] = await Promise.all([
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Booking.aggregate([
        { 
          $match: { 
            status: 'confirmed',
            createdAt: { $gte: new Date(new Date().setDate(1)) }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Booking.aggregate([
        { 
          $match: { 
            status: 'confirmed',
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Booking.aggregate([
        { 
          $match: { 
            status: 'confirmed',
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Booking.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$totalPrice', 0.1] } } } }
      ])
    ]);

    res.json({
      success: true,
      revenueStats: {
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        weeklyRevenue: weeklyRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        pendingRevenue: pendingRevenue[0]?.total || 0,
        platformFee: platformFee[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= PROVIDER ANALYTICS ================= */

export const getProviderAnalytics = async (req, res) => {
  try {
    const providerId = req.user._id;

    // ✅ Get listing IDs for this provider
    const listingIds = await Listing.find({
      provider: providerId,
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    }).distinct('_id');

    const [
      totalTours,
      totalBookings,
      totalRevenue,
      totalEarnings,
      averageRating,
      totalReviews,
      totalTravelers
    ] = await Promise.all([
      Listing.countDocuments({ // ✅ Changed from Tour
        provider: providerId,
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      }),
      Booking.countDocuments({ provider: providerId }),
      Booking.aggregate([
        { $match: { provider: providerId, status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Earning.aggregate([
        { $match: { provider: providerId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Listing.aggregate([ // ✅ Changed from Tour
        { 
          $match: { 
            provider: providerId,
            businessType: { $in: ['tour_operator', 'guide', 'transport'] }
          }
        },
        { $group: { _id: null, avg: { $avg: '$averageRating' } } }
      ]),
      Review.countDocuments({
        listing: { $in: listingIds } // ✅ Changed from 'tour' to 'listing'
      }),
      Booking.distinct('user', { provider: providerId, status: 'confirmed' })
    ]);

    res.json({
      success: true,
      providerAnalytics: {
        totalTours,
        totalBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalEarnings: totalEarnings[0]?.total || 0,
        averageRating: averageRating[0]?.avg || 0,
        totalReviews,
        totalTravelers: totalTravelers.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GROWTH STATISTICS ================= */

export const getGrowthStats = async (req, res) => {
  try {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0)
      });
    }

    const growthData = await Promise.all(
      months.map(async (m) => {
        const [
          newUsers,
          newProviders,
          newTours,
          newBookings,
          revenue
        ] = await Promise.all([
          User.countDocuments({
            createdAt: { $gte: m.start, $lte: m.end }
          }),
          User.countDocuments({
            role: 'PROVIDER',
            createdAt: { $gte: m.start, $lte: m.end }
          }),
          Listing.countDocuments({ // ✅ Changed from Tour
            businessType: { $in: ['tour_operator', 'guide', 'transport'] },
            createdAt: { $gte: m.start, $lte: m.end }
          }),
          Booking.countDocuments({
            createdAt: { $gte: m.start, $lte: m.end }
          }),
          Booking.aggregate([
            { 
              $match: { 
                status: 'confirmed',
                createdAt: { $gte: m.start, $lte: m.end }
              }
            },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
          ])
        ]);

        return {
          month: m.month,
          year: m.year,
          newUsers,
          newProviders,
          newTours,
          newBookings,
          revenue: revenue[0]?.total || 0
        };
      })
    );

    res.json({
      success: true,
      growthData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= TOP PERFORMERS ================= */

export const getTopPerformers = async (req, res) => {
  try {
    const topProviders = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: '$provider',
          totalRevenue: { $sum: '$totalPrice' },
          totalBookings: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'provider'
        }
      },
      { $unwind: '$provider' },
      {
        $project: {
          'provider.name': 1,
          'provider.email': 1,
          'provider.profileImage': 1,
          totalRevenue: 1,
          totalBookings: 1
        }
      }
    ]);

    const topTours = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: '$listing', // ✅ Changed from 'tour' to 'listing'
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'listings', // ✅ Changed from 'tours' to 'listings'
          localField: '_id',
          foreignField: '_id',
          as: 'listing'
        }
      },
      { $unwind: '$listing' },
      {
        $project: {
          'listing.title': 1,
          'listing.location': 1,
          'listing.price': 1,
          'listing.coverImage': 1,
          totalBookings: 1,
          totalRevenue: 1
        }
      }
    ]);

    res.json({
      success: true,
      topPerformers: {
        topProviders,
        topTours
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= AI ANALYTICS ================= */

export const getAIAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const stats = aiAnalytics.getStats();
    const cacheStats = aiCache.getStats();
    const providerInfo = aiProvider.getProviderInfo();

    res.json({
      success: true,
      analytics: stats,
      cache: cacheStats,
      provider: providerInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= RESET AI ANALYTICS ================= */

export const resetAIAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    aiAnalytics.reset();

    res.json({
      success: true,
      message: 'AI analytics reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= CLEAR AI CACHE ================= */

export const clearAICache = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { prefix } = req.query;
    const cleared = aiCache.clear(prefix);

    res.json({
      success: true,
      message: `Cache cleared: ${cleared} items removed`,
      cleared
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};