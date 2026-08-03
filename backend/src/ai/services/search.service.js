// backend/src/ai/services/search.service.js
// ✅ Search Service - Provides listing search functionality

import Listing from '../../models/Listing.js';
import { transformToExperiences } from '../utils/experienceTransformer.js';

/**
 * Search listings based on query
 */
export const searchListings = async (query, options = {}) => {
  const {
    limit = 20,
    page = 1,
    sortBy = 'relevance',
    filters = {}
  } = options;

  try {
    // Build search query
    const searchQuery = buildSearchQuery(query, filters);
    
    // Execute search
    const listings = await Listing.find(searchQuery)
      .populate('provider', 'businessName name avatar verificationStatus')
      .sort(getSortOrder(sortBy))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Transform to Experiences
    const experiences = transformToExperiences(listings);

    // Get total count
    const total = await Listing.countDocuments(searchQuery);

    return {
      experiences,
      listings, // Keep raw listings for services that need them
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Search service error:', error);
    return {
      experiences: [],
      listings: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 0
    };
  }
};

/**
 * Build MongoDB search query
 */
export const buildSearchQuery = (query, filters = {}) => {
  const searchQuery = { status: 'approved' };

  // Text search
  if (query) {
    const keywords = query.split(' ').filter(w => w.length > 2);
    if (keywords.length > 0) {
      searchQuery.$or = [
        { title: { $regex: keywords.join('|'), $options: 'i' } },
        { location: { $regex: keywords.join('|'), $options: 'i' } },
        { description: { $regex: keywords.join('|'), $options: 'i' } },
        { businessType: { $regex: keywords.join('|'), $options: 'i' } },
        { tags: { $in: keywords.map(k => new RegExp(k, 'i')) } }
      ];
    }
  }

  // Filters
  if (filters.businessType) {
    searchQuery.businessType = filters.businessType;
  }

  if (filters.minPrice !== undefined) {
    searchQuery.price = { $gte: filters.minPrice };
  }

  if (filters.maxPrice !== undefined) {
    searchQuery.price = { ...searchQuery.price, $lte: filters.maxPrice };
  }

  if (filters.location) {
    searchQuery.location = { $regex: filters.location, $options: 'i' };
  }

  if (filters.minRating) {
    searchQuery.averageRating = { $gte: filters.minRating };
  }

  if (filters.tags && filters.tags.length > 0) {
    searchQuery.tags = { $in: filters.tags };
  }

  if (filters.isFeatured !== undefined) {
    searchQuery.isFeatured = filters.isFeatured;
  }

  return searchQuery;
};

/**
 * Get sort order
 */
export const getSortOrder = (sortBy) => {
  const sortMap = {
    'relevance': { createdAt: -1 },
    'rating': { averageRating: -1 },
    'price_low': { price: 1 },
    'price_high': { price: -1 },
    'popularity': { bookingCount: -1 },
    'reviews': { totalReviews: -1 },
    'newest': { createdAt: -1 }
  };
  return sortMap[sortBy] || sortMap.relevance;
};

/**
 * Get trending experiences
 */
export const getTrendingExperiences = async (limit = 10) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const listings = await Listing.find({
    status: 'approved',
    createdAt: { $gte: thirtyDaysAgo }
  })
  .sort({ bookingCount: -1, averageRating: -1 })
  .limit(limit)
  .lean();

  return transformToExperiences(listings);
};

/**
 * Get featured experiences
 */
export const getFeaturedExperiences = async (limit = 10) => {
  const listings = await Listing.find({
    status: 'approved',
    isFeatured: true
  })
  .sort({ averageRating: -1 })
  .limit(limit)
  .lean();

  return transformToExperiences(listings);
};

export default {
  searchListings,
  buildSearchQuery,
  getSortOrder,
  getTrendingExperiences,
  getFeaturedExperiences
};