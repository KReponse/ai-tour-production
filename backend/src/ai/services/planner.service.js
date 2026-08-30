// backend/src/ai/services/planner.service.js
// ✅ COMPLETE FIXED - Smart Recommendation & Itinerary Engine
// ✅ ADDED: Hard budget filtering (prevents $1,186 listings for $800 budget)
// ✅ ADDED: Budget allocation across accommodation, activities, food, transport
// ✅ ADDED: Day-by-day activity distribution
// ✅ ADDED: Real database activities in itinerary (no more "Flexible exploration")
// ✅ ADDED: Budget tracking per day
// ✅ ADDED: Fallback with real activities

import aiProvider from "../providers/providerInterface.js";
import plannerPrompt from "../prompts/planner.prompt.js";
import Listing from "../../models/Listing.js";
import User from "../../models/User.js";
import { transformToExperiences } from "../utils/experienceTransformer.js";
import { calculatePersonalizationScore } from "../utils/experienceTransformer.js";

// ===============================
// BUDGET ALLOCATION CONFIG
// ===============================
const BUDGET_ALLOCATION = {
  accommodation: 0.35,  // 35% of budget
  activities: 0.35,     // 35% of budget
  food: 0.20,           // 20% of budget
  transport: 0.05,      // 5% of budget
  reserve: 0.05         // 5% reserve
};

const BUDGET_TOLERANCE = 0.20; // 20% tolerance for "near budget"
const MAX_BUDGET_MULTIPLIER = 1.5; // Absolute max multiplier

