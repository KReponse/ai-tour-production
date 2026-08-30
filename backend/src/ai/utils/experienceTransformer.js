// backend/src/ai/utils/experienceTransformer.js
// ✅ ENHANCED - Added user preference integration
// ✅ ADDED: Personalized experience ranking
// ✅ ADDED: Preference-based filtering
// ✅ ADDED: Score calculation with user context

/**
 * ✅ Experience Transformer
 * 
 * Transforms MongoDB Listing documents into Experience view models
 * for the frontend. This is a PURE transformation layer - no database changes.
 * 
 * Listing → Experience
 * 
 * Internal: Listing (database entity)
 * External: Experience (presentation entity)
 */

/**
 * ✅ Transform a single Listing to Experience with user context
 */
export const transformToListingExperience = (listing, userContext = null) => {
  if (!listing) return null;

  const provider = listing.provider || {};
  
  // ✅ Calculate personalization score if user context provided
  let personalizationScore = 0;
  let matchReasons = [];
  
  if (userContext) {
    const result = calculatePersonalizationScore(listing, userContext);
    personalizationScore = result.score;
    matchReasons = result.reasons;
  }
  
  return {
    // Core Experience fields
    id: listing._id,
    title: listing.title,
    description: listing.description,
    location: listing.location,
    
    // Pricing & Duration
    price: listing.price,
    currency: listing.currency || 'USD',
    duration: listing.duration || '1 day',
    
    // Visuals
    coverImage: listing.coverImage || null,
    galleryImages: listing.galleryImages || [],
    coverMedia: listing.coverMedia || null,
    coverMediaType: listing.coverMediaType || 'image',
    
    // Ratings
    rating: listing.averageRating || 0,
    totalReviews: listing.totalReviews || 0,
    reviewSummary: listing.reviewSummary || null,
    
    // Provider Information
    provider: {
      id: provider._id,
      name: provider.businessName || provider.name || 'Provider',
      avatar: provider.avatar || provider.profileImage || null,
      verified: provider.verificationStatus === 'approved' || false,
      totalListings: provider.totalListings || 0,
      rating: provider.averageRating || 0,
    },
    
    // Listing Details
    businessType: listing.businessType || 'tour_operator',
    listingType: listing.listingType || 'standard',
    category: listing.category || 'general',
    
    // Tags & Interests
    tags: listing.tags || [],
    interests: listing.interests || [],
    highlights: listing.highlights || [],
    amenities: listing.amenities || [],
    
    // Availability
    availability: listing.availability || {},
    isAvailable: listing.isAvailable !== false,
    
    // Status
    status: listing.status || 'pending',
    isVerified: listing.isVerified || false,
    isFeatured: listing.isFeatured || false,
    
    // Metadata
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    
    // Booking related
    bookingCount: listing.bookingCount || 0,
    maxGroupSize: listing.maxGroupSize || listing.capacity || 10,
    
    // SEO
    slug: listing.slug || listing.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '',
    metaDescription: listing.metaDescription || listing.description?.substring(0, 160) || '',
    
    // ✅ Personalization fields
    personalizationScore: personalizationScore,
    matchReasons: matchReasons,
    isPersonalized: !!userContext && personalizationScore > 0,
  };
};

/**
 * ✅ Calculate personalization score for a listing
 */
