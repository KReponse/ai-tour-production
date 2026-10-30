// backend/src/services/exchangeRateService.js
//
// AI Tour Rwanda
// Exchange Rate Service
//
// IMPORTANT RATE CONVENTION
// -------------------------
// fallbackRates means:
//
//   1 USD = 1450 RWF
//   1 EUR = 1550 RWF
//   1 GBP = 1800 RWF
//
// Therefore:
//
//   USD -> RWF = 1450
//   RWF -> USD = 1 / 1450
//
// Never reverse this convention.
//
// This service is responsible for:
// - Reading exchange rates from MongoDB
// - Validating stored rates
// - Correct foreign/RWF conversion
// - Foreign-to-foreign conversion
// - API rate lookup
// - Safe fallback rates
// - Rate caching
// - Rate history
// - Manual rate updates
// - Health checks
//

import axios from "axios";
import ExchangeRate from "../models/ExchangeRate.js";

// ============================================================
// CONSTANTS
// ============================================================

const BASE_CURRENCY = "RWF";

const DEFAULT_FALLBACK_RATES = Object.freeze({
  USD: 1450,
  EUR: 1550,
  GBP: 1800,
  KES: 11,
  UGX: 380,
  TZS: 580,
});

const DEFAULT_SUPPORTED_CURRENCIES = Object.freeze([
  "RWF",
  "USD",
  "EUR",
  "GBP",
  "KES",
  "UGX",
  "TZS",
]);

const CACHE_TTL_MS = 5 * 60 * 1000;
const API_TIMEOUT_MS = 10_000;

const MIN_RATE = 0.0000000001;
const MAX_RATE = 1_000_000_000;

const RATE_SOURCE = Object.freeze({
  DATABASE: "database",
  API: "api",
  FALLBACK: "fallback",
  MANUAL: "manual",
  SYSTEM: "system",
});

// ============================================================
// HELPERS
// ============================================================

const normalizeCurrency = (currency) =>
  String(currency || "")
    .trim()
    .toUpperCase();

const isValidCurrency = (currency) =>
  DEFAULT_SUPPORTED_CURRENCIES.includes(normalizeCurrency(currency));

const isFinitePositive = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

const roundRate = (value, decimals = 12) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  const factor = 10 ** decimals;

  return Math.round(number * factor) / factor;
};

const roundMoney = (value, decimals = 2) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  const factor = 10 ** decimals;

  return Math.round(number * factor) / factor;
};

const safeDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getEnvironment = () =>
  String(process.env.NODE_ENV || "development").toLowerCase();

const isProduction = () => getEnvironment() === "production";

// ============================================================
// SERVICE
// ============================================================

class ExchangeRateService {
  constructor() {
    this.cache = new Map();

    this.fallbackRates = {
      ...DEFAULT_FALLBACK_RATES,
    };

    this.supportedCurrencies = [
      ...DEFAULT_SUPPORTED_CURRENCIES,
    ];

    this.apiConfig = {
      provider:
        process.env.EXCHANGE_RATE_PROVIDER ||
        "exchangerate-api",

      apiKey:
        process.env.EXCHANGE_RATE_API_KEY ||
        process.env.EXCHANGERATE_API_KEY ||
        "",

      baseUrl:
        process.env.EXCHANGE_RATE_API_URL ||
        "https://api.exchangerate-api.com/v4/latest",
    };

    this.autoUpdateEnabled =
      String(process.env.EXCHANGE_RATE_AUTO_UPDATE || "false")
        .toLowerCase() === "true";

    this.autoUpdateInterval =
      Number(process.env.EXCHANGE_RATE_UPDATE_INTERVAL_MS) ||
      6 * 60 * 60 * 1000;

    this.autoUpdateTimer = null;

    if (this.autoUpdateEnabled) {
      this.startAutoUpdate();
    }

    console.log("💱 ExchangeRateService initialized");
    console.log(
      `💱 Base currency: ${BASE_CURRENCY}`
    );
    console.log(
      `💱 Fallback rates:`,
      this.fallbackRates
    );
  }

  // ==========================================================
  // CURRENCY HELPERS
  // ==========================================================

  getSupportedCurrencies() {
    return [...this.supportedCurrencies];
  }

  isSupportedCurrency(currency) {
    return isValidCurrency(currency);
  }

  getFallbackRates() {
    return {
      ...this.fallbackRates,
    };
  }

  // ==========================================================
  // CACHE
  // ==========================================================

  getCacheKey(from, to) {
    return `${normalizeCurrency(from)}_${normalizeCurrency(to)}`;
  }

