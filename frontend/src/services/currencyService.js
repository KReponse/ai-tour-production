// frontend/src/services/currencyService.js
// ✅ COMPLETE FIXED - Added validation and error handling for convertAmount
// ✅ Fixed 400 error on currency conversion

import axios from 'axios';
import API from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// =========================
// ✅ GET SUPPORTED CURRENCIES
// =========================

export const getSupportedCurrencies = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/currencies/supported`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Get supported currencies error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch currencies',
      currencies: [],
    };
  }
};

// =========================
// ✅ GET ALL CURRENCIES (Admin)
// =========================

export const getCurrencies = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/currencies`,
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Get currencies error:', error);
    throw error;
  }
};

// =========================
// ✅ GET DEFAULT CURRENCY
// =========================

export const getDefaultCurrency = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/currencies/default`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Get default currency error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch default currency',
      currency: null,
    };
  }
};

// =========================
// ✅ GET CURRENCY BY CODE
// =========================

export const getCurrencyByCode = async (code) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/currencies/${code}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Get currency ${code} error:`, error);
    throw error;
  }
};

// =========================
// ✅ GET PLATFORM FEES
// =========================

export const getPlatformFees = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/currencies/fees`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Get platform fees error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch platform fees',
      fees: [],
    };
  }
};

// =========================
// ✅ CONVERT AMOUNT - FIXED
// =========================

export const convertAmount = async (amount, fromCurrency, toCurrency, options = {}) => {
  try {
    // ✅ Validate inputs before making the request
    if (!amount || amount <= 0) {
      console.warn('⚠️ Invalid amount for conversion:', amount);
      return {
        success: false,
        message: 'Invalid amount',
        amount: 0,
        fromCurrency: fromCurrency || 'USD',
        toCurrency: toCurrency || 'USD',
        convertedAmount: 0,
        rate: 1,
      };
    }

    // ✅ Ensure currencies are valid strings
    if (!fromCurrency) {
      console.warn('⚠️ Missing fromCurrency, defaulting to USD');
      fromCurrency = 'USD';
    }

    if (!toCurrency) {
      console.warn('⚠️ Missing toCurrency, defaulting to USD');
      toCurrency = 'USD';
    }

    // ✅ Convert to uppercase and ensure proper format
    const from = fromCurrency.toUpperCase().trim();
    const to = toCurrency.toUpperCase().trim();

    console.log(`🔍 Converting ${amount} from ${from} to ${to}`);

    const token = localStorage.getItem('token');
    const { round = true } = options;
    
    const response = await axios.get(
      `${API_URL}/currencies/convert`,
      {
        params: {
          amount: parseFloat(amount),
          from: from,
          to: to,
          round,
        },
        headers: token ? {
          Authorization: `Bearer ${token}`,
        } : {},
        timeout: 10000
      }
    );

    console.log(`✅ Conversion successful: ${amount} ${from} = ${response.data?.convertedAmount} ${to}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Convert amount error:`, error.response?.data || error.message);
    
    // ✅ Return a graceful fallback
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to convert amount',
      amount: parseFloat(amount) || 0,
      fromCurrency: fromCurrency || 'USD',
      toCurrency: toCurrency || 'USD',
      convertedAmount: parseFloat(amount) || 0,
      rate: 1,
    };
  }
};

// =========================
// ✅ ADMIN: CREATE CURRENCY
// =========================

export const createCurrency = async (data) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.post(
      `${API_URL}/currencies`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Create currency error:', error);
    throw error;
  }
};

// =========================
// ✅ ADMIN: UPDATE CURRENCY
// =========================

export const updateCurrency = async (code, data) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.put(
      `${API_URL}/currencies/${code}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000
      }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Update currency ${code} error:`, error);
    throw error;
  }
};

// =========================
// ✅ ADMIN: DELETE CURRENCY
// =========================

export const deleteCurrency = async (code) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.delete(
      `${API_URL}/currencies/${code}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Delete currency ${code} error:`, error);
    throw error;
  }
};

// =========================
// ✅ ADMIN: UPDATE EXCHANGE RATE
// =========================

export const updateExchangeRate = async (code, rate, source = 'admin') => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.put(
      `${API_URL}/currencies/${code}/exchange-rate`,
      { rate, source },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000
      }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Update exchange rate for ${code} error:`, error);
    throw error;
  }
};

// =========================
// ✅ ADMIN: GET EXCHANGE RATE HISTORY
// =========================