export const calculatePersonalizationScore = (listing, userContext) => {
  let score = 0;
  const reasons = [];
  
  if (!userContext || !listing) {
    return { score: 0, reasons: [] };
  }
  
  const {
    interests = [],
    favoriteLocations = [],
    favoriteCategories = [],
    preferredDestinations = [],
    visitedDestinations = [],
    travelStyle = 'balanced',
    budget = 'mid-range',
    travelPace = 'moderate'
  } = userContext;
  
  // ✅ Interest match (max 30 points)
  if (interests.length > 0) {
    const listingTags = listing.tags || [];
    const listingInterests = listing.interests || [];
    const allListingKeywords = [...listingTags, ...listingInterests];
    
    const matches = interests.filter(interest =>
      allListingKeywords.some(keyword =>
        keyword.toLowerCase().includes(interest.toLowerCase())
      )
    );
    
    if (matches.length > 0) {
      const matchScore = Math.min(matches.length * 5, 30);
      score += matchScore;
      reasons.push(`Matches your interest in ${matches.slice(0, 3).join(', ')}`);
    }
  }
  
  // ✅ Location match (max 20 points)
  if (favoriteLocations.length > 0 || preferredDestinations.length > 0) {
    const allLocations = [...favoriteLocations, ...preferredDestinations];
    const listingLocation = listing.location?.toLowerCase() || '';
    
    const locationMatches = allLocations.filter(loc =>
      listingLocation.includes(loc.toLowerCase())
    );
    
    if (locationMatches.length > 0) {
      const matchScore = Math.min(locationMatches.length * 5, 20);
      score += matchScore;
      reasons.push(`Located in ${locationMatches.slice(0, 2).join(', ')}`);
    }
  }
  
  // ✅ Travel style match (max 15 points)
  const styleKeywords = {
    adventure: ['adventure', 'trekking', 'hiking', 'wildlife', 'safari', 'explore', 'thrill'],
    cultural: ['culture', 'history', 'museum', 'heritage', 'local', 'traditional', 'art'],
    relaxation: ['relax', 'spa', 'wellness', 'peaceful', 'scenic', 'beach', 'calm'],
    luxury: ['luxury', 'premium', 'exclusive', '5-star', 'vip', 'private', 'fine'],
    budget: ['budget', 'affordable', 'cheap', 'value', 'economical', 'cost-effective'],
    family: ['family', 'kids', 'children', 'family-friendly', 'group', 'all-ages'],
    romantic: ['romantic', 'couples', 'honeymoon', 'intimate', 'sunset']
  };
  
  const styleWords = styleKeywords[travelStyle] || [];
  const listingKeywords = [
    ...(listing.tags || []),
    ...(listing.interests || []),
    listing.title || '',
    listing.description || '',
    listing.businessType || ''
  ].join(' ').toLowerCase();
  
  const styleMatches = styleWords.filter(word =>
    listingKeywords.includes(word)
  );
  
  if (styleMatches.length > 0) {
    const matchScore = Math.min(styleMatches.length * 3, 15);
    score += matchScore;
    reasons.push(`Matches your ${travelStyle} travel style`);
  }
  
  // ✅ Budget compatibility (max 15 points)
  const budgetRanges = {
    budget: [0, 100],
    'mid-range': [50, 300],
    premium: [200, 600],
    luxury: [400, 9999]
  };
  
  const range = budgetRanges[budget] || budgetRanges['mid-range'];
  const price = listing.price || 0;
  
  if (price >= range[0] && price <= range[1]) {
    score += 15;
    reasons.push(`Within your budget range ($${price})`);
  } else if (price < range[0]) {
    score += 8;
    reasons.push(`Under budget ($${price})`);
  } else if (price > range[1]) {
    score += 3;
    reasons.push(`Above budget but premium ($${price})`);
  }
  
  // ✅ Rating bonus (max 10 points)
  const rating = listing.averageRating || 0;
  if (rating >= 4.5) {
    score += 10;
    reasons.push(`Highly rated (${rating}⭐)`);
  } else if (rating >= 4.0) {
    score += 7;
    reasons.push(`Well rated (${rating}⭐)`);
  } else if (rating >= 3.5) {
    score += 4;
  }
  
  // ✅ Booking popularity (max 10 points)
  const bookingCount = listing.bookingCount || 0;
  if (bookingCount > 100) {
    score += 10;
    reasons.push('Very popular with travelers');
  } else if (bookingCount > 50) {
    score += 7;
  } else if (bookingCount > 20) {
    score += 4;
  }
  
  // ✅ Cap at 100
  score = Math.min(score, 100);
  
  // ✅ Deduplicate reasons
  const uniqueReasons = [...new Set(reasons)];
  
  return {
    score: Math.round(score),
    reasons: uniqueReasons.slice(0, 5) // Max 5 reasons
  };
};

