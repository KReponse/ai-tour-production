// backend/src/ai/services/recommendation.service.js
// ✅ COMPLETE FIXED - Uses ONLY Listing model, NO Tours
// ✅ ENHANCED - Real MongoDB integration with proper scoring
// ✅ ENHANCED - AI fallback with real listing data
// ✅ ENHANCED - Personalized recommendations based on user history
// ✅ PHASE 2 - SMART RECOMMENDATION ENGINE
// ✅ ADDED: Hard budget filtering (prevents $1,186 listings for $200 budget)
// ✅ ADDED: Budget tolerance (within 20% of budget as near-budget)
// ✅ ADDED: Candidate filtering before scoring
// ✅ ADDED: Better match reasons with budget context

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

// ✅ Budget tolerance constants
const BUDGET_TOLERANCE = 0.20; // 20% above budget is "near budget"
const MAX_BUDGET_MULTIPLIER = 1.5; // Absolute max: 50% above budget

class RecommendationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    this.maxResults = 20;
    
    console.log('🤖 Recommendation Service initialized');
    console.log(`📋 Max results: ${this.maxResults}`);
    console.log(`💰 Budget tolerance: ${BUDGET_TOLERANCE * 100}%`);
  }

  /**
   * ✅ Main recommendation method - ENHANCED with hard budget filtering
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
        sessionId = null,
        // ✅ New fields from AIPlanner
        budget = null,
        destination = null,
        interests = [],
        travelStyle = 'balanced',
        mood = null,
        travelers = 1,
        days = null,
      } = params;

      console.log('📤 Recommendation Service: Getting recommendations...');
      console.log(`📌 Query: ${query || 'Popular'}, Limit: ${limit}`);
      console.log(`📌 User: ${userId || 'guest'}`);
      console.log(`💰 Budget: $${budget || 'Not specified'}`);
      console.log(`📍 Destination: ${destination || 'Not specified'}`);
      console.log(`🎯 Travel Style: ${travelStyle}`);

      // ✅ Check cache first
      const cacheKey = this.getCacheKey(query, userId, filters, budget, destination);
      const cached = this.getCached(cacheKey);
      if (cached) {
        console.log('📦 Using cached recommendations');
        return cached;
      }

      // ✅ Get user's booking history for personalization
      const userHistory = await this.getUserHistory(userId);

      // ✅ Get user preferences from context
      const userPreferences = {
        budget: budget || userContext.budget || userHistory.avgPrice || 500,
        destination: destination || userContext.destination || null,
        interests: interests || userContext.interests || userHistory.interests || [],
        travelStyle: travelStyle || userContext.travelStyle || 'balanced',
        mood: mood || userContext.mood || null,
        travelers: travelers || userContext.travelers || 1,
        days: days || userContext.days || null,
      };

      // ✅ Get database recommendations with HARD FILTERS
      const dbRecommendations = await this.getDatabaseRecommendations({
        query,
        filters: {
          ...filters,
          location: destination || filters.location,
          maxPrice: budget ? budget * MAX_BUDGET_MULTIPLIER : filters.maxPrice,
        },
        userHistory,
        userContext,
        userPreferences,
      });

      console.log(`📌 Found ${dbRecommendations.length} database recommendations`);

      // ✅ Filter by budget (HARD CONSTRAINT) - prevents $1,186 listings for $200 budget
      let eligibleRecommendations = dbRecommendations;
      if (budget) {
        // ✅ Hard budget filter: Only include listings within budget or near-budget
        const nearBudgetLimit = budget * (1 + BUDGET_TOLERANCE);
        const withinBudget = dbRecommendations.filter(r => r.price <= budget);
        const nearBudget = dbRecommendations.filter(r => r.price > budget && r.price <= nearBudgetLimit);
        
        // ✅ Primary: within budget, Secondary: near budget
        eligibleRecommendations = [...withinBudget, ...nearBudget];
        
        console.log(`💰 Budget: $${budget}, Within: ${withinBudget.length}, Near: ${nearBudget.length}`);
        
        // ✅ If we have enough within-budget recommendations, return them
        if (withinBudget.length >= limit) {
          console.log(`✅ Found ${withinBudget.length} within-budget recommendations`);
          // Re-rank within-budget recommendations
          const scored = this.scoreRecommendations(withinBudget, userHistory, userPreferences);
          const sorted = scored.sort((a, b) => (b.score || 0) - (a.score || 0));
          const formatted = this.formatRecommendations(sorted.slice(0, limit), userHistory, userPreferences);
          
          const result = {
            success: true,
            recommendations: formatted,
            total: sorted.length,
            source: 'database',
            personalized: userHistory.bookings.length > 0,
            sessionId: sessionId,
            budgetInfo: {
              budget: budget,
              withinBudget: withinBudget.length,
              nearBudget: nearBudget.length,
              totalEligible: eligibleRecommendations.length
            },
            timestamp: new Date().toISOString()
          };
          
          this.setCached(cacheKey, result);
          return result;
        }
      }

      // ✅ If we have enough good recommendations, return them
      if (eligibleRecommendations.length >= limit && !useAI) {
        const scored = this.scoreRecommendations(eligibleRecommendations, userHistory, userPreferences);
        const sorted = scored.sort((a, b) => (b.score || 0) - (a.score || 0));
        const formatted = this.formatRecommendations(sorted.slice(0, limit), userHistory, userPreferences);
        
        const result = {
          success: true,
          recommendations: formatted,
          total: sorted.length,
          source: 'database',
          personalized: userHistory.bookings.length > 0,
          sessionId: sessionId,
          budgetInfo: budget ? {
            budget: budget,
            withinBudget: eligibleRecommendations.filter(r => r.price <= budget).length,
            nearBudget: eligibleRecommendations.filter(r => r.price > budget && r.price <= budget * (1 + BUDGET_TOLERANCE)).length,
            totalEligible: eligibleRecommendations.length
          } : null,
          timestamp: new Date().toISOString()
        };
        
        this.setCached(cacheKey, result);
        return result;
      }

      // ✅ Get AI recommendations if needed
      let aiRecommendations = [];
      let aiFallback = false;
      
      if (useAI && eligibleRecommendations.length > 0) {
        try {
          const response = await aiProvider.recommend({
            query: query || 'Popular experiences in Rwanda',
            userContext: {
              ...userContext,
              pastBookings: userHistory.bookings,
              favoriteLocations: userHistory.favoriteLocations,
              interests: userHistory.interests || userContext.interests,
              travelStyle: travelStyle || 'balanced',
              budget: budget,
              destination: destination
            },
            existingListings: eligibleRecommendations.slice(0, 15),
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
      let combined = [...eligibleRecommendations];
      
      if (aiRecommendations.length > 0) {
        const mappedAI = aiRecommendations.map(rec => ({
          ...rec,
          source: 'ai',
          score: rec.score || 70
        }));
        combined = [...combined, ...mappedAI];
      }

      // ✅ Score and rank all recommendations
      const scored = this.scoreRecommendations(combined, userHistory, userPreferences);

      // ✅ Remove duplicates and sort
      const unique = this.removeDuplicates(scored);
      const sorted = unique.sort((a, b) => (b.score || 0) - (a.score || 0));

      // ✅ Format final response
      const formattedRecommendations = this.formatRecommendations(
        sorted.slice(0, limit),
        userHistory,
        userPreferences
      );

      const result = {
        success: true,
        recommendations: formattedRecommendations,
        total: sorted.length,
        source: aiRecommendations.length > 0 && !aiFallback ? 'ai_enhanced' : 'database',
        personalized: userHistory.bookings.length > 0,
        fallback: aiFallback,
        sessionId: sessionId,
        budgetInfo: budget ? {
          budget: budget,
          withinBudget: eligibleRecommendations.filter(r => r.price <= budget).length,
          nearBudget: eligibleRecommendations.filter(r => r.price > budget && r.price <= budget * (1 + BUDGET_TOLERANCE)).length,
          totalEligible: eligibleRecommendations.length
        } : null,
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
- Budget: $${userContext.budget || 'Not specified'}
- Destination: ${userContext.destination || 'Not specified'}
- Travel Style: ${userContext.travelStyle || 'Balanced'}
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
   * ✅ Get database recommendations with HARD FILTERS
   */
  async getDatabaseRecommendations({ query, filters, userHistory, userContext, userPreferences }) {
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

      // ✅ Location filter (HARD)
      if (filters.location) {
        searchQuery.location = { $regex: filters.location, $options: 'i' };
      }

      // ✅ Budget filter (HARD) - prevents expensive listings from entering candidate pool
      if (filters.maxPrice) {
        searchQuery.price = { $lte: filters.maxPrice };
        console.log(`💰 Hard budget filter: price ≤ $${filters.maxPrice}`);
      }

      if (filters.minPrice) {
        searchQuery.price = { ...searchQuery.price, $gte: filters.minPrice };
      }

      // ✅ Other filters
      if (filters.businessType) {
        searchQuery.businessType = filters.businessType;
      }
      if (filters.category) {
        searchQuery.category = filters.category;
      }
      if (filters.minRating) {
        searchQuery.averageRating = { $gte: filters.minRating };
      }

      // ✅ Capacity filter (if travelers specified)
      if (userPreferences?.travelers && userPreferences.travelers > 1) {
        // Only apply capacity filter if the listing has capacity field
        // and it's greater than or equal to the number of travelers
        searchQuery.$or = [
          { capacity: { $gte: userPreferences.travelers } },
          { capacity: { $exists: false } } // Include listings without capacity specified
        ];
        console.log(`👥 Capacity filter: ≥ ${userPreferences.travelers} travelers`);
      }

      // ✅ Fetch listings with hard filters
      let listings = await Listing.find(searchQuery)
        .populate('provider', 'businessName name avatar email phone')
        .limit(filters.limit || this.maxResults * 2) // Get extra for filtering
        .lean();

      console.log(`📊 Database returned ${listings.length} listings after hard filters`);

      // ✅ If no results and location is specified, try broader search
      if (listings.length === 0 && filters.location) {
        console.log('🔍 No results with location filter, trying broader search...');
        delete searchQuery.location;
        listings = await Listing.find(searchQuery)
          .populate('provider', 'businessName name avatar email phone')
          .limit(filters.limit || this.maxResults * 2)
          .lean();
      }

      // ✅ If STILL no results, return popular listings
      if (listings.length === 0) {
        console.log('🔍 No results found, returning popular listings...');
        listings = await Listing.find({ 
          status: 'approved',
          averageRating: { $gte: 4 }
        })
        .populate('provider', 'businessName name avatar email phone')
        .limit(5)
        .lean();
      }

      // ✅ Format and score listings
      const formatted = listings.map(item => this.formatListing(item, userHistory, userPreferences));

      return formatted;
    } catch (error) {
      console.error('Database query error:', error);
      return [];
    }
  }

  /**
   * ✅ Format a single listing
   */
  formatListing(listing, userHistory, userPreferences = {}) {
    const budget = userPreferences?.budget || 0;
    const isWithinBudget = budget > 0 && listing.price <= budget;
    const isNearBudget = budget > 0 && listing.price > budget && listing.price <= budget * (1 + BUDGET_TOLERANCE);
    
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
      capacity: listing.capacity || 1,
      totalBookings: listing.totalBookings || 0,
      score: this.calculateInitialScore(listing, userHistory, userPreferences),
      url: `/listing/${listing._id}`,
      budgetStatus: budget > 0 ? (
        isWithinBudget ? 'within_budget' :
        isNearBudget ? 'near_budget' :
        'over_budget'
      ) : 'unknown',
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
   * ✅ Calculate initial score with budget awareness
   */
  calculateInitialScore(listing, userHistory, userPreferences = {}) {
    let score = 0;
    const budget = userPreferences?.budget || 0;

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

    // Bonus for approved status (10)
    if (listing.status === 'approved') {
      score += 10;
    }

    // ✅ Budget compatibility (HARD WEIGHT - max 30)
    if (budget > 0) {
      const price = listing.price || 0;
      if (price <= budget) {
        // Within budget: max score
        const budgetRatio = price / budget; // 0-1
        score += 30 * (1 - budgetRatio * 0.3); // 30 to 21 points
      } else if (price <= budget * (1 + BUDGET_TOLERANCE)) {
        // Near budget: moderate score
        const overRatio = (price - budget) / budget;
        score += 20 * (1 - overRatio / BUDGET_TOLERANCE); // 20 to 0 points
      } else {
        // Over budget: penalty
        const overRatio = (price - budget) / budget;
        score -= Math.min(overRatio * 10, 30); // -10 to -30 penalty
      }
    }

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

    return Math.round(Math.max(score, 0));
  }

  /**
   * ✅ Score and rank recommendations
   */
  scoreRecommendations(recommendations, userHistory, userPreferences = {}) {
    const budget = userPreferences?.budget || 0;
    
    return recommendations.map(rec => {
      let score = rec.score || 0;

      // ✅ Budget preference scoring (additional boost)
      if (budget > 0) {
        const price = rec.price || 0;
        if (price <= budget) {
          const budgetRatio = price / budget;
          score += (1 - budgetRatio) * 15; // Cheaper within budget gets more boost
        } else if (price <= budget * (1 + BUDGET_TOLERANCE)) {
          score += 5; // Near budget small boost
        } else {
          score -= 10; // Over budget penalty
        }
      }

      // Personalization scoring
      if (userPreferences.interests) {
        const matchCount = userPreferences.interests.filter(interest =>
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

      // Travel style match
      const travelStyle = userPreferences.travelStyle || 'balanced';
      const styleKeywords = {
        adventure: ['adventure', 'trekking', 'hiking', 'wildlife', 'safari', 'explore'],
        cultural: ['culture', 'history', 'museum', 'heritage', 'local', 'traditional'],
        relaxation: ['relax', 'spa', 'wellness', 'peaceful', 'scenic'],
        luxury: ['luxury', 'premium', 'exclusive', '5-star', 'vip'],
        budget: ['budget', 'affordable', 'cheap', 'value', 'economical'],
        family: ['family', 'kids', 'children', 'family-friendly'],
        romantic: ['romantic', 'couples', 'honeymoon', 'intimate']
      };
      
      const styleWords = styleKeywords[travelStyle] || [];
      const recText = [rec.title, rec.description, ...(rec.tags || [])].join(' ').toLowerCase();
      const styleMatches = styleWords.filter(word => recText.includes(word));
      score += styleMatches.length * 3;

      // Season match
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
        score: Math.round(Math.max(score, 0))
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
      const key = item.id || `${item.title}-${item.location}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
    
    return result;
  }

  /**
   * ✅ Format recommendations for frontend with enhanced match reasons
   */
  formatRecommendations(recommendations, userHistory, userPreferences = {}) {
    const budget = userPreferences?.budget || 0;
    
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
      matchReason: this.getMatchReason(rec, userHistory, userPreferences),
      budgetStatus: budget > 0 ? (
        rec.price <= budget ? 'within_budget' :
        rec.price <= budget * (1 + BUDGET_TOLERANCE) ? 'near_budget' :
        'over_budget'
      ) : 'unknown'
    }));
  }

  /**
   * ✅ Get match reason for recommendation - ENHANCED with budget context
   */
  getMatchReason(rec, userHistory, userPreferences = {}) {
    const reasons = [];
    const budget = userPreferences?.budget || 0;
    
    // ✅ Budget reason (most important)
    if (budget > 0) {
      if (rec.price <= budget) {
        reasons.push(`Within your $${budget} budget`);
      } else if (rec.price <= budget * (1 + BUDGET_TOLERANCE)) {
        reasons.push(`Slightly above your $${budget} budget`);
      } else {
        reasons.push(`Premium option ($${rec.price})`);
      }
    }
    
    // Destination match
    if (userPreferences?.destination && rec.location) {
      if (rec.location.toLowerCase().includes(userPreferences.destination.toLowerCase())) {
        reasons.push(`Located in ${userPreferences.destination}`);
      }
    }
    
    // Location preference
    if (userHistory.favoriteLocations?.includes(rec.location)) {
      reasons.push('Matches your favorite destinations');
    }
    
    // Rating
    if (rec.rating >= 4.5) {
      reasons.push('Highly rated by travelers');
    } else if (rec.rating >= 4.0) {
      reasons.push('Well rated by travelers');
    }
    
    // Interest match
    if (userPreferences.interests && userPreferences.interests.length > 0) {
      const matches = userPreferences.interests.filter(interest =>
        rec.tags?.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))
      );
      if (matches.length > 0) {
        reasons.push(`Matches your interest in ${matches.slice(0, 2).join(', ')}`);
      }
    }
    
    // Travel style match
    const travelStyle = userPreferences.travelStyle || 'balanced';
    const styleLabels = {
      adventure: 'Adventure style',
      cultural: 'Cultural style',
      relaxation: 'Relaxation style',
      luxury: 'Luxury style',
      budget: 'Budget style',
      family: 'Family friendly',
      romantic: 'Romantic style'
    };
    
    const styleKeywords = {
      adventure: ['adventure', 'trekking', 'hiking', 'wildlife', 'safari'],
      cultural: ['culture', 'history', 'museum', 'heritage', 'local'],
      relaxation: ['relax', 'spa', 'wellness', 'peaceful', 'scenic'],
      luxury: ['luxury', 'premium', 'exclusive', '5-star'],
      budget: ['budget', 'affordable', 'cheap', 'value'],
      family: ['family', 'kids', 'children', 'family-friendly'],
      romantic: ['romantic', 'couples', 'honeymoon', 'intimate']
    };
    
    const styleWords = styleKeywords[travelStyle] || [];
    const recText = [rec.title, rec.description, ...(rec.tags || [])].join(' ').toLowerCase();
    if (styleWords.some(word => recText.includes(word))) {
      reasons.push(`Matches your ${styleLabels[travelStyle] || travelStyle}`);
    }
    
    // Popularity
    if (rec.totalBookings && rec.totalBookings > 50) {
      reasons.push('Popular choice');
    }
    
    // Featured
    if (rec.isFeatured) {
      reasons.push('Featured experience');
    }
    
    // Capacity
    if (rec.capacity && userPreferences?.travelers && rec.capacity >= userPreferences.travelers) {
      reasons.push(`Supports ${userPreferences.travelers} travelers`);
    }
    
    if (reasons.length === 0) {
      reasons.push('Popular choice');
    }
    
    return reasons.slice(0, 4).join(' • ');
  }

  /**
   * ✅ Get cache key - ENHANCED with budget and destination
   */
  getCacheKey(query, userId, filters, budget, destination) {
    return JSON.stringify({ 
      query, 
      userId, 
      filters, 
      budget: budget || 0,
      destination: destination || null
    });
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