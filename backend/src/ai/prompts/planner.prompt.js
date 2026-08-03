// backend/src/ai/prompts/planner.prompt.js

export const plannerPrompt = {
  build: ({ 
    destination, 
    days, 
    budget, 
    travelers, 
    preferences, 
    experiences = [],
    interests = [],
    travelStyle = 'balanced',
    startDate = null,
    weather = null
  }) => {
    
    // ✅ Format experiences for the prompt
    const formatExperiences = (expList) => {
      if (!expList || expList.length === 0) {
        return "No specific experiences available. I'll suggest popular Rwanda experiences.";
      }
      
      return expList.map((exp, i) => {
        const tags = exp.tags?.length > 0 ? `🏷️ ${exp.tags.slice(0, 3).join(', ')}` : '';
        const rating = exp.rating > 0 ? `⭐ ${exp.rating}/5` : '';
        const duration = exp.duration || '1 day';
        
        return `${i+1}. **${exp.title}** 🌍 ${exp.location}
   💰 $${exp.price} | ⏱️ ${duration}
   ${rating} ${tags}
   📝 ${exp.description?.substring(0, 80) || ''}`;
      }).join('\n\n');
    };

    // ✅ Travel style descriptions
    const styleDescriptions = {
      adventure: 'Thrilling, active, outdoor experiences, hiking, trekking, wildlife',
      cultural: 'Museums, historic sites, local traditions, community experiences, festivals',
      relaxation: 'Slow pace, spas, lake views, leisurely dining, peaceful nature',
      luxury: 'Premium accommodation, exclusive experiences, fine dining, private tours',
      budget: 'Value experiences, affordable stays, local transport, budget-friendly dining',
      balanced: 'Mix of culture, nature, adventure, and relaxation'
    };

    const styleDesc = styleDescriptions[travelStyle] || styleDescriptions.balanced;

    // ✅ Season descriptions
    const getSeasonDesc = (date) => {
      if (!date) return 'Check current weather forecast before your trip';
      
      const month = new Date(date).getMonth();
      const drySeason = [5, 6, 7, 8]; // June-September
      const rainySeason = [2, 3, 4, 9, 10, 11]; // March-May, October-November
      
      if (drySeason.includes(month)) {
        return '☀️ Dry season - Ideal for gorilla trekking, hiking, and outdoor activities';
      } else if (rainySeason.includes(month)) {
        return '🌧️ Rainy season - Lush landscapes, fewer crowds, occasional showers';
      } else {
        return '🌤️ Shoulder season - Moderate weather, good for travel';
      }
    };

    const seasonInfo = getSeasonDesc(startDate);

    // ✅ Build the prompt
    let prompt = `
🎯 PLAN A PERSONALIZED ${days}-DAY EXPERIENCE IN ${destination}, RWANDA

📋 REQUIREMENTS:
- Destination: ${destination}
- Duration: ${days} days
- Budget: $${budget}
- Travelers: ${travelers || 1}
- Travel Style: ${travelStyle} - ${styleDesc}
- Interests: ${interests?.length > 0 ? interests.join(', ') : 'Not specified'}
- Start Date: ${startDate ? new Date(startDate).toLocaleDateString() : 'Flexible'}
- Weather: ${weather?.condition || seasonInfo}

${experiences?.length > 0 ? `
🎯 AVAILABLE EXPERIENCES (${experiences.length} found):

${formatExperiences(experiences.slice(0, 8))}

${experiences.length > 8 ? `\n... and ${experiences.length - 8} more experiences available` : ''}

💡 TIP: Use these REAL experiences from our platform. DO NOT invent experiences.
` : `
📌 No specific experiences match your criteria. Use these popular Rwanda experiences:

1. 🦍 Gorilla Trekking - Volcanoes National Park ($1500)
2. 🐘 Akagera Safari - Akagera National Park ($200-400)
3. 🌿 Nyungwe Canopy Walk - Nyungwe Forest ($60)
4. 🏙️ Kigali City Tour - Kigali ($50-100)
5. 🚤 Lake Kivu Boat Tour - Lake Kivu ($50-200)
`}

📋 PLAN REQUIREMENTS:
1. Create a REALISTIC day-by-day itinerary using the experiences above
2. Group experiences by LOCATION to minimize travel time
3. Balance ACTIVITIES with REST and MEALS
4. Stay within the $${budget} budget
5. Consider the TRAVEL STYLE (${travelStyle})
6. Account for SEASONAL factors (${seasonInfo})
7. Include specific pricing and logistics

🏨 ACCOMMODATION GUIDELINES (Based on budget):
- Luxury: $150+/night
- Mid-range: $80-150/night  
- Budget: $30-80/night
- Backpacker: $15-30/night

💡 RECOMMENDED BUDGET ALLOCATION:
- Accommodation: 35%
- Activities/Experiences: 30%
- Food: 20%
- Transport: 10%
- Miscellaneous: 5%

RETURN VALID JSON ONLY with this EXACT structure:
{
  "itinerary": [
    {
      "day": 1,
      "title": "Day 1 - Experience Title",
      "location": "City/Area",
      "activities": [
        {
          "time": "9:00 AM",
          "name": "Experience Name",
          "description": "What you'll do",
          "duration": "2 hours",
          "cost": 0,
          "experienceId": "Use real experience ID if available"
        }
      ],
      "meals": {
        "breakfast": "Restaurant name ($$)",
        "lunch": "Restaurant name ($$)",
        "dinner": "Restaurant name ($$)"
      },
      "accommodation": {
        "name": "Hotel/Lodge name",
        "type": "Luxury/Mid-range/Budget",
        "cost": 0,
        "rating": 0
      },
      "totalCost": 0,
      "transport": "Transportation method"
    }
  ],
  "summary": {
    "totalCost": 0,
    "dailyBudget": 0,
    "accommodationTotal": 0,
    "activitiesTotal": 0,
    "foodTotal": 0,
    "transportTotal": 0
  },
  "tips": ["Practical tip 1", "Safety tip 2", "Cultural tip 3"],
  "bestTime": "Best time to visit",
  "weather": "Weather information",
  "packingList": ["Item 1", "Item 2", "Item 3"],
  "transportation": "Transportation recommendations",
  "safetyTips": ["Safety tip 1", "Safety tip 2"],
  "culturalTips": ["Cultural tip 1", "Cultural tip 2"]
}

🗣️ IMPORTANT: 
- Use REAL experiences from the list above
- DO NOT invent experiences that don't exist
- ALWAYS include pricing in the experience data
- The user is a TRAVELER exploring Rwanda
- Use "Experiences" not "Tours" or "Listings"
- Be practical, specific, and helpful
`;

    return prompt;
  },

  // ✅ Get travel style description
  getStyleDescription: (style) => {
    const styles = {
      adventure: 'Thrilling, active, outdoor experiences, hiking, trekking, wildlife',
      cultural: 'Museums, historic sites, local traditions, community experiences, festivals',
      relaxation: 'Slow pace, spas, lake views, leisurely dining, peaceful nature',
      luxury: 'Premium accommodation, exclusive experiences, fine dining, private tours',
      budget: 'Value experiences, affordable stays, local transport, budget-friendly dining',
      balanced: 'Mix of culture, nature, adventure, and relaxation'
    };
    return styles[style] || styles.balanced;
  },

  // ✅ Get seasonal recommendations
  getSeasonalAdvice: (month) => {
    const advice = {
      'dry': {
        title: '☀️ Dry Season (June-September)',
        description: 'Best time for gorilla trekking, hiking, safari, and outdoor activities',
        activities: ['Gorilla Trekking', 'Game Drives', 'Mountain Hiking', 'City Tours']
      },
      'rainy': {
        title: '🌧️ Rainy Season (March-May, October-November)',
        description: 'Lush landscapes, fewer crowds, ideal for bird watching and cultural experiences',
        activities: ['Bird Watching', 'Museum Visits', 'Cultural Tours', 'Indoor Experiences']
      },
      'shoulder': {
        title: '🌤️ Shoulder Season (December-February)',
        description: 'Moderate weather, less crowds, good value for travel',
        activities: ['Safari', 'Lake Activities', 'Cultural Experiences', 'Hiking']
      }
    };
    return advice[month] || advice.dry;
  },

  // ✅ Get budget breakdown recommendation
  getBudgetBreakdown: (budget) => {
    if (budget > 2000) {
      return {
        accommodation: 40,
        activities: 35,
        food: 15,
        transport: 7,
        misc: 3,
        description: 'Luxury travel with premium experiences'
      };
    } else if (budget > 800) {
      return {
        accommodation: 35,
        activities: 30,
        food: 20,
        transport: 10,
        misc: 5,
        description: 'Mid-range comfortable travel'
      };
    } else {
      return {
        accommodation: 30,
        activities: 25,
        food: 25,
        transport: 15,
        misc: 5,
        description: 'Budget-friendly travel'
      };
    }
  }
};

export default plannerPrompt;