// backend/src/ai/providers/gemini.provider.js
// ✅ PRODUCTION-READY - Fixed system instruction format for @google/genai SDK
// ✅ FIXED: GenerateContentRequest.system_instruction.parts[0].data error
// ✅ ADDED: Defensive system prompt validation
// ✅ ADDED: Proper message format conversion

import { GoogleGenAI } from '@google/genai';

export class GeminiProvider {
  constructor() {
    // ── Configuration ──────────────────────────────────────────
    this.apiKey = process.env.GEMINI_API_KEY;
    this.userModel = process.env.GEMINI_MODEL || null;
    
    // ── Core State ─────────────────────────────────────────────
    this.ai = null;
    this.modelName = null;
    this.available = false;
    this.initialized = false;
    this.validated = false;
    
    // ── Quota State ─────────────────────────────────────────────
    this.quotaExceeded = false;
    this.quotaResetAt = null;
    this.quotaError = null;
    
    // ── Error State ─────────────────────────────────────────────
    this.lastError = null;
    this.lastErrorCode = null;
    this.lastErrorTime = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 2;
    
    // ── Retry Configuration ─────────────────────────────────────
    this.maxRetries = 1;
    this.baseDelay = 500;
    this.maxDelay = 2000;
    
    // ── Model Configuration ─────────────────────────────────────
    this.defaultModel = 'gemini-2.0-flash';
    this.fallbackModel = 'gemini-2.0-flash-lite';
    this.useFallbackModel = false;
    this.modelNotFound = false;
    
    // ✅ Production fallback system prompt
    this.FALLBACK_SYSTEM_PROMPT = `You are AI Tour, a helpful travel assistant for Rwanda. 
Help travelers discover amazing experiences in Rwanda including gorilla trekking, safaris, cultural tours, and nature adventures.
Provide accurate, helpful information about travel in Rwanda.`;
    
    console.log('🔍 Gemini Provider instance created');
    console.log(`📌 API Key configured: ${!!this.apiKey}`);
    console.log(`📌 User specified model: ${this.userModel || 'none (using default)'}`);
  }

  // =========================
  // ✅ INITIALIZATION
  // =========================

  async initialize() {
    console.log('🚀 Initializing Gemini...');
    
    if (this.initialized) {
      return this.available;
    }

    if (!this.apiKey || this.apiKey.length < 10) {
      console.warn('⚠️ GEMINI_API_KEY not found or invalid');
      this.available = false;
      this.initialized = true;
      return false;
    }

    try {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
      this.modelName = this.userModel || this.defaultModel;
      this.available = true;
      this.initialized = true;
      this.consecutiveFailures = 0;
      
      console.log(`✅ Gemini client created (model: ${this.modelName})`);
      return true;
      
    } catch (error) {
      console.error('❌ Gemini initialization failed:', error.message);
      this.available = false;
      this.initialized = true;
      this.lastError = error.message;
      this.lastErrorCode = 'INIT_FAILED';
      return false;
    }
  }

  // =========================
  // ✅ IS READY
  // =========================

  isReady() {
    const ready = this.available && this.ai !== null && !this.quotaExceeded;
    
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      console.warn(`⚠️ Gemini has ${this.consecutiveFailures} consecutive failures, marking unavailable`);
      return false;
    }
    
