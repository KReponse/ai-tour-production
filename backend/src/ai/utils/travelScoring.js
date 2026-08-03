// src/ai/utils/travelScoring.js
export class TravelScoring {
  constructor() {
    this.name = 'TravelScoring';
  }

  // Score a tour based on multiple factors
  scoreTour(tour, userContext) {
    let score = 0;

    // 1. Rating score (max 30)
    score += (tour.averageRating || 0) * 6;

    // 2. Popularity score (max 20)
    score += Math.min((tour.totalReviews || 0) * 0.5, 20);

    // 3. Location match (max 20)
    if (userContext?.favoriteLocations) {
      userContext.favoriteLocations.forEach(loc => {
        if (tour.location?.toLowerCase().includes(loc.toLowerCase())) {
          score += 10;
        }
      });
    }

    // 4. Price score (max 15)
    if (userContext?.preferences?.budget) {
      if (tour.price <= userContext.preferences.budget * 0.5) {
        score += 15;
      } else if (tour.price <= userContext.preferences.budget) {
        score += 10;
      } else if (tour.price <= userContext.preferences.budget * 1.5) {
        score += 5;
      }
    }

    // 5. Duration score (max 10)
    const dayCount = parseInt(tour.duration) || 1;
    if (dayCount <= 3) {
      score += 10;
    } else if (dayCount <= 5) {
      score += 7;
    } else {
      score += 4;
    }

    // 6. Interest match (max 5)
    if (userContext?.preferences?.interests) {
      userContext.preferences.interests.forEach(interest => {
        if (tour.title?.toLowerCase().includes(interest.toLowerCase())) {
          score += 2.5;
        }
        if (tour.description?.toLowerCase().includes(interest.toLowerCase())) {
          score += 2.5;
        }
      });
    }

    return Math.min(score, 100);
  }

  // Rank tours by score
  rankTours(tours, userContext) {
    return tours
      .map(tour => ({
        ...tour,
        score: this.scoreTour(tour, userContext)
      }))
      .sort((a, b) => b.score - a.score);
  }

  // Get recommendation reason
  getRecommendationReason(tour, userContext) {
    const reasons = [];

    if (tour.averageRating >= 4.5) {
      reasons.push('⭐ Highly rated');
    }
    if (tour.totalReviews >= 10) {
      reasons.push('📝 Popular tour');
    }
    if (userContext?.favoriteLocations?.some(loc => 
      tour.location?.toLowerCase().includes(loc.toLowerCase())
    )) {
      reasons.push('📍 Matches your favorite locations');
    }
    if (userContext?.preferences?.budget && 
        tour.price <= userContext.preferences.budget) {
      reasons.push('💰 Within your budget');
    }

    return reasons.length > 0 
      ? reasons.join(', ') 
      : '✨ Great option';
  }
}

export const travelScoring = new TravelScoring();
export default travelScoring;