// backend/src/ai/index.js
// ✅ UPDATED - Added async initialization helper and experience transformer

import aiProvider from './providers/providerInterface.js';
import chatService from './services/chat.service.js';
import plannerService from './services/planner.service.js';
import recommendationService from './services/recommendation.service.js';
import experienceTransformer from './utils/experienceTransformer.js';

// ✅ Prompts
import systemPrompt from './prompts/system.prompt.js';
import plannerPrompt from './prompts/planner.prompt.js';
import chatPrompt from './prompts/chat.prompt.js';
import recommendationPrompt from './prompts/recommendation.prompt.js';

// ✅ Utils
import itineraryOptimizer from './utils/itineraryOptimizer.js';
import travelScoring from './utils/travelScoring.js';
import budgetCalculator from './utils/budgetCalculator.js';
import responseFormatter from './utils/responseFormatter.js';

// ✅ Knowledge
import * as cities from './knowledge/rwanda/cities.js';
import * as parks from './knowledge/rwanda/parks.js';
import * as activities from './knowledge/rwanda/activities.js';
import * as visa from './knowledge/rwanda/visa.js';

// =========================
// ✅ AI Module
// =========================
const AI = {
  // Providers
  provider: aiProvider,
  
  // Services
  chat: chatService,
  planner: plannerService,
  recommendation: recommendationService,
  transformer: experienceTransformer,
  
  // Prompts
  prompts: {
    system: systemPrompt,
    planner: plannerPrompt,
    chat: chatPrompt,
    recommendation: recommendationPrompt
  },
  
  // Utils
  utils: {
    itineraryOptimizer,
    travelScoring,
    budgetCalculator,
    responseFormatter
  },
  
  // Knowledge
  knowledge: {
    cities,
    parks,
    activities,
    visa
  },
  
  // ✅ Helper: Ensure provider is initialized
  async ensureInitialized() {
    if (!aiProvider.initialized) {
      console.log('🔄 AI module: Initializing provider...');
      await aiProvider.initialize();
    }
    const available = aiProvider.isAvailable();
    console.log(`📌 AI module: Provider ${available ? 'available' : 'unavailable'}`);
    return available;
  },
  
  // ✅ Helper: Get provider info
  getProviderInfo() {
    return aiProvider.getProviderInfo();
  },
  
  // ✅ Helper: Check if AI is ready
  isReady() {
    return aiProvider.initialized && aiProvider.isAvailable();
  }
};

// =========================
// ✅ EXPORTS
// =========================

// Default export
export default AI;

// Named exports for backward compatibility
export { aiProvider };
export { chatService };
export { plannerService };
export { recommendationService };
export { experienceTransformer };

// Prompts
export { systemPrompt };
export { plannerPrompt };
export { chatPrompt };
export { recommendationPrompt };

// Utils
export { itineraryOptimizer };
export { travelScoring };
export { budgetCalculator };
export { responseFormatter };

// Knowledge
export { cities };
export { parks };
export { activities };
export { visa };

// =========================
// ✅ AUTO-INITIALIZE ON IMPORT
// =========================
// Start initialization in background
console.log('🔄 AI module: Auto-initializing...');
AI.ensureInitialized().catch((error) => {
  console.error('❌ AI module: Auto-initialization failed:', error.message);
});