// backend/src/controllers/currencyController.js
// ✅ COMPLETE FIXED - Multi-Currency Controller with Full CRUD
// ✅ Added missing Payment import
// ✅ Added provider settlement currency endpoints
// ✅ Added user preferred currency endpoints
// ✅ Added currency validation and error handling
// ✅ Added debug logging for convertAmount

import Currency from "../models/Currency.js";
import ExchangeRate from "../models/ExchangeRate.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import currencyService from "../services/currencyService.js";
import exchangeRateService from "../services/exchangeRateService.js";
import settlementService from "../services/settlementService.js";
import { createNotification } from "../utils/notificationService.js";

// ============================================================
// ✅ GET ALL CURRENCIES
// ============================================================

export const getCurrencies = async (req, res) => {
  try {
    const { active = null } = req.query;

    let currencies;
    if (active === 'true') {
      currencies = await currencyService.getActiveCurrencies();
    } else if (active === 'false') {
      currencies = await Currency.find({ isActive: false });
    } else {
      currencies = await Currency.find().sort({ isDefault: -1, code: 1 });
    }

    const formattedCurrencies = currencies.map(c => ({
      ...c.toObject ? c.toObject() : c,
      formattedRate: currencyService.formatAmount(1, c.code),
      isDefault: c.isDefault || false,
      isBase: c.isBaseCurrency || false,
    }));

    res.json({
      success: true,
      currencies: formattedCurrencies,
      total: currencies.length,
    });
  } catch (error) {
    console.error("❌ Get currencies error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET CURRENCY BY CODE
// ============================================================

export const getCurrencyByCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required"
      });
    }

    const currency = await currencyService.getCurrencyByCode(code);

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: `Currency ${code} not found`
      });
    }

    res.json({
      success: true,
      currency: {
        ...currency,
        formattedRate: currencyService.formatAmount(1, currency.code),
      },
    });
  } catch (error) {
    console.error("❌ Get currency by code error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET DEFAULT CURRENCY
// ============================================================

export const getDefaultCurrency = async (req, res) => {
  try {
    const currency = await currencyService.getDefaultCurrency();

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: "No default currency found"
      });
    }

    res.json({
      success: true,
      currency: {
        ...currency,
        formattedRate: currencyService.formatAmount(1, currency.code),
      },
    });
  } catch (error) {
    console.error("❌ Get default currency error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ CREATE CURRENCY (Admin Only)
// ============================================================

export const createCurrency = async (req, res) => {
  try {
    const {
      code,
      symbol,
      name,
      decimalPlaces = 2,
      exchangeRate = 1,
      platformFeePercentage = 10,
      paymentMethods = [],
      settlementAllowed = true,
      isActive = true,
      isDefault = false,
      isBaseCurrency = false,
      format = {},
      countryCodes = [],
    } = req.body;

    // ✅ Validate required fields
    if (!code || !symbol || !name) {
      return res.status(400).json({
        success: false,
        message: "Code, symbol, and name are required"
      });
    }

    const upperCode = code.toUpperCase();

    // ✅ Check if currency already exists
    const existing = await Currency.findOne({ code: upperCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Currency ${upperCode} already exists`
      });
    }

    // ✅ Create currency
    const currency = new Currency({
      code: upperCode,
      symbol,
      name,
      decimalPlaces,
      exchangeRate,
      platformFeePercentage,
      paymentMethods,
      settlementAllowed,
      isActive,
      isDefault,
      isBaseCurrency,
      format: {
        locale: format.locale || 'en-US',
        currencyDisplay: format.currencyDisplay || 'symbol',
        position: format.position || 'before',
      },
      countryCodes,
      createdBy: req.user._id,
    });

    await currency.save();

    // ✅ If this is the base currency, update exchange rate history
    if (isBaseCurrency) {
      await ExchangeRate.setRate(
        upperCode,
        'USD',
        exchangeRate,
        {
          source: 'admin',
          sourceProvider: 'manual',
          createdBy: req.user._id,
          metadata: { created: true },
        }
      );
    }

    // ✅ Clear cache
    currencyService.clearCache();

    // ✅ Log creation
    console.log(`✅ Currency created: ${upperCode} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: `Currency ${upperCode} created successfully`,
      currency: {
        ...currency.toObject(),
        formattedRate: currencyService.formatAmount(1, currency.code),
      },
    });
  } catch (error) {
    console.error("❌ Create currency error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ UPDATE CURRENCY (Admin Only)
// ============================================================

export const updateCurrency = async (req, res) => {
  try {
    const { code } = req.params;
    const updates = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required"
      });
    }

    const upperCode = code.toUpperCase();
    const currency = await Currency.findOne({ code: upperCode });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: `Currency ${upperCode} not found`
      });
    }

    // ✅ Prevent changing code
    delete updates.code;

    // ✅ Track what changed for logging
    const changes = [];
    const oldExchangeRate = currency.exchangeRate;

    // ✅ Apply updates
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && updates[key] !== null) {
        if (key === 'exchangeRate' && updates[key] !== oldExchangeRate) {
          changes.push(`exchangeRate: ${oldExchangeRate} → ${updates[key]}`);
        }
        currency[key] = updates[key];
      }
    });

    // ✅ If exchange rate changed, update history
    if (updates.exchangeRate && updates.exchangeRate !== oldExchangeRate) {
      await ExchangeRate.setRate(
        currency.code,
        'USD',
        updates.exchangeRate,
        {
          source: 'admin',
          sourceProvider: 'manual',
          createdBy: req.user._id,
          metadata: { updated: true, oldRate: oldExchangeRate },
        }
      );
      currency.exchangeRateUpdatedAt = new Date();
      currency.exchangeRateSource = 'admin';
    }

    currency.updatedBy = req.user._id;
    await currency.save();

    // ✅ Clear cache
    currencyService.clearCache();

    // ✅ Log update
    console.log(`✅ Currency updated: ${upperCode} by ${req.user.email}`);
    if (changes.length > 0) {
      console.log(`📝 Changes: ${changes.join(', ')}`);
    }

    res.json({
      success: true,
      message: `Currency ${upperCode} updated successfully`,
      currency: {
        ...currency.toObject(),
        formattedRate: currencyService.formatAmount(1, currency.code),
      },
      changes,
    });
  } catch (error) {
    console.error("❌ Update currency error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ UPDATE EXCHANGE RATE (Admin Only)
// ============================================================

export const updateExchangeRate = async (req, res) => {
  try {
    const { code } = req.params;
    const { rate, source = 'admin' } = req.body;

    if (!code || !rate) {
      return res.status(400).json({
        success: false,
        message: "Currency code and rate are required"
      });
    }

    if (rate <= 0) {
      return res.status(400).json({
        success: false,
        message: "Exchange rate must be greater than 0"
      });
    }

    const upperCode = code.toUpperCase();
    const currency = await Currency.findOne({ code: upperCode });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: `Currency ${upperCode} not found`
      });
    }

    const oldRate = currency.exchangeRate;

    // ✅ Update currency
    currency.exchangeRate = rate;
    currency.exchangeRateUpdatedAt = new Date();
    currency.exchangeRateSource = source;
    currency.updatedBy = req.user._id;
    await currency.save();

    // ✅ Save to exchange rate history
    await ExchangeRate.setRate(
      'RWF',
      upperCode,
      rate,
      {
        source: source,
        sourceProvider: source === 'manual' ? 'manual' : source,
        createdBy: req.user._id,
        metadata: { oldRate, updatedBy: req.user.email },
      }
    );

    // ✅ Clear cache
    currencyService.clearCache();
    exchangeRateService.clearCache();

    // ✅ Log update
    console.log(`✅ Exchange rate updated: ${upperCode} ${oldRate} → ${rate} by ${req.user.email}`);

    res.json({
      success: true,
      message: `Exchange rate for ${upperCode} updated from ${oldRate} to ${rate}`,
      currency: {
        code: currency.code,
        exchangeRate: currency.exchangeRate,
        oldRate,
        updatedAt: currency.exchangeRateUpdatedAt,
        source: currency.exchangeRateSource,
        formatted: currencyService.formatAmount(rate, currency.code),
      },
    });
  } catch (error) {
    console.error("❌ Update exchange rate error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET EXCHANGE RATE HISTORY
// ============================================================

export const getExchangeRateHistory = async (req, res) => {
  try {
    const { code } = req.params;
    const { limit = 30, days = 30 } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required"
      });
    }

    const upperCode = code.toUpperCase();
    const history = await exchangeRateService.getRateHistory(
      'RWF',
      upperCode,
      { limit: parseInt(limit), days: parseInt(days) }
    );

    res.json({
      success: true,
      currency: upperCode,
      history: history.map(h => ({
        rate: h.rate,
        effectiveDate: h.effectiveDate,
        source: h.source,
        sourceProvider: h.sourceProvider,
      })),
      total: history.length,
    });
  } catch (error) {
    console.error("❌ Get exchange rate history error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ TOGGLE CURRENCY STATUS (Admin Only)
// ============================================================

export const toggleCurrencyStatus = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required"
      });
    }

    const upperCode = code.toUpperCase();
    const currency = await Currency.findOne({ code: upperCode });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: `Currency ${upperCode} not found`
      });
    }

    // ✅ Prevent deactivating default currency
    if (currency.isDefault && currency.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate the default currency"
      });
    }

    currency.isActive = !currency.isActive;
    currency.updatedBy = req.user._id;
    await currency.save();

    // ✅ Clear cache
    currencyService.clearCache();

    const status = currency.isActive ? 'activated' : 'deactivated';

    // ✅ Log action
    console.log(`✅ Currency ${upperCode} ${status} by ${req.user.email}`);

    res.json({
      success: true,
      message: `Currency ${upperCode} ${status}`,
      currency: {
        code: currency.code,
        isActive: currency.isActive,
        status,
      },
    });
  } catch (error) {
    console.error("❌ Toggle currency status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ SET DEFAULT CURRENCY (Admin Only)
// ============================================================

export const setDefaultCurrency = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required"
      });
    }

    const upperCode = code.toUpperCase();
    const currency = await Currency.findOne({ code: upperCode });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: `Currency ${upperCode} not found`
      });
    }

    if (!currency.isActive) {
      return res.status(400).json({
        success: false,
        message: `Currency ${upperCode} is not active`
      });
    }

    // ✅ Remove default from all others
    await Currency.updateMany(
      { _id: { $ne: currency._id }, isDefault: true },
      { isDefault: false }
    );

    currency.isDefault = true;
    currency.updatedBy = req.user._id;
    await currency.save();

    // ✅ Clear cache
    currencyService.clearCache();

    // ✅ Log action
    console.log(`✅ Default currency set to ${upperCode} by ${req.user.email}`);

    res.json({
      success: true,
      message: `Default currency set to ${upperCode}`,
      currency: {
        code: currency.code,
        isDefault: currency.isDefault,
        formatted: currencyService.formatAmount(1, currency.code),
      },
    });
  } catch (error) {
    console.error("❌ Set default currency error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ SET BASE CURRENCY (Admin Only)
// ============================================================

export const setBaseCurrency = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required"
      });
    }

    const upperCode = code.toUpperCase();
    const currency = await Currency.findOne({ code: upperCode });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: `Currency ${upperCode} not found`
      });
    }

    if (!currency.isActive) {
      return res.status(400).json({
        success: false,
        message: `Currency ${upperCode} is not active`
      });
    }

    // ✅ Remove base from all others
    await Currency.updateMany(
      { _id: { $ne: currency._id }, isBaseCurrency: true },
      { isBaseCurrency: false }
    );

    currency.isBaseCurrency = true;
    currency.updatedBy = req.user._id;
    await currency.save();

    // ✅ Clear cache
    currencyService.clearCache();

    // ✅ Log action
    console.log(`✅ Base currency set to ${upperCode} by ${req.user.email}`);

    res.json({
      success: true,
      message: `Base currency set to ${upperCode}`,
      currency: {
        code: currency.code,
        isBaseCurrency: currency.isBaseCurrency,
      },
    });
  } catch (error) {
    console.error("❌ Set base currency error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ BULK UPDATE EXCHANGE RATES (Admin Only)
// ============================================================

export const bulkUpdateExchangeRates = async (req, res) => {
  try {
    const { rates, source = 'admin' } = req.body;

    if (!rates || typeof rates !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Rates object is required"
      });
    }

    const results = [];
    const errors = [];

    for (const [code, rate] of Object.entries(rates)) {
      try {
        if (rate <= 0) {
          errors.push({ code, error: 'Rate must be greater than 0' });
          continue;
        }

        const upperCode = code.toUpperCase();
        const currency = await Currency.findOne({ code: upperCode });

        if (!currency) {
          errors.push({ code, error: 'Currency not found' });
          continue;
        }

        const oldRate = currency.exchangeRate;

        currency.exchangeRate = rate;
        currency.exchangeRateUpdatedAt = new Date();
        currency.exchangeRateSource = source;
        currency.updatedBy = req.user._id;
        await currency.save();

        // ✅ Save to exchange rate history
        await ExchangeRate.setRate(
          'RWF',
          upperCode,
          rate,
          {
            source: source,
            sourceProvider: source === 'manual' ? 'manual' : source,
            createdBy: req.user._id,
            metadata: { oldRate, bulkUpdate: true },
          }
        );

        results.push({
          code: upperCode,
          oldRate,
          newRate: rate,
          success: true,
        });
      } catch (error) {
        errors.push({ code, error: error.message });
      }
    }

    // ✅ Clear cache
    currencyService.clearCache();
    exchangeRateService.clearCache();

    // ✅ Log action
    console.log(`✅ Bulk exchange rates updated: ${results.length} currencies by ${req.user.email}`);

    res.json({
      success: true,
      message: `Updated ${results.length} currencies`,
      results,
      errors,
      totalProcessed: results.length + errors.length,
      successful: results.length,
      failed: errors.length,
    });
  } catch (error) {
    console.error("❌ Bulk update exchange rates error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET CURRENCY STATISTICS (Admin Only)
// ============================================================

export const getCurrencyStats = async (req, res) => {
  try {
    const stats = await currencyService.getCurrencyStats();

    // ✅ Get exchange rate stats
    const rateStats = await exchangeRateService.getRateStats();

    // ✅ Get settlement stats
    const settlementStats = await settlementService.getSettlementStats();

    res.json({
      success: true,
      stats: {
        ...stats,
        exchangeRates: rateStats,
        settlement: settlementStats,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Get currency stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET SUPPORTED CURRENCIES (Public)
// ============================================================

export const getSupportedCurrencies = async (req, res) => {
  try {
    const currencies = await currencyService.getActiveCurrencies();

    const formattedCurrencies = currencies.map(c => ({
      code: c.code,
      symbol: c.symbol,
      name: c.name,
      decimalPlaces: c.decimalPlaces,
      isDefault: c.isDefault || false,
      paymentMethods: c.paymentMethods || [],
      settlementAllowed: c.settlementAllowed !== false,
      formatted: currencyService.formatAmount(1, c.code),
    }));

    res.json({
      success: true,
      currencies: formattedCurrencies,
      defaultCurrency: await currencyService.getDefaultCurrency().then(c => c?.code || 'RWF'),
      total: formattedCurrencies.length,
    });
  } catch (error) {
    console.error("❌ Get supported currencies error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ CONVERT AMOUNT (Public) - WITH DEBUG LOGGING
// ============================================================

export const convertAmount = async (req, res) => {
  try {
    const { amount, from, to, round = true } = req.query;

    // ✅ Log the received parameters for debugging
    console.log('🔍 Convert amount request:', { amount, from, to, round });

    // ✅ Validate required parameters
    if (!amount) {
      console.warn('⚠️ Amount is missing');
      return res.status(400).json({
        success: false,
        message: "Amount is required"
      });
    }

    if (!from) {
      console.warn('⚠️ From currency is missing');
      return res.status(400).json({
        success: false,
        message: "From currency is required"
      });
    }

    if (!to) {
      console.warn('⚠️ To currency is missing');
      return res.status(400).json({
        success: false,
        message: "To currency is required"
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      console.warn(`⚠️ Invalid amount: ${amount}`);
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number"
      });
    }

    // ✅ Validate currencies
    const fromCurrency = from.toUpperCase();
    const toCurrency = to.toUpperCase();

    console.log(`🔍 Converting ${amountNum} from ${fromCurrency} to ${toCurrency}`);

    // ✅ Check if currencies are supported
    const isFromSupported = await currencyService.isCurrencyActive(fromCurrency);
    const isToSupported = await currencyService.isCurrencyActive(toCurrency);

    if (!isFromSupported && fromCurrency !== 'USD') {
      console.warn(`⚠️ Currency ${fromCurrency} is not supported`);
      return res.status(400).json({
        success: false,
        message: `Currency ${fromCurrency} is not supported`
      });
    }

    if (!isToSupported && toCurrency !== 'USD') {
      console.warn(`⚠️ Currency ${toCurrency} is not supported`);
      return res.status(400).json({
        success: false,
        message: `Currency ${toCurrency} is not supported`
      });
    }

    const result = await currencyService.convertAmount(
      amountNum,
      fromCurrency,
      toCurrency,
      { round: round === 'true' }
    );

    if (!result || result.error) {
      console.warn(`⚠️ Conversion failed: ${result?.error || 'Unknown error'}`);
      return res.status(404).json({
        success: false,
        message: result?.error || `Exchange rate not found for ${fromCurrency}/${toCurrency}`
      });
    }

    console.log(`✅ Conversion successful: ${amountNum} ${fromCurrency} = ${result.convertedAmount} ${toCurrency}`);

    res.json({
      success: true,
      from: fromCurrency,
      to: toCurrency,
      amount: amountNum,
      convertedAmount: result.convertedAmount,
      rate: result.rate,
      effectiveDate: result.effectiveDate,
      source: result.source,
      formatted: {
        from: currencyService.formatAmount(amountNum, fromCurrency),
        to: currencyService.formatAmount(result.convertedAmount, toCurrency),
      },
    });
  } catch (error) {
    console.error("❌ Convert amount error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to convert amount"
    });
  }
};

// ============================================================
// ✅ DELETE CURRENCY (Admin Only)
// ============================================================

export const deleteCurrency = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required"
      });
    }

    const upperCode = code.toUpperCase();
    const currency = await Currency.findOne({ code: upperCode });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: `Currency ${upperCode} not found`
      });
    }

    // ✅ Prevent deleting default currency
    if (currency.isDefault) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the default currency"
      });
    }

    // ✅ Prevent deleting base currency
    if (currency.isBaseCurrency) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the base currency"
      });
    }

    // ✅ Check if currency has payments
    const hasPayments = await Payment.findOne({ currency: upperCode });
    if (hasPayments) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ${upperCode} because it has payments`
      });
    }

    await Currency.deleteOne({ _id: currency._id });

    // ✅ Clear cache
    currencyService.clearCache();

    // ✅ Log action
    console.log(`✅ Currency ${upperCode} deleted by ${req.user.email}`);

    res.json({
      success: true,
      message: `Currency ${upperCode} deleted successfully`,
    });
  } catch (error) {
    console.error("❌ Delete currency error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET PLATFORM FEES BY CURRENCY (Admin/Public)
// ============================================================

export const getPlatformFees = async (req, res) => {
  try {
    const currencies = await Currency.find({ isActive: true })
      .select('code symbol name platformFeePercentage')
      .lean();

    const fees = currencies.map(c => ({
      code: c.code,
      symbol: c.symbol,
      name: c.name,
      percentage: c.platformFeePercentage || 0,
      formatted: `${c.platformFeePercentage || 0}%`,
    }));

    res.json({
      success: true,
      fees,
    });
  } catch (error) {
    console.error("❌ Get platform fees error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET PROVIDER SETTLEMENT CURRENCY (Provider)
// ============================================================

export const getProviderSettlementCurrency = async (req, res) => {
  try {
    const providerId = req.user._id;
    
    // ✅ Check if user is a provider
    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only providers can access settlement currency"
      });
    }

    const currency = await settlementService.getProviderSettlementCurrency(providerId);
    
    // Get currency details
    const currencyInfo = await currencyService.getCurrencyByCode(currency);

    res.json({
      success: true,
      currency,
      currencyInfo: {
        code: currencyInfo?.code || currency,
        symbol: currencyInfo?.symbol || currency,
        name: currencyInfo?.name || currency,
        formatted: currencyService.formatAmount(1, currency),
      },
      supportedCurrencies: await settlementService.getAllowedSettlementCurrencies(),
    });
  } catch (error) {
    console.error("❌ Get provider settlement currency error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ UPDATE PROVIDER SETTLEMENT CURRENCY (Provider)
// ============================================================

export const updateProviderSettlementCurrency = async (req, res) => {
  try {
    const providerId = req.user._id;
    const { currency } = req.body;

    if (!currency) {
      return res.status(400).json({
        success: false,
        message: "Currency is required"
      });
    }

    // ✅ Check if user is a provider
    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only providers can update settlement currency"
      });
    }

    const upperCode = currency.toUpperCase();
    
    // ✅ Validate currency is allowed for settlement
    const isAllowed = await settlementService.isCurrencyAllowedForSettlement(upperCode);
    if (!isAllowed) {
      return res.status(400).json({
        success: false,
        message: `Currency ${upperCode} is not allowed for settlement`
      });
    }

    const result = await settlementService.updateProviderSettlementCurrency(providerId, upperCode);

    res.json({
      success: true,
      message: `Settlement currency updated to ${upperCode}`,
      currency: upperCode,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Update provider settlement currency error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET USER PREFERRED CURRENCY (User)
// ============================================================

export const getUserPreferredCurrency = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('preferredCurrency');
    
    const currency = user?.preferredCurrency || 'RWF';
    
    // Get currency details
    const currencyInfo = await currencyService.getCurrencyByCode(currency);

    res.json({
      success: true,
      currency,
      currencyInfo: {
        code: currencyInfo?.code || currency,
        symbol: currencyInfo?.symbol || currency,
        name: currencyInfo?.name || currency,
        formatted: currencyService.formatAmount(1, currency),
      },
    });
  } catch (error) {
    console.error("❌ Get user preferred currency error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ UPDATE USER PREFERRED CURRENCY (User)
// ============================================================

export const updateUserPreferredCurrency = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currency } = req.body;

    if (!currency) {
      return res.status(400).json({
        success: false,
        message: "Currency is required"
      });
    }

    const upperCode = currency.toUpperCase();
    
    // ✅ Validate currency is supported
    const isSupported = await currencyService.isCurrencyActive(upperCode);
    if (!isSupported) {
      return res.status(400).json({
        success: false,
        message: `Currency ${upperCode} is not supported`
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { preferredCurrency: upperCode },
      { new: true }
    ).select('preferredCurrency');

    res.json({
      success: true,
      message: `Preferred currency updated to ${upperCode}`,
      currency: upperCode,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Update user preferred currency error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET ALLOWED SETTLEMENT CURRENCIES (Public/Provider)
// ============================================================

export const getAllowedSettlementCurrencies = async (req, res) => {
  try {
    const currencies = await settlementService.getAllowedSettlementCurrencies();
    
    const formattedCurrencies = currencies.map(c => ({
      code: c.code,
      symbol: c.symbol,
      name: c.name,
      decimalPlaces: c.decimalPlaces,
      formatted: currencyService.formatAmount(1, c.code),
    }));

    res.json({
      success: true,
      currencies: formattedCurrencies,
      total: formattedCurrencies.length,
    });
  } catch (error) {
    console.error("❌ Get allowed settlement currencies error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET CURRENCY EXCHANGE RATE (Public)
// ============================================================

export const getCurrencyExchangeRate = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Both 'from' and 'to' currencies are required"
      });
    }

    const rate = await exchangeRateService.getRate(from, to);

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: `Exchange rate not found for ${from}/${to}`
      });
    }

    res.json({
      success: true,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate: rate.rate,
      inverseRate: rate.inverseRate || 1 / rate.rate,
      effectiveDate: rate.effectiveDate,
      source: rate.source,
      expiresAt: rate.expiresAt,
      formatted: {
        from: currencyService.formatAmount(1, from),
        to: currencyService.formatAmount(rate.rate, to),
      },
    });
  } catch (error) {
    console.error("❌ Get currency exchange rate error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};