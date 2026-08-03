// backend/src/services/currencyService.js
// ✅ COMPLETE FIXED - All methods properly defined and exported

import Currency from "../models/Currency.js";
import ExchangeRate from "../models/ExchangeRate.js";
import { currencyConfig, getCurrencyConfig, getPlatformFee } from "../config/currency.config.js";

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

class CurrencyService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour in milliseconds
    this.baseCurrency = currencyConfig.exchangeRate.baseCurrency || "RWF";
    logger.info(`✅ Currency Service initialized with base currency: ${this.baseCurrency}`);
  }

  // =========================
  // ✅ GET ACTIVE CURRENCIES
  // =========================

  async getActiveCurrencies() {
    const cacheKey = "active_currencies";
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let currencies = await Currency.find({ isActive: true })
        .sort({ isDefault: -1, code: 1 })
        .lean();

      // If no currencies in DB, seed defaults
      if (currencies.length === 0) {
        await Currency.seedDefaults();
        currencies = await Currency.find({ isActive: true })
          .sort({ isDefault: -1, code: 1 })
          .lean();
      }

      this.setCache(cacheKey, currencies);
      return currencies;
    } catch (error) {
      logger.error("Error fetching active currencies:", error);
      // Fallback to config
      return Object.values(currencyConfig.supportedCurrencies).filter(c => c.isActive !== false);
    }
  }

  // =========================
  // ✅ GET DEFAULT CURRENCY
  // =========================

  async getDefaultCurrency() {
    const cacheKey = "default_currency";
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let currency = await Currency.findOne({ isDefault: true, isActive: true }).lean();
      
      if (!currency) {
        currency = await Currency.findOne({ isBaseCurrency: true, isActive: true }).lean();
      }
      
      if (!currency) {
        currency = await Currency.findOne({ isActive: true }).lean();
      }

      if (!currency) {
        const defaultCode = currencyConfig.payment.defaultCurrency || "RWF";
        currency = this.getCurrencyByCode(defaultCode);
      }

      this.setCache(cacheKey, currency);
      return currency;
    } catch (error) {
      logger.error("Error fetching default currency:", error);
      const defaultCode = currencyConfig.payment.defaultCurrency || "RWF";
      return this.getCurrencyByCode(defaultCode);
    }
  }

  // =========================
  // ✅ GET CURRENCY BY CODE
  // =========================

  async getCurrencyByCode(code) {
    if (!code) return null;

    const upperCode = code.toUpperCase();
    const cacheKey = `currency_${upperCode}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let currency = await Currency.findOne({ code: upperCode, isActive: true }).lean();
      
      if (!currency) {
        const configCurrency = getCurrencyConfig(upperCode);
        if (configCurrency) {
          currency = {
            code: upperCode,
            symbol: configCurrency.symbol,
            name: configCurrency.name,
            decimalPlaces: configCurrency.decimalPlaces,
            isDefault: configCurrency.isDefault || false,
            isBaseCurrency: configCurrency.isBase || false,
            isActive: true,
            exchangeRate: 1,
            platformFeePercentage: getPlatformFee(upperCode),
            paymentMethods: configCurrency.paymentMethods || [],
            settlementAllowed: configCurrency.settlementAllowed !== false,
            format: {
              locale: currencyConfig.display.format[upperCode]?.locale || "en-US",
              currencyDisplay: "symbol",
            },
          };
        }
      }

      if (currency) {
        this.setCache(cacheKey, currency);
      }
      return currency;
    } catch (error) {
      logger.error(`Error fetching currency ${code}:`, error);
      const configCurrency = getCurrencyConfig(upperCode);
      return configCurrency ? {
        code: upperCode,
        symbol: configCurrency.symbol,
        name: configCurrency.name,
        decimalPlaces: configCurrency.decimalPlaces,
        isDefault: configCurrency.isDefault || false,
        isBaseCurrency: configCurrency.isBase || false,
        isActive: true,
        exchangeRate: 1,
        platformFeePercentage: getPlatformFee(upperCode),
        paymentMethods: configCurrency.paymentMethods || [],
        settlementAllowed: configCurrency.settlementAllowed !== false,
      } : null;
    }
  }

  // =========================
  // ✅ CHECK IF CURRENCY IS ACTIVE
  // =========================

  async isCurrencyActive(code) {
    if (!code) return false;
    
    const upperCode = code.toUpperCase();
    try {
      const currency = await Currency.findOne({ code: upperCode, isActive: true });
      return !!currency;
    } catch (error) {
      return !!currencyConfig.supportedCurrencies[upperCode];
    }
  }

  // =========================
  // ✅ GET EXCHANGE RATE
  // =========================

  async getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    const cacheKey = `rate_${from}_${to}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const rate = await ExchangeRate.getLatest(from, to);
      
      if (rate) {
        this.setCache(cacheKey, rate);
        return rate;
      }

      const inverseRate = await ExchangeRate.getLatest(to, from);
      if (inverseRate) {
        const rateObj = {
          _id: inverseRate._id,
          fromCurrency: from,
          toCurrency: to,
          rate: 1 / inverseRate.rate,
          inverseRate: inverseRate.rate,
          effectiveDate: inverseRate.effectiveDate,
          source: inverseRate.source,
          isInverse: true,
        };
        this.setCache(cacheKey, rateObj);
        return rateObj;
      }

      const fallbackRate = this.getFallbackRate(from, to);
      if (fallbackRate) {
        const rateObj = {
          fromCurrency: from,
          toCurrency: to,
          rate: fallbackRate,
          effectiveDate: new Date(),
          source: "fallback",
          isFallback: true,
        };
        this.setCache(cacheKey, rateObj);
        return rateObj;
      }

      return null;
    } catch (error) {
      logger.error(`Error getting exchange rate ${from}/${to}:`, error);
      return null;
    }
  }

  // =========================
  // ✅ CONVERT AMOUNT
  // =========================

  async convertAmount(amount, fromCurrency, toCurrency, options = {}) {
    if (!amount || amount === 0) return { amount: 0, rate: 1 };

    const {
      useInverse = false,
      round = true,
      decimalPlaces = null,
    } = options;

    if (fromCurrency === toCurrency) {
      return {
        amount: amount,
        rate: 1,
        fromCurrency,
        toCurrency,
        convertedAmount: amount,
      };
    }

    try {
      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      
      if (!rate) {
        const inverseRate = await this.getExchangeRate(toCurrency, fromCurrency);
        if (inverseRate) {
          const converted = useInverse 
            ? amount * inverseRate 
            : amount / inverseRate;
          
          return {
            amount: amount,
            rate: inverseRate,
            fromCurrency,
            toCurrency,
            convertedAmount: this.roundAmount(converted, decimalPlaces),
            isInverse: true,
          };
        }
        
        const fallbackRate = this.getFallbackRate(fromCurrency, toCurrency);
        if (fallbackRate) {
          const converted = amount * fallbackRate;
          return {
            amount: amount,
            rate: fallbackRate,
            fromCurrency,
            toCurrency,
            convertedAmount: this.roundAmount(converted, decimalPlaces),
            isFallback: true,
          };
        }

        return {
          amount: amount,
          rate: 1,
          fromCurrency,
          toCurrency,
          convertedAmount: amount,
          isFallback: true,
          error: "No exchange rate found",
        };
      }

      const converted = useInverse 
        ? amount / rate 
        : amount * rate;

      const result = {
        amount: amount,
        rate: rate,
        fromCurrency,
        toCurrency,
        convertedAmount: this.roundAmount(converted, decimalPlaces),
        rateId: rate._id,
        effectiveDate: rate.effectiveDate,
        source: rate.source,
      };

      if (rate.markUsed) {
        await rate.markUsed().catch(() => {});
      }

      return result;
    } catch (error) {
      logger.error("Currency conversion error:", error);
      return {
        amount: amount,
        rate: 1,
        fromCurrency,
        toCurrency,
        convertedAmount: amount,
        error: error.message,
      };
    }
  }

  // =========================
  // ✅ FORMAT AMOUNT
  // =========================

  formatAmount(amount, currency, options = {}) {
    if (!amount && amount !== 0) return "N/A";
    if (!currency) return amount?.toString() || "0";

    const {
      locale = null,
      currencyDisplay = "symbol",
      minimumFractionDigits = null,
      maximumFractionDigits = null,
    } = options;

    const currencyObj = typeof currency === "string" 
      ? this.getCurrencyByCode(currency) 
      : currency;

    if (!currencyObj) return amount.toString();

    const code = currencyObj.code || currency;
    const decimalPlaces = currencyObj.decimalPlaces || 2;
    const formatConfig = currencyConfig.display.format[code] || currencyConfig.display.format.RWF;

    try {
      const formatter = new Intl.NumberFormat(locale || formatConfig.locale || "en-US", {
        style: "currency",
        currency: code,
        currencyDisplay: currencyDisplay || formatConfig.currencyDisplay || "symbol",
        minimumFractionDigits: minimumFractionDigits !== null ? minimumFractionDigits : decimalPlaces,
        maximumFractionDigits: maximumFractionDigits !== null ? maximumFractionDigits : decimalPlaces,
      });

      return formatter.format(amount);
    } catch (error) {
      const symbol = currencyObj.symbol || code;
      const position = currencyConfig.display.symbolPosition[code] || "before";
      const formatted = amount.toFixed(decimalPlaces);
      
      if (position === "after") {
        return `${formatted} ${symbol}`;
      }
      return `${symbol}${formatted}`;
    }
  }

  // =========================
  // ✅ GET FALLBACK RATE
  // =========================

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

  // =========================
  // ✅ GET CURRENCY SYMBOL
  // =========================

  getCurrencySymbol(code) {
    if (!code) return "$";
    
    const upperCode = code.toUpperCase();
    const currency = this.getCurrencyByCode(upperCode);
    return currency?.symbol || code;
  }

  // =========================
  // ✅ GET DECIMAL PLACES
  // =========================

  getDecimalPlaces(code) {
    if (!code) return 2;
    
    const upperCode = code.toUpperCase();
    const currency = this.getCurrencyByCode(upperCode);
    return currency?.decimalPlaces || 2;
  }

  // =========================
  // ✅ ROUND AMOUNT
  // =========================

  roundAmount(amount, decimalPlaces = null) {
    if (!amount && amount !== 0) return 0;
    
    const places = decimalPlaces !== null ? decimalPlaces : 2;
    const factor = Math.pow(10, places);
    return Math.round(amount * factor) / factor;
  }

  // =========================
  // ✅ CALCULATE PLATFORM FEE
  // =========================

  async calculatePlatformFee(amount, currency) {
    const currencyObj = typeof currency === "string" 
      ? await this.getCurrencyByCode(currency) 
      : currency;

    const feePercentage = currencyObj?.platformFeePercentage || getPlatformFee(currency) || 10;
    const fee = (amount * feePercentage) / 100;
    
    return {
      percentage: feePercentage,
      amount: this.roundAmount(fee, currencyObj?.decimalPlaces),
      currency: currencyObj?.code || currency,
    };
  }

  // =========================
  // ✅ VALIDATE CURRENCY
  // =========================

  isValidCurrency(code) {
    if (!code) return false;
    const upperCode = code.toUpperCase();
    return !!currencyConfig.supportedCurrencies[upperCode];
  }

  // =========================
  // ✅ GET SUPPORTED CURRENCY CODES
  // =========================

  getSupportedCurrencyCodes() {
    return Object.keys(currencyConfig.supportedCurrencies);
  }

  // =========================
  // ✅ CACHE HELPERS
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
  // ✅ ADMIN METHODS
  // =========================

  async createOrUpdateCurrency(data) {
    const { code, ...updateData } = data;
    const upperCode = code.toUpperCase();

    let currency = await Currency.findOne({ code: upperCode });
    
    if (currency) {
      Object.assign(currency, updateData);
      await currency.save();
    } else {
      currency = new Currency({
        code: upperCode,
        ...updateData,
      });
      await currency.save();
    }

    this.clearCacheKey(`currency_${upperCode}`);
    this.clearCacheKey("active_currencies");
    this.clearCacheKey("default_currency");

    return currency;
  }

  async updateExchangeRate(code, rate, source = "admin") {
    const upperCode = code.toUpperCase();
    
    const currency = await Currency.findOne({ code: upperCode });
    if (!currency) {
      throw new Error(`Currency ${upperCode} not found`);
    }

    currency.exchangeRate = rate;
    currency.exchangeRateUpdatedAt = new Date();
    currency.exchangeRateSource = source;
    await currency.save();

    await ExchangeRate.setRate(
      this.baseCurrency,
      upperCode,
      rate,
      {
        source,
        sourceProvider: source,
        metadata: { updatedBy: "admin" },
      }
    );

    this.clearCacheKey(`currency_${upperCode}`);
    this.clearCacheKey(`rate_${this.baseCurrency}_${upperCode}`);

    return currency;
  }

  async getRateHistory(code, options = {}) {
    const upperCode = code.toUpperCase();
    return ExchangeRate.getHistory(this.baseCurrency, upperCode, options);
  }

  async getCurrencyStats() {
    const total = await Currency.countDocuments();
    const active = await Currency.countDocuments({ isActive: true });
    const defaultCurrency = await this.getDefaultCurrency();
    const baseCurrency = await Currency.findOne({ isBaseCurrency: true });

    return {
      total,
      active,
      defaultCurrency: defaultCurrency?.code || null,
      baseCurrency: baseCurrency?.code || this.baseCurrency,
      supportedCurrencies: await this.getActiveCurrencies(),
    };
  }
}

// =========================
// ✅ CREATE AND EXPORT SINGLETON
// =========================

const currencyService = new CurrencyService();
export default currencyService;