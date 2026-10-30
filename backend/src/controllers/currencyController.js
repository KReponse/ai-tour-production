// backend/src/controllers/currencyController.js
// ✅ FIXED - Multi-Currency Controller
// ✅ Aligned with current currencyService API
// ✅ convertAmount() handled as numeric result
// ✅ formatAmount() correctly awaited
// ✅ getCurrency() used instead of missing getCurrencyByCode()
// ✅ Active currency validation aligned with currencyService
// ✅ Default currency uses getDefaultCurrencyCode()
// ✅ MVP platform commission enforced at 0%
// ✅ Exchange-rate history direction normalized to FOREIGN -> RWF
// ✅ Settlement currency endpoints preserved
// ✅ User preferred currency endpoints preserved

import Currency from "../models/Currency.js";
import ExchangeRate from "../models/ExchangeRate.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";

import currencyService from "../services/currencyService.js";
import exchangeRateService from "../services/exchangeRateService.js";
import settlementService from "../services/settlementService.js";

// ============================================================
// HELPERS
// ============================================================

const normalizeCode = (code) => {
  return String(code || "")
    .trim()
    .toUpperCase();
};

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );
};

const getUserEmail = (req) => {
  return req.user?.email || "unknown";
};

const clearCurrencyCaches = () => {
  try {
    if (
      typeof currencyService?.clearCache ===
      "function"
    ) {
      currencyService.clearCache();
    }

    if (
      typeof exchangeRateService?.clearCache ===
      "function"
    ) {
      exchangeRateService.clearCache();
    }
  } catch (error) {
    console.warn(
      "⚠️ Failed to clear currency caches:",
      error.message
    );
  }
};

const getCurrencyInfo = async (code) => {
  const normalized = normalizeCode(code);

  if (!normalized) {
    return null;
  }

  if (
    typeof currencyService?.getCurrency ===
    "function"
  ) {
    return currencyService.getCurrency(
      normalized
    );
  }

  const currency =
    await Currency.findOne({
      code: normalized,
      isActive: true,
    }).lean();

  return currency || null;
};

const isCurrencySupported = async (code) => {
  const normalized = normalizeCode(code);

  if (!normalized) {
    return false;
  }

  try {
    const currency =
      await getCurrencyInfo(normalized);

    return Boolean(
      currency &&
      currency.isActive !== false
    );
  } catch (error) {
    console.warn(
      `⚠️ Currency support check failed for ${normalized}:`,
      error.message
    );

    return false;
  }
};

const formatCurrencyAmount = async (
  amount,
  currency
) => {
  try {
    if (
      typeof currencyService?.formatAmount ===
      "function"
    ) {
      return await currencyService.formatAmount(
        amount,
        currency
      );
    }

    return `${currency} ${amount}`;
  } catch (error) {
    console.warn(
      `⚠️ Currency formatting failed for ${currency}:`,
      error.message
    );

    return `${currency} ${amount}`;
  }
};

// ============================================================
// GET ALL CURRENCIES
// ============================================================

export const getCurrencies = async (
  req,
  res
) => {
  try {
    const { active = null } =
      req.query;

    let currencies;

    if (active === "true") {
      currencies =
        await currencyService.getActiveCurrencies();
    } else if (active === "false") {
      currencies =
        await Currency.find({
          isActive: false,
        }).sort({
          code: 1,
        });
    } else {
      currencies =
        await Currency.find().sort({
          isDefault: -1,
          code: 1,
        });
    }

    const formattedCurrencies =
      await Promise.all(
        currencies.map(
          async (currency) => {
            const plain =
              typeof currency?.toObject ===
              "function"
                ? currency.toObject()
                : currency;

            return {
              ...plain,

              formattedRate:
                await formatCurrencyAmount(
                  1,
                  currency.code
                ),

              isDefault:
                Boolean(
                  currency.isDefault
                ),

              isBase:
                Boolean(
                  currency.isBaseCurrency
                ),
            };
          }
        )
      );

    return res.json({
      success: true,
      currencies:
        formattedCurrencies,
      total:
        formattedCurrencies.length,
    });
  } catch (error) {
    console.error(
      "❌ Get currencies error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load currencies",
    });
  }
};

// ============================================================
// GET CURRENCY BY CODE
// ============================================================

export const getCurrencyByCode = async (
  req,
  res
) => {
  try {
    const code =
      normalizeCode(
        req.params?.code
      );

    if (!code) {
      return res.status(400).json({
        success: false,
        message:
          "Currency code is required",
      });
    }

    const currency =
      await getCurrencyInfo(code);

    if (!currency) {
      return res.status(404).json({
        success: false,
        message:
          `Currency ${code} not found`,
      });
    }

    return res.json({
      success: true,
      currency: {
        ...currency,

        formattedRate:
          await formatCurrencyAmount(
            1,
            currency.code
          ),
      },
    });
  } catch (error) {
    console.error(
      "❌ Get currency by code error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get currency",
    });
  }
};

