// backend/src/utils/updateTourRatings.js
// ✅ UPDATED - Uses Listing instead of Tour

import Review from "../models/Review.js";
import Listing from "../models/Listing.js";

export const updateTourRatings = async (tourId) => {
  try {
    const reviews = await Review.find({
      listing: tourId,  // Changed from 'tour' to 'listing'
      status: "approved"
    });

    const totalReviews = reviews.length;
    
    let averageRating = 0;
    if (totalReviews > 0) {
      const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
      averageRating = sum / totalReviews;
    }

    await Listing.findByIdAndUpdate(tourId, {
      averageRating: averageRating,
      reviewCount: totalReviews  // Changed from 'totalReviews' to 'reviewCount' to match Listing schema
    });

    return { averageRating, totalReviews };
  } catch (error) {
    console.error("Error updating tour ratings:", error);
    throw error;
  }
};

export default updateTourRatings;