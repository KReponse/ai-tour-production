// backend/src/ai/utils/responseFormatter.js
// ✅ ENHANCED - Formats AI responses for UI with real listing data
// ✅ ADDED: Listing card formatting with real MongoDB data
// ✅ ADDED: Structured response for frontend components
// ✅ ADDED: Follow-up context preservation

class ResponseFormatter {
  constructor() {
    this.maxSuggestions = 4;
    this.maxExperiences = 10;
  }

  /**
   * Format response for display with real listing data
   */
  format(response, options = {}) {
    const {
      experiences = [],
      intent = 'general',
      sessionId = null,
      followUpQuestions = [],
      rawResponse = null
    } = options;

    let formatted = {
      success: true,
      message: response,
      experiences: [],
      suggestions: [],
      actions: [],
      intent: intent,
      sessionId: sessionId,
      followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : this.extractSuggestions(response),
      raw: rawResponse,
      timestamp: new Date().toISOString()
    };

    // ✅ Format experiences with real listing data
    if (experiences.length > 0) {
      formatted.experiences = this.formatExperiences(experiences);
    }

    // ✅ Extract actions from response
    formatted.actions = this.extractActions(response, intent);

    // ✅ Add response type
    formatted.responseType = this.getResponseType(intent);

    // ✅ Add context for follow-ups
    if (formatted.experiences.length > 0) {
      formatted.context = {
        hasResults: true,
        resultCount: formatted.experiences.length,
        firstResult: formatted.experiences[0]?.id || null,
        lastResult: formatted.experiences[formatted.experiences.length - 1]?.id || null
      };
    }

    return formatted;
  }

  /**
   * Format experiences with real MongoDB data for frontend cards
   */
  formatExperiences(experiences) {
    return experiences.map(exp => ({
      id: exp._id || exp.id,
      title: exp.title || 'Untitled Experience',
      location: exp.location || 'Rwanda',
      price: exp.price || 0,
      currency: exp.currency || 'USD',
      duration: exp.duration || 'N/A',
      rating: exp.averageRating || exp.rating || 0,
      reviewCount: exp.reviewCount || exp.totalReviews || 0,
      category: exp.category || exp.businessType || 'Experience',
      description: exp.description || 'Discover this amazing experience in Rwanda.',
      coverImage: exp.coverImage || exp.coverMedia || null,
      coverMedia: exp.coverMedia || null,
      coverMediaType: exp.coverMediaType || 'image',
      status: exp.status || 'active',
      url: `/listing/${exp._id || exp.id}`,
      // ✅ Include booking info if available
      bookingInfo: {
        available: exp.available !== false,
        minBookingDays: exp.minBookingDays || 1,
        maxBookingDays: exp.maxBookingDays || 30
      },
      // ✅ Include provider info
      provider: exp.provider ? {
        id: exp.provider._id || exp.provider.id,
        name: exp.provider.name || exp.provider.businessName || 'Provider',
        avatar: exp.provider.profileImage || exp.provider.avatar || null
      } : null
    }));
  }

  /**
   * Format single experience (for details view)
   */
  formatExperience(experience) {
    if (!experience) return null;
    
    const formatted = this.formatExperiences([experience]);
    return formatted.length > 0 ? formatted[0] : null;
  }

  /**
   * Format booking response
   */
  formatBooking(booking) {
    if (!booking) return null;

    return {
      id: booking._id || booking.id,
      bookingCode: booking.bookingCode || 'BKG-' + Date.now(),
      status: booking.status || 'pending',
      amount: booking.totalAmount || booking.amount || 0,
      currency: booking.currency || 'USD',
      startDate: booking.startDate || booking.travelDate || null,
      endDate: booking.endDate || null,
      travelers: booking.travelers || 1,
      experience: booking.listing ? this.formatExperience(booking.listing) : null,
      customer: booking.user ? {
        id: booking.user._id || booking.user.id,
        name: booking.user.name || booking.user.fullName || 'Guest',
        email: booking.user.email || null
      } : null,
      createdAt: booking.createdAt || new Date().toISOString(),
      url: `/booking/${booking._id || booking.id}`
    };
  }