// ============================================================
// GET DEFAULT CURRENCY
// ============================================================

export const getDefaultCurrency = async (
  req,
  res
) => {
  try {
    const defaultCode =
      typeof currencyService?.getDefaultCurrencyCode ===
      "function"
        ? await currencyService.getDefaultCurrencyCode()
        : "RWF";

    const currency =
      await getCurrencyInfo(
        defaultCode
      );

    if (!currency) {
      return res.status(404).json({
        success: false,
        message:
          "No default currency found",
      });
    }

    return res.json({
      success: true,

      currency: {
        ...currency,

        formattedRate:
          await formatCurrencyAmount(
            1,
            currency.code
          ),
      },
    });
  } catch (error) {
    console.error(
      "❌ Get default currency error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get default currency",
    });
  }
};

// ============================================================
// CREATE CURRENCY
// ADMIN ONLY
// ============================================================

export const createCurrency = async (
  req,
  res
) => {
  try {
    const {
      code,
      symbol,
      name,

      decimalPlaces = 2,
      exchangeRate = 1,

      // ✅ MVP = 0%
      platformFeePercentage = 0,

      paymentMethods = [],
      settlementAllowed = true,
      isActive = true,
      isDefault = false,
      isBaseCurrency = false,

      format = {},
      countryCodes = [],
    } = req.body;

    if (
      !code ||
      !symbol ||
      !name
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Code, symbol, and name are required",
      });
    }

    const upperCode =
      normalizeCode(code);

    const numericExchangeRate =
      Number(exchangeRate);

    if (
      !Number.isFinite(
        numericExchangeRate
      ) ||
      numericExchangeRate <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Exchange rate must be greater than 0",
      });
    }

    const existing =
      await Currency.findOne({
        code: upperCode,
      });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          `Currency ${upperCode} already exists`,
      });
    }

    const userId =
      getUserId(req);

    const currency =
      new Currency({
        code: upperCode,
        symbol,
        name,
        decimalPlaces,

        exchangeRate:
          numericExchangeRate,

        // ✅ Never allow platform commission
        platformFeePercentage: 0,

        paymentMethods,
        settlementAllowed,
        isActive,
        isDefault,
        isBaseCurrency,

        format: {
          locale:
            format.locale ||
            "en-US",

          currencyDisplay:
            format.currencyDisplay ||
            "symbol",

          position:
            format.position ||
            "before",
        },

        countryCodes,

        createdBy:
          userId || undefined,
      });

    await currency.save();

    // ----------------------------------------------------------
    // EXCHANGE RATE HISTORY
    // ----------------------------------------------------------
    //
    // Currency.exchangeRate is interpreted as:
    //
    // 1 FOREIGN CURRENCY = X RWF
    //
    // Therefore history is stored as:
    //
    // FOREIGN -> RWF
    //
    // Never RWF -> FOREIGN with the same numeric value.
    // ----------------------------------------------------------

    if (
      isBaseCurrency &&
      upperCode !== "RWF"
    ) {
      try {
        await ExchangeRate.setRate(
          upperCode,
          "RWF",
          numericExchangeRate,
          {
            source:
              "admin",

            sourceProvider:
              "manual",

            createdBy:
              userId || undefined,

            metadata: {
              created: true,
              baseCurrency: true,
            },
          }
        );
      } catch (rateError) {
        console.warn(
          "⚠️ Base currency exchange-rate history update failed:",
          rateError.message
        );
      }
    }

    clearCurrencyCaches();

    console.log(
      `✅ Currency created: ${upperCode} by ${getUserEmail(req)}`
    );

    return res.status(201).json({
      success: true,

      message:
        `Currency ${upperCode} created successfully`,

      currency: {
        ...currency.toObject(),

        formattedRate:
          await formatCurrencyAmount(
            1,
            currency.code
          ),
      },
    });
  } catch (error) {
    console.error(
      "❌ Create currency error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create currency",
    });
  }
};

// ============================================================
// UPDATE CURRENCY
// ADMIN ONLY
// ============================================================

