// backend/src/ai/utils/promptBuilder.js
// ✅ COMPLETE - Prompt builder with conversation context

/**
 * Build main chat prompt with context and history
 */
export function buildChatPrompt({
  message,
  intent,
  entities,
  experiences,
  history = [],
  userLocation = 'Rwanda',
  isFollowUp = false
}) {
  // Build system prompt
  let systemPrompt = `You are AI Tour Rwanda, a friendly and knowledgeable travel assistant for Rwanda, the Land of a Thousand Hills. 

Your role is to help travelers plan their visit to Rwanda by:
1. Recommending amazing experiences, tours, and activities
2. Providing practical travel information (visas, weather, safety, transportation)
3. Sharing cultural insights and local tips
4. Helping with itinerary planning
5. Answering questions about specific locations, attractions, and activities

Key information about Rwanda:
- Capital: Kigali
- Official languages: Kinyarwanda, English, French, Swahili
- Currency: Rwandan Franc (RWF)
- Time zone: CAT (UTC+2)
- Best time to visit: June-September (dry season) and December-February (dry season)

Important guidelines:
- Be warm, enthusiastic, and culturally respectful
- Use local words like "Muraho" (hello) occasionally
- Provide specific, actionable recommendations
- Include practical details (prices, locations, timing)
- When recommending experiences, mention what makes them special
- Always be helpful and honest

Current context:
- User location: ${userLocation}
- User intent: ${intent}
${entities?.location ? `- Mentioned location: ${entities.location}` : ''}
${entities?.price ? `- Price range mentioned: ${entities.price}` : ''}
${entities?.date ? `- Date mentioned: ${entities.date}` : ''}
${entities?.people ? `- Number of people: ${entities.people}` : ''}
${entities?.duration ? `- Duration mentioned: ${entities.duration}` : ''}`;

  // Add conversation history context
  let historyContext = '';
  if (history && history.length > 0) {
    const lastMessages = history.slice(-5); // Last 5 messages
    historyContext = '\n\nPrevious conversation context:\n';
    lastMessages.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      historyContext += `${role}: ${msg.content}\n`;
    });
  }

  // Add experiences context
  let experiencesContext = '';
  if (experiences && experiences.length > 0) {
    experiencesContext = '\n\nRelevant experiences available:\n';
    experiences.slice(0, 5).forEach((exp, index) => {
      experiencesContext += `${index + 1}. ${exp.title || exp.name || 'Experience'}`;
      if (exp.location) experiencesContext += ` in ${exp.location}`;
      if (exp.price) experiencesContext += ` ($${exp.price})`;
      experiencesContext += `\n   ${exp.description || exp.shortDescription || ''}\n`;
    });
  }

  // Build user prompt based on intent
  let userPrompt = '';
  const followUpText = isFollowUp ? ' (follow-up question)' : '';

  switch (intent) {
    case 'plan':
      userPrompt = `The user wants to plan a trip to Rwanda${followUpText}. 
Their message: "${message}"

Please help them create a personalized travel plan. Include:
1. Suggested itinerary (day by day)
2. Must-see attractions
3. Practical tips
4. Estimated costs
5. Best time to go

${entities?.location ? `Focus on ${entities.location} area.` : ''}
${entities?.duration ? `The trip duration is ${entities.duration}.` : ''}
${entities?.people ? `There are ${entities.people} travelers.` : ''}

Be specific and actionable in your recommendations.`;
      break;

    case 'location':
      userPrompt = `The user is asking about locations in Rwanda${followUpText}.
Their message: "${message}"

${entities?.location ? `They are specifically interested in ${entities.location}.` : 'Provide an overview of the best locations to visit in Rwanda.'}

Please provide:
1. Overview of the location(s)
2. Top attractions and activities
3. Best time to visit
4. How to get there
5. Where to stay

Be detailed and informative. Include specific names, prices, and practical tips.`;
      break;

    case 'experience':
      userPrompt = `The user is asking about experiences and activities in Rwanda${followUpText}.
Their message: "${message}"

${entities?.location ? `They want experiences in ${entities.location}.` : ''}

Please recommend specific experiences including:
1. Activity name and description
2. Price range
3. Duration
4. Best time to do it
5. What makes it special
6. How to book

Include a mix of popular and unique experiences. Be specific and enthusiastic.`;
      break;

    case 'price':
      userPrompt = `The user is asking about prices and costs${followUpText}.
Their message: "${message}"

${entities?.location ? `For ${entities.location}.` : ''}
${entities?.price ? `Price range mentioned: ${entities.price}` : ''}

Provide detailed pricing information including:
1. Average costs for activities
2. Entrance fees (if applicable)
3. Tour package prices
4. Additional expenses to consider
5. Budget tips

Be transparent and helpful. Include specific numbers where possible.`;
      break;

    case 'time':
      userPrompt = `The user is asking about timing and seasons${followUpText}.
Their message: "${message}"

${entities?.location ? `For ${entities.location}.` : ''}
${entities?.date ? `Date mentioned: ${entities.date}` : ''}

Provide information about:
1. Best time to visit
2. Weather conditions
3. Seasonal activities
4. Peak vs off-peak seasons
5. What to pack

Be practical and specific. Include months and conditions.`;
      break;

    case 'booking':
      userPrompt = `The user wants to book something${followUpText}.
Their message: "${message}"

${entities?.location ? `Interested in ${entities.location}.` : ''}

Guide them through the booking process including:
1. How to book
2. What's included
3. Payment options
4. Cancellation policy
5. What to expect

Be helpful and reassuring.`;
      break;

    default:
      userPrompt = `The user is asking: "${message}"${followUpText}

Please provide a helpful, informative response about tourism in Rwanda. Be specific and include practical details, recommendations, and cultural insights.`;
  }

  // Combine all parts
  return `${systemPrompt}${historyContext}${experiencesContext}\n\n${userPrompt}`;
}