    return ready;
  }

  // =========================
  // ✅ GET PROVIDER INFO
  // =========================

  getProviderInfo() {
    return {
      name: 'gemini',
      available: this.isReady(),
      initialized: this.initialized,
      validated: this.validated,
      modelName: this.modelName,
      apiKeyConfigured: !!this.apiKey,
      sdk: '@google/genai',
      quotaExceeded: this.quotaExceeded,
      quotaResetAt: this.quotaResetAt,
      lastError: this.lastError,
      lastErrorCode: this.lastErrorCode,
      lastErrorTime: this.lastErrorTime,
      useFallbackModel: this.useFallbackModel,
      modelNotFound: this.modelNotFound,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  // =========================
  // ✅ CLASSIFY ERROR
  // =========================

  classifyError(error) {
    const message = error.message || '';
    const code = error.code || error.status || '';
    const fullMessage = JSON.stringify(message);
    const errorName = error.name || '';
    
    // ── Quota Exhaustion (429) - NO RETRY ─────────────────────
    if (message.includes('429') || 
        code === 'RESOURCE_EXHAUSTED' ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('quota') ||
        fullMessage.includes('quota_exceeded') ||
        fullMessage.includes('quotaExceeded')) {
      
      console.error('⛔ Gemini quota exhausted - NO RETRY');
      return {
        code: 'QUOTA_EXHAUSTED',
        retryable: false,
        switchProvider: true,
        dailyQuota: true,
      };
    }
    
    // ── INVALID_ARGUMENT (400) - NO RETRY, switch provider ────
    if (message.includes('400') || 
        message.includes('INVALID_ARGUMENT') ||
        message.includes('required oneof field') ||
        message.includes('system_instruction.parts[0].data')) {
      
      console.error('⛔ Gemini invalid argument - NO RETRY, switch provider');
      return {
        code: 'INVALID_ARGUMENT',
        retryable: false,
        switchProvider: true,
        dailyQuota: false,
      };
    }
    
    // ── Network/Timeout Error - 1 retry max ──────────────────
    if (errorName === 'TypeError' && message.includes('fetch') ||
        message.includes('fetch failed') || 
        message.includes('ECONNREFUSED') || 
        message.includes('ETIMEDOUT') ||
        message.includes('ENOTFOUND') ||
        message.includes('getaddrinfo') ||
        message.includes('network') ||
        message.includes('connect') ||
        message.includes('timeout') ||
        message.includes('abort') ||
        message.includes('AbortError')) {
      return {
        code: 'NETWORK_ERROR',
        retryable: true,
        switchProvider: false,
        shouldIncrementFailures: true,
      };
    }
    
    // ── Model Not Found (404) ──────────────────────────────────
    if (message.includes('404') || 
        code === 'NOT_FOUND' ||
        message.includes('NOT_FOUND') ||
        message.includes('model not found')) {
      return {
        code: 'MODEL_NOT_FOUND',
        retryable: false,
        switchProvider: true,
      };
    }
    
    // ── Service Unavailable (503) ─────────────────────────────
    if (message.includes('503') || 
        code === 'UNAVAILABLE' ||
        message.includes('UNAVAILABLE')) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
        switchProvider: false,
      };
    }
    
    // ── Auth Error ─────────────────────────────────────────────
    if (code === 401 || message.includes('API key not valid')) {
      return {
        code: 'AUTH_ERROR',
        retryable: false,
        switchProvider: true,
      };
    }
    
    return {
      code: 'UNKNOWN',
      retryable: false,
      switchProvider: true,
      shouldIncrementFailures: true,
    };
  }

  // =========================
  // ✅ EXECUTE WITH RETRY
  // =========================

  async executeWithRetry(fn, context, attempt = 1) {
    // ── Check quota first ──────────────────────────────────────
    if (this.quotaExceeded) {
      if (this.quotaResetAt && new Date() < this.quotaResetAt) {
        console.warn(`⛔ Quota exceeded, skipping Gemini`);
        return { fallback: true, reason: 'quota_exceeded', code: 'QUOTA_EXHAUSTED' };
      }
      
      this.quotaExceeded = false;
      this.quotaResetAt = null;
      this.quotaError = null;
      console.log('🔄 Quota reset, retrying Gemini...');
    }

    try {
      const result = await fn();
      this.consecutiveFailures = 0;
      return result;
    } catch (error) {
      const classification = this.classifyError(error);
      
      // ── QUOTA_EXHAUSTED - No retry, immediate fallback ──────
      if (classification.code === 'QUOTA_EXHAUSTED') {
        console.error('⛔ Gemini quota exhausted - skipping to fallback');
        this.quotaExceeded = true;
        this.quotaError = 'daily_quota_exceeded';
        this.lastError = error.message || error;
        this.lastErrorCode = 'QUOTA_EXHAUSTED';
        this.lastErrorTime = new Date();
        this.consecutiveFailures = 0;
        return { fallback: true, reason: 'quota_exhausted', code: 'QUOTA_EXHAUSTED' };
      }
      
      // ── INVALID_ARGUMENT - No retry, switch provider ────────
      if (classification.code === 'INVALID_ARGUMENT') {
        console.error('⛔ Gemini invalid argument - switching to fallback');
        this.lastError = error.message || error;
        this.lastErrorCode = 'INVALID_ARGUMENT';
        this.lastErrorTime = new Date();
        return { fallback: true, reason: 'invalid_argument', code: 'INVALID_ARGUMENT' };
      }
      
      // ── NETWORK_ERROR - 1 retry max ──────────────────────────
      if (classification.code === 'NETWORK_ERROR' && attempt <= this.maxRetries) {
        this.consecutiveFailures += 1;
        console.warn(`⚠️ Network error (attempt ${attempt}/${this.maxRetries})`);
        
        if (attempt < this.maxRetries) {
          const delay = 500;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.executeWithRetry(fn, context, attempt + 1);
        }
        
        console.warn(`⚠️ Network error after ${this.maxRetries} attempts, falling back`);
        this.lastError = error.message;
        this.lastErrorCode = 'NETWORK_ERROR';
        this.lastErrorTime = new Date();
        return { fallback: true, reason: 'network_error', code: 'NETWORK_ERROR' };
      }
      
      // ── MODEL_NOT_FOUND - Try fallback model ──────────────────
      if (classification.code === 'MODEL_NOT_FOUND') {
        this.modelNotFound = true;
        if (!this.useFallbackModel && this.fallbackModel && this.fallbackModel !== this.modelName) {
          console.warn(`⚠️ Model "${this.modelName}" not found, trying fallback "${this.fallbackModel}"`);
          this.useFallbackModel = true;
          this.modelName = this.fallbackModel;
          this.lastError = `Model not found, using fallback "${this.fallbackModel}"`;
          this.lastErrorCode = 'MODEL_NOT_FOUND';
          this.lastErrorTime = new Date();
          return this.executeWithRetry(fn, context, 1);
        }
        console.error(`❌ Model "${this.modelName}" not found`);
        this.available = false;
        this.lastError = error.message;
        this.lastErrorCode = 'MODEL_NOT_FOUND';
        this.lastErrorTime = new Date();
        return { fallback: true, reason: 'model_not_found', code: 'MODEL_NOT_FOUND' };
      }
      
      // ── SERVICE_UNAVAILABLE - 1 retry ────────────────────────
      if (classification.retryable && attempt < this.maxRetries) {
        const delay = 500;
        console.warn(`⚠️ ${classification.code}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, context, attempt + 1);
      }
      
      // ── Unhandled Error ──────────────────────────────────────
      console.error(`❌ ${context} error:`, error.message);
      this.lastError = error.message;
      this.lastErrorCode = classification.code || 'UNKNOWN_ERROR';
      this.lastErrorTime = new Date();
      this.consecutiveFailures += 1;
      return { fallback: true, reason: 'error', code: classification.code, error: error.message };
    }
  }

  // =========================
  // ✅ VALIDATE SYSTEM PROMPT
  // =========================

  validateSystemPrompt(prompt) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.warn('⚠️ System prompt is empty or invalid, using fallback');
      return this.FALLBACK_SYSTEM_PROMPT;
    }
    
    // Ensure prompt is not too long (Gemini has limits)
    if (prompt.length > 10000) {
      console.warn('⚠️ System prompt too long, truncating to 10000 chars');
      return prompt.substring(0, 10000);
    }
    
    return prompt;
  }

  // =========================
  // ✅ CONVERT MESSAGES TO GEMINI FORMAT
  // =========================

  convertMessagesToGeminiFormat(messages) {
    const contents = [];
    let systemInstruction = null;
    
    for (const msg of messages) {
      // Handle system message
      if (msg.role === 'system') {
        systemInstruction = this.validateSystemPrompt(msg.content);
        continue;
      }
      
      // Convert user/assistant messages
      let role = msg.role === 'assistant' ? 'model' : 'user';
      
      // ✅ Ensure content is a valid string
      const content = msg.content || '';
      if (typeof content !== 'string') {
        console.warn(`⚠️ Message content is not a string, converting: ${typeof content}`);
        continue;
      }
      
      if (content.trim().length === 0) {
        console.warn('⚠️ Empty message content, skipping');
        continue;
      }
      
      contents.push({
        role: role,
        parts: [{ text: content }]
      });
    }
    
    return { contents, systemInstruction };
  }

  // =========================
  // ✅ CHAT - 15 second timeout
  // =========================

  async chat(messages, options = {}) {
    console.log(`📤 Gemini chat() called`);
    console.log(`📌 Messages: ${messages?.length || 0} messages`);
    console.log(`📌 Model: ${this.modelName}${this.useFallbackModel ? ' (fallback)' : ''}`);
    
    if (!this.isReady()) {
      console.warn('⚠️ Gemini not ready');
      return {
        success: true,
        content: "AI service is currently unavailable. Please try again later.",
        fallback: true,
        provider: 'gemini',
        reason: 'not_ready',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // ✅ Convert messages to Gemini format
      const { contents, systemInstruction } = this.convertMessagesToGeminiFormat(messages);
      
      // ✅ Log request details (without secrets)
      console.log(`📌 systemInstruction: ${systemInstruction ? 'present' : 'absent'}`);
      console.log(`📌 systemInstructionLength: ${systemInstruction ? systemInstruction.length : 0}`);
      console.log(`📌 contentsCount: ${contents.length}`);
      console.log(`📌 model: ${this.modelName}`);
      
      // ✅ Validate we have content to send
      if (contents.length === 0) {
        console.error('❌ No valid content to send to Gemini');
        return {
          success: true,
          content: "I couldn't process your request. Please try again.",
          fallback: true,
          provider: 'gemini',
          reason: 'no_content',
          timestamp: new Date().toISOString(),
        };
      }

      const config = {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 500,
        topP: options.topP ?? 0.95,
        topK: options.topK ?? 40,
        timeout: 15000,
      };

      // ✅ Only add systemInstruction if present and valid
      if (systemInstruction && systemInstruction.trim().length > 0) {
        config.systemInstruction = systemInstruction;
        console.log('📌 systemInstruction added to config');
      } else {
        console.warn('⚠️ No valid system instruction, using fallback');
        config.systemInstruction = this.FALLBACK_SYSTEM_PROMPT;
        console.log('📌 Fallback system instruction added');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('⏰ Gemini request aborted after 15s');
      }, 15000);

      try {
        const result = await this.executeWithRetry(async () => {
          const response = await this.ai.models.generateContent({
            model: this.modelName,
            contents: contents,
            config: config,
            signal: controller.signal,
          });
          
          if (!response || !response.text) {
            throw new Error('Empty response from Gemini');
          }
          
          this.validated = true;
          clearTimeout(timeoutId);
          return response;
        }, 'chat');

        clearTimeout(timeoutId);

        if (result.fallback) {
          console.warn(`⚠️ Gemini chat fallback: ${result.reason}`);
          return {
            success: true,
            content: "I'm currently experiencing high demand. Please try again in a moment.",
            fallback: true,
            provider: 'gemini',
            reason: result.reason,
            code: result.code,
            timestamp: new Date().toISOString(),
          };
        }

        console.log('📥 Gemini chat response received');
        
        return {
          success: true,
          content: result.text,
          usage: {
            promptTokens: result.usageMetadata?.promptTokenCount || 0,
            completionTokens: result.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: result.usageMetadata?.totalTokenCount || 0,
          },
          provider: 'gemini',
          model: this.modelName,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Gemini Chat Error:', error.message);
      return {
        success: true,
        content: "I'm currently experiencing technical difficulties. Please try again later.",
        fallback: true,
        provider: 'gemini',
        reason: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // =========================
  // ✅ PLAN - 20 second timeout
  // =========================

  async plan(params) {
    console.log(`📤 Gemini plan() called`);
    console.log(`📌 Model: ${this.modelName}${this.useFallbackModel ? ' (fallback)' : ''}`);
    console.log(`📌 Destination: ${params?.destination || 'Rwanda'}`);
    
    if (!this.isReady()) {
      console.warn('⚠️ Gemini not ready');
      return this.createFallbackPlan(params, 'not_ready');
    }

    try {
      const { destination = 'Rwanda', days = 3, budget = 500, travelers = 1, preferences = 'Balanced' } = params || {};
      
      const prompt = `Create a detailed ${days}-day travel plan for ${destination}, Rwanda.

Budget: $${budget}
Travelers: ${travelers || 1}
Preferences: ${preferences || 'Balanced'}

Return ONLY valid JSON (no markdown, no code fences):
{
  "itinerary": [
    {
      "day": 1,
      "title": "Day 1 Title",
      "activities": ["Activity 1", "Activity 2"],
      "meals": ["Breakfast", "Lunch", "Dinner"],
      "accommodation": "Hotel name",
      "budget": 0
    }
  ],
  "totalCost": 0,
  "tips": ["Tip 1", "Tip 2"],
  "bestTime": "Best time to visit",
  "weather": "Weather information"
}`;

      // ✅ Convert single prompt to Gemini format
      const { contents, systemInstruction } = this.convertMessagesToGeminiFormat([
        { role: 'user', content: prompt }
      ]);
      
      console.log(`📌 systemInstruction: ${systemInstruction ? 'present' : 'absent'}`);
      console.log(`📌 contentsCount: ${contents.length}`);
      console.log(`📌 model: ${this.modelName}`);

      const config = {
        temperature: 0.7,
        maxOutputTokens: 800,
        timeout: 20000,
      };

      if (systemInstruction && systemInstruction.trim().length > 0) {
        config.systemInstruction = systemInstruction;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('⏰ Gemini plan aborted after 20s');
      }, 20000);

      try {
        const result = await this.executeWithRetry(async () => {
          const response = await this.ai.models.generateContent({
            model: this.modelName,
            contents: contents,
            config: config,
            signal: controller.signal,
          });
          
          if (!response || !response.text) {
            throw new Error('Empty response from Gemini');
          }
          
          this.validated = true;
          clearTimeout(timeoutId);
          return response;
        }, 'plan');

        clearTimeout(timeoutId);

        if (result.fallback) {
          return this.createFallbackPlan(params, result.reason);
        }

        const plan = this.parsePlanResponse(result.text, params);
        
        if (!plan) {
          console.warn('⚠️ Failed to parse plan response, using fallback');
          return this.createFallbackPlan(params, 'parse_error');
        }

        return {
          success: true,
          plan,
          raw: result.text,
          provider: 'gemini',
          model: this.modelName,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Gemini Plan Error:', error.message);
      return this.createFallbackPlan(params, 'error', error.message);
    }
  }

  // =========================
  // ✅ RECOMMEND - 15 second timeout
  // =========================

  async recommend(params) {
    console.log(`📤 Gemini recommend() called`);
    console.log(`📌 Model: ${this.modelName}${this.useFallbackModel ? ' (fallback)' : ''}`);
    console.log(`📌 Query: ${params?.query || 'Popular experiences'}`);
    
    if (!this.isReady()) {
      console.warn('⚠️ Gemini not ready');
      return this.createFallbackRecommendations(params, 'not_ready');
    }

    try {
      const { query = '', userContext, limit = 10, existingListings = [] } = params || {};
      
      // ✅ Build prompt with real listing context
      let prompt = `You are an AI travel assistant for Rwanda. Based on the user's query, recommend the most relevant experiences from the available listings.

User Query: "${query || 'Popular experiences in Rwanda'}"

Available Listings (Real data from our database):
${existingListings.map((listing, i) => 
  `${i + 1}. ${listing.title} - ${listing.location} - $${listing.price} - ${listing.rating || 'New'}⭐ - ${listing.category || 'General'}`
).join('\n')}

Return ONLY a JSON array of recommended listing IDs in order of relevance (most relevant first):
["listing_id_1", "listing_id_2", "listing_id_3"]

Important: Only recommend listings from the provided list. Never invent listings.`;

      // ✅ Convert to Gemini format
      const { contents, systemInstruction } = this.convertMessagesToGeminiFormat([
        { role: 'user', content: prompt }
      ]);
      
      console.log(`📌 systemInstruction: ${systemInstruction ? 'present' : 'absent'}`);
      console.log(`📌 contentsCount: ${contents.length}`);
      console.log(`📌 model: ${this.modelName}`);

      const config = {
        temperature: 0.3,
        maxOutputTokens: 500,
        timeout: 15000,
      };

      if (systemInstruction && systemInstruction.trim().length > 0) {
        config.systemInstruction = systemInstruction;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('⏰ Gemini recommend aborted after 15s');
      }, 15000);

      try {
        const result = await this.executeWithRetry(async () => {
          const response = await this.ai.models.generateContent({
            model: this.modelName,
            contents: contents,
            config: config,
            signal: controller.signal,
          });
          
          if (!response || !response.text) {
            throw new Error('Empty response from Gemini');
          }
          
          this.validated = true;
          clearTimeout(timeoutId);
          return response;
        }, 'recommend');

        clearTimeout(timeoutId);

        if (result.fallback) {
          return this.createFallbackRecommendations(params, result.reason);
        }

        const recommendedIds = this.parseRecommendedIds(result.text);
        
        const recommendations = existingListings
          .filter(listing => recommendedIds.includes(listing._id))
          .slice(0, limit);

        return {
          success: true,
          recommendations: recommendations.length > 0 ? recommendations : existingListings.slice(0, limit),
          recommendedIds: recommendedIds,
          provider: 'gemini',
          model: this.modelName,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Gemini Recommend Error:', error.message);
      return this.createFallbackRecommendations(params, 'error', error.message);
    }
  }

  // =========================
  // ✅ PARSERS
  // =========================

  parsePlanResponse(text, params) {
    try {
      let jsonString = text;
      jsonString = jsonString.replace(/```json\s*/g, '');
      jsonString = jsonString.replace(/```\s*/g, '');
      jsonString = jsonString.trim();
      
      const match = jsonString.match(/\{[\s\S]*\}/);
      if (!match) {
        console.warn('No JSON object found in response');
        return null;
      }
      
      const plan = JSON.parse(match[0]);
      
      return {
        destination: params?.destination || 'Rwanda',
        days: params?.days || 3,
        budget: params?.budget || 500,
        travelers: params?.travelers || 1,
        itinerary: Array.isArray(plan.itinerary) ? plan.itinerary : [],
        totalCost: plan.totalCost || params?.budget || 500,
        tips: Array.isArray(plan.tips) ? plan.tips : [],
        bestTime: plan.bestTime || 'June-September',
        weather: plan.weather || 'Mild, 20-25°C',
      };
      
    } catch (error) {
      console.error('Parse plan error:', error.message);
      return null;
    }
  }

  parseRecommendedIds(text) {
    try {
      let jsonString = text;
      jsonString = jsonString.replace(/```json\s*/g, '');
      jsonString = jsonString.replace(/```\s*/g, '');
      jsonString = jsonString.trim();
      
      const match = jsonString.match(/\[[\s\S]*\]/);
      if (!match) {
        console.warn('No JSON array found in response');
        return [];
      }
      
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : [];
      
    } catch (error) {
      console.error('Parse recommendations error:', error.message);
      return [];
    }
  }

  // =========================
  // ✅ FALLBACK HELPERS
  // =========================

  createFallbackPlan(params, reason, error = null) {
    const days = Math.max(1, Number(params?.days) || 3);
    const budget = Math.max(0, Number(params?.budget) || 500);
    const travelers = Math.max(1, Number(params?.travelers) || 1);
    const perDay = Math.round(budget / days);
    const destination = params?.destination || 'Rwanda';

    return {
      success: true,
      plan: {
        destination: destination,
        days: days,
        budget: budget,
        travelers: travelers,
        itinerary: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          title: `Day ${i + 1} - Explore ${destination}`,
          activities: ['Visit local attractions', 'Enjoy Rwandan cuisine', 'Relax'],
          meals: ['Breakfast', 'Lunch', 'Dinner'],
          accommodation: 'Mid-range hotel',
          budget: perDay,
        })),
        totalCost: budget,
        tips: ['Book tours in advance', 'Pack comfortable walking shoes', 'Stay hydrated'],
        bestTime: 'June-September (dry season)',
        weather: 'Mild temperatures, 20-25°C',
      },
      fallback: true,
      provider: 'gemini',
      reason: reason || 'fallback',
      error: error || undefined,
      timestamp: new Date().toISOString(),
    };
  }

  createFallbackRecommendations(params, reason, error = null) {
    const recommendations = params?.existingListings?.slice(0, 10) || [];
    
    return {
      success: true,
      recommendations: recommendations,
      fallback: true,
      provider: 'gemini',
      reason: reason || 'fallback',
      error: error || undefined,
      timestamp: new Date().toISOString(),
    };
  }
}