export const updateCurrency = async (
  req,
  res
) => {
  try {
    const code =
      normalizeCode(
        req.params?.code
      );

    const updates = {
      ...(req.body || {}),
    };

    if (!code) {
      return res.status(400).json({
        success: false,
        message:
          "Currency code is required",
      });
    }

    const currency =
      await Currency.findOne({
        code,
      });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message:
          `Currency ${code} not found`,
      });
    }

    // Never change currency code.
    delete updates.code;

    const changes = [];

    const oldExchangeRate =
      Number(currency.exchangeRate);

    // ----------------------------------------------------------
    // MVP COMMISSION PROTECTION
    // ----------------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "platformFeePercentage"
      )
    ) {
      const requestedFee =
        Number(
          updates.platformFeePercentage
        );

      if (
        Number.isFinite(
          requestedFee
        ) &&
        requestedFee !== 0
      ) {
        changes.push(
          `platformFeePercentage: ${requestedFee} → 0`
        );
      }

      updates.platformFeePercentage =
        0;
    }

    // ----------------------------------------------------------
    // EXCHANGE RATE
    // ----------------------------------------------------------

    if (
      updates.exchangeRate !==
      undefined
    ) {
      const numericRate =
        Number(
          updates.exchangeRate
        );

      if (
        !Number.isFinite(
          numericRate
        ) ||
        numericRate <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Exchange rate must be greater than 0",
        });
      }

      if (
        numericRate !==
        oldExchangeRate
      ) {
        changes.push(
          `exchangeRate: ${oldExchangeRate} → ${numericRate}`
        );

        updates.exchangeRate =
          numericRate;
      }
    }

    // ----------------------------------------------------------
    // APPLY SAFE UPDATES
    // ----------------------------------------------------------

    Object.keys(
      updates
    ).forEach((key) => {
      const value =
        updates[key];

      if (
        value !== undefined &&
        value !== null
      ) {
        currency[key] =
          value;
      }
    });

    // ----------------------------------------------------------
    // SAVE RATE HISTORY
    // ----------------------------------------------------------

    if (
      updates.exchangeRate !==
        undefined &&
      Number(
        updates.exchangeRate
      ) !== oldExchangeRate
    ) {
      await ExchangeRate.setRate(
        code,
        "RWF",
        Number(
          updates.exchangeRate
        ),
        {
          source:
            "admin",

          sourceProvider:
            "manual",

          createdBy:
            getUserId(req) ||
            undefined,

          metadata: {
            updated: true,
            oldRate:
              oldExchangeRate,
          },
        }
      );

      currency.exchangeRateUpdatedAt =
        new Date();

      currency.exchangeRateSource =
        "admin";
    }

    currency.updatedBy =
      getUserId(req) ||
      undefined;

    await currency.save();

    clearCurrencyCaches();

    console.log(
      `✅ Currency updated: ${code} by ${getUserEmail(req)}`
    );

    if (
      changes.length > 0
    ) {
      console.log(
        `📝 Changes: ${changes.join(", ")}`
      );
    }

    return res.json({
      success: true,

      message:
        `Currency ${code} updated successfully`,

      currency: {
        ...currency.toObject(),

        formattedRate:
          await formatCurrencyAmount(
            1,
            currency.code
          ),
      },

      changes,
    });
  } catch (error) {
    console.error(
      "❌ Update currency error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to update currency",
    });
  }
};

// ============================================================
// UPDATE EXCHANGE RATE
// ADMIN ONLY
// ============================================================

export const updateExchangeRate = async (
  req,
  res
) => {
  try {
    const code =
      normalizeCode(
        req.params?.code
      );

    const {
      rate,
      source = "admin",
    } = req.body;

    if (
      !code ||
      rate === undefined ||
      rate === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Currency code and rate are required",
      });
    }

    const numericRate =
      Number(rate);

    if (
      !Number.isFinite(
        numericRate
      ) ||
      numericRate <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Exchange rate must be greater than 0",
      });
    }

    // RWF is the base currency in this architecture.
    if (code === "RWF") {
      return res.status(400).json({
        success: false,
        message:
          "RWF is the base currency and does not require an exchange-rate update",
      });
    }

    const currency =
      await Currency.findOne({
        code,
      });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message:
          `Currency ${code} not found`,
      });
    }

    const oldRate =
      Number(currency.exchangeRate);

    currency.exchangeRate =
      numericRate;

    currency.exchangeRateUpdatedAt =
      new Date();

    currency.exchangeRateSource =
      source;

    currency.updatedBy =
      getUserId(req) ||
      undefined;

    await currency.save();

    // ✅ Correct direction:
    // FOREIGN -> RWF
    await ExchangeRate.setRate(
      code,
      "RWF",
      numericRate,
      {
        source,

        sourceProvider:
          source === "manual"
            ? "manual"
            : source,

        createdBy:
          getUserId(req) ||
          undefined,

        metadata: {
          oldRate,
          updatedBy:
            getUserEmail(req),
        },
      }
    );

    clearCurrencyCaches();

    console.log(
      `✅ Exchange rate updated: ${code} ${oldRate} → ${numericRate} by ${getUserEmail(req)}`
    );

    return res.json({
      success: true,

      message:
        `Exchange rate for ${code} updated from ${oldRate} to ${numericRate}`,

      currency: {
        code:
          currency.code,

        exchangeRate:
          currency.exchangeRate,

        oldRate,

        updatedAt:
          currency.exchangeRateUpdatedAt,

        source:
          currency.exchangeRateSource,

        formatted:
          await formatCurrencyAmount(
            1,
            code
          ),
      },
    });
  } catch (error) {
    console.error(
      "❌ Update exchange rate error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to update exchange rate",
    });
  }
};

