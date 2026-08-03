// backend/src/ai/services/promptBuilder.service.js
// ✅ UPDATED - Uses "Experiences" instead of "Tours"

class PromptBuilderService {
  constructor() {
    this.name = 'PromptBuilderService';
  }

  buildChatPrompt(params) {
    const { message, context, userContext, relevantExperiences } = params; // Changed from relevantTours
    let prompt = `User: ${message}`;

    if (relevantExperiences && relevantExperiences.length > 0) {
      prompt += `\n\nAvailable experiences that might be relevant:\n`;
      prompt += relevantExperiences.map(exp => 
        `- ${exp.title} in ${exp.location} ($${exp.price}, ${exp.duration})`
      ).join('\n');
    }

    if (userContext) {
      prompt += `\n\nUser has previously visited: `;
      prompt += userContext.pastBookings?.map(b => b.title).join(', ') || 'No past bookings';
    }

    prompt += `\n\nAssistant: `;
    return prompt;
  }

  buildPlannerPrompt(params) {
    const { destination, days, budget, travelers, preferences, availableExperiences } = params; // Changed from availableTours
    let prompt = `
Create a detailed ${days}-day travel plan for ${destination}, Rwanda.

REQUIREMENTS:
- Destination: ${destination}
- Duration: ${days} days
- Budget: $${budget}
- Travelers: ${travelers || 1}
- Preferences: ${preferences || 'Balanced'}

IMPORTANT: Use "Experiences" not "Tours" or "Listings".
`;

    if (availableExperiences && availableExperiences.length > 0) {
      prompt += `\nAVAILABLE EXPERIENCES:\n`;
      availableExperiences.forEach(exp => {
        prompt += `- ${exp.title}: ${exp.location} ($${exp.price}, ${exp.duration})\n`;
      });
    }

    prompt += `
RETURN VALID JSON ONLY:
{
  "itinerary": [
    {
      "day": 1,
      "title": "Day 1 Title",
      "experiences": ["Experience 1", "Experience 2"],
      "meals": ["Breakfast", "Lunch", "Dinner"],
      "accommodation": "Hotel name",
      "budget": 0
    }
  ],
  "totalCost": 0,
  "dailyBudget": 0,
  "tips": ["Tip 1", "Tip 2"],
  "bestTime": "Best time to visit",
  "weather": "Weather information",
  "packingList": ["Item 1", "Item 2"],
  "transportation": "Transportation recommendations"
}`;

    return prompt;
  }

  buildRecommendationPrompt(params) {
    const { query, userContext, limit = 10 } = params;
    let prompt = `
Recommend ${limit} experiences in Rwanda based on: "${query || 'Popular experiences'}"

IMPORTANT: Use "Experiences" terminology, never "Tours" or "Listings".
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
    "title": "Experience name",
    "location": "Location, Rwanda",
    "price": 0,
    "duration": "2 days",
    "description": "Brief description",
    "whyRecommended": "Why this experience is recommended",
    "activities": ["Activity 1", "Activity 2"],
    "bestTime": "Best time to visit",
    "rating": 4.5,
    "category": "Adventure|Cultural|Nature|Luxury|Food"
  }
]`;

    return prompt;
  }
}

const promptBuilder = new PromptBuilderService();
export default promptBuilder;