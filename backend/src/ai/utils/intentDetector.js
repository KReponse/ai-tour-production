// backend/src/ai/utils/intentDetector.js
// ✅ COMPLETE - Intent detection with context awareness
// ✅ ADDED: Listing-specific intent detection
// ✅ ADDED: Follow-up context tracking
// ✅ ADDED: Booking intent detection

// Intent patterns with priority
const intentPatterns = {
  plan: {
    patterns: [
      /plan a trip/i,
      /plan a visit/i,
      /plan my trip/i,
      /plan a tour/i,
      /help me plan/i,
      /i want to plan/i,
      /i need to plan/i,
      /trip planning/i,
      /travel planning/i,
      /itinerary/i,
      /create itinerary/i,
      /build itinerary/i,
      /customize trip/i,
      /design trip/i,
      /suggest itinerary/i
    ],
    confidence: 0.9
  },
  location: {
    patterns: [
      /where (?:can|should|do|does|is|are|to) visit/i,
      /where (?:is|are) (?:the|a) (?:best|good) (?:place|location|spot)/i,
      /where (?:is|are) (?:the|a) (?:tour|attraction|site|destination)/i,
      /where (?:should|can) (?:i|we) go/i,
      /location/i,
      /city/i,
      /place/i,
      /destination/i,
      /national park/i,
      /lake/i,
      /mountain/i,
      /volcano/i,
      /top destinations/i,
      /best places/i
    ],
    confidence: 0.85
  },
  experience: {
    patterns: [
      /what (?:can|should|do) (?:i|we) (?:do|see|visit|experience)/i,
      /activities/i,
      /things to do/i,
      /attractions/i,
      /tours/i,
      /safari/i,
      /gorilla trek/i,
      /canopy walk/i,
      /wildlife/i,
      /nature/i,
      /adventure/i,
      /culture/i,
      /experience/i,
      /excursions/i,
      /day trips/i
    ],
    confidence: 0.85
  },
  booking: {
    patterns: [
      /book/i,
      /reserve/i,
      /purchase/i,
      /buy/i,
      /make a booking/i,
      /how to book/i,
      /booking price/i,
      /cost of booking/i,
      /availability/i,
      /available for booking/i,
      /can i book/i,
      /i want to book/i,
      /i'd like to book/i,
      /booking confirmation/i,
      /reservation/i
    ],
    confidence: 0.9
  },
  price: {
    patterns: [
      /price/i,
      /cost/i,
      /fee/i,
      /charge/i,
      /how much/i,
      /what is the cost/i,
      /how many (?:fees|charges)/i,
      /budget/i,
      /expensive/i,
      /cheap/i,
      /affordable/i,
      /pricing/i,
      /rates/i,
      /discount/i
    ],
    confidence: 0.9
  },
  time: {
    patterns: [
      /when is the best time/i,
      /best time to visit/i,
      /season/i,
      /weather/i,
      /climate/i,
      /month/i,
      /january|february|march|april|may|june|july|august|september|october|november|december/i,
      /dry season/i,
      /rainy season/i,
      /high season/i,
      /low season/i,
      /peak season/i,
      /off season/i
    ],
    confidence: 0.85
  },
  details: {
    patterns: [
      /tell me more/i,
      /more info/i,
      /more details/i,
      /information about/i,
      /details of/i,
      /what is (?:included|excluded)/i,
      /what's included/i,
      /what's not included/i,
      /about this tour/i,
      /about this experience/i,
      /learn more/i
    ],
    confidence: 0.8
  },
  compare: {
    patterns: [
      /compare/i,
      /difference between/i,
      /which is better/i,
      /which one/i,
      /vs/i,
      /versus/i,
      /or/i,
      /which should i choose/i,
      /best option/i
    ],
    confidence: 0.85
  },
  general: {
    patterns: [
      /help/i,
      /support/i,
      /guide/i,
      /information/i,
      /tell me about/i,
      /explain/i,
      /describe/i,
      /overview/i,
      /introduction/i,
      /about rwanda/i,
      /land of a thousand hills/i,
      /rwanda travel/i
    ],
    confidence: 0.7
  }
};