// ============================================================
// GET EXCHANGE RATE HISTORY
// ============================================================

export const getExchangeRateHistory =
  async (req, res) => {
    try {
      const code =
        normalizeCode(
          req.params?.code
        );

      const {
        limit = 30,
        days = 30,
      } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          message:
            "Currency code is required",
        });
      }

      const history =
        await exchangeRateService.getRateHistory(
          code,
          "RWF",
          {
            limit:
              Math.min(
                Math.max(
                  Number(limit) || 30,
                  1
                ),
                200
              ),

            days:
              Math.min(
                Math.max(
                  Number(days) || 30,
                  1
                ),
                3650
              ),
          }
        );

      const formattedHistory =
        Array.isArray(history)
          ? history.map(
              (item) => ({
                rate:
                  item.rate,

                effectiveDate:
                  item.effectiveDate,

                source:
                  item.source,

                sourceProvider:
                  item.sourceProvider,
              })
            )
          : [];

      return res.json({
        success: true,

        currency:
          code,

        history:
          formattedHistory,

        total:
          formattedHistory.length,
      });
    } catch (error) {
      console.error(
        "❌ Get exchange rate history error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get exchange-rate history",
      });
    }
  };

// ============================================================
// TOGGLE CURRENCY STATUS
// ADMIN ONLY
// ============================================================

export const toggleCurrencyStatus =
  async (req, res) => {
    try {
      const code =
        normalizeCode(
          req.params?.code
        );

      if (!code) {
        return res.status(400).json({
          success: false,
          message:
            "Currency code is required",
        });
      }

      const currency =
        await Currency.findOne({
          code,
        });

      if (!currency) {
        return res.status(404).json({
          success: false,
          message:
            `Currency ${code} not found`,
        });
      }

      if (
        currency.isDefault &&
        currency.isActive
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot deactivate the default currency",
        });
      }

      currency.isActive =
        !currency.isActive;

      currency.updatedBy =
        getUserId(req) ||
        undefined;

      await currency.save();

      clearCurrencyCaches();

      const status =
        currency.isActive
          ? "activated"
          : "deactivated";

      console.log(
        `✅ Currency ${code} ${status} by ${getUserEmail(req)}`
      );

      return res.json({
        success: true,

        message:
          `Currency ${code} ${status}`,

        currency: {
          code:
            currency.code,

          isActive:
            currency.isActive,

          status,
        },
      });
    } catch (error) {
      console.error(
        "❌ Toggle currency status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to toggle currency status",
      });
    }
  };

// ============================================================
// SET DEFAULT CURRENCY
// ADMIN ONLY
// ============================================================

export const setDefaultCurrency =
  async (req, res) => {
    try {
      const code =
        normalizeCode(
          req.params?.code
        );

      if (!code) {
        return res.status(400).json({
          success: false,
          message:
            "Currency code is required",
        });
      }

      const currency =
        await Currency.findOne({
          code,
        });

      if (!currency) {
        return res.status(404).json({
          success: false,
          message:
            `Currency ${code} not found`,
        });
      }

      if (!currency.isActive) {
        return res.status(400).json({
          success: false,
          message:
            `Currency ${code} is not active`,
        });
      }

      await Currency.updateMany(
        {
          _id: {
            $ne:
              currency._id,
          },

          isDefault:
            true,
        },

        {
          isDefault:
            false,
        }
      );

      currency.isDefault =
        true;

      currency.updatedBy =
        getUserId(req) ||
        undefined;

      await currency.save();

      clearCurrencyCaches();

      console.log(
        `✅ Default currency set to ${code} by ${getUserEmail(req)}`
      );

      return res.json({
        success: true,

        message:
          `Default currency set to ${code}`,

        currency: {
          code:
            currency.code,

          isDefault:
            currency.isDefault,

          formatted:
            await formatCurrencyAmount(
              1,
              currency.code
            ),
        },
      });
    } catch (error) {
      console.error(
        "❌ Set default currency error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to set default currency",
      });
    }
  };

// ============================================================
// SET BASE CURRENCY
// ADMIN ONLY
// ============================================================