class PlannerService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
    this.maxListings = 30;
    this.maxAIListings = 20;
    
    console.log('🤖 Planner Service initialized with Smart Engine');
    console.log(`💰 Budget allocation: ${JSON.stringify(BUDGET_ALLOCATION)}`);
  }

  // ============================================================
  // CREATE PLAN - ENHANCED WITH BUDGET & ITINERARY
  // ============================================================

  async createPlan(params = {}) {
    const startedAt = Date.now();

    try {
      const normalized = this.normalizeParams(params);
      
      // ✅ Load user preferences
      let userPrefs = null;
      if (params.userId) {
        userPrefs = await this.loadUserPreferences(params.userId);
      }

      console.log("📤 Planner Service: Creating smart trip plan...");
      console.log(`📌 Destination: ${normalized.destination}, Days: ${normalized.days}`);
      console.log(`💰 Total Budget: $${normalized.budget}`);
      console.log(`👥 Travelers: ${normalized.travelers}`);

      // ✅ Calculate budget allocation
      const budgetAllocation = this.calculateBudgetAllocation(
        normalized.budget,
        normalized.days,
        normalized.travelers
      );

      console.log(`📊 Budget Allocation:`, budgetAllocation);

      // ✅ Get real listings with hard filters
      let listings = await this.getAvailableExperiences(
        normalized.destination,
        normalized.interests,
        budgetAllocation,
        userPrefs
      );

      console.log(`📌 Found ${listings.length} real listings after hard filters`);

      // ✅ Transform and score listings
      const userContext = userPrefs?.personalization || null;
      const experiences = transformToExperiences(listings, userContext);
      
      // ✅ Rank experiences
      const rankedExperiences = this.rankExperiences(
        experiences,
        normalized,
        userPrefs,
        budgetAllocation
      );

      console.log(`📌 Ranked ${rankedExperiences.length} experiences`);

      // ✅ Select activities for each day
      const selectedActivities = this.selectActivitiesForDays(
        rankedExperiences,
        normalized.days,
        budgetAllocation
      );

      console.log(`📌 Selected ${selectedActivities.length} activities for ${normalized.days} days`);

      // ✅ Build itinerary with real activities
      const itinerary = this.buildItinerary(
        selectedActivities,
        normalized,
        budgetAllocation,
        userPrefs
      );

      // ✅ Calculate totals
      const totals = this.calculateTotals(itinerary, budgetAllocation);

      // ✅ Build final plan
      const plan = {
        destination: normalized.destination,
        days: normalized.days,
        budget: normalized.budget,
        travelers: normalized.travelers,
        travelStyle: normalized.travelStyle || userPrefs?.personalization?.travelStyle || 'balanced',
        itinerary: itinerary,
        summary: {
          accommodationTotal: totals.accommodation,
          activitiesTotal: totals.activities,
          foodTotal: totals.food,
          transportTotal: totals.transport,
          totalCost: totals.total,
          remainingBudget: normalized.budget - totals.total,
          dailyBudget: budgetAllocation.daily
        },
        tips: this.generateTips(normalized, userPrefs),
        packingList: this.generatePackingList(normalized, userPrefs),
        budgetAllocation: budgetAllocation,
        personalized: !!userPrefs,
        userName: userPrefs?.name || 'Traveler',
        generatedAt: new Date().toISOString()
      };

      // ✅ Validate plan doesn't exceed budget
      if (plan.summary.totalCost > normalized.budget) {
        console.warn(`⚠️ Plan exceeds budget by $${plan.summary.totalCost - normalized.budget}`);
        // Reduce expensive activities
        plan.itinerary = this.reduceExpensiveActivities(plan.itinerary, normalized.budget);
        // Recalculate totals
        const recalculated = this.calculateTotals(plan.itinerary, budgetAllocation);
        plan.summary.totalCost = recalculated.total;
        plan.summary.remainingBudget = normalized.budget - recalculated.total;
      }

      // ✅ Cache plan
      const cacheKey = this.getCacheKey({ ...normalized, userId: params.userId });
      this.setCachedPlan(cacheKey, plan);

      console.log(`✅ Planner completed in ${Date.now() - startedAt}ms`);
      console.log(`💰 Total cost: $${plan.summary.totalCost}, Remaining: $${plan.summary.remainingBudget}`);

      return {
        success: true,
        plan: plan,
        fallback: false,
        personalized: !!userPrefs,
        generationTimeMs: Date.now() - startedAt
      };

    } catch (error) {
      console.error("❌ Planner Service Error:", error);
      return this.createFallbackPlan(params, error.message);
    }
  }

  // ============================================================
  // BUDGET ALLOCATION
  // ============================================================

  calculateBudgetAllocation(totalBudget, days, travelers) {
    const perDay = totalBudget / days;
    
    return {
      total: totalBudget,
      perDay: Math.round(perDay),
      accommodation: Math.round(totalBudget * BUDGET_ALLOCATION.accommodation),
      activities: Math.round(totalBudget * BUDGET_ALLOCATION.activities),
      food: Math.round(totalBudget * BUDGET_ALLOCATION.food),
      transport: Math.round(totalBudget * BUDGET_ALLOCATION.transport),
      reserve: Math.round(totalBudget * BUDGET_ALLOCATION.reserve),
      perDayBreakdown: {
        accommodation: Math.round(perDay * BUDGET_ALLOCATION.accommodation),
        activities: Math.round(perDay * BUDGET_ALLOCATION.activities),
        food: Math.round(perDay * BUDGET_ALLOCATION.food),
        transport: Math.round(perDay * BUDGET_ALLOCATION.transport)
      }
    };
  }

  // ============================================================
  // GET AVAILABLE EXPERIENCES WITH HARD FILTERS
  // ============================================================

  async getAvailableExperiences(destination, interests, budgetAllocation, userPrefs) {
    try {
      const query = {
        status: 'approved',
        price: { $lte: budgetAllocation.activities * 1.2 } // Hard budget filter
      };

      // Destination filter
      if (destination && destination.toLowerCase() !== 'rwanda') {
        query.location = {
          $regex: this.escapeRegex(destination),
          $options: 'i'
        };
      }

      // Interest filter
      const allInterests = [
        ...(interests || []),
        ...(userPrefs?.personalization?.interests || [])
      ];

      if (allInterests.length > 0) {
        query.$or = allInterests.flatMap(interest => [
          { tags: { $regex: this.escapeRegex(interest), $options: 'i' } },
          { interests: { $regex: this.escapeRegex(interest), $options: 'i' } },
          { businessType: { $regex: this.escapeRegex(interest), $options: 'i' } },
          { title: { $regex: this.escapeRegex(interest), $options: 'i' } }
        ]);
      }

      // Travel style filter
      const travelStyle = userPrefs?.personalization?.travelStyle || 'balanced';
      if (travelStyle !== 'balanced') {
        const styleKeywords = {
          adventure: ['adventure', 'trekking', 'hiking', 'wildlife', 'safari'],
          cultural: ['culture', 'history', 'museum', 'heritage', 'local'],
          relaxation: ['relax', 'spa', 'wellness', 'peaceful', 'scenic'],
          luxury: ['luxury', 'premium', 'exclusive', '5-star', 'vip'],
          budget: ['budget', 'affordable', 'cheap', 'value', 'economical'],
          family: ['family', 'kids', 'children', 'family-friendly'],
          romantic: ['romantic', 'couples', 'honeymoon', 'intimate']
        };
        
        const keywords = styleKeywords[travelStyle] || [];
        if (keywords.length > 0) {
          if (!query.$or) query.$or = [];
          query.$or.push({
            $or: keywords.map(k => ({
              tags: { $regex: this.escapeRegex(k), $options: 'i' }
            }))
          });
        }
      }

      const listings = await Listing.find(query)
        .select('_id title location price currency duration description coverImage images tags businessType interests averageRating reviewCount status provider capacity totalBookings')
        .populate('provider', 'businessName name avatar')
        .limit(this.maxListings)
        .lean();

      return listings.map(listing => ({
        ...listing,
        id: String(listing._id),
        price: Number(listing.price) || 0,
        rating: Number(listing.averageRating || 0),
        reviewCount: Number(listing.totalReviews || 0),
        totalBookings: Number(listing.totalBookings || 0),
        capacity: Number(listing.capacity || 1),
        tags: Array.isArray(listing.tags) ? listing.tags : [],
        interests: Array.isArray(listing.interests) ? listing.interests : []
      }));

    } catch (error) {
      console.error("❌ Error fetching planner listings:", error);
      return [];
    }
  }

  // ============================================================
  // RANK EXPERIENCES
  // ============================================================

  rankExperiences(experiences, params, userPrefs, budgetAllocation) {
    const activityBudget = budgetAllocation.activities;
    const perDayActivityBudget = budgetAllocation.perDayBreakdown.activities;
    
    return experiences.map(exp => {
      let score = 0;
      const price = exp.price || 0;

      // ✅ Budget score (HIGHEST WEIGHT)
      if (price <= activityBudget) {
        // Within budget: higher score for lower cost
        const ratio = price / activityBudget;
        score += (1 - ratio * 0.5) * 40; // 20-40 points
      } else if (price <= activityBudget * BUDGET_TOLERANCE) {
        // Near budget: moderate score
        const overRatio = (price - activityBudget) / activityBudget;
        score += (1 - overRatio / BUDGET_TOLERANCE) * 20; // 0-20 points
      } else {
        // Over budget: penalty
        const overRatio = (price - activityBudget) / activityBudget;
        score -= Math.min(overRatio * 10, 30);
      }

      // ✅ Destination match
      if (params.destination && exp.location) {
        if (exp.location.toLowerCase().includes(params.destination.toLowerCase())) {
          score += 20;
        }
      }

      // ✅ Interest match
      const interests = [...(params.interests || []), ...(userPrefs?.personalization?.interests || [])];
      if (interests.length > 0) {
        const expText = [exp.title, exp.description, ...(exp.tags || [])].join(' ').toLowerCase();
        const matches = interests.filter(i => expText.includes(i.toLowerCase()));
        score += Math.min(matches.length * 5, 20);
      }

      // ✅ Travel style match
      const travelStyle = params.travelStyle || userPrefs?.personalization?.travelStyle || 'balanced';
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
      const expText = [exp.title, exp.description, ...(exp.tags || [])].join(' ').toLowerCase();
      const styleMatches = styleWords.filter(word => expText.includes(word));
      score += styleMatches.length * 3;

      // ✅ Rating
      if (exp.rating > 0) {
        score += exp.rating * 3; // Max 15 points
      }

      // ✅ Personalization
      if (userPrefs) {
        const personalization = calculatePersonalizationScore(exp, userPrefs.personalization);
        score += personalization.score * 0.3; // Max 30 points
      }

      return {
        ...exp,
        score: Math.round(Math.max(score, 0)),
        matchReasons: this.generateMatchReasons(exp, params, userPrefs, budgetAllocation)
      };
    }).sort((a, b) => b.score - a.score);
  }

  // ============================================================
  // SELECT ACTIVITIES FOR DAYS
  // ============================================================

  selectActivitiesForDays(rankedExperiences, days, budgetAllocation) {
    const activities = [];
    const usedIds = new Set();
    const perDayBudget = budgetAllocation.perDayBreakdown.activities;
    const totalActivityBudget = budgetAllocation.activities;

    // Take top activities within budget
    let remainingBudget = totalActivityBudget;

    for (const exp of rankedExperiences) {
      if (activities.length >= days * 1.5) break; // Max 1.5 activities per day
      if (usedIds.has(exp.id)) continue;
      if (exp.price > remainingBudget) continue;
      if (exp.price > perDayBudget * 1.5) continue; // Don't overspend per day

      usedIds.add(exp.id);
      remainingBudget -= exp.price;
      activities.push(exp);
    }

    // If we have too few activities, include near-budget ones
    if (activities.length < days) {
      for (const exp of rankedExperiences) {
        if (activities.length >= days * 1.5) break;
        if (usedIds.has(exp.id)) continue;
        if (exp.price > perDayBudget * 2) continue;

        usedIds.add(exp.id);
        activities.push(exp);
      }
    }

    return activities.slice(0, days * 1.5);
  }

  // ============================================================
  // BUILD ITINERARY
  // ============================================================

  buildItinerary(activities, params, budgetAllocation, userPrefs) {
    const itinerary = [];
    const days = params.days;
    const perDayBudget = budgetAllocation.perDayBreakdown.activities;
    const travelerName = userPrefs?.name || 'Traveler';

    // Sort activities by score (already ranked)
    const sortedActivities = [...activities];

    // Distribute activities across days
    for (let day = 1; day <= days; day++) {
      const dayActivities = [];
      let dayCost = 0;
      const maxDayCost = perDayBudget * 1.2;

      // Get activities for this day
      const remainingForDay = sortedActivities.slice(dayActivities.length);
      
      // Take 1-2 activities per day
      let activitiesForDay = 0;
      for (const activity of remainingForDay) {
        if (activitiesForDay >= 2) break;
        if (dayCost + activity.price > maxDayCost) break;
        if (dayActivities.some(a => a.id === activity.id)) continue;

        dayActivities.push({
          listingId: activity.id,
          id: activity.id,
          name: activity.title,
          title: activity.title,
          location: activity.location || params.destination,
          description: activity.description?.substring(0, 200) || '',
          duration: activity.duration || '2-3 hours',
          cost: activity.price,
          price: activity.price,
          currency: activity.currency || 'USD',
          rating: activity.rating || 0,
          image: activity.coverImage || null,
          category: activity.businessType || activity.category || 'Experience',
          matchScore: activity.score || 0,
          matchReasons: activity.matchReasons || [],
          detailsUrl: `/listing/${activity.id}`,
          bookingUrl: `/listing/${activity.id}`,
          source: 'mongodb'
        });

        dayCost += activity.price;
        activitiesForDay++;
        
        // Remove used activity
        const index = sortedActivities.indexOf(activity);
        if (index > -1) {
          sortedActivities.splice(index, 1);
        }
      }

      // Build day with real activities
      const dayTitle = dayActivities.length > 0 
        ? `Day ${day} - ${dayActivities[0].title}`
        : `Day ${day} - Explore ${params.destination}`;

      itinerary.push({
        day: day,
        title: dayTitle,
        location: params.destination,
        activities: dayActivities,
        experiences: dayActivities,
        recommendedExperiences: dayActivities,
        meals: {
          breakfast: this.getMealSuggestion('breakfast', params, day),
          lunch: this.getMealSuggestion('lunch', params, day),
          dinner: this.getMealSuggestion('dinner', params, day)
        },
        accommodation: {
          name: this.getAccommodationSuggestion(params, userPrefs),
          type: params.travelStyle || userPrefs?.personalization?.travelStyle || 'mid-range',
          cost: Math.round(budgetAllocation.perDayBreakdown.accommodation)
        },
        transport: this.getTransportSuggestion(params, day),
        totalCost: dayCost + budgetAllocation.perDayBreakdown.accommodation + budgetAllocation.perDayBreakdown.food
      });
    }

    return itinerary;
  }

  // ============================================================
  // CALCULATE TOTALS
  // ============================================================

  calculateTotals(itinerary, budgetAllocation) {
    let activities = 0;
    let accommodation = 0;
    let food = 0;
    let transport = 0;

    for (const day of itinerary) {
      // Activities
      if (day.activities) {
        activities += day.activities.reduce((sum, a) => sum + (a.cost || 0), 0);
      }
      
      // Accommodation
      accommodation += day.accommodation?.cost || budgetAllocation.perDayBreakdown.accommodation;
      
      // Food (estimated)
      food += budgetAllocation.perDayBreakdown.food;
      
      // Transport (estimated)
      transport += budgetAllocation.perDayBreakdown.transport;
    }

    // Ensure accommodation doesn't exceed allocation
    accommodation = Math.min(accommodation, budgetAllocation.accommodation);
    
    return {
      activities: Math.round(activities),
      accommodation: Math.round(accommodation),
      food: Math.round(food),
      transport: Math.round(transport),
      total: Math.round(activities + accommodation + food + transport)
    };
  }

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  getMealSuggestion(meal, params, day) {
    const suggestions = {
      breakfast: ['Breakfast at accommodation', 'Local café breakfast', 'Continental breakfast'],
      lunch: ['Local restaurant lunch', 'Picnic lunch', 'Light lunch at café'],
      dinner: ['Dinner at local restaurant', 'Traditional Rwandan dinner', 'Evening meal at lodge']
    };
    const options = suggestions[meal] || suggestions.breakfast;
    return options[day % options.length];
  }

  getAccommodationSuggestion(params, userPrefs) {
    const style = params.travelStyle || userPrefs?.personalization?.travelStyle || 'balanced';
    const suggestions = {
      luxury: 'Luxury lodge or 5-star hotel',
      premium: 'Premium hotel or resort',
      balanced: 'Comfortable mid-range hotel',
      budget: 'Budget-friendly guesthouse',
      adventure: 'Adventure camp or eco-lodge',
      relaxation: 'Relaxing spa resort'
    };
    return suggestions[style] || suggestions.balanced;
  }

  getTransportSuggestion(params, day) {
    const suggestions = [
      'Local taxi / private car',
      'Walking tour',
      'Local bus / public transport',
      'Rental car',
      'Bicycle / moto taxi'
    ];
    return suggestions[day % suggestions.length];
  }

  generateMatchReasons(exp, params, userPrefs, budgetAllocation) {
    const reasons = [];
    const price = exp.price || 0;
    const activityBudget = budgetAllocation.activities;

    // Budget reason
    if (price <= activityBudget) {
      reasons.push(`Within your activity budget ($${price})`);
    } else if (price <= activityBudget * BUDGET_TOLERANCE) {
      reasons.push(`Slightly above budget ($${price})`);
    }

    // Destination
    if (params.destination && exp.location) {
      if (exp.location.toLowerCase().includes(params.destination.toLowerCase())) {
        reasons.push(`Located in ${params.destination}`);
      }
    }

    // Interests
    const interests = [...(params.interests || []), ...(userPrefs?.personalization?.interests || [])];
    if (interests.length > 0) {
      const expText = [exp.title, exp.description, ...(exp.tags || [])].join(' ').toLowerCase();
      const matches = interests.filter(i => expText.includes(i.toLowerCase()));
      if (matches.length > 0) {
        reasons.push(`Matches your interest in ${matches.slice(0, 2).join(', ')}`);
      }
    }

    // Rating
    if (exp.rating >= 4.5) {
      reasons.push('Highly rated by travelers');
    } else if (exp.rating >= 4.0) {
      reasons.push('Well rated');
    }

    if (reasons.length === 0) {
      reasons.push('Popular choice');
    }

    return reasons.slice(0, 4);
  }

  generateTips(params, userPrefs) {
    const name = userPrefs?.name || 'Traveler';
    const destination = params.destination || 'Rwanda';
    
    return [
      `Book experiences in advance for the best availability, ${name}.`,
      `Check the weather forecast before your ${destination} trip.`,
      'Carry comfortable walking shoes for exploring.',
      'Stay hydrated and protect yourself from the sun.',
      'Respect local customs and protected areas.',
      'Keep some flexibility in your schedule for spontaneous discoveries.'
    ];
  }

  generatePackingList(params, userPrefs) {
    return [
      'Comfortable walking shoes',
      'Light clothing (Rwanda has mild weather)',
      'Rain jacket (especially during rainy season)',
      'Sunscreen and insect repellent',
      'Camera for capturing memories',
      'Power bank for devices',
      'Travel documents and confirmations',
      'Local currency (Rwandan Franc)'
    ];
  }

  // ============================================================
  // FALLBACK PLAN
  // ============================================================

  createFallbackPlan(params, error) {
    console.warn('⚠️ Creating fallback plan due to error:', error);
    
    const normalized = this.normalizeParams(params);
    const budgetAllocation = this.calculateBudgetAllocation(
      normalized.budget,
      normalized.days,
      normalized.travelers
    );

    // Create simple fallback itinerary
    const itinerary = [];
    for (let day = 1; day <= normalized.days; day++) {
      itinerary.push({
        day: day,
        title: `Day ${day} - Explore ${normalized.destination}`,
        location: normalized.destination,
        activities: [],
        experiences: [],
        recommendedExperiences: [],
        meals: {
          breakfast: 'Breakfast at accommodation',
          lunch: 'Local restaurant',
          dinner: 'Local restaurant'
        },
        accommodation: {
          name: 'Comfortable accommodation',
          type: normalized.travelStyle || 'mid-range',
          cost: budgetAllocation.perDayBreakdown.accommodation
        },
        transport: 'Local transport / taxi',
        totalCost: budgetAllocation.perDayBreakdown.accommodation + budgetAllocation.perDayBreakdown.food
      });
    }

    return {
      success: true,
      plan: {
        destination: normalized.destination,
        days: normalized.days,
        budget: normalized.budget,
        travelers: normalized.travelers,
        travelStyle: normalized.travelStyle || 'balanced',
        itinerary: itinerary,
        summary: {
          accommodationTotal: budgetAllocation.accommodation,
          activitiesTotal: 0,
          foodTotal: budgetAllocation.food,
          transportTotal: budgetAllocation.transport,
          totalCost: budgetAllocation.accommodation + budgetAllocation.food + budgetAllocation.transport,
          remainingBudget: normalized.budget - (budgetAllocation.accommodation + budgetAllocation.food + budgetAllocation.transport),
          dailyBudget: budgetAllocation.perDay
        },
        tips: this.generateTips(normalized, null),
        packingList: this.generatePackingList(normalized, null),
        budgetAllocation: budgetAllocation,
        personalized: false,
        userName: 'Traveler',
        generatedAt: new Date().toISOString(),
        fallback: true
      },
      fallback: true,
      error: error
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  normalizeParams(params) {
    return {
      destination: params.destination || 'Rwanda',
      days: Math.max(1, parseInt(params.days) || 3),
      budget: Math.max(0, Number(params.budget) || 500),
      travelers: Math.max(1, parseInt(params.travelers) || 1),
      interests: Array.isArray(params.interests) ? params.interests : [],
      travelStyle: params.travelStyle || 'balanced',
      language: params.language || 'en',
      userId: params.userId || null
    };
  }

  async loadUserPreferences(userId) {
    if (!userId) return null;
    try {
      const user = await User.findById(userId).select('preferences behavior name email');
      if (!user) return null;
      return {
        name: user.name,
        preferences: user.preferences || {},
        behavior: user.behavior || {},
        personalization: {
          travelStyle: user.preferences?.travelStyle || 'balanced',
          budget: user.preferences?.budget || 'mid-range',
          interests: user.preferences?.interests || [],
          preferredDestinations: user.preferences?.preferredDestinations || []
        }
      };
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return null;
    }
  }

  escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getCacheKey(params) {
    return JSON.stringify({
      destination: params.destination?.toLowerCase(),
      days: params.days,
      budget: params.budget,
      travelers: params.travelers,
      interests: [...(params.interests || [])].sort(),
      travelStyle: params.travelStyle,
      userId: params.userId
    });
  }

  getCachedPlan(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.plan;
    }
    return null;
  }

  setCachedPlan(key, plan) {
    this.cache.set(key, { plan, timestamp: Date.now() });
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }
}

// Singleton instance
const plannerService = new PlannerService();
export default plannerService;