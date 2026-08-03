// backend/src/controllers/publicReviewController.js
// ✅ FIXED - Performance optimized

import Review from '../models/Review.js';

export const getPublicReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'latest',
      rating,
      search,
      listingId,
      providerId
    } = req.query;

    // ✅ Parse limit - cap at 50 to prevent abuse
    const parsedLimit = Math.min(parseInt(limit) || 20, 50);
    const parsedPage = parseInt(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    // ─── Build filter ──────────────────────────────────────────────
    const filter = { status: 'published' };

    if (listingId) filter.listing = listingId;
    if (providerId) filter.provider = providerId;
    if (rating) filter.rating = parseInt(rating);
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } }
      ];
    }

    // ─── Sort options ──────────────────────────────────────────────
    const sortOptions = {
      latest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      highest: { rating: -1 },
      lowest: { rating: 1 },
      helpful: { helpfulCount: -1 }
    };
    const sortObj = sortOptions[sort] || { createdAt: -1 };

    // ✅ Run queries in parallel for better performance
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .select('rating title comment images createdAt helpfulCount traveler listing provider') // ✅ Select only needed fields
        .populate('traveler', 'name avatar') // ✅ Only get name and avatar
        .populate('listing', 'title slug coverImage') // ✅ Only get title and slug
        .sort(sortObj)
        .skip(skip)
        .limit(parsedLimit)
        .lean(), // ✅ Use lean() for better performance
      Review.countDocuments(filter)
    ]);

    res.json({
      success: true,
      reviews,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('❌ Get public reviews error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const getPublicReviewById = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      status: 'published'
    })
      .select('rating title comment images createdAt helpfulCount traveler listing provider providerResponse') // ✅ Select needed fields
      .populate('traveler', 'name avatar')
      .populate('listing', 'title slug coverImage')
      .populate('provider', 'name businessName avatar')
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({ success: true, review });
  } catch (error) {
    console.error('❌ Get public review by id error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getListingReviews = async (req, res) => {
  try {
    const { listingId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    const sort = req.query.sort === 'highest' ? { rating: -1 } : { createdAt: -1 };

    const filter = { listing: listingId, status: 'published' };

    // ✅ Run queries in parallel
    const [reviews, total, stats] = await Promise.all([
      Review.find(filter)
        .select('rating title comment images createdAt helpfulCount traveler')
        .populate('traveler', 'name avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      Review.getListingStats(listingId)
    ]);

    res.json({
      success: true,
      reviews,
      stats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Get listing reviews error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const filter = { provider: providerId, status: 'published' };

    // ✅ Run queries in parallel
    const [reviews, total, stats] = await Promise.all([
      Review.find(filter)
        .select('rating title comment images createdAt helpfulCount traveler listing')
        .populate('traveler', 'name avatar')
        .populate('listing', 'title slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      Review.getProviderStats(providerId)
    ]);

    res.json({
      success: true,
      reviews,
      stats: stats[0] || null,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Get provider reviews error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReviewStats = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    let stats;
    if (entityType === 'listing') {
      stats = await Review.getListingStats(entityId);
    } else if (entityType === 'provider') {
      const result = await Review.getProviderStats(entityId);
      stats = result[0] || null;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type'
      });
    }

    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Get review stats error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};