// backend/src/ai/prompts/planner.prompt.js
// ✅ PRODUCTION READY
// AI Tour Rwanda — Listing-driven AI Trip Planner
//
// IMPORTANT:
// - MongoDB Listings are the ONLY source of truth for experiences.
// - AI must NEVER invent listings, prices, IDs, ratings, URLs, or availability.
// - Backend must validate all experienceId values after AI response.
// - If no real experiences are provided, AI must not fabricate any.
// - This prompt is designed for Gemini/OpenAI providers.

const plannerPrompt = {
  build({
    destination,
    days,
    budget,
    travelers = 1,
    preferences = {},
    experiences = [],
    interests = [],
    travelStyle = 'balanced',
    startDate = null,
    endDate = null,
    weather = null,
    currency = 'USD',
    language = 'en'
  }) {
    const safeDays = Math.max(1, Number(days) || 1);
    const safeBudget = Math.max(0, Number(budget) || 0);
    const safeTravelers = Math.max(1, Number(travelers) || 1);

    const styleDescriptions = {
      adventure:
        'Prioritize outdoor adventure, hiking, trekking, wildlife and active experiences.',
      cultural:
        'Prioritize culture, history, museums, local communities, traditions and heritage.',
      relaxation:
        'Prioritize relaxed activities, nature, scenic locations, wellness and slower pacing.',
      luxury:
        'Prioritize premium experiences, comfort, private services and high-quality options.',
      budget:
        'Prioritize affordable experiences, efficient transport and good value.',
      balanced:
        'Balance nature, culture, adventure, relaxation and practical travel time.'
    };

    const styleDescription =
      styleDescriptions[travelStyle] || styleDescriptions.balanced;

    const formatExperience = (experience, index) => {
      const id = experience.id
        ? String(experience.id)
        : '';

      return JSON.stringify({
        index: index + 1,
        experienceId: id,
        title: experience.title || '',
        location: experience.location || '',
        price:
          typeof experience.price === 'number'
            ? experience.price
            : null,
        currency: experience.currency || currency,
        duration: experience.duration || null,
        rating:
          typeof experience.rating === 'number'
            ? experience.rating
            : null,
        description: experience.description || '',
        category: experience.businessType || null,
        tags: Array.isArray(experience.tags)
          ? experience.tags.slice(0, 10)
          : [],
        interests: Array.isArray(experience.interests)
          ? experience.interests.slice(0, 10)
          : []
      });
    };

    const experienceData = experiences.length
      ? experiences
          .slice(0, 20)
          .map(formatExperience)
          .join(',\n')
      : '[]';

    const weatherData = weather
      ? JSON.stringify(weather)
      : '{}';

    const preferencesData =
      typeof preferences === 'object'
        ? JSON.stringify(preferences)
        : String(preferences || '');

    const interestsData = Array.isArray(interests)
      ? interests.join(', ')
      : String(interests || '');

    const startDateText = startDate
      ? new Date(startDate).toISOString().slice(0, 10)
      : 'flexible';

    const endDateText = endDate
      ? new Date(endDate).toISOString().slice(0, 10)
      : 'not specified';

    return `
You are the official AI Tour Rwanda trip-planning assistant.

Your job is to create a practical, realistic and personalized Rwanda travel itinerary.

==================================================
ABSOLUTE DATA RULES
==================================================

1. The AVAILABLE EXPERIENCES section is the ONLY authoritative source for platform experiences.

2. NEVER invent an experience.

3. NEVER create a fake experienceId.

4. NEVER modify or invent:
   - experience title
   - listing ID
   - price
   - currency
   - rating
   - duration
   - location
   - availability
   - provider information

5. If an activity comes from AVAILABLE EXPERIENCES, its exact experienceId MUST be copied.

6. If there are no AVAILABLE EXPERIENCES, do NOT fabricate experiences.

7. General Rwanda travel advice is allowed, but it MUST NOT be presented as a platform experience.

8. Do not claim that an experience is available for booking unless it exists in AVAILABLE EXPERIENCES.

9. Do not generate URLs.

10. The backend will generate detailsUrl and bookingUrl from the real experienceId.

11. Do not invent hotels, restaurants, prices or availability as if they were verified platform data.

12. When hotel or restaurant information is not supplied by the backend, describe it generically, for example:
    "mid-range hotel in Kigali"
    "local restaurant near the accommodation"

==================================================
TRAVELER REQUEST
==================================================

Destination:
${destination || 'Rwanda'}

Trip duration:
${safeDays} day(s)

Budget:
${safeBudget} ${currency}

Travelers:
${safeTravelers}

Travel style:
${travelStyle}

Travel style guidance:
${styleDescription}

Interests:
${interestsData || 'Not specified'}

Preferences:
${preferencesData || '{}'}

Start date:
${startDateText}

End date:
${endDateText}

Weather:
${weatherData}

==================================================
AVAILABLE EXPERIENCES FROM MONGODB
==================================================

The following experiences are REAL platform data.

You may ONLY use these experiences as bookable/recommended platform experiences.

[
${experienceData}
]

==================================================
PLANNING RULES
==================================================

Create a ${safeDays}-day itinerary.

For every day:

- Give the traveler a clear day title.
- Keep activities geographically sensible.
- Avoid unnecessary long-distance travel between activities.
- Do not schedule too many activities in one day.
- Leave reasonable time for meals, transport and rest.
- Consider the traveler's interests and travel style.
- Consider the supplied weather information.
- Consider the trip duration.
- Consider the total budget.

==================================================
EXPERIENCE SELECTION
==================================================

When selecting experiences:

1. Prefer experiences matching the destination.
2. Prefer experiences matching interests.
3. Prefer experiences matching travelStyle.
4. Prefer experiences that fit the budget.
5. Prefer geographically compatible experiences on the same day.
6. Do not repeat the same experience unless there is a strong reason.
7. Use only the supplied experienceId.
8. If no supplied experience is appropriate for a day, leave that day's
   platform activities empty and provide generic non-bookable travel
   suggestions separately.

IMPORTANT:

An empty activity list is better than a fabricated experience.

==================================================
BUDGET RULES
==================================================

The total estimated trip cost should be reasonable relative to the
traveler's stated budget.

Budget allocation is a GUIDELINE, not a guarantee:

- Accommodation: approximately 30–40%
- Experiences/activities: approximately 20–35%
- Food: approximately 15–25%
- Transport: approximately 10–20%
- Miscellaneous: approximately 5–10%

Do not claim exact accommodation, restaurant or transport prices unless
the backend supplied them.

Experience costs MUST come from AVAILABLE EXPERIENCES.

If experience.price is null, do not invent a price.

When price is unknown:

"cost": null

The summary must clearly distinguish between:

- known platform experience costs
- estimated/general travel costs

==================================================
FOLLOW-UP AND PERSONALIZATION
==================================================

Use the supplied traveler information to personalize the plan.

If the traveler is budget-conscious:
prioritize lower-cost real experiences.

If the traveler prefers luxury:
prioritize higher-value real experiences when available.

If the traveler prefers adventure:
prioritize relevant real outdoor experiences.

If the traveler prefers culture:
prioritize relevant cultural experiences.

If the destination is Rwanda:
you may organize the itinerary around appropriate regions,
but do not claim that a specific platform experience exists unless it
appears in AVAILABLE EXPERIENCES.

==================================================
IMPORTANT DISTINCTION
==================================================

There are TWO types of information:

A. PLATFORM EXPERIENCES

These MUST come from AVAILABLE EXPERIENCES.

They have:
- experienceId
- title
- location
- price
- duration
- rating
- description

B. GENERAL TRAVEL INFORMATION

This may include:
- general transport advice
- packing advice
- safety advice
- cultural advice
- seasonal advice
- generic accommodation guidance

General information must NEVER be represented as a bookable platform listing.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Do not use markdown.

Do not use code fences.

Do not add explanations outside JSON.

Use EXACTLY this structure:

{
  "itinerary": [
    {
      "day": 1,
      "title": "Day 1 - ...",
      "location": "...",
      "activities": [
        {
          "time": "09:00",
          "name": "REAL EXPERIENCE TITLE",
          "description": "Short description based on supplied experience data",
          "duration": "REAL DURATION OR null",
          "cost": 0,
          "currency": "USD",
          "experienceId": "REAL MONGODB EXPERIENCE ID",
          "isBookable": true
        }
      ],
      "meals": {
        "breakfast": "Generic recommendation or supplied restaurant",
        "lunch": "Generic recommendation or supplied restaurant",
        "dinner": "Generic recommendation or supplied restaurant"
      },
      "accommodation": {
        "name": "Generic accommodation recommendation unless verified data exists",
        "type": "Budget/Mid-range/Luxury",
        "cost": null,
        "currency": "USD",
        "rating": null
      },
      "transport": "Practical transport recommendation",
      "estimatedCost": 0
    }
  ],

  "summary": {
    "totalEstimatedCost": 0,
    "currency": "USD",
    "dailyBudget": 0,
    "knownExperienceCost": 0,
    "estimatedAccommodationCost": 0,
    "estimatedFoodCost": 0,
    "estimatedTransportCost": 0,
    "estimatedMiscellaneousCost": 0,
    "withinBudget": true
  },

  "recommendedExperiences": [
    {
      "experienceId": "REAL MONGODB EXPERIENCE ID",
      "reason": "Why this real experience matches the traveler"
    }
  ],

  "tips": [
    "Practical travel tip"
  ],

  "bestTime": "General seasonal recommendation",

  "weather": {
    "condition": "Supplied weather condition or null",
    "temperature": null,
    "season": null
  },

  "transportation": "General transportation recommendation",

  "safetyTips": [
    "Practical safety tip"
  ],

  "culturalTips": [
    "Practical cultural tip"
  ],

  "packingList": [
    "Useful packing item"
  ],

  "planningNotes": [
    "Important limitation or planning assumption"
  ]
}

==================================================
STRICT EXPERIENCE VALIDATION
==================================================

Before returning JSON, internally verify:

For every itinerary activity where:

"isBookable": true

the "experienceId" MUST exactly match one of the IDs supplied in
AVAILABLE EXPERIENCES.

For every item in recommendedExperiences:

"experienceId" MUST exactly match one of the IDs supplied in
AVAILABLE EXPERIENCES.

If an ID does not exist:

- remove the activity/recommendation
- do not replace it with an invented experience

If there are zero valid platform experiences:

"recommendedExperiences": []

and all itinerary activities that would require a platform listing
must be omitted.

==================================================
NO HALLUCINATION POLICY
==================================================

Never create:

"Gorilla Trekking"

"Akagera Safari"

"Nyungwe Canopy Walk"

"Lake Kivu Boat Tour"

"Kigali City Tour"

or any other experience simply because it is popular in Rwanda.

Use them ONLY if they appear in AVAILABLE EXPERIENCES.

==================================================
LANGUAGE
==================================================

Respond in:

${language}

Keep the language natural, clear and useful for a traveler.

==================================================
FINAL CHECK
==================================================

Before responding:

✓ Valid JSON only
✓ Exactly ${safeDays} itinerary days
✓ No invented experience IDs
✓ No invented platform experiences
✓ No invented listing prices
✓ Real experience data preserved
✓ No fake URLs
✓ Budget considered
✓ Destination considered
✓ Interests considered
✓ Travel style considered
✓ Weather considered
✓ Activities distributed logically
✓ Avoid unnecessary repetition
✓ Empty is better than fabricated
`;
  },

  getStyleDescription(style = 'balanced') {
    const styles = {
      adventure:
        'Prioritize outdoor adventure, hiking, trekking, wildlife and active experiences.',
      cultural:
        'Prioritize culture, history, museums, local communities, traditions and heritage.',
      relaxation:
        'Prioritize relaxed activities, nature, scenic locations, wellness and slower pacing.',
      luxury:
        'Prioritize premium experiences, comfort, private services and high-quality options.',
      budget:
        'Prioritize affordable experiences, efficient transport and good value.',
      balanced:
        'Balance nature, culture, adventure, relaxation and practical travel time.'
    };

    return styles[style] || styles.balanced;
  },

  getSeasonalAdvice(month) {
    const monthNumber = Number(month);

    if ([5, 6, 7, 8].includes(monthNumber)) {
      return {
        title: 'Dry season',
        description:
          'Generally favorable conditions for many outdoor activities, while checking the current forecast remains important.',
        activities: [
          'Outdoor activities',
          'Hiking',
          'Wildlife experiences',
          'Cultural exploration'
        ]
      };
    }

    if ([2, 3, 4, 9, 10].includes(monthNumber)) {
      return {
        title: 'Rainier season',
        description:
          'Expect possible rainfall and flexible scheduling may be useful.',
        activities: [
          'Cultural experiences',
          'Nature experiences',
          'Flexible outdoor activities',
          'Indoor activities'
        ]
      };
    }

    return {
      title: 'Moderate travel season',
      description:
        'Check the current weather forecast and local conditions before finalizing outdoor plans.',
      activities: [
        'Nature experiences',
        'Cultural exploration',
        'City activities',
        'Outdoor activities'
      ]
    };
  },

  getBudgetBreakdown(budget) {
    const amount = Number(budget) || 0;

    if (amount >= 2000) {
      return {
        accommodation: 40,
        activities: 30,
        food: 15,
        transport: 10,
        misc: 5,
        description: 'Comfortable or premium travel'
      };
    }

    if (amount >= 800) {
      return {
        accommodation: 35,
        activities: 30,
        food: 20,
        transport: 10,
        misc: 5,
        description: 'Mid-range travel'
      };
    }

    return {
      accommodation: 30,
      activities: 25,
      food: 25,
      transport: 15,
      misc: 5,
      description: 'Budget-conscious travel'
    };
  }
};

export default plannerPrompt;
export { plannerPrompt };

