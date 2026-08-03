// backend/src/services/exchangeRateService.js
// ✅ NEW - Exchange Rate Service for Multi-Currency Payment System

import ExchangeRate from "../models/ExchangeRate.js";
import Currency from "../models/Currency.js";
import { currencyConfig } from "../config/currency.config.js";
import axios from "axios";

// Try to import logger, fallback to console if not available
let logger;
try {
  const loggerModule = await import("../config/logger.js");
  logger = loggerModule.default || loggerModule;
} catch (error) {
  logger = {
    info: (...args) => console.log('ℹ️', ...args),
    error: (...args) => console.error('❌', ...args),
    warn: (...args) => console.warn('⚠️', ...args),
    debug: (...args) => console.debug('🔍', ...args),
  };
}

class ExchangeRateService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = currencyConfig.exchangeRate.cacheDuration * 1000 || 3600000; // 1 hour
    this.baseCurrency = currencyConfig.exchangeRate.baseCurrency || "RWF";
    this.provider = currencyConfig.exchangeRate.defaultProvider || "manual";
    this.apiKeys = currencyConfig.exchangeRate.apiKeys || {};
    this.autoUpdateEnabled = currencyConfig.exchangeRate.autoUpdateEnabled !== false;
    this.updateInterval = null;

    // Start auto-update if enabled
    if (this.autoUpdateEnabled) {
      this.startAutoUpdate();
    }

    logger.info(`✅ Exchange Rate Service initialized with base currency: ${this.baseCurrency}`);
    logger.info(`📊 Exchange rate provider: ${this.provider}`);
    logger.info(`🔄 Auto-update: ${this.autoUpdateEnabled ? 'enabled' : 'disabled'}`);
  }

  // =========================
  // GET EXCHANGE RATE
  // =========================

  /**
   * Get exchange rate between two currencies
   */
  async getRate(fromCurrency, toCurrency, options = {}) {
    const { forceRefresh = false, useCache = true } = options;

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // If same currency, return 1
    if (from === to) {
      return {
        rate: 1,
        fromCurrency: from,
        toCurrency: to,
        source: "same_currency",
        effectiveDate: new Date(),
      };
    }

    // Check cache
    const cacheKey = `rate_${from}_${to}`;
    if (useCache && !forceRefresh) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug(`📦 Using cached rate: ${from}/${to} = ${cached.rate}`);
        return cached;
      }
    }

    try {
      // Try to get from database
      let rate = await ExchangeRate.getLatest(from, to);

      if (rate) {
        const result = {
          rate: rate.rate,
          fromCurrency: from,
          toCurrency: to,
          source: rate.source || "database",
          effectiveDate: rate.effectiveDate,
          expiresAt: rate.expiresAt,
          rateId: rate._id,
          inverseRate: rate.inverseRate,
        };

        this.setCache(cacheKey, result);
        return result;
      }

      // Try inverse rate
      const inverseRate = await ExchangeRate.getLatest(to, from);
      if (inverseRate) {
        const result = {
          rate: 1 / inverseRate.rate,
          fromCurrency: from,
          toCurrency: to,
          source: "inverse_database",
          effectiveDate: inverseRate.effectiveDate,
          expiresAt: inverseRate.expiresAt,
          rateId: inverseRate._id,
          inverseRate: inverseRate.rate,
          isInverse: true,
        };

        this.setCache(cacheKey, result);
        return result;
      }

      // Try API if no database rate found
      if (this.provider !== "manual") {
        const apiRate = await this.fetchFromAPI(from, to);
        if (apiRate) {
          const savedRate = await ExchangeRate.setRate(
            from,
            to,
            apiRate.rate,
            {
              source: "api",
              sourceProvider: this.provider,
              metadata: apiRate.metadata || {},
            }
          );

          const result = {
            rate: savedRate.rate,
            fromCurrency: from,
            toCurrency: to,
            source: "api",
            effectiveDate: savedRate.effectiveDate,
            expiresAt: savedRate.expiresAt,
            rateId: savedRate._id,
          };

          this.setCache(cacheKey, result);
          return result;
        }
      }

      // Try fallback rates
      const fallbackRate = this.getFallbackRate(from, to);
      if (fallbackRate) {
        const savedRate = await ExchangeRate.setRate(
          from,
          to,
          fallbackRate,
          {
            source: "fallback",
            sourceProvider: "manual",
            metadata: { isFallback: true },
          }
        );

        const result = {
          rate: savedRate.rate,
          fromCurrency: from,
          toCurrency: to,
          source: "fallback",
          effectiveDate: savedRate.effectiveDate,
          expiresAt: savedRate.expiresAt,
          rateId: savedRate._id,
          isFallback: true,
        };

        this.setCache(cacheKey, result);
        return result;
      }

      // No rate found
      logger.warn(`⚠️ No exchange rate found for ${from}/${to}`);
      return null;
    } catch (error) {
      logger.error(`❌ Error getting exchange rate ${from}/${to}:`, error);
      return null;
    }
  }

  /**
   * Get multiple exchange rates at once
   */
  async getRates(fromCurrency, toCurrencies, options = {}) {
    const results = {};
    const promises = toCurrencies.map(async (to) => {
      const rate = await this.getRate(fromCurrency, to, options);
      if (rate) {
        results[to] = rate;
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get rate with conversion
   */
  async getRateWithConversion(amount, fromCurrency, toCurrency, options = {}) {
    const rate = await this.getRate(fromCurrency, toCurrency, options);
    
    if (!rate) {
      return {
        success: false,
        error: "Exchange rate not found",
        amount,
        fromCurrency,
        toCurrency,
      };
    }

    const convertedAmount = amount * rate.rate;

    return {
      success: true,
      rate: rate.rate,
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount,
      source: rate.source,
      effectiveDate: rate.effectiveDate,
      rateId: rate.rateId,
    };
  }

  // =========================
  // API PROVIDERS
  // =========================

  /**
   * Fetch rate from API provider
   */
  async fetchFromAPI(fromCurrency, toCurrency) {
    const provider = this.provider;
    const apiKey = this.apiKeys[provider];

    if (!apiKey) {
      logger.warn(`⚠️ No API key for provider: ${provider}`);
      return null;
    }

    try {
      switch (provider) {
        case "fixer":
          return await this.fetchFixer(fromCurrency, toCurrency, apiKey);
        case "openexchangerates":
          return await this.fetchOpenExchangeRates(fromCurrency, toCurrency, apiKey);
        case "currencyfreaks":
          return await this.fetchCurrencyFreaks(fromCurrency, toCurrency, apiKey);
        case "exchangerate-api":
          return await this.fetchExchangeRateApi(fromCurrency, toCurrency, apiKey);
        default:
          logger.warn(`⚠️ Unknown provider: ${provider}`);
          return null;
      }
    } catch (error) {
      logger.error(`❌ Error fetching from ${provider}:`, error);
      return null;
    }
  }

  /**
   * Fetch from Fixer.io API
   */
  async fetchFixer(fromCurrency, toCurrency, apiKey) {
    const response = await axios.get(
      `https://api.fixer.io/latest`,
      {
        params: {
          base: fromCurrency,
          symbols: toCurrency,
          access_key: apiKey,
        },
        timeout: 10000,
      }
    );

    if (response.data.success === false) {
      throw new Error(response.data.error?.info || "Fixer API error");
    }

    return {
      rate: response.data.rates[toCurrency],
      metadata: {
        provider: "fixer",
        timestamp: response.data.timestamp,
        date: response.data.date,
      },
    };
  }

  /**
   * Fetch from OpenExchangeRates API
   */
  async fetchOpenExchangeRates(fromCurrency, toCurrency, apiKey) {
    const response = await axios.get(
      `https://openexchangerates.org/api/latest.json`,
      {
        params: {
          app_id: apiKey,
          base: fromCurrency,
          symbols: toCurrency,
        },
        timeout: 10000,
      }
    );

    return {
      rate: response.data.rates[toCurrency],
      metadata: {
        provider: "openexchangerates",
        timestamp: response.data.timestamp,
        disclaimer: response.data.disclaimer,
      },
    };
  }

  /**
   * Fetch from CurrencyFreaks API
   */
  async fetchCurrencyFreaks(fromCurrency, toCurrency, apiKey) {
    const response = await axios.get(
      `https://api.currencyfreaks.com/latest`,
      {
        params: {
          apikey: apiKey,
          base: fromCurrency,
          symbols: toCurrency,
        },
        timeout: 10000,
      }
    );

    return {
      rate: response.data.rates[toCurrency],
      metadata: {
        provider: "currencyfreaks",
        date: response.data.date,
      },
    };
  }

  /**
   * Fetch from ExchangeRate-API
   */
  async fetchExchangeRateApi(fromCurrency, toCurrency, apiKey) {
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${fromCurrency}`,
      {
        params: {
          symbols: toCurrency,
        },
        timeout: 10000,
      }
    );

    if (response.data.result === "error") {
      throw new Error(response.data.error?.type || "ExchangeRate-API error");
    }

    return {
      rate: response.data.conversion_rates[toCurrency],
      metadata: {
        provider: "exchangerate-api",
        time_last_update_utc: response.data.time_last_update_utc,
        time_next_update_utc: response.data.time_next_update_utc,
      },
    };
  }

    // =========================
  // FALLBACK RATES
  // =========================

  /**
   * Get fallback rate from config
   */
  getFallbackRate(fromCurrency, toCurrency) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === this.baseCurrency) {
      return currencyConfig.exchangeRate.fallbackRates[to] || null;
    }

    if (to === this.baseCurrency) {
      const rate = currencyConfig.exchangeRate.fallbackRates[from];
      return rate ? 1 / rate : null;
    }

    const fromRate = currencyConfig.exchangeRate.fallbackRates[from];
    const toRate = currencyConfig.exchangeRate.fallbackRates[to];
    
    if (fromRate && toRate) {
      return toRate / fromRate;
    }

    return null;
  }

  /**
   * Get rate with fallback - called from getRate()
   */
  async getRateWithFallback(fromCurrency, toCurrency) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Try fallback rates
    const fallbackRate = this.getFallbackRate(from, to);
    if (fallbackRate && this.validateRate(fallbackRate)) {
      logger.info(`📊 Using fallback rate for ${from}/${to}: ${fallbackRate}`);
      
      try {
        const savedRate = await ExchangeRate.setRate(
          from,
          to,
          fallbackRate,
          {
            source: "system",  // ✅ FIXED: Use 'system' instead of 'fallback'
            sourceProvider: "manual",
            metadata: { 
              isFallback: true,
              fallbackReason: 'No API or database rate available',
              fallbackSource: 'config',
            },
          }
        );

        const result = {
          rate: savedRate.rate,
          fromCurrency: from,
          toCurrency: to,
          source: "system",
          effectiveDate: savedRate.effectiveDate,
          expiresAt: savedRate.expiresAt,
          rateId: savedRate._id,
          isFallback: true,
        };

        return result;
      } catch (saveError) {
        logger.error(`❌ Failed to save fallback rate: ${saveError.message}`);
        // Return rate without saving
        return {
          rate: fallbackRate,
          fromCurrency: from,
          toCurrency: to,
          source: "fallback_unsaved",
          effectiveDate: new Date(),
          isFallback: true,
          isUnsaved: true,
        };
      }
    }

    // No rate found
    logger.warn(`⚠️ No exchange rate found for ${from}/${to}`);
    return null;
  }

  // =========================
  // BULK UPDATE
  // =========================

  /**
   * Update all exchange rates from API
   */
  async updateAllRates() {
    const activeCurrencies = await Currency.getActiveCurrencies();
    const rates = {};
    const base = this.baseCurrency;

    logger.info(`🔄 Updating exchange rates for ${activeCurrencies.length} currencies`);

    for (const currency of activeCurrencies) {
      if (currency.code === base) continue;

      try {
        const rate = await this.fetchFromAPI(base, currency.code);
        if (rate) {
          rates[currency.code] = rate.rate;
          
          await ExchangeRate.setRate(
            base,
            currency.code,
            rate.rate,
            {
              source: "api",
              sourceProvider: this.provider,
              metadata: rate.metadata || {},
            }
          );

          await Currency.findOneAndUpdate(
            { code: currency.code },
            {
              exchangeRate: rate.rate,
              exchangeRateUpdatedAt: new Date(),
              exchangeRateSource: "api",
            }
          );

          logger.info(`✅ Updated ${currency.code}: ${rate.rate}`);
        }
      } catch (error) {
        logger.error(`❌ Failed to update ${currency.code}:`, error);
      }
    }

    this.clearCache();
    return rates;
  }

  // =========================
  // AUTO-UPDATE
  // =========================

  /**
   * Start auto-update interval
   */
  startAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    const interval = currencyConfig.exchangeRate.autoUpdateInterval * 60 * 1000 || 3600000;

    this.updateInterval = setInterval(() => {
      this.updateAllRates().catch(error => {
        logger.error("❌ Auto-update failed:", error);
      });
    }, interval);

    logger.info(`🔄 Auto-update scheduled every ${interval / 60000} minutes`);
  }

  /**
   * Stop auto-update
   */
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info("🔄 Auto-update stopped");
    }
  }

  // =========================
  // RATE MANAGEMENT
  // =========================

  /**
   * Set manual exchange rate
   */
  async setManualRate(fromCurrency, toCurrency, rate, createdBy = null) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (rate <= 0) {
      throw new Error("Rate must be greater than 0");
    }

    const savedRate = await ExchangeRate.setRate(
      from,
      to,
      rate,
      {
        source: "manual",
        sourceProvider: "manual",
        createdBy,
        metadata: { manuallySet: true },
      }
    );

    if (from === this.baseCurrency) {
      await Currency.findOneAndUpdate(
        { code: to },
        {
          exchangeRate: rate,
          exchangeRateUpdatedAt: new Date(),
          exchangeRateSource: "manual",
        }
      );
    }

    this.clearCache();
    return savedRate;
  }

  /**
   * Get rate history
   */
  async getRateHistory(fromCurrency, toCurrency, options = {}) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    return ExchangeRate.getHistory(from, to, options);
  }

  /**
   * Get rate statistics
   */
  async getRateStats() {
    const stats = await ExchangeRate.getStats();
    
    const latestRates = await ExchangeRate.aggregate([
      { $sort: { effectiveDate: -1 } },
      { $group: { _id: "$fromCurrency", rate: { $first: "$$ROOT" } } },
    ]);

    return {
      ...stats,
      latestRates: latestRates.map(r => ({
        fromCurrency: r.rate.fromCurrency,
        toCurrency: r.rate.toCurrency,
        rate: r.rate.rate,
        effectiveDate: r.rate.effectiveDate,
      })),
    };
  }

  /**
   * Cleanup old rates
   */
  async cleanupOldRates(daysToKeep = 90) {
    const count = await ExchangeRate.cleanup(daysToKeep);
    logger.info(`🧹 Cleaned up ${count} old exchange rates`);
    return count;
  }

  // =========================
  // CACHE HELPERS
  // =========================

  getFromCache(key) {
    if (!this.cache.has(key)) return null;
    
    const cached = this.cache.get(key);
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.cache.clear();
  }

  clearCacheKey(key) {
    this.cache.delete(key);
  }

  // =========================
  // VALIDATION
  // =========================

  /**
   * Validate exchange rate
   */
  validateRate(rate) {
    if (!rate || rate <= 0) return false;
    if (!isFinite(rate)) return false;
    if (rate.toString().includes('e')) return false;
    return true;
  }

  /**
   * Check if rate is fresh (not stale)
   */
  isRateFresh(rate) {
    if (!rate || !rate.effectiveDate) return false;
    
    const now = new Date();
    const diff = now - new Date(rate.effectiveDate);
    const staleThreshold = currencyConfig.exchangeRate.staleThresholdHours * 60 * 60 * 1000;
    
    return diff < staleThreshold;
  }

  /**
   * Check if rate is expired
   */
  isRateExpired(rate) {
    if (!rate || !rate.expiresAt) return false;
    return new Date() > new Date(rate.expiresAt);
  }

  // =========================
  // HEALTH CHECK
  // =========================

  /**
   * Check exchange rate service health
   */
  async healthCheck() {
    try {
      const base = this.baseCurrency;
      const testCurrency = "USD";

      const rate = await this.getRate(base, testCurrency, { forceRefresh: true });

      return {
        status: rate ? "healthy" : "degraded",
        baseCurrency: base,
        provider: this.provider,
        autoUpdateEnabled: this.autoUpdateEnabled,
        latestRate: rate ? {
          from: base,
          to: testCurrency,
          rate: rate.rate,
          source: rate.source,
          effectiveDate: rate.effectiveDate,
        } : null,
        cacheSize: this.cache.size,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        baseCurrency: this.baseCurrency,
        provider: this.provider,
      };
    }
  }
}

// =========================
// ✅ SINGLETON EXPORT
// =========================

const exchangeRateService = new ExchangeRateService();
export default exchangeRateService;