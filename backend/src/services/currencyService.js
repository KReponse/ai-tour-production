// backend/src/services/currencyService.js

import Currency from "../models/Currency.js";
import ExchangeRate from "../models/ExchangeRate.js";
import exchangeRateService from "./exchangeRateService.js";
import { currencyConfig } from "../config/currency.config.js";

// ==========================================================
// HELPERS
// ==========================================================

const SAFE_NUMBER = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeCode = (currency) => {
  if (currency === null || currency === undefined) {
    return null;
  }

  const code = String(currency).trim().toUpperCase();

  return code || null;
};

const getNestedValue = (object, paths = []) => {
  for (const path of paths) {
    let current = object;

    for (const key of path.split(".")) {
      if (current === null || current === undefined) {
        current = undefined;
        break;
      }

      current = current[key];
    }

    if (current !== undefined && current !== null) {
      return current;
    }
  }

  return undefined;
};

const getConfiguredCurrency = (code) => {
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode || !currencyConfig) {
    return null;
  }

  if (Array.isArray(currencyConfig)) {
    return (
      currencyConfig.find(
        (item) =>
          normalizeCode(
            item?.code ||
              item?.currency ||
              item?.currencyCode
          ) === normalizedCode
      ) || null
    );
  }

  if (currencyConfig.currencies) {
    if (Array.isArray(currencyConfig.currencies)) {
      return (
        currencyConfig.currencies.find(
          (item) =>
            normalizeCode(
              item?.code ||
                item?.currency ||
                item?.currencyCode
            ) === normalizedCode
        ) || null
      );
    }

    if (currencyConfig.currencies[normalizedCode]) {
      return currencyConfig.currencies[normalizedCode];
    }
  }

  if (currencyConfig[normalizedCode]) {
    return currencyConfig[normalizedCode];
  }

  return null;
};

const getConfiguredDefaultCurrency = () => {
  const configured = getNestedValue(currencyConfig, [
    "defaultCurrency",
    "defaultCurrencyCode",
    "baseCurrency",
    "primaryCurrency",
  ]);

  return normalizeCode(configured) || "RWF";
};

// ==========================================================
// SERVICE
// ==========================================================

class CurrencyService {
  constructor() {
    this.baseCurrency = "RWF";

    this.cache = new Map();

    // 5 minutes
    this.cacheDuration = 5 * 60 * 1000;

    // Fallback rates used only when DB/provider
    // exchange-rate data is unavailable.
    this.defaultRates = {
      RWF: 1,
      USD: 1450,
      EUR: 1550,
      GBP: 1800,
      KES: 11.2,
      UGX: 0.39,
      TZS: 0.39,
      BIF: 0.42,
      CDF: 0.52,
      ZAR: 82,
      AED: 395,
      CHF: 1750,
      CAD: 1050,
      AUD: 950,
      JPY: 9.8,
      CNY: 200,
      INR: 17.2,
      NGN: 0.95,
      GHS: 85,
      XAF: 2.35,
    };

    console.log("💱 CurrencyService initialized");
    console.log(`💱 Base currency: ${this.baseCurrency}`);
  }

  // ========================================================
  // NORMALIZATION
  // ========================================================

  normalizeCurrency(currency) {
    return normalizeCode(currency);
  }

  isSameCurrency(currencyA, currencyB) {
    return (
      this.normalizeCurrency(currencyA) ===
      this.normalizeCurrency(currencyB)
    );
  }

  roundAmount(amount, decimals = 2) {
    const numericAmount = SAFE_NUMBER(amount, 0);
    const factor = 10 ** decimals;

    return (
      Math.round(
        (numericAmount + Number.EPSILON) * factor
      ) / factor
    );
  }

  isValidPositiveRate(rate) {
    return (
      Number.isFinite(Number(rate)) &&
      Number(rate) > 0
    );
  }

  // ========================================================
  // CACHE
  // ========================================================

  getCacheKey(fromCurrency, toCurrency) {
    const from = this.normalizeCurrency(fromCurrency);
    const to = this.normalizeCurrency(toCurrency);

    return `${from}:${to}`;
  }

