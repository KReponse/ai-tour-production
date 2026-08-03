// backend/src/ai/utils/intentDetector.js
// ✅ COMPLETE - Intent detection with context awareness

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
      /design trip/i
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
      /volcano/i
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
      /experience/i
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
      /available for booking/i
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
      /affordable/i
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
      /low season/i
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
      /land of a thousand hills/i
    ],
    confidence: 0.7
  }
};

// Entity extraction patterns
const entityPatterns = {
  location: /(?:in|at|near|around|to)\s+([A-Za-z\s]+)/i,
  price: /(\d+)\s*(?:usd|dollar|dollars|$|usd)/i,
  date: /(\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4})/i,
  people: /(\d+)\s*(?:people|persons|pax|adults?|travelers?)/i,
  duration: /(\d+)\s*(?:day|night|week|month)/i
};

// Known locations in Rwanda for better entity extraction
const knownLocations = [
  'kigali', 'musanze', 'ruhengeri', 'gisagara', 'gisenyi', 'kibuye', 'cyangugu',
  'akagera', 'nyungwe', 'volcanoes', 'bisate', 'kivu', 'kabgayi', 'butare',
  'huye', 'rwamagana', 'kayonza', 'gatsibo', 'nyamagabe', 'karongi', 'rutsiro',
  'nyabihu', 'burera', 'gakenke', 'rulindo', 'gasabo', 'nyarugenge', 'kicukiro'
];

/**
 * Detect intent with context awareness
 */
export function detectIntent(message, history = []) {
  const messageLower = message.toLowerCase().trim();
  
  // If message is very short, use previous context
  if (message.length < 10 && history && history.length > 0) {
    const lastIntent = history[history.length - 1]?.metadata?.intent || null;
    if (lastIntent) {
      console.log(`📌 Using previous intent from context: ${lastIntent}`);
      return {
        intent: lastIntent,
        confidence: 0.8,
        isFollowUp: true,
        entities: extractEntities(message, lastIntent)
      };
    }
  }

  let bestIntent = 'general';
  let bestConfidence = 0;

  // Score each intent
  for (const [intent, data] of Object.entries(intentPatterns)) {
    let score = 0;
    
    // Check patterns
    for (const pattern of data.patterns) {
      if (pattern.test(messageLower)) {
        score += data.confidence;
        break;
      }
    }

    // Boost score for exact matches
    if (score > 0) {
      // Check if message is exactly a pattern
      const exactMatch = data.patterns.some(p => {
        const cleaned = p.source.replace(/\\/g, '').replace(/\^|\$/g, '');
        return messageLower.includes(cleaned.toLowerCase());
      });
      
      if (exactMatch) {
        score += 0.2;
      }

      // Context boost: if previous intent matches
      if (history && history.length > 0 && history[history.length - 1]?.metadata?.intent === intent) {
        score += 0.3;
      }
    }

    if (score > bestConfidence) {
      bestConfidence = score;
      bestIntent = intent;
    }
  }

  // If confidence is low but we have history, use previous intent
  if (bestConfidence < 0.3 && history && history.length > 0) {
    const lastIntent = history[history.length - 1]?.metadata?.intent;
    if (lastIntent) {
      console.log(`📌 Low confidence, falling back to previous intent: ${lastIntent}`);
      return {
        intent: lastIntent,
        confidence: 0.5,
        isFollowUp: true,
        entities: extractEntities(message, lastIntent)
      };
    }
  }

  // Extract entities
  const entities = extractEntities(message, bestIntent);

  // Check if this is a follow-up
  const isFollowUp = determineFollowUp(message, history);

  return {
    intent: bestIntent,
    confidence: bestConfidence,
    isFollowUp,
    entities
  };
}

/**
 * Extract entities from message
 */
export function extractEntities(message, intent = 'general') {
  const entities = {};
  
  // Extract location
  for (const location of knownLocations) {
    if (message.toLowerCase().includes(location.toLowerCase())) {
      entities.location = location;
      break;
    }
  }
  
  // Try regex patterns
  for (const [key, pattern] of Object.entries(entityPatterns)) {
    const match = message.match(pattern);
    if (match) {
      entities[key] = match[1];
    }
  }

  // If no location found but location intent, use context
  if (!entities.location && intent === 'location' && knownLocations.some(l => message.includes(l))) {
    const found = knownLocations.find(l => message.includes(l));
    if (found) entities.location = found;
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
    /^and\s*(then|so|what|how|why|when|where|who|which)?$/i
  ];

  const messageLower = message.toLowerCase().trim();
  
  // Check if message matches any follow-up pattern
  for (const pattern of followUpPatterns) {
    if (pattern.test(messageLower)) {
      return true;
    }
  }

  // Check if message is very short (likely a follow-up)
  if (message.length < 10 && message.split(' ').length < 4) {
    // But not if it's a clear new topic
    const newTopicPatterns = [
      /^(hi|hello|hey|muraho|good morning|good afternoon|good evening)$/i,
      /^(i want|i need|i'd like|i would like)\s*(to book|to go|to visit|a tour|a trip|a listing)/i,
      /^(show me|find|search for)\s*(tours|listings|experiences|activities|things to do)/i
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

// Default export for compatibility
export default {
  detectIntent,
  extractEntities,
  determineFollowUp,
  getSuggestions,
  intentPatterns,
  knownLocations
};