export const setBaseCurrency =
  async (req, res) => {
    try {
      const code =
        normalizeCode(
          req.params?.code
        );

      if (!code) {
        return res.status(400).json({
          success: false,
          message:
            "Currency code is required",
        });
      }

      const currency =
        await Currency.findOne({
          code,
        });

      if (!currency) {
        return res.status(404).json({
          success: false,
          message:
            `Currency ${code} not found`,
        });
      }

      if (!currency.isActive) {
        return res.status(400).json({
          success: false,
          message:
            `Currency ${code} is not active`,
        });
      }

      await Currency.updateMany(
        {
          _id: {
            $ne:
              currency._id,
          },

          isBaseCurrency:
            true,
        },

        {
          isBaseCurrency:
            false,
        }
      );

      currency.isBaseCurrency =
        true;

      currency.updatedBy =
        getUserId(req) ||
        undefined;

      await currency.save();

      clearCurrencyCaches();

      console.log(
        `✅ Base currency set to ${code} by ${getUserEmail(req)}`
      );

      return res.json({
        success: true,

        message:
          `Base currency set to ${code}`,

        currency: {
          code:
            currency.code,

          isBaseCurrency:
            currency.isBaseCurrency,
        },
      });
    } catch (error) {
      console.error(
        "❌ Set base currency error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to set base currency",
      });
    }
  };

// ============================================================
// BULK UPDATE EXCHANGE RATES
// ADMIN ONLY
// ============================================================

export const bulkUpdateExchangeRates =
  async (req, res) => {
    try {
      const {
        rates,
        source = "admin",
      } = req.body;

      if (
        !rates ||
        typeof rates !== "object" ||
        Array.isArray(rates)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rates object is required",
        });
      }

      const results = [];
      const errors = [];

      for (
        const [
          code,
          rawRate,
        ] of Object.entries(rates)
      ) {
        try {
          const upperCode =
            normalizeCode(code);

          const numericRate =
            Number(rawRate);

          if (
            !upperCode
          ) {
            errors.push({
              code,
              error:
                "Currency code is required",
            });

            continue;
          }

          if (
            upperCode === "RWF"
          ) {
            errors.push({
              code:
                upperCode,

              error:
                "RWF is the base currency",
            });

            continue;
          }

          if (
            !Number.isFinite(
              numericRate
            ) ||
            numericRate <= 0
          ) {
            errors.push({
              code:
                upperCode,

              error:
                "Rate must be greater than 0",
            });

            continue;
          }

          const currency =
            await Currency.findOne({
              code:
                upperCode,
            });

          if (!currency) {
            errors.push({
              code:
                upperCode,

              error:
                "Currency not found",
            });

            continue;
          }

          const oldRate =
            Number(
              currency.exchangeRate
            );

          currency.exchangeRate =
            numericRate;

          currency.exchangeRateUpdatedAt =
            new Date();

          currency.exchangeRateSource =
            source;

          currency.updatedBy =
            getUserId(req) ||
            undefined;

          await currency.save();

          // ✅ FOREIGN -> RWF
          await ExchangeRate.setRate(
            upperCode,
            "RWF",
            numericRate,
            {
              source,

              sourceProvider:
                source ===
                "manual"
                  ? "manual"
                  : source,

              createdBy:
                getUserId(req) ||
                undefined,

              metadata: {
                oldRate,
                bulkUpdate:
                  true,
              },
            }
          );

          results.push({
            code:
              upperCode,

            oldRate,

            newRate:
              numericRate,

            success:
              true,
          });
        } catch (error) {
          errors.push({
            code,
            error:
              error.message,
          });
        }
      }

      clearCurrencyCaches();

      console.log(
        `✅ Bulk exchange rates updated: ${results.length} currencies by ${getUserEmail(req)}`
      );

      return res.json({
        success: true,

        message:
          `Updated ${results.length} currencies`,

        results,
        errors,

        totalProcessed:
          results.length +
          errors.length,

        successful:
          results.length,

        failed:
          errors.length,
      });
    } catch (error) {
      console.error(
        "❌ Bulk update exchange rates error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update exchange rates",
      });
    }
  };

// ============================================================
// GET CURRENCY STATISTICS
// ADMIN ONLY
// ============================================================

export const getCurrencyStats = async (
  req,
  res
) => {
  try {
    const stats =
      await currencyService.getCurrencyStats();

    const rateStats =
      await exchangeRateService.getRateStats();

    const settlementStats =
      await settlementService.getSettlementStats();

    return res.json({
      success: true,

      stats: {
        ...stats,

        exchangeRates:
          rateStats,

        settlement:
          settlementStats,

        lastUpdated:
          new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "❌ Get currency stats error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get currency statistics",
    });
  }
};

// ============================================================
// GET SUPPORTED CURRENCIES
// PUBLIC
// ============================================================

export const getSupportedCurrencies =
  async (req, res) => {
    try {
      const currencies =
        await currencyService.getActiveCurrencies();

      const formattedCurrencies =
        await Promise.all(
          currencies.map(
            async (currency) => ({
              code:
                currency.code,

              symbol:
                currency.symbol,

              name:
                currency.name,

              decimalPlaces:
                currency.decimalPlaces,

              isDefault:
                Boolean(
                  currency.isDefault
                ),

              paymentMethods:
                currency.paymentMethods ||
                [],

              settlementAllowed:
                currency.settlementAllowed !==
                false,

              formatted:
                await formatCurrencyAmount(
                  1,
                  currency.code
                ),
            })
          )
        );

      const defaultCurrency =
        typeof currencyService?.getDefaultCurrencyCode ===
        "function"
          ? await currencyService.getDefaultCurrencyCode()
          : "RWF";

      return res.json({
        success: true,

        currencies:
          formattedCurrencies,

        defaultCurrency:
          normalizeCode(
            defaultCurrency
          ),

        total:
          formattedCurrencies.length,
      });
    } catch (error) {
      console.error(
        "❌ Get supported currencies error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get supported currencies",
      });
    }
  };