// Entity extraction patterns
const entityPatterns = {
  location: /(?:in|at|near|around|to)\s+([A-Za-z\s]+)/i,
  price: /(\d+)\s*(?:usd|dollar|dollars|$|usd|rwf|rwf)/i,
  date: /(\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4})/i,
  people: /(\d+)\s*(?:people|persons|pax|adults?|travelers?|guests?)/i,
  duration: /(\d+)\s*(?:day|night|week|month|hour)/i,
  experience: /(?:gorilla trek|safari|canoe|kayak|hike|trek|tour|visit|excursion)/i,
  accommodation: /(?:hotel|lodge|camp|hostel|resort|airbnb|guesthouse|villa)/i
};

// Known locations in Rwanda for better entity extraction
const knownLocations = [
  'kigali', 'musanze', 'ruhengeri', 'gisagara', 'gisenyi', 'kibuye', 'cyangugu',
  'akagera', 'nyungwe', 'volcanoes', 'bisate', 'kivu', 'kabgayi', 'butare',
  'huye', 'rwamagana', 'kayonza', 'gatsibo', 'nyamagabe', 'karongi', 'rutsiro',
  'nyabihu', 'burera', 'gakenke', 'rulindo', 'gasabo', 'nyarugenge', 'kicukiro',
  'lake kivu', 'lake mutanda', 'lake burera', 'lake ruhondo', 'mount bisoke',
  'mount karisimbi', 'mount muhabura', 'mount sabinyo', 'mount gahinga',
  'volcanoes national park', 'nyungwe national park', 'akagera national park'
];

// Known experience types
const experienceTypes = [
  'gorilla trekking', 'chimpanzee trekking', 'golden monkey trekking',
  'safari', 'game drive', 'boat cruise', 'kayaking', 'canoeing',
  'hiking', 'trekking', 'nature walk', 'canopy walk', 'bird watching',
  'cultural tour', 'city tour', 'culinary experience', 'coffee tour',
  'market tour', 'museum visit', 'memorial visit', 'village visit',
  'community experience', 'volcano climbing', 'mountain climbing'
];

/**
 * Detect intent with context awareness
 */
