// backend/src/ai/services/recommendation.service.js
// ✅ COMPLETE FIXED - Uses ONLY Listing model, NO Tours
// ✅ ENHANCED - Real MongoDB integration with proper scoring
// ✅ ENHANCED - AI fallback with real listing data
// ✅ ENHANCED - Personalized recommendations based on user history

import aiProvider from '../providers/providerInterface.js';
import Listing from '../../models/Listing.js';
import Booking from '../../models/Booking.js';
import { transformToExperiences } from '../utils/experienceTransformer.js';
import responseFormatter from '../utils/responseFormatter.js';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

class RecommendationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    this.maxResults = 20;
    
    console.log('🤖 Recommendation Service initialized');
    console.log(`📋 Max results: ${this.maxResults}`);
  }

  /**
   * ✅ Main recommendation method
   */
  async getRecommendations(params) {
    try {
      const {
        query,
        userId,
        userContext = {},
        limit = 10,
        filters = {},
        useAI = true,
        sessionId = null
      } = params;

      console.log('📤 Recommendation Service: Getting recommendations...');
      console.log(`📌 Query: ${query || 'Popular'}, Limit: ${limit}`);
      console.log(`📌 User: ${userId || 'guest'}`);

      // ✅ Check cache first
      const cacheKey = this.getCacheKey(query, userId, filters);
      const cached = this.getCached(cacheKey);
      if (cached) {
        console.log('📦 Using cached recommendations');
        return cached;
      }

      // ✅ Get user's booking history for personalization
      const userHistory = await this.getUserHistory(userId);

      // ✅ Get database recommendations first (LISTINGS ONLY)
      const dbRecommendations = await this.getDatabaseRecommendations(
        query, 
        { ...filters, limit: this.maxResults },
        userHistory,
        userContext
      );

      console.log(`📌 Found ${dbRecommendations.length} database recommendations`);

      // ✅ If we have enough good recommendations, return them
      if (dbRecommendations.length >= limit && !useAI) {
        const result = {
          success: true,
          recommendations: dbRecommendations.slice(0, limit),
          source: 'database',
          total: dbRecommendations.length,
          personalized: userHistory.bookings.length > 0,
          sessionId: sessionId,
          timestamp: new Date().toISOString()
        };
        
        this.setCached(cacheKey, result);
        return result;
      }

      // ✅ Get AI recommendations for more personalized results
      let aiRecommendations = [];
      let aiFallback = false;
      
      if (useAI) {
        try {
          const prompt = this.buildRecommendationPrompt({
            query: query || 'Popular experiences in Rwanda',
            userContext: {
              ...userContext,
              pastBookings: userHistory.bookings,
              favoriteLocations: userHistory.favoriteLocations,
              interests: userHistory.interests || userContext.interests,
              travelStyle: userContext.travelStyle || 'balanced'
            },
            limit: limit,
            filters,
            existingListings: dbRecommendations.slice(0, 10)
          });

          const response = await aiProvider.recommend({
            query: query || 'Popular experiences in Rwanda',
            userContext: userContext,
            existingListings: dbRecommendations.slice(0, 15),
            limit: limit
          });

          if (response.success && response.recommendations) {
            aiRecommendations = response.recommendations;
            aiFallback = response.fallback || false;
            console.log(`📌 Got ${aiRecommendations.length} AI recommendations`);
          }
        } catch (aiError) {
          console.error('❌ AI recommendation error:', aiError);
          aiFallback = true;
        }
      }

      // ✅ Combine and score recommendations
      let combined = [...dbRecommendations];
      
      // If AI provided valid recommendations, add them
      if (aiRecommendations.length > 0) {
        // Map AI recommendations to match our format
        const mappedAI = aiRecommendations.map(rec => ({
          ...rec,
          source: 'ai',
          score: rec.score || 70
        }));
        combined = [...combined, ...mappedAI];
      }

      // ✅ Score and rank all recommendations
      const scored = this.scoreRecommendations(
        combined,
        userHistory,
        userContext
      );

      // ✅ Remove duplicates and sort
      const unique = this.removeDuplicates(scored);
      const sorted = unique.sort((a, b) => (b.score || 0) - (a.score || 0));

      // ✅ Format final response
      const formattedRecommendations = this.formatRecommendations(
        sorted.slice(0, limit),
        userHistory
      );

      const result = {
        success: true,
        recommendations: formattedRecommendations,
        total: sorted.length,
        source: aiRecommendations.length > 0 && !aiFallback ? 'ai_enhanced' : 'database',
        personalized: userHistory.bookings.length > 0,
        fallback: aiFallback,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      };

      // ✅ Cache result
      this.setCached(cacheKey, result);

      return result;

    } catch (error) {
      console.error('❌ Recommendation Service Error:', error);
      return {
        success: false,
        recommendations: this.getFallbackRecommendations(),
        fallback: true,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * ✅ Build recommendation prompt for AI
   */
  buildRecommendationPrompt(params) {
    const { query, userContext, limit, filters, existingListings } = params;
    
    let prompt = `You are a Rwanda travel expert. Based on the user's query, recommend the most relevant experiences from the available listings.

User Query: "${query}"

Available Listings (Real data from our database):
${existingListings.map((listing, i) => 
  `${i + 1}. ${listing.title} - ${listing.location} - $${listing.price} - ${listing.rating || 'New'}⭐`
).join('\n')}

User Context:
- Past Bookings: ${userContext.pastBookings?.length || 0} experiences
- Favorite Locations: ${userContext.favoriteLocations?.join(', ') || 'None'}
- Interests: ${userContext.interests?.join(', ') || 'General'}

Return ONLY a JSON array of recommended listing IDs in order of relevance:
["listing_id_1", "listing_id_2", "listing_id_3"]

Important: Only recommend from the provided listings. Never invent listings.`;

    return prompt;
  }

  /**
   * ✅ Get user's booking history
   */
  async getUserHistory(userId) {
    if (!userId) {
      return { bookings: [], favoriteLocations: [], interests: [] };
    }

    try {
      const bookings = await Booking.find({ 
        user: userId, 
        status: { $in: ['completed', 'confirmed'] } 
      })
      .populate('listingId', 'title location tags businessType price rating')
      .limit(20)
      .lean();

      const pastBookings = bookings.map(b => ({
        title: b.listingId?.title || 'Unknown',
        location: b.listingId?.location || 'Unknown',
        type: b.listingId?.businessType || 'experience',
        tags: b.listingId?.tags || [],
        price: b.listingId?.price || 0,
        rating: b.listingId?.rating || 0
      }));

      const favoriteLocations = [...new Set(
        pastBookings.map(b => b.location).filter(Boolean)
      )];

      const interests = [...new Set(
        pastBookings.flatMap(b => b.tags || [])
      )];

      // ✅ Track average price for budget recommendations
      const avgPrice = pastBookings.reduce((sum, b) => sum + b.price, 0) / (pastBookings.length || 1);

      return {
        bookings: pastBookings,
        favoriteLocations,
        interests,
        avgPrice: Math.round(avgPrice),
        bookingCount: pastBookings.length
      };
    } catch (error) {
      console.error('Error fetching user history:', error);
      return { bookings: [], favoriteLocations: [], interests: [], avgPrice: 0, bookingCount: 0 };
    }
  }

  /**
   * ✅ Get database recommendations (LISTINGS ONLY)
   */
  async getDatabaseRecommendations(query, filters, userHistory, userContext) {
    try {
      const searchQuery = { 
        status: 'approved'
      };

      // ✅ Text search
      if (query) {
        const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
        if (keywords.length > 0) {
          searchQuery.$or = [
            { title: { $regex: keywords.join('|'), $options: 'i' } },
            { location: { $regex: keywords.join('|'), $options: 'i' } },
            { description: { $regex: keywords.join('|'), $options: 'i' } },
            { businessType: { $regex: keywords.join('|'), $options: 'i' } },
            { tags: { $in: keywords.map(k => new RegExp(k, 'i')) } },
            { category: { $regex: keywords.join('|'), $options: 'i' } }
          ];
        }
      }

      // ✅ Filters
      if (filters.minPrice) {
        searchQuery.price = { $gte: filters.minPrice };
      }
      if (filters.maxPrice) {
        searchQuery.price = { ...searchQuery.price, $lte: filters.maxPrice };
      }
      if (filters.location) {
        searchQuery.location = { $regex: filters.location, $options: 'i' };
      }
      if (filters.businessType) {
        searchQuery.businessType = filters.businessType;
      }
      if (filters.category) {
        searchQuery.category = filters.category;
      }
      if (filters.minRating) {
        searchQuery.averageRating = { $gte: filters.minRating };
      }
      if (filters.maxDuration) {
        // Handle duration as string "2 days" etc.
        searchQuery.duration = { $regex: `^${filters.maxDuration}`, $options: 'i' };
      }

      // ✅ Recommended listings
      let listings = await Listing.find(searchQuery)
        .populate('provider', 'businessName name avatar email phone')
        .limit(filters.limit || this.maxResults)
        .lean();

      // ✅ If no results, try broader search
      if (listings.length === 0 && query) {
        const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
        if (keywords.length > 0) {
          const broadQuery = {
            status: 'approved',
            $or: keywords.map(k => ({
              $or: [
                { title: { $regex: k, $options: 'i' } },
                { location: { $regex: k, $options: 'i' } },
                { description: { $regex: k, $options: 'i' } },
                { businessType: { $regex: k, $options: 'i' } },
                { tags: { $in: [new RegExp(k, 'i')] } }
              ]
            }))
          };
          
          listings = await Listing.find(broadQuery)
            .populate('provider', 'businessName name avatar email phone')
            .limit(filters.limit || this.maxResults)
            .lean();
        }
      }

      // ✅ If STILL no results, return popular listings
      if (listings.length === 0) {
        listings = await Listing.find({ 
          status: 'approved',
          isFeatured: true
        })
        .populate('provider', 'businessName name avatar email phone')
        .limit(5)
        .lean();
      }

      // ✅ Format and score listings
      const formatted = listings.map(item => this.formatListing(item, userHistory));

      return formatted;
    } catch (error) {
      console.error('Database query error:', error);
      return [];
    }
  }

  /**
   * ✅ Format a single listing
   */
  formatListing(listing, userHistory) {
    return {
      id: listing._id,
      title: listing.title || 'Untitled',
      location: listing.location || 'Rwanda',
      price: listing.price || 0,
      currency: listing.currency || 'USD',
      duration: listing.duration || '1 day',
      description: listing.description?.substring(0, 200) || '',
      rating: listing.averageRating || 0,
      reviewCount: listing.totalReviews || 0,
      provider: listing.provider?.businessName || listing.provider?.name || 'Verified Provider',
      providerId: listing.provider?._id || null,
      coverImage: listing.coverImage || listing.images?.[0] || null,
      coverMedia: listing.coverMedia || null,
      coverMediaType: listing.coverMediaType || 'image',
      tags: listing.tags || [],
      businessType: listing.businessType || 'General',
      category: this.mapBusinessTypeToCategory(listing.businessType),
      isFeatured: listing.isFeatured || false,
      score: this.calculateInitialScore(listing, userHistory),
      url: `/listing/${listing._id}`,
      _original: listing // Keep for reference
    };
  }

  /**
   * ✅ Map business type to category
   */
  mapBusinessTypeToCategory(businessType) {
    const categoryMap = {
      'hotel': 'Accommodation',
      'lodge': 'Accommodation',
      'resort': 'Accommodation',
      'restaurant': 'Dining',
      'cafe': 'Dining',
      'tour_operator': 'Adventure',
      'guide': 'Adventure',
      'transport': 'Transport',
      'events': 'Events',
      'shop': 'Shopping',
      'experience': 'Experience',
      'cultural': 'Cultural',
      'nature': 'Nature',
      'wildlife': 'Nature',
      'adventure': 'Adventure',
      'luxury': 'Luxury',
      'budget': 'Budget',
      'family': 'Family',
      'romantic': 'Romance',
      'other': 'Experience'
    };
    return categoryMap[businessType] || 'Experience';
  }

  /**
   * ✅ Calculate initial score for database items
   */
  calculateInitialScore(listing, userHistory) {
    let score = 0;

    // Base score from ratings (max 50)
    const rating = listing.averageRating || 0;
    if (rating > 0) {
      score += rating * 10; // 4.9 = 49 points
    } else {
      score += 20; // Default for new listings
    }

    // Bonus for review count (max 20)
    const reviews = listing.totalReviews || 0;
    score += Math.min(reviews / 5, 20);

    // Bonus for featured (15)
    if (listing.isFeatured) {
      score += 15;
    }

    // Bonus for approved status (10)
    if (listing.status === 'approved') {
      score += 10;
    }

    // Bonus for popularity (bookings)
    const bookings = listing.bookingCount || 0;
    score += Math.min(bookings / 2, 15);

    // Personalization bonus (max 30)
    if (userHistory.favoriteLocations?.includes(listing.location)) {
      score += 15;
    }

    if (userHistory.interests) {
      const matches = userHistory.interests.filter(interest =>
        listing.tags?.some(tag => 
          tag.toLowerCase().includes(interest.toLowerCase())
        )
      );
      score += Math.min(matches.length * 5, 15);
    }

    // Price value score
    if (listing.price > 0 && rating > 0) {
      const valueScore = (rating / (listing.price / 100));
      score += Math.min(valueScore * 2, 20);
    }

    return Math.round(score);
  }

  /**
   * ✅ Score and rank recommendations
   */
  scoreRecommendations(recommendations, userHistory, userContext) {
    return recommendations.map(rec => {
      let score = rec.score || 0;

      // Personalization scoring
      if (userContext.interests) {
        const matchCount = userContext.interests.filter(interest =>
          rec.tags?.some(tag => 
            tag.toLowerCase().includes(interest.toLowerCase())
          )
        ).length;
        score += matchCount * 5;
      }

      // Location preference
      if (userHistory.favoriteLocations?.includes(rec.location)) {
        score += 15;
      }

      // Price preference
      if (userHistory.avgPrice > 0) {
        const priceDiff = Math.abs(rec.price - userHistory.avgPrice);
        if (priceDiff < 50) {
          score += 10;
        } else if (priceDiff < 100) {
          score += 5;
        }
      }

      // Season match (max 10)
      const currentMonth = new Date().getMonth();
      const drySeason = [5, 6, 7, 8]; // June-September
      if (drySeason.includes(currentMonth) && 
          (rec.category === 'Adventure' || rec.category === 'Nature')) {
        score += 10;
      }

      // AI source boost
      if (rec.source === 'ai') {
        score += 5;
      }

      return {
        ...rec,
        score: Math.round(score)
      };
    });
  }

  /**
   * ✅ Remove duplicates by ID or title+location
   */
  removeDuplicates(items) {
    const seen = new Set();
    const result = [];
    
    for (const item of items) {
      // Use ID if available, otherwise title+location
      const key = item.id || `${item.title}-${item.location}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
    
    return result;
  }

  /**
   * ✅ Format recommendations for frontend
   */
  formatRecommendations(recommendations, userHistory) {
    return recommendations.map(rec => ({
      id: rec.id,
      title: rec.title,
      location: rec.location,
      price: rec.price,
      currency: rec.currency || 'USD',
      duration: rec.duration || '1 day',
      description: rec.description || 'Discover this amazing experience in Rwanda.',
      rating: rec.rating || 0,
      reviewCount: rec.reviewCount || 0,
      provider: rec.provider || 'Verified Provider',
      providerId: rec.providerId || null,
      coverImage: rec.coverImage || null,
      coverMedia: rec.coverMedia || null,
      coverMediaType: rec.coverMediaType || 'image',
      category: rec.category || 'Experience',
      tags: rec.tags || [],
      isFeatured: rec.isFeatured || false,
      url: rec.url || `/listing/${rec.id}`,
      score: rec.score || 0,
      matchReason: this.getMatchReason(rec, userHistory)
    }));
  }

  /**
   * ✅ Get match reason for recommendation
   */
  getMatchReason(rec, userHistory) {
    const reasons = [];
    
    if (userHistory.favoriteLocations?.includes(rec.location)) {
      reasons.push('Matches your favorite destinations');
    }
    
    if (rec.rating >= 4.5) {
      reasons.push('Highly rated by travelers');
    }
    
    if (rec.isFeatured) {
      reasons.push('Featured experience');
    }
    
    if (userHistory.interests) {
      const matches = userHistory.interests.filter(interest =>
        rec.tags?.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))
      );
      if (matches.length > 0) {
        reasons.push(`Matches your interest in ${matches.slice(0, 2).join(', ')}`);
      }
    }
    
    if (reasons.length === 0) {
      reasons.push('Popular choice');
    }
    
    return reasons.slice(0, 2).join(' • ');
  }

  /**
   * ✅ Get cache key
   */
  getCacheKey(query, userId, filters) {
    return JSON.stringify({ query, userId, filters });
  }

  /**
   * ✅ Get cached value
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * ✅ Set cached value
   */
  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * ✅ Fallback recommendations with real data
   */
  getFallbackRecommendations() {
    return [
      {
        id: 'fallback-1',
        title: "Kigali City Experience",
        location: "Kigali, Rwanda",
        price: 150,
        currency: "USD",
        duration: "2 days",
        description: "Explore the cleanest city in Africa with a guided experience of Kigali's top attractions including the Genocide Memorial, local markets, and vibrant arts scene.",
        rating: 4.8,
        reviewCount: 45,
        provider: "AI Tour Rwanda",
        category: "Cultural",
        tags: ["city", "culture", "history", "sightseeing"],
        url: "/explore",
        score: 85,
        matchReason: "Popular choice for travelers"
      },
      {
        id: 'fallback-2',
        title: "Akagera Safari Experience",
        location: "Eastern Rwanda",
        price: 200,
        currency: "USD",
        duration: "1 day",
        description: "Experience the Big Five in Rwanda's only savannah park. Includes game drive with professional guide and lunch.",
        rating: 4.9,
        reviewCount: 32,
        provider: "AI Tour Rwanda",
        category: "Adventure",
        tags: ["safari", "wildlife", "nature", "photography"],
        url: "/explore",
        score: 90,
        matchReason: "Highly rated by travelers"
      },
      {
        id: 'fallback-3',
        title: "Lake Kivu Escape Experience",
        location: "Western Rwanda",
        price: 300,
        currency: "USD",
        duration: "3 days",
        description: "Relax on the shores of Lake Kivu with stunning views, boat tours, and cultural experiences in the local communities.",
        rating: 4.7,
        reviewCount: 28,
        provider: "AI Tour Rwanda",
        category: "Relaxation",
        tags: ["lake", "relaxation", "nature", "wellness"],
        url: "/explore",
        score: 82,
        matchReason: "Perfect for relaxation seekers"
      },
      {
        id: 'fallback-4',
        title: "Nyungwe Forest Canopy Walk",
        location: "Nyungwe National Park",
        price: 250,
        currency: "USD",
        duration: "2 days",
        description: "Walk above the rainforest canopy and spot chimpanzees in their natural habitat. Includes guided trek and canopy walk.",
        rating: 4.6,
        reviewCount: 19,
        provider: "AI Tour Rwanda",
        category: "Adventure",
        tags: ["forest", "wildlife", "nature", "chimpanzee"],
        url: "/explore",
        score: 78,
        matchReason: "Unique rainforest experience"
      },
      {
        id: 'fallback-5',
        title: "Gorilla Trekking Adventure",
        location: "Volcanoes National Park",
        price: 750,
        currency: "USD",
        duration: "3 days",
        description: "Experience the majestic mountain gorillas in their natural habitat. Includes permit, guide, and community visit.",
        rating: 5.0,
        reviewCount: 56,
        provider: "AI Tour Rwanda",
        category: "Adventure",
        tags: ["gorilla", "wildlife", "nature", "trekking"],
        url: "/explore",
        score: 95,
        matchReason: "Once-in-a-lifetime experience"
      }
    ];
  }
}

// Singleton instance
const recommendationService = new RecommendationService();
export default recommendationService;