// ============================================================
// CONVERT AMOUNT
// PUBLIC
// ============================================================

export const convertAmount = async (
  req,
  res
) => {
  try {
    const {
      amount,
      from,
      to,
      round = "true",
    } = req.query;

    console.log(
      "🔍 Convert amount request:",
      {
        amount,
        from,
        to,
        round,
      }
    );

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Amount is required",
      });
    }

    if (!from) {
      return res.status(400).json({
        success: false,
        message:
          "From currency is required",
      });
    }

    if (!to) {
      return res.status(400).json({
        success: false,
        message:
          "To currency is required",
      });
    }

    const amountNum =
      Number(amount);

    if (
      !Number.isFinite(
        amountNum
      ) ||
      amountNum <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Amount must be a positive number",
      });
    }

    const fromCurrency =
      normalizeCode(from);

    const toCurrency =
      normalizeCode(to);

    if (
      !fromCurrency ||
      !toCurrency
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid currency code",
      });
    }

    console.log(
      `🔍 Converting ${amountNum} from ${fromCurrency} to ${toCurrency}`
    );

    // ----------------------------------------------------------
    // SUPPORTED CURRENCIES
    // ----------------------------------------------------------

    const [
      fromSupported,
      toSupported,
    ] = await Promise.all([
      isCurrencySupported(
        fromCurrency
      ),
      isCurrencySupported(
        toCurrency
      ),
    ]);

    if (!fromSupported) {
      return res.status(400).json({
        success: false,
        message:
          `Currency ${fromCurrency} is not supported`,
      });
    }

    if (!toSupported) {
      return res.status(400).json({
        success: false,
        message:
          `Currency ${toCurrency} is not supported`,
      });
    }

    // ----------------------------------------------------------
    // SAME CURRENCY
    // ----------------------------------------------------------

    if (
      fromCurrency ===
      toCurrency
    ) {
      const formatted =
        await formatCurrencyAmount(
          amountNum,
          toCurrency
        );

      console.log(
        `✅ Conversion successful: ${amountNum} ${fromCurrency} = ${amountNum} ${toCurrency}`
      );

      return res.json({
        success: true,

        from:
          fromCurrency,

        to:
          toCurrency,

        amount:
          amountNum,

        convertedAmount:
          amountNum,

        rate:
          1,

        effectiveDate:
          new Date(),

        source:
          "same_currency",

        formatted: {
          from:
            await formatCurrencyAmount(
              amountNum,
              fromCurrency
            ),

          to:
            formatted,
        },
      });
    }

    // ----------------------------------------------------------
    // CURRENT CURRENCYSERVICE CONTRACT
    // ----------------------------------------------------------
    //
    // IMPORTANT:
    //
    // currencyService.convertAmount()
    //
    // returns:
    //
    // NUMBER
    //
    // It does NOT return:
    //
    // {
    //   convertedAmount,
    //   rate
    // }
    //
    // Therefore:
    //
    // 1. ask exchangeRateService for rate
    // 2. ask currencyService for converted amount
    //
    // ----------------------------------------------------------

    const rateResult =
      await exchangeRateService.getRate(
        fromCurrency,
        toCurrency
      );

    const rate =
      typeof rateResult ===
      "object"
        ? Number(
            rateResult?.rate
          )
        : Number(rateResult);

    if (
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          `Exchange rate not found for ${fromCurrency}/${toCurrency}`,
      });
    }

    const shouldRound =
      String(round)
        .toLowerCase() !==
      "false";

    const convertedRaw =
      await currencyService.convertAmount(
        amountNum,
        fromCurrency,
        toCurrency,
        {
          round:
            shouldRound,
        }
      );

    const convertedAmount =
      Number(
        convertedRaw
      );

    if (
      !Number.isFinite(
        convertedAmount
      )
    ) {
      throw new Error(
        "Currency conversion produced an invalid amount"
      );
    }

    const effectiveDate =
      typeof rateResult ===
      "object"
        ? rateResult?.effectiveDate ||
          null
        : null;

    const source =
      typeof rateResult ===
      "object"
        ? rateResult?.source ||
          "exchange_rate_service"
        : "exchange_rate_service";

    console.log(
      `✅ Conversion successful: ${amountNum} ${fromCurrency} = ${convertedAmount} ${toCurrency} @ ${rate}`
    );

    return res.json({
      success: true,

      from:
        fromCurrency,

      to:
        toCurrency,

      amount:
        amountNum,

      convertedAmount,

      rate,

      effectiveDate,

      source,

      formatted: {
        from:
          await formatCurrencyAmount(
            amountNum,
            fromCurrency
          ),

        to:
          await formatCurrencyAmount(
            convertedAmount,
            toCurrency
          ),
      },
    });
  } catch (error) {
    console.error(
      "❌ Convert amount error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to convert amount",
    });
  }
};

