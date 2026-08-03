// backend/src/ai/services/recommendation.service.js
// ✅ UPDATED - Removed ALL Tour references, uses ONLY Listing

import aiProvider from '../providers/providerInterface.js';
import recommendationPrompt from '../prompts/recommendation.prompt.js';
import Listing from '../../models/Listing.js';
import Booking from '../../models/Booking.js';
import { transformToExperiences } from '../utils/experienceTransformer.js';

class RecommendationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
  }

  async getRecommendations(params) {
    try {
      const {
        query,
        userId,
        userContext = {},
        limit = 10,
        filters = {},
        useAI = true
      } = params;

      console.log('📤 Recommendation Service: Getting recommendations...');
      console.log(`📌 Query: ${query || 'Popular'}, Limit: ${limit}`);

      // ✅ Get user's booking history for personalization
      const userHistory = await this.getUserHistory(userId);

      // ✅ Get database recommendations first (LISTINGS ONLY)
      const dbRecommendations = await this.getDatabaseRecommendations(
        query, 
        { ...filters, limit: limit * 2 },
        userHistory
      );

      console.log(`📌 Found ${dbRecommendations.length} database recommendations`);

      // ✅ If we have enough good recommendations, return them
      if (dbRecommendations.length >= limit && !useAI) {
        return {
          success: true,
          recommendations: dbRecommendations.slice(0, limit),
          source: 'database',
          total: dbRecommendations.length,
          personalized: true
        };
      }

      // ✅ Get AI recommendations for more personalized results
      let aiRecommendations = [];
      if (useAI) {
        const prompt = recommendationPrompt.build({
          query: query || 'Popular experiences in Rwanda',
          userContext: {
            ...userContext,
            pastBookings: userHistory.bookings,
            favoriteLocations: userHistory.favoriteLocations,
            interests: userHistory.interests || userContext.interests,
            travelStyle: userContext.travelStyle || 'balanced'
          },
          limit: limit,
          filters
        });

        const response = await aiProvider.chat([
          { role: 'system', content: 'You are a Rwanda travel expert. Return ONLY valid JSON array. Use "Experiences" not "Tours".' },
          { role: 'user', content: prompt }
        ], {
          temperature: 0.7,
          maxTokens: 1000
        });

        aiRecommendations = this.parseResponse(response.content);
        console.log(`📌 Got ${aiRecommendations.length} AI recommendations`);

        // ✅ Score and rank recommendations
        const scored = this.scoreRecommendations(
          [...dbRecommendations, ...aiRecommendations],
          userHistory,
          userContext
        );

        // ✅ Sort by score and remove duplicates
        const unique = this.removeDuplicates(scored);
        const sorted = unique.sort((a, b) => (b.score || 0) - (a.score || 0));

        return {
          success: true,
          recommendations: sorted.slice(0, limit),
          total: sorted.length,
          source: 'mixed',
          personalized: true,
          fallback: response.fallback || false
        };
      }

      return {
        success: true,
        recommendations: dbRecommendations.slice(0, limit),
        source: 'database',
        total: dbRecommendations.length
      };
    } catch (error) {
      console.error('❌ Recommendation Service Error:', error);
      return {
        success: false,
        recommendations: this.getFallbackRecommendations(),
        fallback: true,
        error: error.message
      };
    }
  }

  // ✅ Get user's booking history (UPDATED - uses listingId only)
  async getUserHistory(userId) {
    if (!userId) {
      return { bookings: [], favoriteLocations: [], interests: [] };
    }

    try {
      const bookings = await Booking.find({ 
        user: userId, 
        status: { $in: ['completed', 'confirmed'] } 
      })
      .populate('listingId', 'title location tags businessType')
      .limit(20)
      .lean();

      const pastBookings = bookings.map(b => ({
        title: b.listingId?.title || 'Unknown',
        location: b.listingId?.location || 'Unknown',
        type: b.listingId?.businessType || 'experience',
        tags: b.listingId?.tags || []
      }));

      const favoriteLocations = [...new Set(
        pastBookings.map(b => b.location).filter(Boolean)
      )];

      const interests = [...new Set(
        pastBookings.flatMap(b => b.tags || [])
      )];

      return {
        bookings: pastBookings,
        favoriteLocations,
        interests
      };
    } catch (error) {
      console.error('Error fetching user history:', error);
      return { bookings: [], favoriteLocations: [], interests: [] };
    }
  }

  // ✅ Get database recommendations (LISTINGS ONLY - NO TOURS)
  async getDatabaseRecommendations(query, filters, userHistory) {
    try {
      const searchQuery = { 
        status: 'approved'
      };

      if (query) {
        const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
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

      // ✅ ONLY Listing - NO Tour
      const listings = await Listing.find(searchQuery)
        .populate('provider', 'businessName name avatar')
        .limit(filters.limit || 20)
        .lean();

      // Format and score
      const formatted = listings.map(item => ({
        id: item._id,
        title: item.title,
        location: item.location,
        price: item.price,
        currency: item.currency || 'USD',
        duration: item.duration || '1 day',
        description: item.description?.substring(0, 200) || '',
        rating: item.averageRating || 0,
        reviews: item.totalReviews || 0,
        provider: item.provider?.businessName || item.provider?.name || 'Verified Provider',
        coverImage: item.coverImage || item.images?.[0] || null,
        tags: item.tags || [],
        businessType: item.businessType || 'General',
        category: this.mapBusinessTypeToCategory(item.businessType),
        score: this.calculateInitialScore(item, userHistory)
      }));

      return formatted;
    } catch (error) {
      console.error('Database query error:', error);
      return [];
    }
  }

  // ✅ Map business type to category
  mapBusinessTypeToCategory(businessType) {
    const categoryMap = {
      'hotel': 'Accommodation',
      'lodge': 'Accommodation',
      'restaurant': 'Dining',
      'cafe': 'Dining',
      'tour_operator': 'Adventure',
      'guide': 'Adventure',
      'transport': 'Transport',
      'events': 'Events',
      'shop': 'Shopping',
      'other': 'Experience'
    };
    return categoryMap[businessType] || 'Experience';
  }

  // ✅ Calculate initial score for database items
  calculateInitialScore(item, userHistory) {
    let score = 0;

    // Base score from ratings
    score += (item.averageRating || 4) * 5;

    // Bonus for popularity (bookings)
    score += Math.min(item.bookingCount || 0, 50) * 0.5;

    // Bonus for verified status
    if (item.status === 'approved') score += 10;

    // Bonus for featured
    if (item.isFeatured) score += 15;

    // Personalization bonus
    if (userHistory.favoriteLocations?.includes(item.location)) {
      score += 15;
    }

    if (userHistory.interests) {
      const matches = userHistory.interests.filter(interest =>
        item.tags?.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))
      );
      score += matches.length * 5;
    }

    return Math.round(score);
  }

  // ✅ Score and rank recommendations
  scoreRecommendations(recommendations, userHistory, userContext) {
    return recommendations.map(rec => {
      let score = rec.score || 0;

      // Personalization scoring
      if (userContext.interests) {
        const matchCount = userContext.interests.filter(interest =>
          rec.tags?.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))
        ).length;
        score += matchCount * 5;
      }

      // Location preference
      if (userHistory.favoriteLocations?.includes(rec.location)) {
        score += 15;
      }

      // Season match
      const currentMonth = new Date().getMonth();
      const drySeason = [5, 6, 7, 8];
      if (drySeason.includes(currentMonth) && rec.category === 'Adventure') {
        score += 10;
      }

      // Price value
      if (rec.price && rec.rating) {
        const valueScore = (rec.rating / (rec.price / 100));
        score += Math.min(valueScore * 2, 20);
      }

      return {
        ...rec,
        score: Math.round(score)
      };
    });
  }

  // ✅ Remove duplicates by title and location
  removeDuplicates(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = `${item.title}-${item.location}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ✅ Parse AI response
  parseResponse(text) {
    try {
      // Try to find JSON array
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // Try parsing as object and wrap
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        const obj = JSON.parse(objectMatch[0]);
        return [obj];
      }
      return [];
    } catch (error) {
      console.error('❌ Parse error:', error);
      return [];
    }
  }

  // ✅ Fallback recommendations with real data (UPDATED - uses Experiences)
  getFallbackRecommendations() {
    return [
      {
        title: "Kigali City Experience",
        location: "Kigali, Rwanda",
        price: 150,
        currency: "USD",
        duration: "2 days",
        description: "Explore the cleanest city in Africa with a guided experience of Kigali's top attractions.",
        whyRecommended: "Perfect introduction to Rwanda's capital city",
        activities: ["City Tour", "Genocide Memorial", "Local Markets", "Museum Visit"],
        bestTime: "All year round",
        rating: 4.8,
        score: 85,
        tags: ["city", "culture", "history"],
        category: "Cultural"
      },
      {
        title: "Akagera Safari Experience",
        location: "Eastern Rwanda",
        price: 200,
        currency: "USD",
        duration: "1 day",
        description: "Experience the Big Five in Rwanda's only savannah park.",
        whyRecommended: "Incredible wildlife experience in Rwanda",
        activities: ["Game Drive", "Boat Safari", "Bird Watching"],
        bestTime: "June-September",
        rating: 4.9,
        score: 90,
        tags: ["safari", "wildlife", "nature"],
        category: "Adventure"
      },
      {
        title: "Lake Kivu Escape Experience",
        location: "Western Rwanda",
        price: 300,
        currency: "USD",
        duration: "3 days",
        description: "Relax on the shores of Lake Kivu with stunning views.",
        whyRecommended: "Perfect relaxation getaway",
        activities: ["Boat Tours", "Swimming", "Sunset Views", "Beach Time"],
        bestTime: "May-October",
        rating: 4.7,
        score: 82,
        tags: ["lake", "relaxation", "nature"],
        category: "Relaxation"
      }
    ];
  }
}

// Singleton instance
const recommendationService = new RecommendationService();
export default recommendationService;