/**
 * ✅ Transform multiple Listings to Experiences with personalization
 */
export const transformToExperiences = (listings, userContext = null) => {
  if (!listings || !Array.isArray(listings)) return [];
  
  return listings
    .filter(listing => listing && listing._id)
    .map(listing => transformToListingExperience(listing, userContext))
    .filter(experience => experience !== null)
    .sort((a, b) => (b.personalizationScore || 0) - (a.personalizationScore || 0));
};

/**
 * ✅ Transform with additional scoring/ranking
 */
export const transformWithScores = (listings, scores = {}, userContext = null) => {
  if (!listings || !Array.isArray(listings)) return [];
  
  return listings
    .filter(listing => listing && listing._id)
    .map(listing => {
      const experience = transformToListingExperience(listing, userContext);
      const score = scores[listing._id] || listing.score || experience.personalizationScore || 0;
      
      return {
        ...experience,
        score: Math.round(score * 100) / 100,
        matchReason: listing.matchReason || experience.matchReasons?.join(' • ') || null,
      };
    })
    .filter(experience => experience !== null)
    .sort((a, b) => b.score - a.score);
};

/**
 * ✅ Group Experiences by category
 */
export const groupExperiencesByCategory = (experiences) => {
  if (!experiences || !Array.isArray(experiences)) return {};
  
  const grouped = {};
  
  experiences.forEach(experience => {
    const category = experience.businessType || experience.category || 'other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(experience);
  });
  
  return grouped;
};

/**
 * ✅ Filter Experiences by user preferences
 */
export const filterExperiencesByPreferences = (experiences, preferences = {}) => {
  if (!experiences || !Array.isArray(experiences)) return [];
  
  let filtered = [...experiences];
  
  // ✅ Filter by budget
  if (preferences.maxBudget) {
    filtered = filtered.filter(exp => exp.price <= preferences.maxBudget);
  }
  
  if (preferences.minBudget) {
    filtered = filtered.filter(exp => exp.price >= preferences.minBudget);
  }
  
  // ✅ Filter by interests
  if (preferences.interests && preferences.interests.length > 0) {
    filtered = filtered.filter(exp => {
      const expKeywords = [
        ...(exp.interests || []),
        ...(exp.tags || []),
        exp.title || '',
        exp.description || '',
        exp.category || ''
      ].join(' ').toLowerCase();
      
      return preferences.interests.some(interest =>
        expKeywords.includes(interest.toLowerCase())
      );
    });
  }
  
  // ✅ Filter by location
  if (preferences.location) {
    filtered = filtered.filter(exp =>
      exp.location?.toLowerCase().includes(preferences.location.toLowerCase())
    );
  }
  
  // ✅ Filter by business type
  if (preferences.businessType) {
    filtered = filtered.filter(exp =>
      exp.businessType === preferences.businessType
    );
  }
  
  // ✅ Filter by rating
  if (preferences.minRating) {
    filtered = filtered.filter(exp => exp.rating >= preferences.minRating);
  }
  
  // ✅ Filter by availability
  if (preferences.availableOnly) {
    filtered = filtered.filter(exp => exp.isAvailable);
  }
  
  return filtered;
};

/**
 * ✅ Sort Experiences by relevance with personalization
 */
export const sortExperiencesByRelevance = (experiences, sortBy = 'relevance', userContext = null) => {
  if (!experiences || !Array.isArray(experiences)) return [];
  
  const sorted = [...experiences];
  
  switch (sortBy) {
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case 'price':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'popularity':
      sorted.sort((a, b) => b.bookingCount - a.bookingCount);
      break;
    case 'reviews':
      sorted.sort((a, b) => b.totalReviews - a.totalReviews);
      break;
    case 'newest':
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'relevance':
      // If user context provided, use personalization score
      if (userContext) {
        sorted.sort((a, b) => (b.personalizationScore || 0) - (a.personalizationScore || 0));
      } else {
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }
      break;
    case 'personalized':
      sorted.sort((a, b) => (b.personalizationScore || 0) - (a.personalizationScore || 0));
      break;
    default:
      sorted.sort((a, b) => b.rating - a.rating);
  }
  
  return sorted;
};