/**
 * Build follow-up prompt with context
 */
export function buildFollowUpPrompt({
  message,
  history,
  context,
  lastIntent,
  lastResults = []
}) {
  // Get last assistant response
  const lastResponse = history?.filter(m => m.role === 'assistant').pop();
  const lastUserMessage = history?.filter(m => m.role === 'user').pop();

  let prompt = `You are AI Tour Rwanda, a travel assistant. 

Context of the conversation:
- Previous user question: "${lastUserMessage?.content || 'N/A'}"
- Your previous response: "${lastResponse?.content || 'N/A'}"
- Last intent: ${lastIntent || 'general'}
${context?.location ? `- Location context: ${context.location}` : ''}
${lastResults?.length > 0 ? `- Previously recommended experiences: ${lastResults.slice(0, 3).map(e => e.title || e.name).join(', ')}` : ''}

The user is following up with: "${message}"

Please provide a helpful response that:
1. Acknowledges the previous conversation
2. Directly answers the follow-up question
3. Provides additional details if requested
4. Is concise but informative
5. Maintains the same helpful, enthusiastic tone

If the user said "yes" or "okay", continue with the previous topic and offer more details.
If the user asked "where", "when", "how", refer to the previous context.

Be specific and reference the previous conversation.`;

  return prompt;
}

/**
 * Build system prompt for initial greeting
 */
export function buildSystemPrompt(userLocation = 'Rwanda') {
  return `You are AI Tour Rwanda, a friendly and knowledgeable travel assistant for Rwanda. You help travelers plan amazing experiences in the Land of a Thousand Hills.

Your persona:
- Warm, enthusiastic, and culturally respectful
- Knowledgeable about all aspects of Rwandan tourism
- Helpful and practical
- Uses occasional Kinyarwanda words like "Muraho" (hello)
- Provides specific, actionable recommendations

Current context:
- User location: ${userLocation}

Important guidelines:
1. Be specific - mention actual places, prices, and practical details
2. Be enthusiastic - help users get excited about visiting Rwanda
3. Be helpful - provide clear, actionable advice
4. Be culturally aware - respect local customs and traditions
5. Be honest - don't oversell, be transparent about what to expect

Start every conversation warmly and be ready to help with any travel-related questions.`;
}

/**
 * Build greeting prompt
 */
export function buildGreetingPrompt(userLocation = 'Rwanda', userName = '') {
  const nameContext = userName ? `, ${userName}` : '';
  return `Muraho${nameContext}! 🇷🇼 Welcome to AI Tour Rwanda, your personal travel assistant for the Land of a Thousand Hills.

I'm here to help you discover the best of Rwanda - from gorilla trekking in Volcanoes National Park to safari adventures in Akagera, and from the vibrant streets of Kigali to the serene shores of Lake Kivu.

${userLocation && userLocation !== 'Rwanda' ? `I see you're coming from ${userLocation}.` : ''}

How can I help you plan your Rwandan adventure today?

What would you like to know about?
- 🦍 Gorilla trekking experiences
- 🐘 Safari adventures
- 🌆 City tours in Kigali
- 🌿 Nyungwe Forest canopy walks
- 🏖️ Lake Kivu relaxation
- 📅 Best time to visit
- 💰 Budget planning
- 🏨 Accommodation recommendations`;
}

/**
 * Build help prompt
 */
export function buildHelpPrompt() {
  return `Here's how I can help you plan your trip to Rwanda:

🇷🇼 **Destinations & Experiences**
- "Where should I visit in Rwanda?"
- "Tell me about gorilla trekking"
- "What's there to do in Kigali?"
- "Best safari experiences"

🗓️ **Planning & Booking**
- "Plan a 5-day trip for me"
- "How much does a tour cost?"
- "Best time to visit Rwanda"
- "How do I book a tour?"

💡 **Travel Tips**
- "What should I pack?"
- "Is Rwanda safe for tourists?"
- "What's the weather like?"
- "Do I need a visa?"

🤔 **Other Questions**
- "Tell me about Rwandan culture"
- "What food should I try?"
- "How do I get around?"
- "Show me popular tours"

Simply ask me anything, and I'll help you plan an amazing Rwandan experience! 🎉`;
}

/**
 * Build search prompt
 */
export function buildSearchPrompt({ message, results }) {
  let resultsContext = '';
  if (results && results.length > 0) {
    resultsContext = '\n\nI found these experiences based on your request:\n';
    results.slice(0, 5).forEach((result, index) => {
      resultsContext += `${index + 1}. ${result.title || result.name}`;
      if (result.location) resultsContext += ` in ${result.location}`;
      if (result.price) resultsContext += ` ($${result.price})`;
      if (result.description) resultsContext += `\n   ${result.description.substring(0, 100)}...`;
      resultsContext += '\n';
    });
  }

  return `The user is looking for experiences in Rwanda.
Their search query: "${message}"
${resultsContext}

Please respond with a helpful overview of the experiences, highlighting what makes each one special. If no specific results were found, suggest popular alternatives.`;
}

// Export all functions as default object for compatibility
export default {
  buildChatPrompt,
  buildFollowUpPrompt,
  buildSystemPrompt,
  buildGreetingPrompt,
  buildHelpPrompt,
  buildSearchPrompt
};