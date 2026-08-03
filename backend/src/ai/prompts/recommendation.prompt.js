// src/ai/prompts/recommendation.prompt.js
export const recommendationPrompt = {
  build: ({ query, userContext, limit = 10 }) => {
    let prompt = `
Recommend ${limit} tours in Rwanda based on: "${query || 'Popular tours in Rwanda'}"
`;

    if (userContext) {
      prompt += `
USER CONTEXT:
- Past bookings: ${userContext.pastBookings?.length || 0}
- Favorite locations: ${userContext.favoriteLocations?.join(', ') || 'Not specified'}
`;
    }

    prompt += `
RETURN VALID JSON ARRAY ONLY:
[
  {
    "title": "Tour name",
    "location": "Location, Rwanda",
    "price": 0,
    "currency": "USD",
    "duration": "2 days",
    "description": "Brief description",
    "whyRecommended": "Why this tour is recommended",
    "activities": ["Activity 1", "Activity 2"],
    "bestTime": "Best time to visit",
    "rating": 4.5
  }
]
`;

    return prompt;
  }
};

export default recommendationPrompt;