/**
 * ✅ Create Experience summary for AI prompts with personalization
 */
export const createExperienceSummary = (experiences, limit = 5, userContext = null) => {
  if (!experiences || !Array.isArray(experiences) || experiences.length === 0) {
    return "No experiences available.";
  }
  
  // ✅ Sort by personalization score if context provided
  let sorted = [...experiences];
  if (userContext) {
    sorted.sort((a, b) => (b.personalizationScore || 0) - (a.personalizationScore || 0));
  }
  
  const topExperiences = sorted.slice(0, limit);
  
  return topExperiences.map((exp, index) => {
    let summary = `${index + 1}. **${exp.title}**\n`;
    summary += `   📍 Location: ${exp.location}\n`;
    summary += `   💰 Price: $${exp.price} / ${exp.duration}\n`;
    summary += `   ⭐ Rating: ${exp.rating} (${exp.totalReviews} reviews)\n`;
    summary += `   🏷️ Tags: ${exp.tags?.join(', ') || 'None'}\n`;
    summary += `   📝 Description: ${exp.description?.substring(0, 150) || 'No description'}`;
    
    if (exp.personalizationScore) {
      summary += `\n   🎯 Match Score: ${exp.personalizationScore}%`;
    }
    if (exp.matchReasons?.length > 0) {
      summary += `\n   ✅ Why: ${exp.matchReasons.join(' • ')}`;
    }
    
    return summary;
  }).join('\n\n');
};

/**
 * ✅ Create Experience card data for frontend
 */
export const createExperienceCard = (experience) => {
  if (!experience) return null;
  
  return {
    id: experience.id || experience._id,
    title: experience.title,
    image: experience.coverImage || experience.images?.[0] || null,
    location: experience.location,
    price: experience.price,
    rating: experience.rating || 0,
    reviews: experience.totalReviews || 0,
    duration: experience.duration || '1 day',
    businessType: experience.businessType || 'tour_operator',
    tags: experience.tags || [],
    isVerified: experience.isVerified || false,
    isFeatured: experience.isFeatured || false,
    providerName: experience.provider?.name || 'Provider',
    providerId: experience.provider?.id || null,
    slug: experience.slug || '',
    personalizationScore: experience.personalizationScore || 0,
    matchReasons: experience.matchReasons || [],
  };
};

/**
 * ✅ Create featured experiences list
 */
export const createFeaturedExperiences = (experiences, limit = 6) => {
  if (!experiences || !Array.isArray(experiences)) return [];
  
  return experiences
    .filter(exp => exp.isFeatured)
    .slice(0, limit)
    .map(exp => createExperienceCard(exp));
};

/**
 * ✅ Create trending experiences (by popularity)
 */
export const createTrendingExperiences = (experiences, limit = 6) => {
  if (!experiences || !Array.isArray(experiences)) return [];
  
  return experiences
    .sort((a, b) => (b.bookingCount || 0) - (a.bookingCount || 0))
    .slice(0, limit)
    .map(exp => createExperienceCard(exp));
};

/**
 * ✅ Create recommended experiences (by rating)
 */
