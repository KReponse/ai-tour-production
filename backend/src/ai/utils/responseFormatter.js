// backend/src/ai/utils/responseFormatter.js
// ✅ ENHANCED - Formats AI responses for UI

class ResponseFormatter {
  /**
   * Format response for display
   */
  format(response, experiences = []) {
    let formatted = {
      text: response,
      experiences: [],
      suggestions: [],
      actions: []
    };

    // Extract experience mentions
    if (experiences.length > 0) {
      formatted.experiences = experiences.map(exp => ({
        id: exp.id || exp._id,
        title: exp.title,
        location: exp.location,
        price: exp.price,
        rating: exp.averageRating || exp.rating,
        image: exp.coverImage
      }));
    }

    // Extract suggested actions from response
    formatted.actions = this.extractActions(response);

    // Extract quick replies
    formatted.suggestions = this.extractSuggestions(response);

    return formatted;
  }

  /**
   * Extract actions from response
   */
  extractActions(text) {
    const actions = [];
    const actionMap = {
      'view details': 'View Experience Details',
      'book now': 'Book Now',
      'plan trip': 'Plan My Trip',
      'more experiences': 'See More Experiences',
      'nearby': 'Nearby Experiences',
      'luxury': 'Luxury Experiences',
      'budget': 'Budget Experiences'
    };

    const lowerText = text.toLowerCase();
    Object.entries(actionMap).forEach(([keyword, action]) => {
      if (lowerText.includes(keyword)) {
        actions.push(action);
      }
    });

    return [...new Set(actions)].slice(0, 4);
  }

  /**
   * Extract suggested questions
   */
  extractSuggestions(text) {
    const suggestions = [];
    const patterns = [
      /would you like (.*?)\?/gi,
      /want to (.*?)\?/gi,
      /interested in (.*?)\?/gi
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const suggestion = match[1]?.trim();
        if (suggestion && suggestion.length > 5) {
          suggestions.push(suggestion.charAt(0).toUpperCase() + suggestion.slice(1));
        }
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Truncate text to max length
   */
  truncate(text, maxLength = 180) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Add emojis to experience list
   */
  addEmojis(text, experiences) {
    let formatted = text;
    const emojiMap = {
      'gorilla': '🦍',
      'safari': '🐘',
      'hiking': '🥾',
      'lake': '🏖️',
      'city': '🏙️',
      'culture': '🏛️',
      'food': '🍽️',
      'luxury': '✨',
      'budget': '💰',
      'nature': '🌿',
      'wildlife': '🐾'
    };

    Object.entries(emojiMap).forEach(([keyword, emoji]) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `${emoji} $&`);
    });

    return formatted;
  }
}

export default new ResponseFormatter();