  /**
   * Format error response
   */
  formatError(error, options = {}) {
    const {
      fallback = false,
      suggestions = [],
      experiences = []
    } = options;

    return {
      success: false,
      message: error.message || 'Something went wrong. Please try again.',
      fallback: fallback,
      suggestions: suggestions.length > 0 ? suggestions : [
        'Try a different search',
        'Browse popular experiences',
        'Contact support for help'
      ],
      experiences: this.formatExperiences(experiences),
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        details: error.details || null
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format follow-up response with context
   */
  formatFollowUp(response, context) {
    const {
      previousIntent = null,
      lastResults = [],
      currentIndex = 0
    } = context || {};

    let formatted = {
      success: true,
      message: response,
      isFollowUp: true,
      previousIntent: previousIntent,
      suggestions: this.extractSuggestions(response),
      experiences: []
    };

    // ✅ If we have previous results, show context
    if (lastResults.length > 0) {
      // Show a subset based on context
      const start = currentIndex;
      const end = Math.min(start + 3, lastResults.length);
      formatted.experiences = this.formatExperiences(lastResults.slice(start, end));
      formatted.context = {
        totalResults: lastResults.length,
        showingFrom: start + 1,
        showingTo: end,
        hasMore: end < lastResults.length
      };
    }

    return formatted;
  }

  /**
   * Extract actions from response based on intent
   */
  extractActions(text, intent = 'general') {
    const actions = [];
    const actionMap = {
      // General actions
      'view details': { label: 'View Details', action: 'view_details' },
      'book now': { label: 'Book Now', action: 'book_now' },
      'plan trip': { label: 'Plan My Trip', action: 'plan_trip' },
      'more experiences': { label: 'See More', action: 'see_more' },
      'nearby': { label: 'Nearby Experiences', action: 'nearby' },
      'luxury': { label: 'Luxury Experiences', action: 'luxury' },
      'budget': { label: 'Budget Experiences', action: 'budget' },
      
      // Intent-specific actions
      'show listings': { label: 'View Listings', action: 'view_listings' },
      'check availability': { label: 'Check Availability', action: 'check_availability' },
      'compare prices': { label: 'Compare Prices', action: 'compare_prices' },
      'get directions': { label: 'Get Directions', action: 'get_directions' },
      'contact provider': { label: 'Contact Provider', action: 'contact_provider' },
      'read reviews': { label: 'Read Reviews', action: 'read_reviews' },
      'view photos': { label: 'View Photos', action: 'view_photos' },
      'share': { label: 'Share Experience', action: 'share' },
      'save': { label: 'Save to Favorites', action: 'save_favorite' },
      'recommend': { label: 'Get Recommendations', action: 'recommend' }
    };

    const lowerText = text.toLowerCase();
    
    // Check for action keywords
    Object.entries(actionMap).forEach(([keyword, action]) => {
      if (lowerText.includes(keyword)) {
        // Avoid duplicates
        if (!actions.some(a => a.action === action.action)) {
          actions.push(action);
        }
      }
    });

    // ✅ Add intent-based default actions
    if (actions.length === 0) {
      const defaultActions = {
        plan: [
          { label: 'View Itinerary', action: 'view_itinerary' },
          { label: 'Get Recommendations', action: 'recommend' }
        ],
        booking: [
          { label: 'View Details', action: 'view_details' },
          { label: 'Book Now', action: 'book_now' }
        ],
        location: [
          { label: 'View Listings', action: 'view_listings' },
          { label: 'Get Directions', action: 'get_directions' }
        ],
        experience: [
          { label: 'View Details', action: 'view_details' },
          { label: 'Read Reviews', action: 'read_reviews' }
        ],
        general: [
          { label: 'View Listings', action: 'view_listings' },
          { label: 'Get Recommendations', action: 'recommend' }
        ]
      };

      const intentActions = defaultActions[intent] || defaultActions.general;
      actions.push(...intentActions.slice(0, 2));
    }

    return actions.slice(0, 4);
  }

  /**
   * Extract suggested questions from response
   */
  extractSuggestions(text) {
    const suggestions = [];
    const patterns = [
      /would you like (.*?)\?/gi,
      /want to (.*?)\?/gi,
      /interested in (.*?)\?/gi,
      /you can (.*?)\?/gi,
      /try (.*?)\?/gi,
      /explore (.*?)\?/gi,
      /discover (.*?)\?/gi
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const suggestion = match[1]?.trim();
        if (suggestion && suggestion.length > 5) {
          // Capitalize first letter
          const formatted = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
          // Avoid duplicates
          if (!suggestions.includes(formatted) && formatted.length < 60) {
            suggestions.push(formatted);
          }
        }
      }
    }

    // ✅ Add default suggestions if none found
    if (suggestions.length === 0) {
      const defaults = [
        'Show me more experiences',
        'Tell me about Rwanda',
        'Help me plan a trip',
        'What are the popular activities?'
      ];
      suggestions.push(...defaults);
    }

    return suggestions.slice(0, this.maxSuggestions);
  }

  /**
   * Get response type based on intent
   */
  getResponseType(intent) {
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

  /**
   * Add emojis to text for better UX
   */
  addEmojis(text) {
    let formatted = text;
    const emojiMap = [
      { keywords: ['gorilla', 'gorillas'], emoji: '🦍' },
      { keywords: ['safari', 'wildlife'], emoji: '🐘' },
      { keywords: ['hiking', 'trekking'], emoji: '🥾' },
      { keywords: ['lake', 'kivu', 'water'], emoji: '🏖️' },
      { keywords: ['city', 'kigali'], emoji: '🏙️' },
      { keywords: ['culture', 'cultural', 'traditional'], emoji: '🏛️' },
      { keywords: ['food', 'cuisine', 'restaurant'], emoji: '🍽️' },
      { keywords: ['luxury', 'premium'], emoji: '✨' },
      { keywords: ['budget', 'cheap', 'affordable'], emoji: '💰' },
      { keywords: ['nature', 'natural'], emoji: '🌿' },
      { keywords: ['mountain', 'volcano'], emoji: '⛰️' },
      { keywords: ['forest', 'canopy', 'rainforest'], emoji: '🌳' },
      { keywords: ['bird', 'birds'], emoji: '🦅' },
      { keywords: ['beach', 'lake kivu'], emoji: '🏝️' },
      { keywords: ['memorial', 'history', 'historical'], emoji: '📜' },
      { keywords: ['coffee', 'tea'], emoji: '☕' },
      { keywords: ['market', 'shopping'], emoji: '🛍️' },
      { keywords: ['night', 'evening'], emoji: '🌙' },
      { keywords: ['family', 'families'], emoji: '👨‍👩‍👧‍👦' },
      { keywords: ['adventure', 'adventurous'], emoji: '🚀' }
    ];

    emojiMap.forEach(({ keywords, emoji }) => {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        formatted = formatted.replace(regex, `${emoji} $&`);
      });
    });

    // Remove duplicate emojis
    formatted = formatted.replace(/([^\s])\s*([^\s])\s*/g, (match, p1, p2) => {
      if (p1 === p2 && /[\u{1F000}-\u{1FFFF}]/u.test(p1)) {
        return p1;
      }
      return p1 + ' ' + p2;
    });

    return formatted;
  }

