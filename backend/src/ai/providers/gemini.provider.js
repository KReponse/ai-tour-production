// backend/src/ai/providers/gemini.provider.js
// AI Tour - Production Gemini Provider
// @google/genai SDK
//
// Production fixes:
// - Uses gemini-3.6-flash as primary model
// - Never defaults to retired gemini-2.0-flash
// - Safe fallback model handling
// - 503 / high-demand retry
// - Network retry
// - Quota handling
// - Model-not-found fallback
// - Correct systemInstruction format
// - Abort-safe requests
// - Defensive response parsing
// - Compatible chat / plan / recommend APIs

import { GoogleGenAI } from '@google/genai';

export class GeminiProvider {
  constructor() {
    // ============================================================
    // CONFIGURATION
    // ============================================================

    this.apiKey = process.env.GEMINI_API_KEY?.trim() || null;

    this.userModel =
      process.env.GEMINI_MODEL?.trim() || null;

    // IMPORTANT:
    // gemini-3.6-flash has been verified by test-gemini.js.
    // Do NOT use retired gemini-2.0-flash.
    this.defaultModel =
      this.userModel || 'gemini-3.6-flash';

    // Fallback must also be configurable.
    // If not configured, use the same verified model rather than
    // falling back to an unavailable/retired model.
    this.fallbackModel =
      process.env.GEMINI_FALLBACK_MODEL?.trim() ||
      'gemini-3.6-flash';

    // ============================================================
    // CORE STATE
    // ============================================================

    this.ai = null;

    this.modelName = this.defaultModel;

    this.available = false;
    this.initialized = false;
    this.validated = false;

    // ============================================================
    // QUOTA STATE
    // ============================================================

    this.quotaExceeded = false;
    this.quotaResetAt = null;
    this.quotaError = null;

    // ============================================================
    // ERROR STATE
    // ============================================================

    this.lastError = null;
    this.lastErrorCode = null;
    this.lastErrorTime = null;

    this.consecutiveFailures = 0;

    // Only permanent/serious failures count here.
    this.maxConsecutiveFailures = 5;

    // ============================================================
    // RETRY CONFIGURATION
    // ============================================================

    this.maxRetries = 3;

    this.baseDelay = 1000;

    this.maxDelay = 8000;

    this.retryJitter = 250;

    // ============================================================
    // MODEL STATE
    // ============================================================

    this.useFallbackModel = false;

    this.modelNotFound = false;

    this.modelCandidates = [
      this.defaultModel,
      this.fallbackModel,
    ].filter(
      (model, index, array) =>
        model &&
        array.indexOf(model) === index
    );

    // ============================================================
    // FALLBACK SYSTEM PROMPT
    // ============================================================

    this.FALLBACK_SYSTEM_PROMPT = `
You are AI Tour, a helpful travel assistant for Rwanda.

Help travelers discover amazing experiences in Rwanda including:

- Gorilla trekking
- Akagera National Park safaris
- Nyungwe National Park
- Kigali city tours
- Cultural experiences
- Nature and adventure activities
- Hotels and accommodation
- Transportation
- Local tourism information

Be friendly, helpful and concise.

Provide accurate information.

When information is uncertain, clearly say so instead of inventing facts.

When recommending tourism experiences, prioritize useful information
about location, duration, price when known, best time to visit,
and practical travel advice.
`.trim();

    // ============================================================
    // LOG CONFIGURATION
    // ============================================================

    console.log('🔍 Gemini Provider instance created');

    console.log(
      `📌 API Key configured: ${!!this.apiKey}`
    );

    console.log(
      `📌 User model: ${this.userModel || 'none'}`
    );

    console.log(
      `📌 Default model: ${this.defaultModel}`
    );

    console.log(
      `📌 Fallback model: ${this.fallbackModel}`
    );
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async initialize() {
    console.log('🚀 Initializing Gemini...');

    if (this.initialized) {
      return this.available;
    }

    if (
      !this.apiKey ||
      this.apiKey.length < 10
    ) {
      console.warn(
        '⚠️ GEMINI_API_KEY missing or invalid'
      );

      this.available = false;

      this.initialized = true;

      this.lastError =
        'GEMINI_API_KEY missing or invalid';

      this.lastErrorCode =
        'AUTH_ERROR';

      this.lastErrorTime =
        new Date();

      return false;
    }

    try {
      this.ai =
        new GoogleGenAI({
          apiKey: this.apiKey,
        });

      this.modelName =
        this.defaultModel;

      this.available = true;

      this.initialized = true;

      this.validated = false;

      this.consecutiveFailures = 0;

      console.log(
        `✅ Gemini client created`
      );

      console.log(
        `🤖 Gemini model: ${this.modelName}`
      );

      return true;
    } catch (error) {
      console.error(
        '❌ Gemini initialization failed:',
        error?.message || error
      );

      this.available = false;

      this.initialized = true;

      this.lastError =
        error?.message ||
        String(error);

      this.lastErrorCode =
        'INIT_FAILED';

      this.lastErrorTime =
        new Date();

      return false;
    }
  }

  // ============================================================
  // READY CHECK
  // ============================================================

  isReady() {
    if (
      !this.initialized ||
      !this.ai
    ) {
      return false;
    }

    if (!this.available) {
      return false;
    }

    // Handle quota expiration.
    if (this.quotaExceeded) {
      if (
        this.quotaResetAt &&
        new Date() <
          this.quotaResetAt
      ) {
        return false;
      }

      console.log(
        '🔄 Gemini quota window expired'
      );

      this.quotaExceeded = false;

      this.quotaResetAt = null;

      this.quotaError = null;
    }

    if (
      this.consecutiveFailures >=
      this.maxConsecutiveFailures
    ) {
      console.warn(
        `⚠️ Gemini reached ${this.consecutiveFailures} serious failures`
      );

      return false;
    }

    return true;
  }

  // ============================================================
  // PROVIDER INFO
  // ============================================================

  getProviderInfo() {
    return {
      name: 'gemini',

      active: this.isReady(),

      available: this.isReady(),

      initialized:
        this.initialized,

      validated:
        this.validated,

      modelName:
        this.modelName,

      apiKeyConfigured:
        !!this.apiKey,

      sdk:
        '@google/genai',

      quotaExceeded:
        this.quotaExceeded,

      quotaResetAt:
        this.quotaResetAt,

      lastError:
        this.lastError,

      lastErrorCode:
        this.lastErrorCode,

      lastErrorTime:
        this.lastErrorTime,

      useFallbackModel:
        this.useFallbackModel,

      modelNotFound:
        this.modelNotFound,

      consecutiveFailures:
        this.consecutiveFailures,

      availableProviders: [
        'gemini',
        'openai',
      ],
    };
  }

  // ============================================================
  // ERROR CLASSIFICATION
  // ============================================================

  classifyError(error) {
    const message =
      error?.message
        ? String(error.message)
        : String(error || '');

    const code =
      error?.code !== undefined
        ? String(error.code)
        : '';

    const status =
      error?.status !== undefined
        ? String(error.status)
        : '';

    const name =
      error?.name
        ? String(error.name)
        : '';

    const combined =
      `${message} ${code} ${status}`
        .toLowerCase();

    // ------------------------------------------------------------
    // QUOTA / RATE LIMIT
    // ------------------------------------------------------------

    if (
      combined.includes('429') ||
      combined.includes(
        'resource_exhausted'
      ) ||
      combined.includes(
        'quota exceeded'
      ) ||
      combined.includes(
        'quota_exceeded'
      ) ||
      combined.includes(
        'quotaexceeded'
      ) ||
      combined.includes(
        'rate limit'
      )
    ) {
      return {
        code:
          'QUOTA_EXHAUSTED',

        retryable:
          false,

        switchProvider:
          true,

        shouldIncrementFailures:
          false,
      };
    }

    // ------------------------------------------------------------
    // AUTH
    // ------------------------------------------------------------

    if (
      combined.includes('401') ||
      combined.includes('403') ||
      combined.includes(
        'unauthenticated'
      ) ||
      combined.includes(
        'permission_denied'
      ) ||
      combined.includes(
        'permission denied'
      ) ||
      combined.includes(
        'api key not valid'
      ) ||
      combined.includes(
        'invalid api key'
      )
    ) {
      return {
        code:
          'AUTH_ERROR',

        retryable:
          false,

        switchProvider:
          true,

        shouldIncrementFailures:
          true,
      };
    }

    // ------------------------------------------------------------
    // INVALID REQUEST
    // ------------------------------------------------------------

    if (
      combined.includes('400') ||
      combined.includes(
        'invalid_argument'
      ) ||
      combined.includes(
        'required oneof field'
      ) ||
      combined.includes(
        'system_instruction.parts'
      ) ||
      combined.includes(
        'invalid request'
      )
    ) {
      return {
        code:
          'INVALID_ARGUMENT',

        retryable:
          false,

        switchProvider:
          true,

        shouldIncrementFailures:
          true,
      };
    }

    // ------------------------------------------------------------
    // MODEL NOT FOUND
    // ------------------------------------------------------------

    if (
      combined.includes('404') ||
      combined.includes(
        'not_found'
      ) ||
      combined.includes(
        'model not found'
      ) ||
      combined.includes(
        'model_not_found'
      ) ||
      combined.includes(
        'no longer available'
      )
    ) {
      return {
        code:
          'MODEL_NOT_FOUND',

        retryable:
          false,

        switchProvider:
          false,

        tryFallbackModel:
          true,

        shouldIncrementFailures:
          false,
      };
    }

    // ------------------------------------------------------------
    // 503 / HIGH DEMAND
    // ------------------------------------------------------------

    if (
      combined.includes('503') ||
      combined.includes(
        'unavailable'
      ) ||
      combined.includes(
        'high demand'
      ) ||
      combined.includes(
        'temporarily unavailable'
      )
    ) {
      return {
        code:
          'SERVICE_UNAVAILABLE',

        retryable:
          true,

        switchProvider:
          false,

        shouldIncrementFailures:
          false,
      };
    }

    // ------------------------------------------------------------
    // NETWORK
    // ------------------------------------------------------------

    if (
      (
        name === 'TypeError' &&
        combined.includes('fetch')
      ) ||
      combined.includes(
        'fetch failed'
      ) ||
      combined.includes(
        'econnrefused'
      ) ||
      combined.includes(
        'etimedout'
      ) ||
      combined.includes(
        'enotfound'
      ) ||
      combined.includes(
        'getaddrinfo'
      ) ||
      combined.includes(
        'connection reset'
      ) ||
      combined.includes(
        'connection refused'
      ) ||
      combined.includes(
        'socket'
      ) ||
      combined.includes(
        'timeout'
      ) ||
      combined.includes(
        'abort'
      ) ||
      combined.includes(
        'aborterror'
      ) ||
      combined.includes(
        'network'
      )
    ) {
      return {
        code:
          'NETWORK_ERROR',

        retryable:
          true,

        switchProvider:
          false,

        shouldIncrementFailures:
          false,
      };
    }

    // ------------------------------------------------------------
    // UNKNOWN
    // ------------------------------------------------------------

    return {
      code:
        'UNKNOWN_ERROR',

      retryable:
        false,

      switchProvider:
        true,

      shouldIncrementFailures:
        true,
    };
  }

  // ============================================================
  // RETRY DELAY
  // ============================================================

  calculateRetryDelay(attempt) {
    const exponential =
      this.baseDelay *
      Math.pow(
        2,
        Math.max(
          0,
          attempt - 1
        )
      );

    const capped =
      Math.min(
        exponential,
        this.maxDelay
      );

    const jitter =
      Math.floor(
        Math.random() *
          this.retryJitter
      );

    return capped + jitter;
  }

  // ============================================================
  // EXECUTE WITH RETRY
  // ============================================================

  async executeWithRetry(
    fn,
    context,
    attempt = 1
  ) {
    // ----------------------------------------------------------
    // QUOTA
    // ----------------------------------------------------------

    if (this.quotaExceeded) {
      if (
        this.quotaResetAt &&
        new Date() <
          this.quotaResetAt
      ) {
        return {
          fallback:
            true,

          reason:
            'quota_exceeded',

          code:
            'QUOTA_EXHAUSTED',
        };
      }

      this.quotaExceeded = false;

      this.quotaResetAt = null;

      this.quotaError = null;
    }

    try {
      const result =
        await fn();

      // Successful request resets temporary failures.
      this.consecutiveFailures = 0;

      this.lastError = null;

      this.lastErrorCode = null;

      this.lastErrorTime = null;

      this.available = true;

      return result;
    } catch (error) {
      const classification =
        this.classifyError(error);

      const errorMessage =
        error?.message ||
        String(error);

      console.warn(
        `⚠️ Gemini ${context} failed:`,
        classification.code
      );

      console.warn(
        `📄 Error: ${errorMessage}`
      );

      // --------------------------------------------------------
      // QUOTA
      // --------------------------------------------------------

      if (
        classification.code ===
        'QUOTA_EXHAUSTED'
      ) {
        this.quotaExceeded =
          true;

        // Temporary protection.
        this.quotaResetAt =
          new Date(
            Date.now() +
              60 * 60 * 1000
          );

        this.quotaError =
          'Gemini quota/rate limit exceeded';

        this.lastError =
          errorMessage;

        this.lastErrorCode =
          'QUOTA_EXHAUSTED';

        this.lastErrorTime =
          new Date();

        return {
          fallback:
            true,

          reason:
            'quota_exhausted',

          code:
            'QUOTA_EXHAUSTED',
        };
      }

      // --------------------------------------------------------
      // MODEL NOT FOUND
      // --------------------------------------------------------

      if (
        classification.code ===
          'MODEL_NOT_FOUND' &&
        this.fallbackModel &&
        this.modelName !==
          this.fallbackModel
      ) {
        console.warn(
          `⚠️ Model "${this.modelName}" is unavailable`
        );

        console.warn(
          `🔄 Switching to fallback model "${this.fallbackModel}"`
        );

        this.modelNotFound =
          true;

        this.useFallbackModel =
          true;

        this.modelName =
          this.fallbackModel;

        this.lastError =
          `Model unavailable, switched to ${this.fallbackModel}`;

        this.lastErrorCode =
          'MODEL_NOT_FOUND';

        this.lastErrorTime =
          new Date();

        return this.executeWithRetry(
          fn,
          context,
          1
        );
      }

      // --------------------------------------------------------
      // RETRY 503 / NETWORK
      // --------------------------------------------------------

      if (
        classification.retryable &&
        attempt <=
          this.maxRetries
      ) {
        const delay =
          this.calculateRetryDelay(
            attempt
          );

        console.warn(
          `🔁 Gemini ${classification.code}: retry ${attempt}/${this.maxRetries} in ${delay}ms`
        );

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              delay
            )
        );

        return this.executeWithRetry(
          fn,
          context,
          attempt + 1
        );
      }

      // --------------------------------------------------------
      // FINAL FAILURE
      // --------------------------------------------------------

      this.lastError =
        errorMessage;

      this.lastErrorCode =
        classification.code ||
        'UNKNOWN_ERROR';

      this.lastErrorTime =
        new Date();

      if (
        classification.shouldIncrementFailures
      ) {
        this.consecutiveFailures +=
          1;
      }

      return {
        fallback:
          true,

        reason:
          (
            classification.code ||
            'error'
          ).toLowerCase(),

        code:
          classification.code,

        error:
          errorMessage,
      };
    }
  }

  // ============================================================
  // SYSTEM PROMPT VALIDATION
  // ============================================================

  validateSystemPrompt(prompt) {
    if (
      !prompt ||
      typeof prompt !== 'string' ||
      !prompt.trim()
    ) {
      return this.FALLBACK_SYSTEM_PROMPT;
    }

    if (
      prompt.length > 10000
    ) {
      console.warn(
        '⚠️ System prompt too long; truncating'
      );

      return prompt.substring(
        0,
        10000
      );
    }

    return prompt.trim();
  }

  // ============================================================
  // MESSAGE CONVERSION
  // ============================================================

  convertMessagesToGeminiFormat(
    messages = []
  ) {
    const contents = [];

    let systemInstruction =
      null;

    for (const msg of messages) {
      if (
        !msg ||
        !msg.role
      ) {
        continue;
      }

      // SYSTEM
      if (
        msg.role === 'system'
      ) {
        const validated =
          this.validateSystemPrompt(
            msg.content
          );

        if (!systemInstruction) {
          systemInstruction =
            validated;
        } else {
          systemInstruction =
            `${systemInstruction}\n\n${validated}`;
        }

        continue;
      }

      // USER / ASSISTANT
      const role =
        msg.role ===
        'assistant'
          ? 'model'
          : 'user';

      if (
        typeof msg.content !==
        'string'
      ) {
        console.warn(
          `⚠️ Invalid ${msg.role} message content`
        );

        continue;
      }

      const content =
        msg.content.trim();

      if (!content) {
        continue;
      }

      contents.push({
        role,

        parts: [
          {
            text: content,
          },
        ],
      });
    }

    return {
      contents,

      systemInstruction,
    };
  }

  // ============================================================
  // REQUEST CONFIG
  // ============================================================

  buildConfig(options = {}) {
    return {
      temperature:
        options.temperature ?? 0.7,

      maxOutputTokens:
        options.maxTokens ?? 500,

      topP:
        options.topP ?? 0.95,

      topK:
        options.topK ?? 40,
    };
  }

  // ============================================================
  // GENERATE CONTENT
  // ============================================================

  async generateContent(
    contents,
    config,
    timeoutMs,
    context
  ) {
    if (
      !this.ai
    ) {
      throw new Error(
        'Gemini client is not initialized'
      );
    }

    const controller =
      new AbortController();

    const timeoutId =
      setTimeout(() => {
        controller.abort();

        console.warn(
          `⏰ Gemini ${context} timeout after ${timeoutMs}ms`
        );
      }, timeoutMs);

    try {
      const response =
        await this.ai.models.generateContent({
          model:
            this.modelName,

          contents,

          config,

          signal:
            controller.signal,
        });

      if (
        !response ||
        typeof response.text !==
          'string' ||
        !response.text.trim()
      ) {
        throw new Error(
          'Empty response from Gemini'
        );
      }

      this.validated = true;

      return response;
    } finally {
      clearTimeout(
        timeoutId
      );
    }
  }

  // ============================================================
  // CHAT
  // ============================================================

  async chat(
    messages = [],
    options = {}
  ) {
    console.log(
      '📤 Gemini chat() called'
    );

    console.log(
      `📌 Messages: ${messages.length}`
    );

    console.log(
      `📌 Model: ${this.modelName}`
    );

    if (
      !this.isReady()
    ) {
      console.warn(
        '⚠️ Gemini not ready'
      );

      return {
        success: true,

        content:
          'AI service is currently unavailable. Please try again later.',

        fallback: true,

        provider:
          'gemini',

        reason:
          'not_ready',

        timestamp:
          new Date().toISOString(),
      };
    }

    try {
      const {
        contents,
        systemInstruction,
      } =
        this.convertMessagesToGeminiFormat(
          messages
        );

      if (
        !contents.length
      ) {
        return {
          success: true,

          content:
            "I couldn't process your request. Please try again.",

          fallback: true,

          provider:
            'gemini',

          reason:
            'no_content',

          timestamp:
            new Date().toISOString(),
        };
      }

      const config =
        this.buildConfig(
          options
        );

      // @google/genai accepts a string
      // for config.systemInstruction.
      config.systemInstruction =
        this.validateSystemPrompt(
          systemInstruction
        );

      const result =
        await this.executeWithRetry(
          () =>
            this.generateContent(
              contents,
              config,
              options.timeout ??
                15000,
              'chat'
            ),
          'chat'
        );

      if (
        result?.fallback
      ) {
        console.warn(
          `⚠️ Gemini chat fallback: ${result.reason}`
        );

        return {
          success: true,

          content:
            'I am temporarily unable to connect to the AI service. Please try again in a moment.',

          fallback: true,

          provider:
            'gemini',

          reason:
            result.reason,

          code:
            result.code,

          timestamp:
            new Date().toISOString(),
        };
      }

      return {
        success: true,

        content:
          result.text,

        usage: {
          promptTokens:
            result
              .usageMetadata
              ?.promptTokenCount ||
            0,

          completionTokens:
            result
              .usageMetadata
              ?.candidatesTokenCount ||
            0,

          totalTokens:
            result
              .usageMetadata
              ?.totalTokenCount ||
            0,
        },

        provider:
          'gemini',

        model:
          this.modelName,

        timestamp:
          new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        '❌ Gemini Chat Error:',
        error?.message ||
          error
      );

      return {
        success: true,

        content:
          'I am currently experiencing technical difficulties. Please try again later.',

        fallback: true,

        provider:
          'gemini',

        reason:
          'error',

        error:
          error?.message ||
          String(error),

        timestamp:
          new Date().toISOString(),
      };
    }
  }

  // ============================================================
  // PLAN
  // ============================================================

  async plan(
    params = {}
  ) {
    console.log(
      '📤 Gemini plan() called'
    );

    console.log(
      `📌 Model: ${this.modelName}`
    );

    const {
      destination =
        'Rwanda',

      days = 3,

      budget = 500,

      travelers = 1,

      preferences =
        'Balanced',
    } = params;

    if (
      !this.isReady()
    ) {
      return this.createFallbackPlan(
        params,
        'not_ready'
      );
    }

    try {
      const prompt = `
Create a detailed ${days}-day travel plan for ${destination}, Rwanda.

Budget: $${budget}
Travelers: ${travelers}
Preferences: ${preferences}

Return ONLY valid JSON.

{
  "itinerary": [
    {
      "day": 1,
      "title": "Day 1 Title",
      "activities": [
        "Activity 1",
        "Activity 2"
      ],
      "meals": [
        "Breakfast",
        "Lunch",
        "Dinner"
      ],
      "accommodation": "Hotel name",
      "budget": 0
    }
  ],
  "totalCost": 0,
  "tips": [
    "Tip 1",
    "Tip 2"
  ],
  "bestTime": "Best time to visit",
  "weather": "Weather information"
}
`.trim();

      const {
        contents,
        systemInstruction,
      } =
        this.convertMessagesToGeminiFormat([
          {
            role:
              'user',

            content:
              prompt,
          },
        ]);

      const config = {
        temperature:
          0.7,

        maxOutputTokens:
          800,

        systemInstruction:
          this.validateSystemPrompt(
            systemInstruction
          ),
      };

      const result =
        await this.executeWithRetry(
          () =>
            this.generateContent(
              contents,
              config,
              20000,
              'plan'
            ),
          'plan'
        );

      if (
        result?.fallback
      ) {
        return this.createFallbackPlan(
          params,
          result.reason,
          result.error
        );
      }

      const plan =
        this.parsePlanResponse(
          result.text,
          params
        );

      if (!plan) {
        return this.createFallbackPlan(
          params,
          'parse_error'
        );
      }

      return {
        success: true,

        plan,

        raw:
          result.text,

        provider:
          'gemini',

        model:
          this.modelName,

        timestamp:
          new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        '❌ Gemini Plan Error:',
        error?.message ||
          error
      );

      return this.createFallbackPlan(
        params,
        'error',
        error?.message
      );
    }
  }

  // ============================================================
  // RECOMMEND
  // ============================================================

  async recommend(
    params = {}
  ) {
    console.log(
      '📤 Gemini recommend() called'
    );

    console.log(
      `📌 Model: ${this.modelName}`
    );

    const {
      query = '',

      limit = 10,

      existingListings = [],
    } = params;

    if (
      !this.isReady()
    ) {
      return this.createFallbackRecommendations(
        params,
        'not_ready'
      );
    }

    try {
      const listingContext =
        existingListings
          .map(
            (
              listing,
              index
            ) =>
              `${index + 1}. ${
                listing.title ||
                'Untitled'
              } - ${
                listing.location ||
                'Rwanda'
              } - $${listing.price ?? 0} - ${
                listing.rating ||
                'New'
              }⭐ - ${
                listing.category ||
                'General'
              } - ID: ${
                listing._id
              }`
          )
          .join('\n');

      const prompt = `
You are an AI travel assistant for Rwanda.

User Query:
"${query || 'Popular experiences in Rwanda'}"

Available Listings:
${
  listingContext ||
  'No listings available.'
}

Return ONLY a JSON array containing listing IDs.

Example:
["listing_id_1", "listing_id_2"]

IMPORTANT:
- Only use IDs from the provided listings.
- Never invent a listing ID.
- Return the most relevant listings first.
`.trim();

      const {
        contents,
        systemInstruction,
      } =
        this.convertMessagesToGeminiFormat([
          {
            role:
              'user',

            content:
              prompt,
          },
        ]);

      const config = {
        temperature:
          0.3,

        maxOutputTokens:
          500,

        systemInstruction:
          this.validateSystemPrompt(
            systemInstruction
          ),
      };

      const result =
        await this.executeWithRetry(
          () =>
            this.generateContent(
              contents,
              config,
              15000,
              'recommend'
            ),
          'recommend'
        );

      if (
        result?.fallback
      ) {
        return this.createFallbackRecommendations(
          params,
          result.reason,
          result.error
        );
      }

      const recommendedIds =
        this.parseRecommendedIds(
          result.text
        );

      const recommendations =
        existingListings
          .filter(
            listing =>
              recommendedIds.includes(
                String(
                  listing._id
                )
              )
          )
          .slice(
            0,
            Number(limit) || 10
          );

      return {
        success: true,

        recommendations:
          recommendations.length
            ? recommendations
            : existingListings.slice(
                0,
                Number(limit) || 10
              ),

        recommendedIds,

        provider:
          'gemini',

        model:
          this.modelName,

        timestamp:
          new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        '❌ Gemini Recommend Error:',
        error?.message ||
          error
      );

      return this.createFallbackRecommendations(
        params,
        'error',
        error?.message
      );
    }
  }

  // ============================================================
  // PLAN PARSER
  // ============================================================

  parsePlanResponse(
    text,
    params = {}
  ) {
    try {
      if (
        typeof text !==
          'string' ||
        !text.trim()
      ) {
        return null;
      }

      const jsonString =
        text
          .replace(
            /```json/gi,
            ''
          )
          .replace(
            /```/g,
            ''
          )
          .trim();

      const start =
        jsonString.indexOf(
          '{'
        );

      const end =
        jsonString.lastIndexOf(
          '}'
        );

      if (
        start === -1 ||
        end === -1 ||
        end <= start
      ) {
        return null;
      }

      const plan =
        JSON.parse(
          jsonString.substring(
            start,
            end + 1
          )
        );

      return {
        destination:
          params.destination ||
          'Rwanda',

        days:
          Math.max(
            1,
            Number(
              params.days
            ) || 3
          ),

        budget:
          Math.max(
            0,
            Number(
              params.budget
            ) || 500
          ),

        travelers:
          Math.max(
            1,
            Number(
              params.travelers
            ) || 1
          ),

        itinerary:
          Array.isArray(
            plan.itinerary
          )
            ? plan.itinerary
            : [],

        totalCost:
          Number(
            plan.totalCost
          ) ||
          Number(
            params.budget
          ) ||
          500,

        tips:
          Array.isArray(
            plan.tips
          )
            ? plan.tips
            : [],

        bestTime:
          plan.bestTime ||
          'June-September',

        weather:
          plan.weather ||
          'Mild temperatures, approximately 20-25°C',
      };
    } catch (error) {
      console.error(
        '❌ Parse plan error:',
        error?.message ||
          error
      );

      return null;
    }
  }

  // ============================================================
  // RECOMMENDATION PARSER
  // ============================================================

  parseRecommendedIds(
    text
  ) {
    try {
      if (
        typeof text !==
          'string' ||
        !text.trim()
      ) {
        return [];
      }

      const jsonString =
        text
          .replace(
            /```json/gi,
            ''
          )
          .replace(
            /```/g,
            ''
          )
          .trim();

      const start =
        jsonString.indexOf(
          '['
        );

      const end =
        jsonString.lastIndexOf(
          ']'
        );

      if (
        start === -1 ||
        end === -1 ||
        end <= start
      ) {
        return [];
      }

      const parsed =
        JSON.parse(
          jsonString.substring(
            start,
            end + 1
          )
        );

      return Array.isArray(
        parsed
      )
        ? parsed.map(String)
        : [];
    } catch (error) {
      console.error(
        '❌ Parse recommendations error:',
        error?.message ||
          error
      );

      return [];
    }
  }

  // ============================================================
  // FALLBACK PLAN
  // ============================================================

  createFallbackPlan(
    params = {},
    reason = 'fallback',
    error = null
  ) {
    const days =
      Math.max(
        1,
        Number(
          params.days
        ) || 3
      );

    const budget =
      Math.max(
        0,
        Number(
          params.budget
        ) || 500
      );

    const travelers =
      Math.max(
        1,
        Number(
          params.travelers
        ) || 1
      );

    const perDay =
      Math.round(
        budget / days
      );

    const destination =
      params.destination ||
      'Rwanda';

    return {
      success: true,

      plan: {
        destination,

        days,

        budget,

        travelers,

        itinerary:
          Array.from(
            {
              length: days,
            },
            (
              _,
              index
            ) => ({
              day:
                index + 1,

              title:
                `Day ${
                  index + 1
                } - Explore ${destination}`,

              activities: [
                'Visit local attractions',
                'Enjoy Rwandan cuisine',
                'Relax and explore',
              ],

              meals: [
                'Breakfast',
                'Lunch',
                'Dinner',
              ],

              accommodation:
                'Mid-range hotel',

              budget:
                perDay,
            })
          ),

        totalCost:
          budget,

        tips: [
          'Book popular tours in advance',
          'Pack comfortable walking shoes',
          'Stay hydrated',
        ],

        bestTime:
          'June-September (dry season)',

        weather:
          'Mild temperatures, approximately 20-25°C',
      },

      fallback: true,

      provider:
        'gemini',

      reason,

      error:
        error ||
        undefined,

      timestamp:
        new Date().toISOString(),
    };
  }

  // ============================================================
  // FALLBACK RECOMMENDATIONS
  // ============================================================

  createFallbackRecommendations(
    params = {},
    reason = 'fallback',
    error = null
  ) {
    const limit =
      Math.max(
        1,
        Number(
          params.limit
        ) || 10
      );

    const recommendations =
      Array.isArray(
        params.existingListings
      )
        ? params.existingListings.slice(
            0,
            limit
          )
        : [];

    return {
      success: true,

      recommendations,

      fallback: true,

      provider:
        'gemini',

      reason,

      error:
        error ||
        undefined,

      timestamp:
        new Date().toISOString(),
    };
  }
}