// ============================================================
// DELETE CURRENCY
// ADMIN ONLY
// ============================================================

export const deleteCurrency = async (
  req,
  res
) => {
  try {
    const code =
      normalizeCode(
        req.params?.code
      );

    if (!code) {
      return res.status(400).json({
        success: false,
        message:
          "Currency code is required",
      });
    }

    const currency =
      await Currency.findOne({
        code,
      });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message:
          `Currency ${code} not found`,
      });
    }

    if (
      currency.isDefault
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete the default currency",
      });
    }

    if (
      currency.isBaseCurrency
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete the base currency",
      });
    }

    const hasPayments =
      await Payment.findOne({
        currency:
          code,
      });

    if (hasPayments) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot delete ${code} because it has payments`,
      });
    }

    await Currency.deleteOne({
      _id:
        currency._id,
    });

    clearCurrencyCaches();

    console.log(
      `✅ Currency ${code} deleted by ${getUserEmail(req)}`
    );

    return res.json({
      success: true,
      message:
        `Currency ${code} deleted successfully`,
    });
  } catch (error) {
    console.error(
      "❌ Delete currency error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to delete currency",
    });
  }
};

// ============================================================
// GET PLATFORM FEES
// ADMIN / PUBLIC
// ============================================================

export const getPlatformFees =
  async (req, res) => {
    try {
      const currencies =
        await Currency.find({
          isActive: true,
        })
          .select(
            "code symbol name platformFeePercentage"
          )
          .lean();

      const fees =
        currencies.map(
          (currency) => ({
            code:
              currency.code,

            symbol:
              currency.symbol,

            name:
              currency.name,

            // ✅ MVP = 0%
            percentage:
              0,

            formatted:
              "0%",
          })
        );

      return res.json({
        success: true,
        fees,
      });
    } catch (error) {
      console.error(
        "❌ Get platform fees error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get platform fees",
      });
    }
  };

// ============================================================
// GET PROVIDER SETTLEMENT CURRENCY
// PROVIDER / ADMIN
// ============================================================

export const getProviderSettlementCurrency =
  async (req, res) => {
    try {
      const providerId =
        getUserId(req);

      if (
        req.user?.role !==
          "provider" &&
        req.user?.role !==
          "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only providers can access settlement currency",
        });
      }

      if (!providerId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      const currency =
        normalizeCode(
          await settlementService.getProviderSettlementCurrency(
            providerId
          )
        );

      const currencyInfo =
        await getCurrencyInfo(
          currency
        );

      return res.json({
        success: true,

        currency,

        currencyInfo: {
          code:
            currencyInfo?.code ||
            currency,

          symbol:
            currencyInfo?.symbol ||
            currency,

          name:
            currencyInfo?.name ||
            currency,

          formatted:
            await formatCurrencyAmount(
              1,
              currency
            ),
        },

        supportedCurrencies:
          await settlementService.getAllowedSettlementCurrencies(),
      });
    } catch (error) {
      console.error(
        "❌ Get provider settlement currency error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get provider settlement currency",
      });
    }
  };

// ============================================================
// UPDATE PROVIDER SETTLEMENT CURRENCY
// PROVIDER / ADMIN
// ============================================================

export const updateProviderSettlementCurrency =
  async (req, res) => {
    try {
      const providerId =
        getUserId(req);

      const {
        currency,
      } = req.body;

      if (
        !currency
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Currency is required",
        });
      }

      if (
        req.user?.role !==
          "provider" &&
        req.user?.role !==
          "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only providers can update settlement currency",
        });
      }

      const upperCode =
        normalizeCode(
          currency
        );

      const isAllowed =
        await settlementService.isCurrencyAllowedForSettlement(
          upperCode
        );

      if (!isAllowed) {
        return res.status(400).json({
          success: false,
          message:
            `Currency ${upperCode} is not allowed for settlement`,
        });
      }

      await settlementService.updateProviderSettlementCurrency(
        providerId,
        upperCode
      );

      return res.json({
        success: true,

        message:
          `Settlement currency updated to ${upperCode}`,

        currency:
          upperCode,

        updatedAt:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "❌ Update provider settlement currency error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update settlement currency",
      });
    }
  };

// ============================================================
// GET USER PREFERRED CURRENCY
// USER
// ============================================================

export const getUserPreferredCurrency =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      const user =
        await User.findById(
          userId
        ).select(
          "preferredCurrency"
        );

      const currency =
        normalizeCode(
          user?.preferredCurrency ||
          "RWF"
        );

      const currencyInfo =
        await getCurrencyInfo(
          currency
        );

      return res.json({
        success: true,

        currency,

        currencyInfo: {
          code:
            currencyInfo?.code ||
            currency,

          symbol:
            currencyInfo?.symbol ||
            currency,

          name:
            currencyInfo?.name ||
            currency,

          formatted:
            await formatCurrencyAmount(
              1,
              currency
            ),
        },
      });
    } catch (error) {
      console.error(
        "❌ Get user preferred currency error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get preferred currency",
      });
    }
  };

// ============================================================
// UPDATE USER PREFERRED CURRENCY
// USER
// ============================================================

export const updateUserPreferredCurrency =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const {
        currency,
      } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (!currency) {
        return res.status(400).json({
          success: false,
          message:
            "Currency is required",
        });
      }

      const upperCode =
        normalizeCode(
          currency
        );

      const isSupported =
        await isCurrencySupported(
          upperCode
        );

      if (!isSupported) {
        return res.status(400).json({
          success: false,
          message:
            `Currency ${upperCode} is not supported`,
        });
      }

      await User.findByIdAndUpdate(
        userId,

        {
          preferredCurrency:
            upperCode,
        },

        {
          new: true,
        }
      );

      return res.json({
        success: true,

        message:
          `Preferred currency updated to ${upperCode}`,

        currency:
          upperCode,

        updatedAt:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "❌ Update user preferred currency error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update preferred currency",
      });
    }
  };

// ============================================================
// GET ALLOWED SETTLEMENT CURRENCIES
// PUBLIC / PROVIDER
// ============================================================

export const getAllowedSettlementCurrencies =
  async (req, res) => {
    try {
      const currencies =
        await settlementService.getAllowedSettlementCurrencies();

      const formattedCurrencies =
        await Promise.all(
          currencies.map(
            async (currency) => ({
              code:
                currency.code,

              symbol:
                currency.symbol,

              name:
                currency.name,

              decimalPlaces:
                currency.decimalPlaces,

              formatted:
                await formatCurrencyAmount(
                  1,
                  currency.code
                ),
            })
          )
        );

      return res.json({
        success: true,

        currencies:
          formattedCurrencies,

        total:
          formattedCurrencies.length,
      });
    } catch (error) {
      console.error(
        "❌ Get allowed settlement currencies error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get settlement currencies",
      });
    }
  };

// ============================================================
// GET CURRENCY EXCHANGE RATE
// PUBLIC
// ============================================================

export const getCurrencyExchangeRate =
  async (req, res) => {
    try {
      const {
        from,
        to,
      } = req.query;

      const fromCurrency =
        normalizeCode(from);

      const toCurrency =
        normalizeCode(to);

      if (
        !fromCurrency ||
        !toCurrency
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Both 'from' and 'to' currencies are required",
        });
      }

      const rateResult =
        await exchangeRateService.getRate(
          fromCurrency,
          toCurrency
        );

      const numericRate =
        typeof rateResult ===
        "object"
          ? Number(
              rateResult?.rate
            )
          : Number(rateResult);

      if (
        !Number.isFinite(
          numericRate
        ) ||
        numericRate <= 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            `Exchange rate not found for ${fromCurrency}/${toCurrency}`,
        });
      }

      const effectiveDate =
        typeof rateResult ===
        "object"
          ? rateResult?.effectiveDate ||
            null
          : null;

      const source =
        typeof rateResult ===
        "object"
          ? rateResult?.source ||
            "exchange_rate_service"
          : "exchange_rate_service";

      const expiresAt =
        typeof rateResult ===
        "object"
          ? rateResult?.expiresAt ||
            null
          : null;

      return res.json({
        success: true,

        from:
          fromCurrency,

        to:
          toCurrency,

        rate:
          numericRate,

        inverseRate:
          1 / numericRate,

        effectiveDate,

        source,

        expiresAt,

        formatted: {
          from:
            await formatCurrencyAmount(
              1,
              fromCurrency
            ),

          to:
            await formatCurrencyAmount(
              numericRate,
              toCurrency
            ),
        },
      });
    } catch (error) {
      console.error(
        "❌ Get currency exchange rate error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to get exchange rate",
      });
    }
  };