export function detectIntent(message, history = []) {
  const messageLower = message.toLowerCase().trim();
  
  // ✅ If message is very short, use previous context
  if (message.length < 10 && history && history.length > 0) {
    const lastIntent = history[history.length - 1]?.metadata?.intent || null;
    if (lastIntent) {
      console.log(`📌 Using previous intent from context: ${lastIntent}`);
      return {
        intent: lastIntent,
        confidence: 0.8,
        isFollowUp: true,
        entities: extractEntities(message, lastIntent),
        context: history[history.length - 1]?.metadata?.context || {}
      };
    }
  }

  let bestIntent = 'general';
  let bestConfidence = 0;
  let matchedPatterns = [];

  // Score each intent
  for (const [intent, data] of Object.entries(intentPatterns)) {
    let score = 0;
    let matched = false;
    
    // Check patterns
    for (const pattern of data.patterns) {
      if (pattern.test(messageLower)) {
        matched = true;
        matchedPatterns.push({ intent, pattern: pattern.source });
        score += data.confidence;
        break;
      }
    }

    // Boost score for exact matches
    if (matched) {
      // Check if message is exactly a pattern
      const exactMatch = data.patterns.some(p => {
        const cleaned = p.source.replace(/\\/g, '').replace(/\^|\$/g, '');
        return messageLower.includes(cleaned.toLowerCase()) || 
               messageLower === cleaned.toLowerCase();
      });
      
      if (exactMatch) {
        score += 0.2;
      }

      // Context boost: if previous intent matches
      if (history && history.length > 0 && history[history.length - 1]?.metadata?.intent === intent) {
        score += 0.3;
      }

      // ✅ If message contains location and intent is location, boost
      if (intent === 'location' && knownLocations.some(l => messageLower.includes(l))) {
        score += 0.2;
      }

      // ✅ If message contains experience type and intent is experience, boost
      if (intent === 'experience' && experienceTypes.some(e => messageLower.includes(e))) {
        score += 0.2;
      }
    }

    if (score > bestConfidence) {
      bestConfidence = score;
      bestIntent = intent;
    }
  }

  // ✅ If confidence is low but we have history, use previous intent
  if (bestConfidence < 0.3 && history && history.length > 0) {
    const lastIntent = history[history.length - 1]?.metadata?.intent;
    if (lastIntent) {
      console.log(`📌 Low confidence, falling back to previous intent: ${lastIntent}`);
      return {
        intent: lastIntent,
        confidence: 0.5,
        isFollowUp: true,
        entities: extractEntities(message, lastIntent),
        context: history[history.length - 1]?.metadata?.context || {}
      };
    }
  }

  // Extract entities
  const entities = extractEntities(message, bestIntent);

  // Check if this is a follow-up
  const isFollowUp = determineFollowUp(message, history);

  // ✅ Build context
  const context = {
    lastIntent: bestIntent,
    confidence: bestConfidence,
    entities: entities,
    matchedPatterns: matchedPatterns
  };

  return {
    intent: bestIntent,
    confidence: bestConfidence,
    isFollowUp,
    entities,
    context,
    matchedPatterns: matchedPatterns.slice(0, 3) // Keep top 3 matches
  };
}

/**
 * Extract entities from message
 */
export function extractEntities(message, intent = 'general') {
  const entities = {};
  const messageLower = message.toLowerCase();
  
  // Extract location from known locations
  for (const location of knownLocations) {
    if (messageLower.includes(location.toLowerCase())) {
      entities.location = location;
      break;
    }
  }
  
  // Try regex patterns
  for (const [key, pattern] of Object.entries(entityPatterns)) {
    const match = message.match(pattern);
    if (match) {
      entities[key] = match[1].trim();
    }
  }

  // ✅ Extract experience type from known experiences
  if (!entities.experience) {
    for (const exp of experienceTypes) {
      if (messageLower.includes(exp)) {
        entities.experience = exp;
        break;
      }
    }
  }

  // If no location found but location intent, use context
  if (!entities.location && intent === 'location' && knownLocations.some(l => messageLower.includes(l))) {
    const found = knownLocations.find(l => messageLower.includes(l));
    if (found) entities.location = found;
  }

  // ✅ Extract price range
  const priceMatch = messageLower.match(/(?:under|less than|around|about)\s*\$?(\d+)/i);
  if (priceMatch) {
    entities.maxPrice = parseInt(priceMatch[1]);
  }

  // ✅ Extract number of days
  const dayMatch = messageLower.match(/(\d+)\s*(?:day|night)s?/i);
  if (dayMatch) {
    entities.days = parseInt(dayMatch[1]);
  }

  return entities;
}

/**
 * Determine if message is a follow-up
 */