  /**
   * Truncate text to max length
   */
  truncate(text, maxLength = 180) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Build HTML preview for experience card
   */
  buildExperiencePreview(experience) {
    if (!experience) return '';

    const formatted = this.formatExperience(experience);
    if (!formatted) return '';

    return `
      <div class="experience-preview">
        <h4>${formatted.title}</h4>
        <p>📍 ${formatted.location}</p>
        <p>💰 $${formatted.price} ${formatted.currency}</p>
        <p>⏱️ ${formatted.duration}</p>
        ${formatted.rating > 0 ? `<p>⭐ ${formatted.rating} (${formatted.reviewCount} reviews)</p>` : ''}
        <a href="${formatted.url}">View Details →</a>
      </div>
    `;
  }

  /**
   * Build plain text summary of experiences
   */
  buildExperienceSummary(experiences, maxCount = 3) {
    if (!experiences || experiences.length === 0) return '';

    const formatted = this.formatExperiences(experiences.slice(0, maxCount));
    let summary = `\n\nI found ${experiences.length} experiences:\n\n`;

    formatted.forEach((exp, index) => {
      summary += `${index + 1}. **${exp.title}** - ${exp.location}\n`;
      summary += `   💰 $${exp.price} ${exp.currency} • ⏱️ ${exp.duration}`;
      if (exp.rating > 0) {
        summary += ` • ⭐ ${exp.rating}`;
      }
      summary += `\n   🔗 ${exp.url}\n\n`;
    });

    if (experiences.length > maxCount) {
      summary += `... and ${experiences.length - maxCount} more experiences.\n`;
    }

    return summary;
  }
}

export default new ResponseFormatter();