  getCachedRate(fromCurrency, toCurrency) {
    const key = this.getCacheKey(
      fromCurrency,
      toCurrency
    );

    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (
      Date.now() - entry.timestamp >
      this.cacheDuration
    ) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  setCachedRate(
    fromCurrency,
    toCurrency,
    value
  ) {
    const key = this.getCacheKey(
      fromCurrency,
      toCurrency
    );

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // ========================================================
  // CURRENCY DATABASE
  // ========================================================

  async getCurrency(code) {
    const normalizedCode =
      this.normalizeCurrency(code);

    if (!normalizedCode) {
      return null;
    }

    try {
      const currency = await Currency.findOne({
        code: normalizedCode,
      }).lean();

      if (currency) {
        return currency;
      }
    } catch (error) {
      console.error(
        `❌ Failed to load currency ${normalizedCode}:`,
        error.message
      );
    }

    // Fallback to configured currency.
    const configured =
      getConfiguredCurrency(normalizedCode);

    if (configured) {
      return {
        code: normalizedCode,
        ...configured,
      };
    }

    // Fallback currency is considered active
    // only when we explicitly know its rate.
    if (
      Object.prototype.hasOwnProperty.call(
        this.defaultRates,
        normalizedCode
      )
    ) {
      return {
        code: normalizedCode,
        name: normalizedCode,
        symbol: normalizedCode,
        isActive: true,
      };
    }

    return null;
  }

  async getCurrencyByCode(code) {
    return this.getCurrency(code);
  }

  // ========================================================
  // FIX:
  // currencyController.js expects this method.
  // ========================================================

  async isCurrencyActive(currencyCode) {
    const code =
      this.normalizeCurrency(currencyCode);

    if (!code) {
      return false;
    }

    try {
      // If currency exists in DB, DB status is authoritative.
      const currency = await Currency.findOne({
        code,
      }).lean();

      if (currency) {
        return currency.isActive !== false;
      }
    } catch (error) {
      console.warn(
        `⚠️ Failed checking currency status for ${code}:`,
        error.message
      );
    }

    // Configured currency fallback.
    const configured =
      getConfiguredCurrency(code);

    if (configured) {
      return configured.isActive !== false;
    }

    // Fallback currency list.
    if (
      Object.prototype.hasOwnProperty.call(
        this.defaultRates,
        code
      )
    ) {
      return true;
    }

    return false;
  }

  async getActiveCurrencies() {
    try {
      const currencies =
        await Currency.find({
          isActive: true,
        })
          .sort({
            code: 1,
          })
          .lean();

      if (currencies?.length) {
        return currencies;
      }
    } catch (error) {
      console.error(
        "❌ Failed to load active currencies:",
        error.message
      );
    }

    // DB can be empty during initial setup.
    const configuredCodes =
      Object.keys(this.defaultRates);

    return configuredCodes.map((code) => {
      const configured =
        getConfiguredCurrency(code);

      return {
        code,
        name:
          configured?.name ||
          configured?.displayName ||
          code,
        symbol:
          configured?.symbol ||
          code,
        isActive: true,
        decimalDigits:
          configured?.decimalDigits ??
          configured?.decimals ??
          2,
      };
    });
  }

  async getSupportedCurrencies() {
    return this.getActiveCurrencies();
  }

  // ========================================================
  // DEFAULT CURRENCY
  // ========================================================

  async getDefaultCurrencyCode() {
    const configuredDefault =
      getConfiguredDefaultCurrency();

    try {
      const configuredCurrency =
        await Currency.findOne({
          code: configuredDefault,
          isActive: true,
        }).lean();

      if (configuredCurrency?.code) {
        return this.normalizeCurrency(
          configuredCurrency.code
        );
      }
    } catch (error) {
      console.error(
        "❌ Failed to read default currency from database:",
        error.message
      );
    }

    return (
      configuredDefault ||
      this.baseCurrency
    );
  }

  // Backward-compatible API expected by controller.
  async getDefaultCurrency() {
    return this.getDefaultCurrencyCode();
  }

  // ========================================================
  // FALLBACK RATES
  // ========================================================

  getFallbackRate(currency) {
    const normalizedCurrency =
      this.normalizeCurrency(currency);

    if (!normalizedCurrency) {
      return null;
    }

    if (
      normalizedCurrency ===
      this.baseCurrency
    ) {
      return 1;
    }

    const configuredCurrency =
      getConfiguredCurrency(
        normalizedCurrency
      );

    const configuredRate =
      getNestedValue(
        configuredCurrency,
        [
          "rate",
          "exchangeRate",
          "rateToRwf",
          "rwfRate",
          "value",
        ]
      );

    if (
      this.isValidPositiveRate(
        configuredRate
      )
    ) {
      return SAFE_NUMBER(configuredRate);
    }

    const fallback =
      this.defaultRates[
        normalizedCurrency
      ];

    if (
      this.isValidPositiveRate(fallback)
    ) {
      return fallback;
    }

    return null;
  }

  // ========================================================
  // EXCHANGE RATE
  // ========================================================

  async getExchangeRate(
    fromCurrency,
    toCurrency
  ) {
    const from =
      this.normalizeCurrency(fromCurrency);
    const to =
      this.normalizeCurrency(toCurrency);

    if (!from || !to) {
      throw new Error(
        "Both source and target currencies are required"
      );
    }

    if (from === to) {
      return 1;
    }

    const cached =
      this.getCachedRate(from, to);

    if (cached !== null) {
      return cached;
    }

    // ------------------------------------------------------
    // 1. ExchangeRateService
    // ------------------------------------------------------

    try {
      if (
        exchangeRateService &&
        typeof exchangeRateService.getRate ===
          "function"
      ) {
        const serviceRate =
          await exchangeRateService.getRate(
            from,
            to
          );

        const numericRate =
          typeof serviceRate === "object"
            ? getNestedValue(
                serviceRate,
                [
                  "rate",
                  "exchangeRate",
                  "value",
                ]
              )
            : serviceRate;

        if (
          this.isValidPositiveRate(
            numericRate
          )
        ) {
          const rate =
            SAFE_NUMBER(numericRate);

          this.setCachedRate(
            from,
            to,
            rate
          );

          return rate;
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ ExchangeRateService.getRate failed (${from} → ${to}):`,
        error.message
      );
    }

    // ------------------------------------------------------
    // 2. Direct ExchangeRate DB
    // ------------------------------------------------------

    try {
      const directRate =
        await ExchangeRate.findOne({
          baseCurrency: from,
          quoteCurrency: to,
          isActive: {
            $ne: false,
          },
        })
          .sort({
            effectiveAt: -1,
            updatedAt: -1,
          })
          .lean();

      const numericRate =
        getNestedValue(
          directRate,
          [
            "rate",
            "exchangeRate",
            "value",
          ]
        );

      if (
        this.isValidPositiveRate(
          numericRate
        )
      ) {
        const rate =
          SAFE_NUMBER(numericRate);

        this.setCachedRate(
          from,
          to,
          rate
        );

        return rate;
      }
    } catch (error) {
      console.warn(
        `⚠️ Direct ExchangeRate lookup failed (${from} → ${to}):`,
        error.message
      );
    }

    // ------------------------------------------------------
    // 3. Fallback via RWF
    // ------------------------------------------------------

    const fromToBase =
      this.getFallbackRate(from);

    const toToBase =
      this.getFallbackRate(to);

    if (
      this.isValidPositiveRate(
        fromToBase
      ) &&
      this.isValidPositiveRate(
        toToBase
      )
    ) {
      const rate =
        fromToBase / toToBase;

      if (
        this.isValidPositiveRate(rate)
      ) {
        this.setCachedRate(
          from,
          to,
          rate
        );

        return rate;
      }
    }

    throw new Error(
      `Exchange rate unavailable for ${from} → ${to}`
    );
  }

  // ========================================================
  // CONVERSION
  // ========================================================

  async convertAmount(
    amount,
    fromCurrency,
    toCurrency,
    options = {}
  ) {
    const numericAmount =
      SAFE_NUMBER(amount, 0);

    if (numericAmount < 0) {
      throw new Error(
        "Amount cannot be negative"
      );
    }

    const from =
      this.normalizeCurrency(fromCurrency);

    const to =
      this.normalizeCurrency(toCurrency);

    if (!from || !to) {
      throw new Error(
        "Both source and target currencies are required"
      );
    }

    if (from === to) {
      return this.roundAmount(
        numericAmount,
        Number.isInteger(options.decimals)
          ? options.decimals
          : 2
      );
    }

    const rate =
      await this.getExchangeRate(
        from,
        to
      );

    const converted =
      numericAmount * rate;

    const decimals =
      Number.isInteger(options.decimals)
        ? options.decimals
        : 2;

    return this.roundAmount(
      converted,
      decimals
    );
  }

  async convertCurrency(
    amount,
    fromCurrency,
    toCurrency,
    options = {}
  ) {
    return this.convertAmount(
      amount,
      fromCurrency,
      toCurrency,
      options
    );
  }

  async getRateWithConversion(
    amount,
    fromCurrency,
    toCurrency,
    options = {}
  ) {
    const rate =
      await this.getExchangeRate(
        fromCurrency,
        toCurrency
      );

    const decimals =
      Number.isInteger(options.decimals)
        ? options.decimals
        : 2;

    const convertedAmount =
      this.roundAmount(
        SAFE_NUMBER(amount, 0) *
          rate,
        decimals
      );

    return {
      amount:
        SAFE_NUMBER(amount, 0),

      fromCurrency:
        this.normalizeCurrency(
          fromCurrency
        ),

      toCurrency:
        this.normalizeCurrency(
          toCurrency
        ),

      rate,

      convertedAmount,
    };
  }

  // ========================================================
  // FORMATTING
  // ========================================================

  async formatAmount(
    amount,
    currency,
    options = {}
  ) {
    const code =
      this.normalizeCurrency(currency);

    if (!code) {
      return String(amount);
    }

    const configuredCurrency =
      await this.getCurrency(code);

    const decimals =
      options.decimals ??
      configuredCurrency?.decimalDigits ??
      configuredCurrency?.decimals ??
      2;

    const symbol =
      options.symbol ||
      configuredCurrency?.symbol ||
      code;

    const roundedAmount =
      this.roundAmount(
        amount,
        Number(decimals)
      );

    if (options.numberOnly) {
      return roundedAmount.toFixed(
        Number(decimals)
      );
    }

    return `${symbol} ${roundedAmount.toFixed(
      Number(decimals)
    )}`;
  }

  // ========================================================
  // PLATFORM COMMISSION
  // ========================================================

  calculatePlatformFee(amount) {
    const numericAmount =
      SAFE_NUMBER(amount, 0);

    // AI Tour MVP:
    // Platform commission = 0%.
    // Provider receives 100%.
    return {
      percentage: 0,
      fee: 0,
      grossAmount:
        this.roundAmount(
          numericAmount
        ),
      providerAmount:
        this.roundAmount(
          numericAmount
        ),
    };
  }

  calculateProviderAmount(amount) {
    const numericAmount =
      SAFE_NUMBER(amount, 0);

    // 0% platform commission.
    return this.roundAmount(
      numericAmount
    );
  }

  // ========================================================
  // VALIDATION
  // ========================================================

  validateAmount(amount) {
    const numericAmount =
      Number(amount);

    return (
      Number.isFinite(
        numericAmount
      ) &&
      numericAmount >= 0
    );
  }

  validateCurrency(currency) {
    const normalized =
      this.normalizeCurrency(currency);

    return Boolean(
      normalized &&
        /^[A-Z]{3}$/.test(normalized)
    );
  }

  async validateCurrencyPair(
    fromCurrency,
    toCurrency
  ) {
    const from =
      this.normalizeCurrency(
        fromCurrency
      );

    const to =
      this.normalizeCurrency(
        toCurrency
      );

    if (!this.validateCurrency(from)) {
      return {
        valid: false,
        reason:
          `Invalid source currency: ${fromCurrency}`,
      };
    }

    if (!this.validateCurrency(to)) {
      return {
        valid: false,
        reason:
          `Invalid target currency: ${toCurrency}`,
      };
    }

    const fromActive =
      await this.isCurrencyActive(
        from
      );

    const toActive =
      await this.isCurrencyActive(
        to
      );

    if (!fromActive) {
      return {
        valid: false,
        reason:
          `Source currency ${from} is not active`,
      };
    }

    if (!toActive) {
      return {
        valid: false,
        reason:
          `Target currency ${to} is not active`,
      };
    }

    if (from === to) {
      return {
        valid: true,
        rate: 1,
      };
    }

    try {
      const rate =
        await this.getExchangeRate(
          from,
          to
        );

      return {
        valid: true,
        rate,
      };
    } catch (error) {
      return {
        valid: false,
        reason: error.message,
      };
    }
  }

  // ========================================================
  // CURRENCY ADMINISTRATION
  // ========================================================

  async createCurrency(data) {
    const code =
      this.normalizeCurrency(
        data?.code
      );

    if (!code) {
      throw new Error(
        "Currency code is required"
      );
    }

    if (!this.validateCurrency(code)) {
      throw new Error(
        `Invalid currency code: ${code}`
      );
    }

    const existing =
      await Currency.findOne({
        code,
      });

    if (existing) {
      return existing;
    }

    return Currency.create({
      ...data,
      code,
      isActive:
        data?.isActive !== undefined
          ? Boolean(data.isActive)
          : true,
    });
  }

  async updateCurrency(
    code,
    updates = {}
  ) {
    const normalizedCode =
      this.normalizeCurrency(code);

    if (!normalizedCode) {
      throw new Error(
        "Currency code is required"
      );
    }

    const sanitizedUpdates = {
      ...updates,
      code: normalizedCode,
    };

    const result =
      await Currency.findOneAndUpdate(
        {
          code: normalizedCode,
        },
        sanitizedUpdates,
        {
          new: true,
          runValidators: true,
        }
      );

    this.clearCache();

    return result;
  }

  async activateCurrency(code) {
    return this.updateCurrency(code, {
      isActive: true,
    });
  }

  async deactivateCurrency(code) {
    return this.updateCurrency(code, {
      isActive: false,
    });
  }

  async deleteCurrency(code) {
    const normalizedCode =
      this.normalizeCurrency(code);

    if (
      normalizedCode ===
      this.baseCurrency
    ) {
      throw new Error(
        "Base currency cannot be deleted"
      );
    }

    const result =
      await Currency.findOneAndDelete({
        code: normalizedCode,
      });

    this.clearCache();

    return result;
  }

  // ========================================================
  // EXCHANGE RATE ADMINISTRATION
  // ========================================================

  async createExchangeRate(data) {
    const baseCurrency =
      this.normalizeCurrency(
        data?.baseCurrency ||
          data?.fromCurrency
      );

    const quoteCurrency =
      this.normalizeCurrency(
        data?.quoteCurrency ||
          data?.toCurrency
      );

    const rate =
      SAFE_NUMBER(
        data?.rate ??
          data?.exchangeRate ??
          data?.value,
        0
      );

    if (
      !baseCurrency ||
      !quoteCurrency
    ) {
      throw new Error(
        "baseCurrency and quoteCurrency are required"
      );
    }

    if (
      !this.isValidPositiveRate(rate)
    ) {
      throw new Error(
        "Exchange rate must be greater than zero"
      );
    }

    const result =
      await ExchangeRate.create({
        ...data,
        baseCurrency,
        quoteCurrency,
        rate,
      });

    this.clearCache();

    return result;
  }

  async updateExchangeRate(
    id,
    updates = {}
  ) {
    const sanitizedUpdates = {
      ...updates,
    };

    if (updates.baseCurrency) {
      sanitizedUpdates.baseCurrency =
        this.normalizeCurrency(
          updates.baseCurrency
        );
    }

    if (updates.quoteCurrency) {
      sanitizedUpdates.quoteCurrency =
        this.normalizeCurrency(
          updates.quoteCurrency
        );
    }

    if (
      updates.rate !== undefined ||
      updates.exchangeRate !==
        undefined
    ) {
      sanitizedUpdates.rate =
        SAFE_NUMBER(
          updates.rate ??
            updates.exchangeRate,
          0
        );
    }

    const result =
      await ExchangeRate.findByIdAndUpdate(
        id,
        sanitizedUpdates,
        {
          new: true,
          runValidators: true,
        }
      );

    this.clearCache();

    return result;
  }

  async getExchangeRates(
    filters = {}
  ) {
    const query = {};

    if (filters.baseCurrency) {
      query.baseCurrency =
        this.normalizeCurrency(
          filters.baseCurrency
        );
    }

    if (filters.quoteCurrency) {
      query.quoteCurrency =
        this.normalizeCurrency(
          filters.quoteCurrency
        );
    }

    if (
      filters.isActive !== undefined
    ) {
      query.isActive = Boolean(
        filters.isActive
      );
    }

    return ExchangeRate.find(query)
      .sort({
        updatedAt: -1,
      })
      .lean();
  }

  // ========================================================
  // PREVIEW
  // ========================================================

  async previewConversion(
    amount,
    fromCurrency,
    toCurrency
  ) {
    const result =
      await this.getRateWithConversion(
        amount,
        fromCurrency,
        toCurrency
      );

    return {
      ...result,

      // AI Tour MVP commission = 0%.
      platformFee: 0,

      providerAmount:
        result.convertedAmount,
    };
  }

  // ========================================================
  // HEALTH
  // ========================================================

  async healthCheck() {
    const result = {
      service: "CurrencyService",
      healthy: true,
      baseCurrency:
        this.baseCurrency,
      cacheEntries:
        this.cache.size,
      timestamp:
        new Date().toISOString(),
    };

    try {
      await this.getActiveCurrencies();

      result.database =
        "available";
    } catch (error) {
      result.database =
        "unavailable";

      result.healthy = false;

      result.error =
        error.message;
    }

    return result;
  }

  // ========================================================
  // CLEANUP
  // ========================================================

  cleanupCache() {
    const now = Date.now();

    for (const [
      key,
      entry,
    ] of this.cache.entries()) {
      if (
        now - entry.timestamp >
        this.cacheDuration
      ) {
        this.cache.delete(key);
      }
    }
  }
}

// ==========================================================
// SINGLETON
// ==========================================================

const currencyService =
  new CurrencyService();

// Default import compatibility.
export default currencyService;

// Named import compatibility.
export { currencyService };