export function determineFollowUp(message, history) {
  if (!history || history.length === 0) return false;

  const followUpPatterns = [
    /^(yes|no|okay|ok|sure|yeah|yep|nope|nah|maybe|perhaps)$/i,
    /^(where|when|who|what|which|how|why)\s*(is|are|was|were|do|does|did|can|could|will|would)?\s*$/i,
    /^(tell me more|continue|go on|and then|after that|what else|anything else|more|again)$/i,
    /^(how much|how many|how far|how long|how much does it cost|price|cost)$/i,
    /^(is it|are they|can i|do you|does it|will it|would it)\s*(good|safe|worth|available|open|possible)?$/i,
    /^(what about|what's|what is|where is|when is)\s*(the|that|this|it|there)?$/i,
    /^(i want|i need|i'd like|i would like)\s*(to|that|this|it|more|details|info)?$/i,
    /^(can you|could you|would you)\s*(explain|elaborate|clarify|expand|tell|show|give)\s*(more|further)?$/i,
    /^(that sounds|this is|it seems|looks)\s*(good|great|interesting|nice|fine|cool|amazing)$/i,
    /^(how about|what about)\s*(the|that|this|it)?$/i,
    /^and\s*(then|so|what|how|why|when|where|who|which)?$/i,
    /^(first|second|third|last|next|previous|one|two|three)/i,
    /^(the|that|this)\s*(one|thing|place|tour|experience|listing)/i
  ];

  const messageLower = message.toLowerCase().trim();
  
  // Check if message matches any follow-up pattern
  for (const pattern of followUpPatterns) {
    if (pattern.test(messageLower)) {
      return true;
    }
  }

  // Check if message is very short (likely a follow-up)
  if (message.length < 15 && message.split(' ').length < 4) {
    // But not if it's a clear new topic
    const newTopicPatterns = [
      /^(hi|hello|hey|muraho|good morning|good afternoon|good evening)$/i,
      /^(i want|i need|i'd like|i would like)\s*(to book|to go|to visit|a tour|a trip|a listing)/i,
      /^(show me|find|search for)\s*(tours|listings|experiences|activities|things to do)/i,
      /^(what|where|when)\s*(is|are)\s*(the|a)\s*(best|good|top|popular)/i
    ];
    
    for (const pattern of newTopicPatterns) {
      if (pattern.test(messageLower)) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Get suggestions based on intent and context
 */
export function getSuggestions(intent, context = null) {
  const suggestions = {
    plan: [
      'Show me popular tours',
      'What activities are available?',
      'When should I visit?',
      'Plan a 3-day itinerary'
    ],
    location: [
      'What\'s the best time to visit?',
      'What activities are there?',
      'How do I get there?',
      'Where to stay?'
    ],
    experience: [
      'Tell me more about this',
      'Is it suitable for families?',
      'What\'s included in the price?',
      'How long does it take?'
    ],
    booking: [
      'How do I book?',
      'What\'s the cancellation policy?',
      'Are there group discounts?',
      'Can I customize?'
    ],
    price: [
      'What\'s included in the price?',
      'Are there extra fees?',
      'Do you offer group discounts?',
      'Is there a payment plan?'
    ],
    time: [
      'What\'s the weather like?',
      'What should I pack?',
      'Are there any festivals?',
      'Is it crowded?'
    ],
    details: [
      'Tell me more',
      'What\'s included?',
      'How long is it?',
      'What should I bring?'
    ],
    compare: [
      'Which one is cheaper?',
      'What\'s the difference?',
      'Which is more popular?',
      'Which is shorter?'
    ],
    general: [
      'Show me tours in Rwanda',
      'What is the best time to visit?',
      'Tell me about the culture',
      'What activities are available?',
      'Help me plan a trip'
    ]
  };

  // Return suggestions for intent, or general if not found
  const result = suggestions[intent] || suggestions.general;
  
  // If we have context, personalize suggestions
  if (context?.lastResults?.length > 0) {
    const location = context.location;
    if (location) {
      result[0] = `More about ${location}`;
      result[1] = `Activities in ${location}`;
    }
  }

  return result.slice(0, 4);
}

/**
 * ✅ Get response type based on intent
 */
export function getResponseType(intent) {
  const types = {
    plan: 'planning',
    location: 'location_info',
    experience: 'experience_info',
    booking: 'booking_help',
    price: 'pricing_info',
    time: 'timing_info',
    details: 'details_info',
    compare: 'comparison',
    general: 'general_info'
  };
  return types[intent] || 'general_info';
}

// Default export for compatibility
export default {
  detectIntent,
  extractEntities,
  determineFollowUp,
  getSuggestions,
  getResponseType,
  intentPatterns,
  knownLocations,
  experienceTypes
};