  getCachedRate(from, to) {
    const key = this.getCacheKey(from, to);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (
      Date.now() - cached.timestamp >
      CACHE_TTL_MS
    ) {
      this.cache.delete(key);
      return null;
    }

    if (!this.validateRate(cached.rate)) {
      this.cache.delete(key);
      return null;
    }

    return {
      ...cached,
      source: cached.source || "cache",
    };
  }

  setCachedRate(from, to, rate, metadata = {}) {
    if (!this.validateRate(rate)) {
      return null;
    }

    const key = this.getCacheKey(from, to);

    const value = {
      from: normalizeCurrency(from),
      to: normalizeCurrency(to),
      rate: roundRate(rate),
      timestamp: Date.now(),
      ...metadata,
    };

    this.cache.set(key, value);

    return value;
  }

  clearCache() {
    this.cache.clear();

    console.log("💱 Exchange-rate cache cleared");

    return {
      success: true,
    };
  }

  clearCacheForCurrency(currency) {
    const code = normalizeCurrency(currency);

    for (const key of this.cache.keys()) {
      if (
        key.startsWith(`${code}_`) ||
        key.endsWith(`_${code}`)
      ) {
        this.cache.delete(key);
      }
    }
  }

  // ==========================================================
  // RATE VALIDATION
  // ==========================================================

  validateRate(rate) {
    const numericRate = Number(rate);

    return (
      Number.isFinite(numericRate) &&
      numericRate >= MIN_RATE &&
      numericRate <= MAX_RATE
    );
  }

  /**
   * Validate semantic rate direction.
   *
   * Our fallback convention is:
   *
   *   foreign -> RWF = configured foreign/RWF value
   *   RWF -> foreign = reciprocal
   *
   * This method is intentionally conservative.
   */
  isSemanticallyValidFallbackRate(
    fromCurrency,
    toCurrency,
    rate
  ) {
    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);
    const numericRate = Number(rate);

    if (!this.validateRate(numericRate)) {
      return false;
    }

    if (from === to) {
      return Math.abs(numericRate - 1) < 0.0000001;
    }

    const fromFallback =
      this.fallbackRates[from];

    const toFallback =
      this.fallbackRates[to];

    if (from === BASE_CURRENCY && toFallback) {
      const expected = 1 / toFallback;

      return this.isCloseEnough(
        numericRate,
        expected
      );
    }

    if (to === BASE_CURRENCY && fromFallback) {
      const expected = fromFallback;

      return this.isCloseEnough(
        numericRate,
        expected
      );
    }

    if (
      fromFallback &&
      toFallback &&
      from !== BASE_CURRENCY &&
      to !== BASE_CURRENCY
    ) {
      const expected =
        toFallback / fromFallback;

      return this.isCloseEnough(
        numericRate,
        expected
      );
    }

