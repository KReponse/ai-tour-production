// backend/src/ai/utils/experienceTransformer.js

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
 * ✅ Transform a single Listing to Experience
 */
export const transformToListingExperience = (listing) => {
  if (!listing) return null;

  // ✅ Extract provider info
  const provider = listing.provider || {};
  
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
    },
    
    // Listing Details
    businessType: listing.businessType || 'tour_operator',
    listingType: listing.listingType || 'standard',
    category: listing.category || 'general',
    
    // Tags & Interests
    tags: listing.tags || [],
    interests: listing.interests || [],
    highlights: listing.highlights || [],
    
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
  };
};

/**
 * ✅ Transform multiple Listings to Experiences
 */
export const transformToExperiences = (listings) => {
  if (!listings || !Array.isArray(listings)) return [];
  
  return listings
    .filter(listing => listing && listing._id) // Filter out invalid entries
    .map(listing => transformToListingExperience(listing))
    .filter(experience => experience !== null);
};

/**
 * ✅ Transform with additional scoring/ranking
 */
export const transformWithScores = (listings, scores = {}) => {
  if (!listings || !Array.isArray(listings)) return [];
  
  return listings
    .filter(listing => listing && listing._id)
    .map(listing => {
      const experience = transformToListingExperience(listing);
      const score = scores[listing._id] || listing.score || 0;
      
      return {
        ...experience,
        score: Math.round(score * 100) / 100,
        matchReason: listing.matchReason || null,
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
    const category = experience.businessType || 'other';
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
    filtered = filtered.filter(exp => 
      exp.interests?.some(interest => 
        preferences.interests.some(pref => 
          interest.toLowerCase().includes(pref.toLowerCase())
        )
      ) ||
      exp.tags?.some(tag => 
        preferences.interests.some(pref => 
          tag.toLowerCase().includes(pref.toLowerCase())
        )
      )
    );
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
  
  return filtered;
};

/**
 * ✅ Sort Experiences by relevance
 */
export const sortExperiencesByRelevance = (experiences, sortBy = 'rating') => {
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
      sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
      break;
    default:
      sorted.sort((a, b) => b.rating - a.rating);
  }
  
  return sorted;
};

/**
 * ✅ Create Experience summary for AI prompts
 */
export const createExperienceSummary = (experiences, limit = 5) => {
  if (!experiences || !Array.isArray(experiences) || experiences.length === 0) {
    return "No experiences available.";
  }
  
  const topExperiences = experiences.slice(0, limit);
  
  return topExperiences.map((exp, index) => {
    return `${index + 1}. **${exp.title}**\n` +
           `   📍 Location: ${exp.location}\n` +
           `   💰 Price: $${exp.price} / ${exp.duration}\n` +
           `   ⭐ Rating: ${exp.rating} (${exp.totalReviews} reviews)\n` +
           `   🏷️ Tags: ${exp.tags?.join(', ') || 'None'}\n` +
           `   📝 Description: ${exp.description?.substring(0, 150) || 'No description'}\n`;
  }).join('\n');
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
  
  // Simple location matching (can be enhanced with geospatial)
  const nearby = experiences.filter(exp =>
    exp.location?.toLowerCase().includes(location.toLowerCase())
  );
  
  return nearby
    .slice(0, limit)
    .map(exp => createExperienceCard(exp));
};

/**
 * ✅ Create AI-recommended experiences
 */
export const createAIRecommendedExperiences = (experiences, userContext, limit = 6) => {
  if (!experiences || !Array.isArray(experiences)) return [];
  
  let scored = experiences.map(exp => {
    let score = 0;
    
    // ✅ User interest match
    if (userContext?.interests) {
      const interestMatches = userContext.interests.filter(interest =>
        exp.tags?.some(tag => tag.toLowerCase().includes(interest.toLowerCase())) ||
        exp.interests?.some(i => i.toLowerCase().includes(interest.toLowerCase()))
      );
      score += interestMatches.length * 2;
    }
    
    // ✅ Past booking match
    if (userContext?.favoriteTypes) {
      const typeMatch = userContext.favoriteTypes.some(type =>
        exp.businessType?.toLowerCase().includes(type.toLowerCase())
      );
      if (typeMatch) score += 3;
    }
    
    // ✅ Location match
    if (userContext?.favoriteLocations) {
      const locationMatch = userContext.favoriteLocations.some(loc =>
        exp.location?.toLowerCase().includes(loc.toLowerCase())
      );
      if (locationMatch) score += 2;
    }
    
    // ✅ Rating bonus
    if (exp.rating >= 4.5) score += 2;
    else if (exp.rating >= 4.0) score += 1;
    
    // ✅ Booking count bonus
    if (exp.bookingCount > 50) score += 2;
    else if (exp.bookingCount > 20) score += 1;
    
    return { ...exp, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
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
    } else if (['hotel', 'lodge'].includes(type)) {
      categories.luxury.push(exp);
    } else if (['events', 'shop'].includes(type)) {
      categories.urban.push(exp);
    }
    
    // ✅ Categorize by tags
    if (tags.some(t => ['nature', 'wildlife', 'scenic', 'lake', 'forest'].includes(t))) {
      categories.nature.push(exp);
    }
    if (tags.some(t => ['culture', 'history', 'heritage', 'traditional'].includes(t))) {
      categories.cultural.push(exp);
    }
    if (tags.some(t => ['relaxation', 'wellness', 'spa', 'peaceful'].includes(t))) {
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
};