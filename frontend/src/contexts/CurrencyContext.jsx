// frontend/src/contexts/CurrencyContext.jsx
// ✅ NEW - Currency Context for Multi-Currency Support

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getSupportedCurrencies, getDefaultCurrency, convertAmount } from '../services/currencyService';
import { useAuth } from './AuthContext';

// =========================
// CONTEXT CREATION
// =========================

const CurrencyContext = createContext(null);

// =========================
// PROVIDER COMPONENT
// =========================

export const CurrencyProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [currencies, setCurrencies] = useState([]);
  const [defaultCurrency, setDefaultCurrencyState] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exchangeRates, setExchangeRates] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  // =========================
  // LOAD CURRENCIES
  // =========================

  const loadCurrencies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [currenciesData, defaultData] = await Promise.all([
        getSupportedCurrencies(),
        getDefaultCurrency(),
      ]);

      if (currenciesData.success) {
        setCurrencies(currenciesData.currencies || []);
        setDefaultCurrencyState(currenciesData.defaultCurrency || 'RWF');
        
        // Build exchange rates map
        const rates = {};
        currenciesData.currencies.forEach(c => {
          if (c.exchangeRate) {
            rates[c.code] = c.exchangeRate;
          }
        });
        setExchangeRates(rates);
      }

      // Set selected currency
      const userPref = user?.preferredCurrency;
      const storedPref = localStorage.getItem('preferredCurrency');
      
      let selected = null;
      
      // Priority: User preference > Local storage > Default
      if (userPref && currenciesData.currencies?.some(c => c.code === userPref)) {
        selected = userPref;
      } else if (storedPref && currenciesData.currencies?.some(c => c.code === storedPref)) {
        selected = storedPref;
      } else {
        selected = currenciesData.defaultCurrency || 'RWF';
      }

      setSelectedCurrency(selected);
      localStorage.setItem('preferredCurrency', selected);
      
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error('❌ Error loading currencies:', error);
      setError(error.message || 'Failed to load currencies');
      
      // Fallback to RWF
      setSelectedCurrency('RWF');
      setDefaultCurrencyState('RWF');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  // =========================
  // SET SELECTED CURRENCY
  // =========================

  const setCurrency = useCallback((currencyCode) => {
    const upperCode = currencyCode.toUpperCase();
    const exists = currencies.some(c => c.code === upperCode);
    
    if (!exists) {
      console.warn(`Currency ${upperCode} not supported`);
      return;
    }

    setSelectedCurrency(upperCode);
    localStorage.setItem('preferredCurrency', upperCode);
    
    // If user is logged in, update their preference
    if (user) {
      // We'll update the user's preference via API when they save their profile
    }
  }, [currencies, user]);

  // =========================
  // FORMAT AMOUNT
  // =========================

  const formatAmount = useCallback((amount, currencyCode = null) => {
    const code = currencyCode || selectedCurrency || 'RWF';
    const currency = currencies.find(c => c.code === code);
    
    if (!currency) {
      return `${amount} ${code}`;
    }

    try {
      const formatter = new Intl.NumberFormat(currency.format?.locale || 'en-US', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: currency.decimalPlaces || 2,
        maximumFractionDigits: currency.decimalPlaces || 2,
        currencyDisplay: currency.format?.currencyDisplay || 'symbol',
      });
      return formatter.format(amount);
    } catch (error) {
      // Fallback formatting
      const symbol = currency.symbol || code;
      const position = currency.format?.position || 'before';
      const formatted = amount.toFixed(currency.decimalPlaces || 2);
      
      if (position === 'after') {
        return `${formatted} ${symbol}`;
      }
      return `${symbol}${formatted}`;
    }
  }, [currencies, selectedCurrency]);

  // =========================
  // CONVERT AMOUNT
  // =========================

  const convert = useCallback(async (amount, fromCurrency, toCurrency = null) => {
    const to = toCurrency || selectedCurrency || 'RWF';
    
    if (fromCurrency === to) {
      return {
        amount,
        fromCurrency,
        toCurrency: to,
        rate: 1,
        convertedAmount: amount,
        success: true,
      };
    }

    try {
      const result = await convertAmount(amount, fromCurrency, to);
      
      if (result.success) {
        return {
          amount: result.amount,
          fromCurrency: result.from,
          toCurrency: result.to,
          rate: result.rate,
          convertedAmount: result.convertedAmount,
          formatted: {
            from: result.formatted?.from || formatAmount(result.amount, result.from),
            to: result.formatted?.to || formatAmount(result.convertedAmount, result.to),
          },
          success: true,
        };
      }
      
      // Fallback: use cached exchange rate
      const rate = exchangeRates[to] / exchangeRates[fromCurrency];
      const convertedAmount = amount * rate;
      
      return {
        amount,
        fromCurrency,
        toCurrency: to,
        rate,
        convertedAmount,
        formatted: {
          from: formatAmount(amount, fromCurrency),
          to: formatAmount(convertedAmount, to),
        },
        success: true,
        fallback: true,
      };
    } catch (error) {
      console.error('❌ Currency conversion error:', error);
      
      // Last resort: return original amount
      return {
        amount,
        fromCurrency,
        toCurrency: to,
        rate: 1,
        convertedAmount: amount,
        formatted: {
          from: formatAmount(amount, fromCurrency),
          to: formatAmount(amount, to),
        },
        success: false,
        error: error.message,
      };
    }
  }, [selectedCurrency, exchangeRates, formatAmount]);

  // =========================
  // GET CURRENCY SYMBOL
  // =========================

  const getSymbol = useCallback((currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode || '$';
  }, [currencies]);

  // =========================
  // GET CURRENCY INFO
  // =========================

  const getCurrencyInfo = useCallback((currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency || null;
  }, [currencies]);

  // =========================
  // CHECK IF CURRENCY SUPPORTED
  // =========================

  const isCurrencySupported = useCallback((currencyCode) => {
    return currencies.some(c => c.code === currencyCode);
  }, [currencies]);

  // =========================
  // REFRESH CURRENCIES
  // =========================

  const refreshCurrencies = useCallback(async () => {
    await loadCurrencies();
  }, [loadCurrencies]);

  // =========================
  // CONTEXT VALUE
  // =========================

  const contextValue = useMemo(() => ({
    currencies,
    selectedCurrency,
    defaultCurrency,
    loading,
    error,
    exchangeRates,
    lastUpdated,
    setCurrency,
    formatAmount,
    convert,
    getSymbol,
    getCurrencyInfo,
    isCurrencySupported,
    refreshCurrencies,
    // Convenience getters
    symbol: selectedCurrency ? getSymbol(selectedCurrency) : '$',
    defaultSymbol: defaultCurrency ? getSymbol(defaultCurrency) : '$',
  }), [
    currencies,
    selectedCurrency,
    defaultCurrency,
    loading,
    error,
    exchangeRates,
    lastUpdated,
    setCurrency,
    formatAmount,
    convert,
    getSymbol,
    getCurrencyInfo,
    isCurrencySupported,
    refreshCurrencies,
  ]);

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

// =========================
// CUSTOM HOOK
// =========================

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

// =========================
// WITH CURRENCY HOC
// =========================

export const withCurrency = (WrappedComponent) => {
  return function WithCurrencyWrapper(props) {
    const currencyContext = useCurrency();
    return <WrappedComponent {...props} currency={currencyContext} />;
  };
};

export default CurrencyContext;