export const createRecommendedExperiences = (experiences, limit = 6) => {
  if (!experiences || !Array.isArray(experiences)) return [];
  
  return experiences
    .filter(exp => exp.rating >= 4.0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
    .map(exp => createExperienceCard(exp));
};

/**
 * ✅ Create nearby experiences (by location)
 */
export const createNearbyExperiences = (experiences, location, limit = 6) => {
  if (!experiences || !Array.isArray(experiences) || !location) return [];
  
  const nearby = experiences.filter(exp =>
    exp.location?.toLowerCase().includes(location.toLowerCase())
  );
  
  return nearby
    .slice(0, limit)
    .map(exp => createExperienceCard(exp));
};

/**
 * ✅ Create AI-recommended experiences with personalization
 */
export const createAIRecommendedExperiences = (experiences, userContext, limit = 6) => {
  if (!experiences || !Array.isArray(experiences)) return [];
  
  // ✅ Use the personalization scoring
  const scored = experiences.map(exp => {
    const result = calculatePersonalizationScore(
      { ...exp, _id: exp.id || exp._id, tags: exp.tags || [], interests: exp.interests || [] },
      userContext
    );
    
    return {
      ...exp,
      personalizationScore: result.score,
      matchReasons: result.reasons
    };
  });
  
  scored.sort((a, b) => b.personalizationScore - a.personalizationScore);
  
  return scored
    .slice(0, limit)
    .map(exp => createExperienceCard(exp));
};

/**
 * ✅ Create Experience categories map
 */
export const createExperienceCategories = (experiences) => {
  if (!experiences || !Array.isArray(experiences)) return {};
  
  const categories = {
    adventure: [],
    cultural: [],
    nature: [],
    luxury: [],
    budget: [],
    food: [],
    relaxation: [],
    urban: [],
  };
  
  experiences.forEach(exp => {
    const type = exp.businessType || 'other';
    const tags = exp.tags || [];
    const interests = exp.interests || [];
    
    // ✅ Categorize by business type
    if (['tour_operator', 'guide', 'transport'].includes(type)) {
      categories.adventure.push(exp);
    } else if (['restaurant', 'cafe'].includes(type)) {
      categories.food.push(exp);
    } else if (['hotel', 'lodge', 'resort'].includes(type)) {
      categories.luxury.push(exp);
    } else if (['events', 'shop'].includes(type)) {
      categories.urban.push(exp);
    }
    
    // ✅ Categorize by tags
    if (tags.some(t => ['nature', 'wildlife', 'scenic', 'lake', 'forest', 'mountain', 'gorilla'].includes(t))) {
      categories.nature.push(exp);
    }
    if (tags.some(t => ['culture', 'history', 'heritage', 'traditional', 'museum', 'memorial'].includes(t))) {
      categories.cultural.push(exp);
    }
    if (tags.some(t => ['relaxation', 'wellness', 'spa', 'peaceful', 'sunset', 'beach'].includes(t))) {
      categories.relaxation.push(exp);
    }
    if (exp.price < 100) {
      categories.budget.push(exp);
    }
  });
  
  // ✅ Remove duplicates
  Object.keys(categories).forEach(key => {
    categories[key] = [...new Set(categories[key])];
  });
  
  return categories;
};

/**
 * ✅ Get top matches for a user
 */
export const getTopMatches = (experiences, userContext, limit = 5) => {
  if (!experiences || !Array.isArray(experiences)) return [];
  
  const scored = experiences.map(exp => {
    const result = calculatePersonalizationScore(
      { ...exp, _id: exp.id || exp._id, tags: exp.tags || [], interests: exp.interests || [] },
      userContext
    );
    
    return {
      ...exp,
      personalizationScore: result.score,
      matchReasons: result.reasons
    };
  });
  
  scored.sort((a, b) => b.personalizationScore - a.personalizationScore);
  
  return scored.slice(0, limit);
};

/**
 * ✅ Default export with all functions
 */
export default {
  transformToListingExperience,
  transformToExperiences,
  transformWithScores,
  groupExperiencesByCategory,
  filterExperiencesByPreferences,
  sortExperiencesByRelevance,
  createExperienceSummary,
  createExperienceCard,
  createFeaturedExperiences,
  createTrendingExperiences,
  createRecommendedExperiences,
  createNearbyExperiences,
  createAIRecommendedExperiences,
  createExperienceCategories,
  calculatePersonalizationScore,
  getTopMatches,
}; 