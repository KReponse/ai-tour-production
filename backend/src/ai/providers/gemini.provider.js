// backend/src/ai/providers/gemini.provider.js
// ✅ PRODUCTION-READY - Fixed quota handling, no wasteful validation

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
    
    // ── Retry Configuration ─────────────────────────────────────
    this.maxRetries = 1; // Only 1 retry for temporary errors
    this.baseDelay = 1000;
    this.maxDelay = 5000;
    
    // ── Model Selection ─────────────────────────────────────────
    this.defaultModel = 'gemini-2.0-flash';
    this.fallbackModel = 'gemini-2.0-flash-lite';
    this.useFallbackModel = false;
    this.modelNotFound = false;
    
    console.log('🔍 Gemini Provider instance created');
    console.log(`📌 API Key configured: ${!!this.apiKey}`);
    console.log(`📌 User specified model: ${this.userModel || 'none (using default)'}`);
  }

  // =========================
  // ✅ INITIALIZATION - NO API CALLS
  // =========================

  async initialize() {
    console.log('🚀 Initializing Gemini (no API calls)...');
    
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
      
      console.log(`✅ Gemini client created (model: ${this.modelName})`);
      console.log('📌 Model validation will happen on first request (lazy)');
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
    return this.available && this.ai !== null && !this.quotaExceeded;
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
    };
  }

  // =========================
  // ✅ CLASSIFY ERROR
  // =========================

  classifyError(error) {
    const message = error.message || '';
    const code = error.code || error.status || '';
    const fullMessage = JSON.stringify(message);
    
    // ── Quota Exhaustion (429) ────────────────────────────────
    if (message.includes('429') || 
        code === 'RESOURCE_EXHAUSTED' ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('quota') ||
        fullMessage.includes('quota_exceeded')) {
      
      // Check if daily quota
      if (message.includes('daily quota') || 
          message.includes('quota exceeded') ||
          fullMessage.includes('GenerateRequestsPerDay')) {
        return {
          code: 'QUOTA_EXHAUSTED',
          retryable: false,
          switchProvider: true,
          dailyQuota: true,
        };
      }
      
      // Check for RetryInfo
      let retryDelay = null;
      if (error.details) {
        for (const detail of error.details) {
          if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
            const delayStr = detail.retryDelay || '';
            const match = delayStr.match(/(\d+)/);
            if (match) {
              retryDelay = parseInt(match[1]) * 1000;
            }
          }
          if (detail['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure') {
            const violations = detail.violations || [];
            for (const v of violations) {
              if (v.quotaMetric && v.quotaMetric.includes('generate_content')) {
                return {
                  code: 'QUOTA_EXHAUSTED',
                  retryable: false,
                  switchProvider: true,
                  dailyQuota: true,
                  retryDelay: retryDelay,
                  quotaMetric: v.quotaMetric,
                };
              }
            }
          }
        }
      }
      
      return {
        code: 'RATE_LIMITED',
        retryable: false,
        switchProvider: true,
        retryDelay: retryDelay,
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
    
    // ── Network Error ──────────────────────────────────────────
    if (message.includes('fetch failed') || 
        message.includes('ECONNREFUSED') || 
        message.includes('ETIMEDOUT') ||
        message.includes('ENOTFOUND')) {
      return {
        code: 'NETWORK_ERROR',
        retryable: true,
        switchProvider: false,
      };
    }
    
    return {
      code: 'UNKNOWN',
      retryable: false,
      switchProvider: true,
    };
  }

  // =========================
  // ✅ EXECUTE WITH RETRY
  // =========================

  async executeWithRetry(fn, context, attempt = 1) {
    // ── Check quota first ──────────────────────────────────────
    if (this.quotaExceeded) {
      if (this.quotaResetAt && new Date() < this.quotaResetAt) {
        const remainingMs = this.quotaResetAt - new Date();
        const remainingSec = Math.ceil(remainingMs / 1000);
        console.warn(`⛔ Quota exceeded, reset in ${remainingSec}s`);
        return { fallback: true, reason: 'quota_exceeded', code: 'QUOTA_EXHAUSTED' };
      }
      
      // ── Reset quota after timeout ────────────────────────────
      this.quotaExceeded = false;
      this.quotaResetAt = null;
      this.quotaError = null;
      console.log('🔄 Quota reset, retrying Gemini...');
    }

    try {
      return await fn();
    } catch (error) {
      const classification = this.classifyError(error);
      
      // ── Quota Exhausted ──────────────────────────────────────
      if (classification.code === 'QUOTA_EXHAUSTED') {
        console.error('⛔ Gemini quota exhausted');
        this.quotaExceeded = true;
        this.quotaError = classification.dailyQuota ? 'daily_quota_exceeded' : 'rate_limit_exceeded';
        this.lastError = error.message || error;
        this.lastErrorCode = 'QUOTA_EXHAUSTED';
        this.lastErrorTime = new Date();
        
        if (classification.retryDelay) {
          this.quotaResetAt = new Date(Date.now() + classification.retryDelay);
          console.log(`📌 Quota reset at: ${this.quotaResetAt.toISOString()}`);
        }
        
        return { fallback: true, reason: 'quota_exhausted', code: 'QUOTA_EXHAUSTED' };
      }
      
      // ── Model Not Found ──────────────────────────────────────
      if (classification.code === 'MODEL_NOT_FOUND') {
        this.modelNotFound = true;
        if (!this.useFallbackModel && this.fallbackModel && this.fallbackModel !== this.modelName) {
          console.warn(`⚠️ Model "${this.modelName}" not found, trying fallback "${this.fallbackModel}"`);
          this.useFallbackModel = true;
          const oldModel = this.modelName;
          this.modelName = this.fallbackModel;
          this.lastError = `Model "${oldModel}" not found, using fallback "${this.fallbackModel}"`;
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
      
      // ── Service Unavailable (retryable) ──────────────────────
      if (classification.retryable && attempt < this.maxRetries) {
        const delay = Math.min(this.baseDelay * Math.pow(2, attempt - 1), this.maxDelay);
        console.warn(`⚠️ ${classification.code}, retrying in ${delay}ms... (attempt ${attempt}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, context, attempt + 1);
      }
      
      // ── Unhandled Error ──────────────────────────────────────
      console.error(`❌ ${context} error:`, error.message);
      this.lastError = error.message;
      this.lastErrorCode = classification.code || 'UNKNOWN_ERROR';
      this.lastErrorTime = new Date();
      return { fallback: true, reason: 'error', code: classification.code, error: error.message };
    }
  }

  // =========================
  // ✅ CHAT
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
      // ── Format messages ──────────────────────────────────────
      const formattedMessages = [];
      let systemInstruction = null;
      
      for (const msg of messages || []) {
        if (msg.role === 'system') {
          systemInstruction = msg.content;
          continue;
        }
        formattedMessages.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }

      // ── Build config ──────────────────────────────────────────
      const config = {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 500,
        topP: options.topP ?? 0.95,
        topK: options.topK ?? 40,
      };

      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      // ── Execute with retry ────────────────────────────────────
      const result = await this.executeWithRetry(async () => {
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: formattedMessages,
          config,
        });
        
        if (!response || !response.text) {
          throw new Error('Empty response from Gemini');
        }
        
        this.validated = true;
        return response;
      }, 'chat');

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
  // ✅ PLAN
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

      const result = await this.executeWithRetry(async () => {
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        });
        
        if (!response || !response.text) {
          throw new Error('Empty response from Gemini');
        }
        
        this.validated = true;
        return response;
      }, 'plan');

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
      console.error('❌ Gemini Plan Error:', error.message);
      return this.createFallbackPlan(params, 'error', error.message);
    }
  }

  // =========================
  // ✅ RECOMMEND
  // =========================

  async recommend(params) {
    console.log(`📤 Gemini recommend() called`);
    console.log(`📌 Model: ${this.modelName}${this.useFallbackModel ? ' (fallback)' : ''}`);
    
    if (!this.isReady()) {
      console.warn('⚠️ Gemini not ready');
      return this.createFallbackRecommendations(params, 'not_ready');
    }

    try {
      const { query = '', userContext, limit = 10 } = params || {};
      
      let prompt = `Recommend ${limit} experiences in Rwanda based on: "${query || 'Popular experiences in Rwanda'}"`;

      if (userContext) {
        prompt += `\nUser Context: Past bookings: ${userContext.pastBookings?.length || 0}`;
      }

      prompt += `

Return ONLY valid JSON array (no markdown, no code fences):
[
  {
    "title": "Experience name",
    "location": "Location, Rwanda",
    "price": 0,
    "duration": "2 days",
    "description": "Brief description",
    "whyRecommended": "Why this experience is recommended",
    "activities": ["Activity 1", "Activity 2"],
    "bestTime": "Best time to visit",
    "rating": 4.5,
    "category": "Adventure|Cultural|Nature|Luxury|Food"
  }
]`;

      const result = await this.executeWithRetry(async () => {
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        });
        
        if (!response || !response.text) {
          throw new Error('Empty response from Gemini');
        }
        
        this.validated = true;
        return response;
      }, 'recommend');

      if (result.fallback) {
        return this.createFallbackRecommendations(params, result.reason);
      }

      const recommendations = this.parseRecommendations(result.text);
      
      return {
        success: true,
        recommendations: recommendations.length > 0 ? recommendations : [],
        raw: result.text,
        provider: 'gemini',
        model: this.modelName,
        timestamp: new Date().toISOString(),
      };
      
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

  parseRecommendations(text) {
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
    return {
      success: true,
      recommendations: [
        {
          title: "Kigali City Experience",
          location: "Kigali, Rwanda",
          price: 150,
          duration: "2 days",
          description: "Explore the cleanest city in Africa",
          whyRecommended: "Perfect introduction to Rwanda",
          activities: ["City Tour", "Genocide Memorial", "Local Markets"],
          bestTime: "All year round",
          rating: 4.8,
          category: "Cultural"
        },
        {
          title: "Gorilla Trekking Adventure",
          location: "Volcanoes National Park",
          price: 750,
          duration: "3 days",
          description: "Experience mountain gorillas in their natural habitat",
          whyRecommended: "Once-in-a-lifetime experience",
          activities: ["Gorilla Trekking", "Community Visit"],
          bestTime: "June-September",
          rating: 4.9,
          category: "Adventure"
        },
        {
          title: "Lake Kivu Serenity",
          location: "Lake Kivu",
          price: 300,
          duration: "2 days",
          description: "Relax by the beautiful Lake Kivu",
          whyRecommended: "Perfect for relaxation",
          activities: ["Boat Cruise", "Kayaking", "Swimming"],
          bestTime: "All year round",
          rating: 4.7,
          category: "Nature"
        },
      ],
      fallback: true,
      provider: 'gemini',
      reason: reason || 'fallback',
      error: error || undefined,
      timestamp: new Date().toISOString(),
    };
  }
}