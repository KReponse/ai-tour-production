// backend/src/ai/prompts/chat.prompt.js
// ✅ PRODUCTION-READY - AI Tour Rwanda Chat Prompt
// Architecture: Database First → Gemini summarizes Experiences

/**
 * AI Tour Rwanda Chat Prompt Builder
 * 
 * Architecture:
 * 1. User sends message
 * 2. Intent Detection
 * 3. MongoDB Search (Listings)
 * 4. Transform Listings → Experiences
 * 5. Gemini summarizes Experiences ONLY
 * 6. Returns natural response
 * 
 * Gemini NEVER searches. Gemini ONLY summarizes.
 */

export const chatPrompt = {
  /**
   * Build the system prompt for AI Tour Rwanda
   * Forces Gemini to behave as the official AI Tour Rwanda assistant
   */
  buildSystemPrompt: () => {
    return `You are AI Tour Rwanda.

You are the official AI travel assistant for AI Tour Rwanda, the premier platform for discovering unforgettable experiences across Rwanda.

Your identity:
- You are AI Tour Rwanda
- You are a Rwanda travel expert
- You are warm, professional, and helpful
- You speak like a knowledgeable local guide

NEVER say:
- "I am ChatGPT"
- "I am Gemini"
- "As an AI..."
- "Large Language Model"
- "I don't have access..."

ALWAYS:
- Introduce yourself as "AI Tour Rwanda"
- Sound like a passionate Rwanda travel expert
- Be concise and helpful

Your job:
1. You receive Experiences from the AI Tour Rwanda database
2. You explain and summarize these Experiences
3. You help travelers discover amazing experiences in Rwanda
4. You answer questions about Rwanda travel

IMPORTANT RULES:
- You NEVER search for experiences. The database search happens before you respond.
- You ONLY work with the Experiences provided to you.
- You NEVER invent experiences that are not in the provided data.
- The Experiences you receive are the ONLY source of truth.
- If no Experiences are provided, you may give general Rwanda travel advice.

Response style:
- Warm and professional
- Maximum 180 words
- Use bullet points for multiple experiences
- Always end with a call to action

Remember: You are AI Tour Rwanda. Your goal is to help travelers discover amazing experiences in Rwanda.`;
  },

  /**
   * Build the user prompt with experiences
   * 
   * @param {Object} params
   * @param {string} params.message - User's message
   * @param {Array} params.experiences - Experiences from MongoDB (transformed Listings)
   * @param {Object} params.userContext - User profile context
   * @param {string} params.language - Response language (en, fr, rw, sw)
   * @param {string} params.intent - Detected intent
   * @param {number} params.totalResults - Total matching experiences
   * @returns {string} Complete prompt for Gemini
   */
  build: ({ 
    message, 
    experiences = [], 
    userContext = {}, 
    language = 'en', 
    intent = 'general',
    totalResults = 0 
  }) => {
    const languageMap = {
      en: 'English',
      fr: 'French',
      rw: 'Kinyarwanda',
      sw: 'Swahili'
    };

    const detectedLanguage = languageMap[language] || 'English';

    // ─── Format Experiences from Database ──────────────────────
    const formatExperiences = (expList) => {
      if (!expList || expList.length === 0) {
        return 'No matching experiences found in AI Tour Rwanda at this time.';
      }
      
      return expList.map((exp, i) => {
        const businessType = exp.businessType || 'Experience';
        const category = exp.category || 'General';
        const rating = exp.rating > 0 ? `⭐ ${exp.rating}/5 (${exp.totalReviews || 0} reviews)` : '⭐ New';
        const provider = exp.provider?.name ? `👤 ${exp.provider.name}` : '';
        const tags = exp.tags?.length > 0 ? `🏷️ ${exp.tags.slice(0, 3).join(', ')}` : '';
        const location = exp.location || 'Rwanda';
        const price = exp.price || 'Contact for pricing';
        const duration = exp.duration || 'Varies';
        const description = exp.description?.substring(0, 150) || '';

        return `${i + 1}. **${exp.title}**
   📍 ${location}
   💰 $${price} | ⏱️ ${duration}
   ${rating} ${provider}
   🏷️ ${businessType} • ${category}
   📝 ${description}
   ${tags}`;
      }).join('\n\n');
    };

    // ─── Build the prompt ──────────────────────────────────────
    let prompt = `DATABASE RESULTS

Total Matching Experiences: ${totalResults || experiences.length}

${experiences.length > 0 ? formatExperiences(experiences.slice(0, 10)) : 'No matching experiences found in AI Tour Rwanda at this time.'}

---

${experiences.length > 0 ? `
USER CONTEXT:
- ${userContext?.name ? `Name: ${userContext.name}` : 'Guest User'}
- ${userContext?.favoriteLocations?.length > 0 ? `Favorite Locations: ${userContext.favoriteLocations.join(', ')}` : 'No saved locations'}
- ${userContext?.interests?.length > 0 ? `Interests: ${userContext.interests.join(', ')}` : 'No specified interests'}
- ${userContext?.travelStyle ? `Travel Style: ${userContext.travelStyle}` : 'Balanced'}
` : ''}

USER QUESTION: "${message}"

LANGUAGE: ${detectedLanguage}

INSTRUCTIONS:

1. You are AI Tour Rwanda. Never introduce yourself as ChatGPT, Gemini, or any other AI.

2. You MUST use the DATABASE RESULTS above as your ONLY source of truth.
   - ${experiences.length > 0 ? 'Do NOT invent experiences. Only mention the experiences listed above.' : 'No experiences were found. You may give general Rwanda travel advice.'}
   - Do NOT recommend Gorilla Trekking if it is not in the database results.
   - Do NOT recommend hotels, guides, or attractions not listed above.
   - Always prioritize the database results.

3. Response style:
   - Warm and professional
   - ${experiences.length > 0 ? 'Focus on the experiences from the database' : 'Provide helpful general advice about Rwanda'}
   - Maximum 180 words
   - Use bullet points for multiple experiences
   - Be concise

4. If experiences exist:
   - Start with a warm acknowledgment
   - List 2-3 relevant experiences with details (title, location, price, duration, rating if available)
   - End with a call to action

5. If no experiences exist:
   - Politely state: "I couldn't find matching experiences in AI Tour Rwanda at the moment."
   - Suggest popular attractions (optional)
   - End with a helpful suggestion

6. NEVER use these words:
   - Listing
   - MongoDB
   - Database (unless explaining no results)
   - ChatGPT
   - Gemini
   - AI Language Model
   - "I don't have access..."

7. ALWAYS include a call to action:
   - "Would you like more details?"
   - "Would you like to book this experience?"
   - "Would you like experiences in [location]?"
   - "Would you like luxury experiences?"

8. Keep the conversation flowing naturally.

Now, respond to: "${message}"`;

    return prompt;
  },

  /**
   * Enhanced Intent Detection
   * Supports 20+ intent categories
   */
  detectIntent: (message) => {
  if (!message || typeof message !== 'string') return 'general';
  
  const lower = message.toLowerCase().trim();
  
  // ─── Greetings ──────────────────────────────────────────────
  if (/^(hello|hi|hey|greetings|good morning|good afternoon|good evening|howdy|hola|muraho|bonjour|jambo|sawubona|amakuru|mwaramutse|mwiriwe)/i.test(lower)) {
    return 'greet';
  }
  
  // ─── Planning (MUST come BEFORE location) ──────────────────
  if (/plan|itinerary|trip|travel|vacation|holiday|schedule|route|day by day|journey|tour plan|weekend trip|road trip|help me plan|help planning/i.test(lower)) {
    return 'plan';
  }
  
  // ─── Location (comes after planning) ───────────────────────
  if (/where|location|place|area|city|region|province|district|nearby|nearest|close to|around|visit in|go to|see in|best places|where can i/i.test(lower)) {
    return 'location';
  }
  
  // ─── Booking ────────────────────────────────────────────────
  if (/book|reserve|pay|purchase|confirm|availability|check in|check out|cancel|refund|deposit|hold|secure|reservation|booking/i.test(lower)) {
    return 'booking';
  }
  
  // ─── Pricing / Budget ──────────────────────────────────────
  if (/price|cost|how much|fee|charge|discount|deal|offer|budget|spend|cheap|expensive|worth it|value|money|dollar|\$/i.test(lower)) {
    return 'price';
  }
  
  // ─── Help / Support ────────────────────────────────────────
  if (/help|support|assist|guide|advice|suggestion|recommend|tip|advise|what should|how to|where to|tell me|show me/i.test(lower)) {
    return 'help';
  }
  
  // ─── Experiences / Activities ──────────────────────────────
  if (/tour|safari|gorilla|trekking|hike|visit|attraction|sightseeing|excursion|activity|experience|adventure|explore|discover|things to do|must see|best places/i.test(lower)) {
    return 'experience';
  }
  
  // ─── Season / Weather ──────────────────────────────────────
  if (/when|season|month|weather|climate|rainy|dry|sunny|rain|summer|winter|spring|autumn|best time|worst time|forecast|temperature|cold|hot|warm/i.test(lower)) {
    return 'season';
  }
  
  // ─── Food / Dining ──────────────────────────────────────────
  if (/food|restaurant|cafe|dining|eat|meal|cuisine|local food|traditional food|breakfast|lunch|dinner|snack|drink|coffee/i.test(lower)) {
    return 'food';
  }
  
  // ─── Accommodation ──────────────────────────────────────────
  if (/hotel|lodge|camp|hostel|accommodation|stay|room|resort|villa|airbnb|guesthouse|cottage|apartment|bed and breakfast|bnb/i.test(lower)) {
    return 'accommodation';
  }
  
  // ─── Transportation ─────────────────────────────────────────
  if (/transport|transfer|drive|taxi|car|bus|van|pickup|dropoff|ride|shuttle|airport|vehicle|cab|uber|motorbike|bicycle/i.test(lower)) {
    return 'transport';
  }
  
  // ─── Events / Shopping ─────────────────────────────────────
  if (/event|festival|culture|cultural|concert|show|performance|shopping|market|craft|souvenir|art|museum|gallery|exhibition/i.test(lower)) {
    return 'events';
  }
  
  // ─── Wildlife / Nature ─────────────────────────────────────
  if (/wildlife|animal|nature|forest|lake|mountain|volcano|river|bird|chimpanzee|monkey|elephant|lion|giraffe|zebra|hippo|park|reserve|conservation|garden|hiking|trail/i.test(lower)) {
    return 'nature';
  }
  
  // ─── Family Travel ─────────────────────────────────────────
  if (/family|kids|children|baby|toddler|teenager|parent|family friendly|child friendly|family trip|family vacation/i.test(lower)) {
    return 'family';
  }
  
  // ─── Luxury Travel ─────────────────────────────────────────
  if (/luxury|luxurious|premium|high end|exclusive|private|5 star|five star|upscale|elegant|splurge|expensive/i.test(lower)) {
    return 'luxury';
  }
  
  // ─── Budget Travel ─────────────────────────────────────────
  if (/budget|affordable|cheap|economy|low cost|backpacker|hostel|camping|save money|deal|discount|value/i.test(lower)) {
    return 'budget';
  }
  
  // ─── Romantic Travel ───────────────────────────────────────
  if (/romantic|couple|honeymoon|anniversary|valentine|love|partner|spouse|wife|husband|girlfriend|boyfriend/i.test(lower)) {
    return 'romantic';
  }
  
  // ─── Business Travel ──────────────────────────────────────
  if (/business|conference|meeting|coworking|office|work trip|corporate|professional|networking|event|workshop/i.test(lower)) {
    return 'business';
  }
  
  return 'general';
},
  /**
   * Get Quick Replies for the user
   * Context-aware based on intent
   */
  getQuickReplies: (intent) => {
    const replies = {
      greet: [
        'Explore Experiences',
        'Plan My Trip',
        'Top Attractions'
      ],
      experience: [
        'Show All Experiences',
        'Nearby Experiences',
        'Top Rated Experiences',
        'Adventure Experiences'
      ],
      booking: [
        'View Experience Details',
        'Check Availability',
        'Book Now',
        'My Bookings'
      ],
      plan: [
        '3-Day Itinerary',
        '1-Week Trip',
        'Weekend Getaway',
        'Budget Travel Tips'
      ],
      price: [
        'Budget Experiences',
        'Luxury Experiences',
        'Best Value',
        'All Prices'
      ],
      help: [
        'How to Book',
        'Cancellation Policy',
        'Contact Support',
        'FAQ'
      ],
      location: [
        'Kigali Experiences',
        'Volcanoes Experiences',
        'Lake Kivu Experiences',
        'Akagera Experiences'
      ],
      season: [
        'Best Time to Visit',
        'Weather Guide',
        'Seasonal Experiences',
        'Rainy Season Tips'
      ],
      food: [
        'Local Cuisine',
        'Best Restaurants',
        'Fine Dining',
        'Street Food'
      ],
      accommodation: [
        'Luxury Hotels',
        'Mid-Range Hotels',
        'Budget Lodges',
        'Unique Stays'
      ],
      transport: [
        'Car Hire',
        'Airport Transfer',
        'Public Transport',
        'Private Driver'
      ],
      events: [
        'Cultural Events',
        'Festivals',
        'Shopping Experiences',
        'Art Galleries'
      ],
      nature: [
        'Gorilla Trekking',
        'Safari',
        'Hiking',
        'Bird Watching'
      ],
      family: [
        'Family Friendly Experiences',
        'Kids Activities',
        'Safe Destinations',
        'Family Packages'
      ],
      luxury: [
        'Luxury Experiences',
        '5-Star Hotels',
        'Private Tours',
        'Exclusive Packages'
      ],
      budget: [
        'Budget Experiences',
        'Cheap Stays',
        'Free Activities',
        'Money Saving Tips'
      ],
      romantic: [
        'Romantic Getaways',
        'Couples Experiences',
        'Honeymoon Packages',
        'Private Dining'
      ],
      business: [
        'Business Travel Tips',
        'Meeting Venues',
        'Business Hotels',
        'Corporate Packages'
      ],
      general: [
        'Explore Experiences',
        'Plan a Trip',
        'Get Help',
        'About Rwanda'
      ]
    };
    return replies[intent] || replies.general;
  },

  /**
   * Get the response tone based on intent
   */
  getTone: (intent) => {
    const tones = {
      greet: 'warm and welcoming',
      experience: 'enthusiastic and inspiring',
      booking: 'professional and helpful',
      plan: 'organized and detailed',
      price: 'informative and transparent',
      help: 'supportive and encouraging',
      location: 'geographically aware',
      season: 'seasonally informed',
      food: 'culinary enthusiastic',
      accommodation: 'comfort-focused',
      transport: 'practical and clear',
      events: 'culturally enthusiastic',
      nature: 'nature-loving and inspiring',
      family: 'family-friendly and reassuring',
      luxury: 'elegant and premium',
      budget: 'practical and honest',
      romantic: 'warm and personal',
      business: 'professional and efficient',
      general: 'friendly and helpful'
    };
    return tones[intent] || tones.general;
  },

  /**
   * Get the maximum response length based on intent
   */
  getResponseLength: (intent) => {
    const lengths = {
      greet: 60,
      experience: 150,
      booking: 150,
      plan: 180,
      price: 100,
      help: 140,
      location: 120,
      season: 100,
      food: 100,
      accommodation: 120,
      transport: 100,
      events: 120,
      nature: 130,
      family: 140,
      luxury: 130,
      budget: 120,
      romantic: 130,
      business: 140,
      general: 140
    };
    return lengths[intent] || 140;
  }
};

export default chatPrompt;