    return true;
  }

  isCloseEnough(
    actual,
    expected,
    tolerance = 0.02
  ) {
    const a = Number(actual);
    const e = Number(expected);

    if (
      !Number.isFinite(a) ||
      !Number.isFinite(e) ||
      e === 0
    ) {
      return false;
    }

    return (
      Math.abs(a - e) / Math.abs(e) <=
      tolerance
    );
  }

  // ==========================================================
  // CONFIGURED FALLBACK RATE
  // ==========================================================

  /**
   * Returns a rate using the canonical AI Tour convention.
   *
   * Example:
   *
   * USD -> RWF
   * 1450
   *
   * RWF -> USD
   * 1 / 1450
   *
   * USD -> EUR
   * 1550 / 1450
   */
  getConfiguredRate(
    fromCurrency,
    toCurrency
  ) {
    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);

    if (!from || !to) {
      return null;
    }

    if (from === to) {
      return 1;
    }

    const fromRate =
      this.fallbackRates[from];

    const toRate =
      this.fallbackRates[to];

    // ----------------------------------------------------------
    // Foreign -> RWF
    // ----------------------------------------------------------

    if (to === BASE_CURRENCY) {
      if (!isFinitePositive(fromRate)) {
        return null;
      }

      return roundRate(fromRate);
    }

    // ----------------------------------------------------------
    // RWF -> Foreign
    // ----------------------------------------------------------

    if (from === BASE_CURRENCY) {
      if (!isFinitePositive(toRate)) {
        return null;
      }

      return roundRate(1 / toRate);
    }

    // ----------------------------------------------------------
    // Foreign -> Foreign
    //
    // Example:
    //
    // 1 USD = 1450 RWF
    // 1 EUR = 1550 RWF
    //
    // Therefore:
    //
    // 1 USD = 1450 / 1550 EUR
    // ----------------------------------------------------------

    if (
      isFinitePositive(fromRate) &&
      isFinitePositive(toRate)
    ) {
      return roundRate(
        fromRate / toRate
      );
    }

    return null;
  }

  // ==========================================================
  // DATABASE RATE NORMALIZATION
  // ==========================================================

  getRateSource(rateDocument) {
    if (!rateDocument) {
      return null;
    }

    return String(
      rateDocument.source ||
        rateDocument.provider ||
        rateDocument.rateSource ||
        ""
    ).toLowerCase();
  }

  getRateValue(rateDocument) {
    if (!rateDocument) {
      return null;
    }

    const candidates = [
      rateDocument.rate,
      rateDocument.exchangeRate,
      rateDocument.value,
    ];

    for (const candidate of candidates) {
      if (this.validateRate(candidate)) {
        return Number(candidate);
      }
    }

    return null;
  }

  getRateDocumentDate(rateDocument) {
    if (!rateDocument) {
      return null;
    }

    return (
      safeDate(rateDocument.updatedAt) ||
      safeDate(rateDocument.createdAt) ||
      safeDate(rateDocument.effectiveDate)
    );
  }

  // ==========================================================
  // DATABASE RATE REPAIR
  // ==========================================================

  /**
   * Legacy problem:
   *
   * A previous implementation stored:
   *
   * USD/RWF = 1/1450
   *
   * when the application expects:
   *
   * USD/RWF = 1450
   *
   * We must never silently replace manually maintained rates.
   *
   * But fallback/system records can safely be repaired.
   */
  async repairKnownBadFallbackRate(
    rateDocument,
    fromCurrency,
    toCurrency
  ) {
    if (!rateDocument) {
      return null;
    }

    const source =
      this.getRateSource(rateDocument);

    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);

    const currentRate =
      this.getRateValue(rateDocument);

    const configuredRate =
      this.getConfiguredRate(from, to);

    if (
      !this.validateRate(currentRate) ||
      !this.validateRate(configuredRate)
    ) {
      return null;
    }

    const isSystemRate =
      source === "fallback" ||
      source === "system" ||
      source === "default";

    if (!isSystemRate) {
      return null;
    }

    if (
      this.isSemanticallyValidFallbackRate(
        from,
        to,
        currentRate
      )
    ) {
      return null;
    }

    console.warn(
      `⚠️ Repairing legacy exchange rate ${from}/${to}: ${currentRate} -> ${configuredRate}`
    );

    try {
      rateDocument.rate =
        configuredRate;

      rateDocument.source =
        RATE_SOURCE.SYSTEM;

      rateDocument.provider =
        RATE_SOURCE.SYSTEM;

      rateDocument.updatedAt =
        new Date();

      if (
        rateDocument.metadata &&
        typeof rateDocument.metadata.set ===
          "function"
      ) {
        rateDocument.metadata.set(
          "repaired",
          "true"
        );

        rateDocument.metadata.set(
          "repairReason",
          "Legacy fallback rate direction was reversed"
        );
      }

      await rateDocument.save();

      return rateDocument;
    } catch (error) {
      console.error(
        "❌ Failed to repair exchange rate:",
        error.message
      );

      return null;
    }
  }

  // ==========================================================
  // GET RATE
  // ==========================================================

  async getRate(
    fromCurrency,
    toCurrency,
    options = {}
  ) {
    const from =
      normalizeCurrency(fromCurrency);

    const to =
      normalizeCurrency(toCurrency);

    const {
      useCache = true,
      allowApi = true,
      allowFallback = true,
      saveFallback = true,
    } = options;

    if (!from || !to) {
      throw new Error(
        "Source and target currencies are required"
      );
    }

    if (from === to) {
      return {
        success: true,
        from,
        to,
        rate: 1,
        source: "identity",
      };
    }

    if (
      !isValidCurrency(from) ||
      !isValidCurrency(to)
    ) {
      throw new Error(
        `Unsupported currency conversion: ${from} -> ${to}`
      );
    }

    // ----------------------------------------------------------
    // CACHE
    // ----------------------------------------------------------

    if (useCache) {
      const cached =
        this.getCachedRate(from, to);

      if (cached) {
        return {
          success: true,
          from,
          to,
          rate: cached.rate,
          source: cached.source || "cache",
          cached: true,
          timestamp: cached.timestamp,
        };
      }
    }

    // ----------------------------------------------------------
    // DATABASE
    // ----------------------------------------------------------

    try {
      const direct =
        await ExchangeRate.getLatest(
          from,
          to
        );

      if (direct) {
        const repaired =
          await this.repairKnownBadFallbackRate(
            direct,
            from,
            to
          );

        const usableDocument =
          repaired || direct;

        const databaseRate =
          this.getRateValue(
            usableDocument
          );

        if (
          this.validateRate(databaseRate)
        ) {
          const source =
            this.getRateSource(
              usableDocument
            ) || RATE_SOURCE.DATABASE;

          // ----------------------------------------------------
          // IMPORTANT:
          //
          // If a known fallback/system record is semantically
          // reversed, do not use it.
          // ----------------------------------------------------

          const isSystemRate =
            source === "fallback" ||
            source === "system" ||
            source === "default";

          if (
            !isSystemRate ||
            this.isSemanticallyValidFallbackRate(
              from,
              to,
              databaseRate
            )
          ) {
            this.setCachedRate(
              from,
              to,
              databaseRate,
              {
                source:
                  source === "manual"
                    ? RATE_SOURCE.MANUAL
                    : RATE_SOURCE.DATABASE,
                database: true,
                updatedAt:
                  this.getRateDocumentDate(
                    usableDocument
                  ),
              }
            );

            console.log(
              `💱 Database rate ${from}/${to}: ${databaseRate}`
            );

            return {
              success: true,
              from,
              to,
              rate: roundRate(
                databaseRate
              ),
              source:
                source === "manual"
                  ? RATE_SOURCE.MANUAL
                  : RATE_SOURCE.DATABASE,
              database: true,
              updatedAt:
                this.getRateDocumentDate(
                  usableDocument
                ),
            };
          }

          console.warn(
            `⚠️ Ignoring semantically invalid database rate ${from}/${to}: ${databaseRate}`
          );
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ Database exchange-rate lookup failed for ${from}/${to}:`,
        error.message
      );
    }

    // ----------------------------------------------------------
    // INVERSE DATABASE RATE
    // ----------------------------------------------------------

    try {
      const inverse =
        await ExchangeRate.getLatest(
          to,
          from
        );

      if (inverse) {
        const inverseSource =
          this.getRateSource(inverse);

        const inverseValue =
          this.getRateValue(inverse);

        const inverseIsSystemRate =
          inverseSource === "fallback" ||
          inverseSource === "system" ||
          inverseSource === "default";

        if (
          this.validateRate(
            inverseValue
          ) &&
          (
            !inverseIsSystemRate ||
            this.isSemanticallyValidFallbackRate(
              to,
              from,
              inverseValue
            )
          )
        ) {
          const convertedRate =
            1 / inverseValue;

          if (
            this.validateRate(
              convertedRate
            )
          ) {
            this.setCachedRate(
              from,
              to,
              convertedRate,
              {
                source:
                  RATE_SOURCE.DATABASE,
                inverse: true,
              }
            );

            console.log(
              `💱 Inverse database rate ${from}/${to}: ${convertedRate}`
            );

            return {
              success: true,
              from,
              to,
              rate: roundRate(
                convertedRate
              ),
              source:
                RATE_SOURCE.DATABASE,
              inverse: true,
            };
          }
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ Inverse database rate lookup failed for ${from}/${to}:`,
        error.message
      );
    }

    // ----------------------------------------------------------
    // API
    // ----------------------------------------------------------

    if (allowApi) {
      try {
        const apiResult =
          await this.getRateFromApi(
            from,
            to
          );

        if (
          apiResult &&
          this.validateRate(
            apiResult.rate
          )
        ) {
          this.setCachedRate(
            from,
            to,
            apiResult.rate,
            {
              source:
                RATE_SOURCE.API,
              provider:
                apiResult.provider,
              timestamp:
                Date.now(),
            }
          );

          return {
            success: true,
            from,
            to,
            rate: roundRate(
              apiResult.rate
            ),
            source:
              RATE_SOURCE.API,
            provider:
              apiResult.provider,
          };
        }
      } catch (error) {
        console.warn(
          `⚠️ API exchange-rate lookup failed for ${from}/${to}:`,
          error.message
        );
      }
    }

    // ----------------------------------------------------------
    // FALLBACK
    // ----------------------------------------------------------

    if (allowFallback) {
      const fallbackRate =
        this.getConfiguredRate(
          from,
          to
        );

      if (
        this.validateRate(
          fallbackRate
        )
      ) {
        const result = {
          success: true,
          from,
          to,
          rate: roundRate(
            fallbackRate
          ),
          source:
            RATE_SOURCE.FALLBACK,
          fallback: true,
        };

        this.setCachedRate(
          from,
          to,
          fallbackRate,
          {
            source:
              RATE_SOURCE.FALLBACK,
          }
        );

        if (saveFallback) {
          await this.saveFallbackRate(
            from,
            to,
            fallbackRate
          );
        }

        console.log(
          `💱 Fallback rate ${from}/${to}: ${fallbackRate}`
        );

        return result;
      }
    }

    throw new Error(
      `Unable to determine exchange rate for ${from} -> ${to}`
    );
  }

  // ==========================================================
  // GET RATE WITH FALLBACK
  // ==========================================================

  async getRateWithFallback(
    fromCurrency,
    toCurrency
  ) {
    try {
      return await this.getRate(
        fromCurrency,
        toCurrency,
        {
          useCache: true,
          allowApi: true,
          allowFallback: true,
          saveFallback: true,
        }
      );
    } catch (error) {
      const from =
        normalizeCurrency(fromCurrency);

      const to =
        normalizeCurrency(toCurrency);

      const fallbackRate =
        this.getConfiguredRate(
          from,
          to
        );

      if (
        this.validateRate(
          fallbackRate
        )
      ) {
        return {
          success: true,
          from,
          to,
          rate: fallbackRate,
          source:
            RATE_SOURCE.FALLBACK,
          fallback: true,
          emergencyFallback: true,
        };
      }

      throw error;
    }
  }

  // ==========================================================
  // GET MULTIPLE RATES
  // ==========================================================

  async getRates(
    baseCurrency = BASE_CURRENCY,
    currencies = this.supportedCurrencies
  ) {
    const base =
      normalizeCurrency(baseCurrency);

    const targetCurrencies =
      Array.isArray(currencies)
        ? currencies
        : this.supportedCurrencies;

    const rates = {};

    for (const currency of targetCurrencies) {
      const target =
        normalizeCurrency(currency);

      if (!target) {
        continue;
      }

      try {
        const result =
          await this.getRate(
            base,
            target
          );

        rates[target] = result.rate;
      } catch (error) {
        console.warn(
          `⚠️ Failed to get ${base}/${target}:`,
          error.message
        );
      }
    }

    return {
      success: true,
      base,
      rates,
    };
  }

  // ==========================================================
  // RATE WITH CONVERSION
  // ==========================================================

  async getRateWithConversion(
    amount,
    fromCurrency,
    toCurrency,
    options = {}
  ) {
    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      )
    ) {
      throw new Error(
        "Amount must be a valid number"
      );
    }

    const result =
      await this.getRate(
        fromCurrency,
        toCurrency,
        options
      );

    const convertedAmount =
      numericAmount * result.rate;

    return {
      ...result,
      amount: numericAmount,
      convertedAmount:
        roundMoney(
          convertedAmount
        ),
    };
  }

  // ==========================================================
  // API LOOKUP
  // ==========================================================

  async getRateFromApi(
    fromCurrency,
    toCurrency
  ) {
    const from =
      normalizeCurrency(fromCurrency);

    const to =
      normalizeCurrency(toCurrency);

    const provider =
      this.apiConfig.provider;

    // ----------------------------------------------------------
    // exchangerate-api.com / compatible latest endpoint
    // ----------------------------------------------------------

    if (
      provider ===
      "exchangerate-api"
    ) {
      const baseUrl =
        this.apiConfig.baseUrl.replace(
          /\/$/,
          ""
        );

      const url =
        `${baseUrl}/${encodeURIComponent(
          from
        )}`;

      const response =
        await axios.get(
          url,
          {
            timeout:
              API_TIMEOUT_MS,
          }
        );

      const data =
        response?.data;

      const apiRate =
        Number(
          data?.rates?.[to]
        );

      if (
        !this.validateRate(
          apiRate
        )
      ) {
        throw new Error(
          `Invalid API rate for ${from}/${to}`
        );
      }

      return {
        rate: apiRate,
        provider:
          "exchangerate-api",
      };
    }

    // ----------------------------------------------------------
    // Generic API
    // ----------------------------------------------------------

    if (
      !this.apiConfig.apiKey
    ) {
      throw new Error(
        "Exchange-rate API key is not configured"
      );
    }

    const response =
      await axios.get(
        this.apiConfig.baseUrl,
        {
          timeout:
            API_TIMEOUT_MS,

          params: {
            access_key:
              this.apiConfig.apiKey,
            base: from,
            symbols: to,
          },
        }
      );

    const apiRate =
      Number(
        response?.data?.rates?.[to]
      );

    if (
      !this.validateRate(
        apiRate
      )
    ) {
      throw new Error(
        `Invalid API rate for ${from}/${to}`
      );
    }

    return {
      rate: apiRate,
      provider,
    };
  }

  // ==========================================================
  // SAVE FALLBACK RATE
  // ==========================================================

  async saveFallbackRate(
    fromCurrency,
    toCurrency,
    rate
  ) {
    const from =
      normalizeCurrency(fromCurrency);

    const to =
      normalizeCurrency(toCurrency);

    const numericRate =
      Number(rate);

    if (
      !this.validateRate(
        numericRate
      )
    ) {
      return null;
    }

    if (
      !this.isSemanticallyValidFallbackRate(
        from,
        to,
        numericRate
      )
    ) {
      console.warn(
        `⚠️ Refusing to save semantically invalid fallback rate ${from}/${to}: ${numericRate}`
      );

      return null;
    }

    try {
      // --------------------------------------------------------
      // First try to update the latest matching document.
      // --------------------------------------------------------

      const existing =
        await ExchangeRate.getLatest(
          from,
          to
        );

      if (existing) {
        const existingSource =
          this.getRateSource(
            existing
          );

        const canUpdate =
          existingSource ===
            "fallback" ||
          existingSource ===
            "system" ||
          existingSource ===
            "default" ||
          !existingSource;

        if (canUpdate) {
          existing.rate =
            roundRate(
              numericRate
            );

          existing.source =
            RATE_SOURCE.FALLBACK;

          existing.provider =
            RATE_SOURCE.FALLBACK;

          existing.updatedAt =
            new Date();

          await existing.save();

          return existing;
        }

        // Never overwrite a manual rate with fallback.
        return existing;
      }

      // --------------------------------------------------------
      // Create new fallback record.
      // --------------------------------------------------------

      const document =
        new ExchangeRate({
          fromCurrency: from,
          toCurrency: to,
          rate: roundRate(
            numericRate
          ),
          source:
            RATE_SOURCE.FALLBACK,
          provider:
            RATE_SOURCE.FALLBACK,
          updatedAt:
            new Date(),
        });

      await document.save();

      return document;
    } catch (error) {
      console.error(
        `❌ Failed to save fallback rate ${from}/${to}:`,
        error.message
      );

      return null;
    }
  }

  // ==========================================================
  // UPDATE ALL RATES
  // ==========================================================

  async updateAllRates(options = {}) {
    const {
      useApi = true,
      useFallback = true,
    } = options;

    const results = [];

    for (
      const currency of this.supportedCurrencies
    ) {
      if (
        currency === BASE_CURRENCY
      ) {
        continue;
      }

      try {
        let rateResult = null;

        if (useApi) {
          try {
            rateResult =
              await this.getRateFromApi(
                currency,
                BASE_CURRENCY
              );
          } catch (error) {
            console.warn(
              `⚠️ API update failed for ${currency}/${BASE_CURRENCY}:`,
              error.message
            );
          }
        }

        // ------------------------------------------------------
        // API rate convention is respected as returned.
        // We only store it if valid.
        // ------------------------------------------------------

        if (
          rateResult &&
          this.validateRate(
            rateResult.rate
          )
        ) {
          const saved =
            await this.saveRate(
              currency,
              BASE_CURRENCY,
              rateResult.rate,
              {
                source:
                  RATE_SOURCE.API,
                provider:
                  rateResult.provider,
              }
            );

          results.push({
            from: currency,
            to: BASE_CURRENCY,
            rate:
              rateResult.rate,
            source:
              RATE_SOURCE.API,
            success: !!saved,
          });

          continue;
        }

        // ------------------------------------------------------
        // Fallback
        // ------------------------------------------------------

        if (useFallback) {
          const fallbackRate =
            this.getConfiguredRate(
              currency,
              BASE_CURRENCY
            );

          if (
            this.validateRate(
              fallbackRate
            )
          ) {
            const saved =
              await this.saveRate(
                currency,
                BASE_CURRENCY,
                fallbackRate,
                {
                  source:
                    RATE_SOURCE.FALLBACK,
                  provider:
                    RATE_SOURCE.FALLBACK,
                }
              );

            results.push({
              from: currency,
              to: BASE_CURRENCY,
              rate:
                fallbackRate,
              source:
                RATE_SOURCE.FALLBACK,
              success: !!saved,
            });
          }
        }
      } catch (error) {
        results.push({
          from: currency,
          to: BASE_CURRENCY,
          success: false,
          error:
            error.message,
        });
      }
    }

    this.clearCache();

    return {
      success: true,
      updatedAt:
        new Date(),
      results,
    };
  }

  // ==========================================================
  // SAVE RATE
  // ==========================================================

  async saveRate(
    fromCurrency,
    toCurrency,
    rate,
    metadata = {}
  ) {
    const from =
      normalizeCurrency(fromCurrency);

    const to =
      normalizeCurrency(toCurrency);

    const numericRate =
      Number(rate);

    if (
      !from ||
      !to ||
      !this.validateRate(
        numericRate
      )
    ) {
      throw new Error(
        "Invalid exchange-rate data"
      );
    }

    try {
      const existing =
        await ExchangeRate.getLatest(
          from,
          to
        );

      if (existing) {
        existing.rate =
          roundRate(
            numericRate
          );

        if (
          metadata.source
        ) {
          existing.source =
            metadata.source;
        }

        if (
          metadata.provider
        ) {
          existing.provider =
            metadata.provider;
        }

        if (
          metadata.effectiveDate
        ) {
          existing.effectiveDate =
            metadata.effectiveDate;
        }

        existing.updatedAt =
          new Date();

        await existing.save();

        this.clearCacheForCurrency(
          from
        );

        this.clearCacheForCurrency(
          to
        );

        return existing;
      }

      const document =
        new ExchangeRate({
          fromCurrency: from,
          toCurrency: to,
          rate: roundRate(
            numericRate
          ),
          source:
            metadata.source ||
            RATE_SOURCE.MANUAL,
          provider:
            metadata.provider ||
            RATE_SOURCE.MANUAL,
          effectiveDate:
            metadata.effectiveDate ||
            new Date(),
          updatedAt:
            new Date(),
        });

      await document.save();

      this.clearCacheForCurrency(
        from
      );

      this.clearCacheForCurrency(
        to
      );

      return document;
    } catch (error) {
      console.error(
        `❌ Failed to save rate ${from}/${to}:`,
        error.message
      );

      throw error;
    }
  }

  // ==========================================================
  // MANUAL RATE UPDATE
  // ==========================================================

  async setManualRate(
    fromCurrency,
    toCurrency,
    rate
  ) {
    const from =
      normalizeCurrency(fromCurrency);

    const to =
      normalizeCurrency(toCurrency);

    const numericRate =
      Number(rate);

    if (
      !this.validateRate(
        numericRate
      )
    ) {
      throw new Error(
        "Invalid exchange rate"
      );
    }

    const document =
      await this.saveRate(
        from,
        to,
        numericRate,
        {
          source:
            RATE_SOURCE.MANUAL,
          provider:
            RATE_SOURCE.MANUAL,
        }
      );

    this.setCachedRate(
      from,
      to,
      numericRate,
      {
        source:
          RATE_SOURCE.MANUAL,
      }
    );

    return {
      success: true,
      from,
      to,
      rate: roundRate(
        numericRate
      ),
      source:
        RATE_SOURCE.MANUAL,
      document,
    };
  }

  // ==========================================================
  // RATE HISTORY
  // ==========================================================

  async getRateHistory(
    fromCurrency,
    toCurrency,
    options = {}
  ) {
    const from =
      normalizeCurrency(fromCurrency);

    const to =
      normalizeCurrency(toCurrency);

    const limit =
      Math.min(
        Math.max(
          Number(
            options.limit || 50
          ),
          1
        ),
        500
      );

    const query = {
      fromCurrency: from,
      toCurrency: to,
    };

    if (
      options.startDate ||
      options.endDate
    ) {
      query.createdAt = {};

      if (options.startDate) {
        query.createdAt.$gte =
          new Date(
            options.startDate
          );
      }

      if (options.endDate) {
        query.createdAt.$lte =
          new Date(
            options.endDate
          );
      }
    }

    return ExchangeRate.find(
      query
    )
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();
  }

  // ==========================================================
  // STATISTICS
  // ==========================================================

  async getRateStats(
    fromCurrency,
    toCurrency
  ) {
    const history =
      await this.getRateHistory(
        fromCurrency,
        toCurrency,
        {
          limit: 500,
        }
      );

    const rates =
      history
        .map(
          (item) =>
            Number(item.rate)
        )
        .filter(
          (rate) =>
            this.validateRate(
              rate
            )
        );

    if (!rates.length) {
      return {
        success: true,
        count: 0,
        min: null,
        max: null,
        average: null,
        latest: null,
      };
    }

    const sum =
      rates.reduce(
        (total, rate) =>
          total + rate,
        0
      );

    return {
      success: true,
      count: rates.length,
      min: Math.min(...rates),
      max: Math.max(...rates),
      average:
        roundRate(
          sum / rates.length
        ),
      latest: rates[0],
    };
  }

  // ==========================================================
  // CLEANUP
  // ==========================================================

  async cleanupOldRates(
    days = 90
  ) {
    const retentionDays =
      Math.max(
        Number(days) || 90,
        1
      );

    const cutoff =
      new Date(
        Date.now() -
          retentionDays *
            24 *
            60 *
            60 *
            1000
      );

    try {
      const result =
        await ExchangeRate.deleteMany(
          {
            createdAt: {
              $lt: cutoff,
            },
          }
        );

      return {
        success: true,
        deleted:
          result.deletedCount || 0,
        cutoff,
      };
    } catch (error) {
      console.error(
        "❌ Failed to cleanup old exchange rates:",
        error.message
      );

      return {
        success: false,
        deleted: 0,
        error:
          error.message,
      };
    }
  }

  // ==========================================================
  // FRESHNESS
  // ==========================================================

  async isRateFresh(
    fromCurrency,
    toCurrency,
    maxAgeMs =
      24 * 60 * 60 * 1000
  ) {
    const from =
      normalizeCurrency(
        fromCurrency
      );

    const to =
      normalizeCurrency(
        toCurrency
      );

    try {
      const document =
        await ExchangeRate.getLatest(
          from,
          to
        );

      if (!document) {
        return false;
      }

      const date =
        this.getRateDocumentDate(
          document
        );

      if (!date) {
        return false;
      }

      return (
        Date.now() -
          date.getTime() <=
        maxAgeMs
      );
    } catch (error) {
      return false;
    }
  }

  // ==========================================================
  // HEALTH CHECK
  // ==========================================================

  async healthCheck() {
    const checks = {};

    for (
      const currency of this.supportedCurrencies
    ) {
      if (
        currency === BASE_CURRENCY
      ) {
        continue;
      }

      try {
        const result =
          await this.getRate(
            currency,
            BASE_CURRENCY,
            {
              useCache: true,
              allowApi: false,
              allowFallback: true,
              saveFallback: false,
            }
          );

        checks[
          `${currency}_${BASE_CURRENCY}`
        ] = {
          healthy:
            this.validateRate(
              result.rate
            ),
          rate:
            result.rate,
          source:
            result.source,
        };
      } catch (error) {
        checks[
          `${currency}_${BASE_CURRENCY}`
        ] = {
          healthy: false,
          error:
            error.message,
        };
      }
    }

    const healthy =
      Object.values(
        checks
      ).every(
        (check) =>
          check.healthy
      );

    return {
      success: healthy,
      healthy,
      baseCurrency:
        BASE_CURRENCY,
      checks,
      checkedAt:
        new Date(),
    };
  }

  // ==========================================================
  // AUTO UPDATE
  // ==========================================================

  startAutoUpdate() {
    if (this.autoUpdateTimer) {
      return;
    }

    this.autoUpdateTimer =
      setInterval(
        async () => {
          try {
            console.log(
              "🔄 Automatic exchange-rate update started"
            );

            await this.updateAllRates();

            console.log(
              "✅ Automatic exchange-rate update completed"
            );
          } catch (error) {
            console.error(
              "❌ Automatic exchange-rate update failed:",
              error.message
            );
          }
        },
        this.autoUpdateInterval
      );

    if (
      typeof this.autoUpdateTimer.unref ===
      "function"
    ) {
      this.autoUpdateTimer.unref();
    }

    console.log(
      `⏱️ Exchange-rate auto update enabled every ${Math.round(
        this.autoUpdateInterval /
          3600000
      )}h`
    );
  }

  stopAutoUpdate() {
    if (!this.autoUpdateTimer) {
      return;
    }

    clearInterval(
      this.autoUpdateTimer
    );

    this.autoUpdateTimer = null;

    console.log(
      "⏹️ Exchange-rate auto update stopped"
    );
  }

  // ==========================================================
  // DEBUG / DIAGNOSTICS
  // ==========================================================

  getDiagnostics() {
    return {
      baseCurrency:
        BASE_CURRENCY,

      supportedCurrencies:
        this.getSupportedCurrencies(),

      fallbackRates:
        this.getFallbackRates(),

      cacheSize:
        this.cache.size,

      apiProvider:
        this.apiConfig.provider,

      apiConfigured:
        Boolean(
          this.apiConfig.apiKey
        ),

      autoUpdateEnabled:
        this.autoUpdateEnabled,

      environment:
        getEnvironment(),

      production:
        isProduction(),
    };
  }
}

// ============================================================
// SINGLETON
// ============================================================

const exchangeRateService =
  new ExchangeRateService();

export default exchangeRateService;

export {
  ExchangeRateService,
  BASE_CURRENCY,
  DEFAULT_FALLBACK_RATES,
  DEFAULT_SUPPORTED_CURRENCIES,
};