export const getExchangeRateHistory = async (code, params = {}) => {
  try {
    const token = localStorage.getItem('token');
    const { limit = 30, days = 30 } = params;
    
    const response = await axios.get(
      `${API_URL}/currencies/${code}/history`,
      {
        params: { limit, days },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Get exchange rate history for ${code} error:`, error);
    throw error;
  }
};

// =========================
// ✅ ADMIN: TOGGLE CURRENCY STATUS
// =========================

export const toggleCurrencyStatus = async (code) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.put(
      `${API_URL}/currencies/${code}/toggle`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Toggle currency ${code} status error:`, error);
    throw error;
  }
};

// =========================
// ✅ ADMIN: SET DEFAULT CURRENCY
// =========================

export const setDefaultCurrency = async (code) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.put(
      `${API_URL}/currencies/${code}/default`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Set default currency ${code} error:`, error);
    throw error;
  }
};

// =========================
// ✅ ADMIN: SET BASE CURRENCY
// =========================

export const setBaseCurrency = async (code) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.put(
      `${API_URL}/currencies/${code}/base`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Set base currency ${code} error:`, error);
    throw error;
  }
};

// =========================
// ✅ ADMIN: BULK UPDATE EXCHANGE RATES
// =========================

export const bulkUpdateExchangeRates = async (rates, source = 'admin') => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.post(
      `${API_URL}/currencies/bulk/rates`,
      { rates, source },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Bulk update exchange rates error:', error);
    throw error;
  }
};

// =========================
// ✅ ADMIN: GET CURRENCY STATISTICS
// =========================

export const getCurrencyStats = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/currencies/stats/all`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Get currency stats error:', error);
    throw error;
  }
};

// =========================
// ✅ GET PROVIDER SETTLEMENT CURRENCY
// =========================

export const getProviderSettlementCurrency = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/currencies/provider/settlement`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Get provider settlement currency error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch settlement currency',
      currency: 'RWF',
    };
  }
};

// =========================
// ✅ UPDATE PROVIDER SETTLEMENT CURRENCY
// =========================

export const updateProviderSettlementCurrency = async (currency) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.put(
      `${API_URL}/currencies/provider/settlement`,
      { currency },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Update provider settlement currency error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update settlement currency',
    };
  }
};

// =========================
// ✅ GET USER PREFERRED CURRENCY
// =========================

export const getUserPreferredCurrency = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/currencies/user/preferred`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Get user preferred currency error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch preferred currency',
      currency: 'RWF',
    };
  }
};

// =========================
// ✅ UPDATE USER PREFERRED CURRENCY
// =========================

export const updateUserPreferredCurrency = async (currency) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.put(
      `${API_URL}/currencies/user/preferred`,
      { currency },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Update user preferred currency error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update preferred currency',
    };
  }
};

// =========================
// ✅ GET ALLOWED SETTLEMENT CURRENCIES
// =========================

export const getAllowedSettlementCurrencies = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/currencies/settlement/allowed`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Get allowed settlement currencies error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch settlement currencies',
      currencies: [],
    };
  }
};

// =========================
// ✅ GET EXCHANGE RATE
// =========================

export const getExchangeRate = async (from, to) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/currencies/exchange-rate`,
      {
        params: { from, to },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Get exchange rate ${from}/${to} error:`, error);
    return {
      success: false,
      message: error.message || 'Failed to fetch exchange rate',
    };
  }
};

// =========================
// ✅ USER PREFERENCE HELPERS
// =========================

export const getUserPreferredCurrencyLocal = () => {
  return localStorage.getItem('preferredCurrency') || 'RWF';
};

export const setUserPreferredCurrencyLocal = (code) => {
  localStorage.setItem('preferredCurrency', code.toUpperCase());
};

// =========================
// ✅ FORMAT HELPERS
// =========================

export const formatCurrency = (amount, currency, options = {}) => {
  const { locale = 'en-US', currencyDisplay = 'symbol', minimumFractionDigits = null, maximumFractionDigits = null } = options;
  
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      currencyDisplay,
      minimumFractionDigits: minimumFractionDigits !== null ? minimumFractionDigits : undefined,
      maximumFractionDigits: maximumFractionDigits !== null ? maximumFractionDigits : undefined,
    });
    return formatter.format(amount);
  } catch (error) {
    return `${amount} ${currency}`;
  }
};

export const getCurrencySymbol = (currency) => {
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'symbol',
    });
    return formatter.format(0).replace(/0/g, '').trim();
  } catch (error) {
    return currency;
  }
};

// =========================
// ✅ DEFAULT EXPORT
// =========================

export default {
  getSupportedCurrencies,
  getCurrencies,
  getDefaultCurrency,
  getCurrencyByCode,
  getPlatformFees,
  convertAmount,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  updateExchangeRate,
  getExchangeRateHistory,
  toggleCurrencyStatus,
  setDefaultCurrency,
  setBaseCurrency,
  bulkUpdateExchangeRates,
  getCurrencyStats,
  getUserPreferredCurrencyLocal,
  setUserPreferredCurrencyLocal,
  formatCurrency,
  getCurrencySymbol,
  getProviderSettlementCurrency,
  updateProviderSettlementCurrency,
  getUserPreferredCurrency,
  updateUserPreferredCurrency,
  getAllowedSettlementCurrencies,
  getExchangeRate,
};