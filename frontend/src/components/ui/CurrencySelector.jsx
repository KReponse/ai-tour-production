// frontend/src/components/ui/CurrencySelector.jsx
// ✅ COMPLETE FIXED - Fixed DOM nesting: button inside button
// ✅ Fixed import for setUserPreferredCurrencyLocal

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Loader2, RefreshCw } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { setUserPreferredCurrencyLocal } from '../../services/currencyService';

// =========================
// CURRENCY SELECTOR COMPONENT
// =========================

const CurrencySelector = ({
  variant = 'default', // 'default', 'compact', 'minimal'
  className = '',
  onChange = null,
  showLabel = true,
  showRefresh = false,
  disabled = false,
  align = 'left', // 'left', 'right', 'center'
}) => {
  const {
    currencies,
    selectedCurrency,
    loading,
    error,
    setCurrency,
    formatAmount,
    getSymbol,
    refreshCurrencies,
  } = useCurrency();

  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);

  // =========================
  // CLOSE DROPDOWN ON CLICK OUTSIDE
  // =========================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // =========================
  // HANDLE CURRENCY CHANGE
  // =========================

  const handleCurrencySelect = (currencyCode) => {
    setCurrency(currencyCode);
    setUserPreferredCurrencyLocal(currencyCode);
    setIsOpen(false);
    
    if (onChange) {
      onChange(currencyCode);
    }
  };

  // =========================
  // HANDLE REFRESH
  // =========================

  const handleRefresh = async (e) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await refreshCurrencies();
    setIsRefreshing(false);
  };

  // =========================
  // GET SELECTED CURRENCY OBJECT
  // =========================

  const selectedCurrencyObj = currencies.find(c => c.code === selectedCurrency);

  // =========================
  // RENDER TRIGGER BUTTON
  // =========================

  const renderTrigger = () => {
    if (loading) {
      return (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-wait ${className}`}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ${className}`}
        >
          <span className="text-sm">Error</span>
        </div>
      );
    }

    if (variant === 'compact') {
      return (
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${className}`}
        >
          <span className="text-sm font-medium">
            {selectedCurrencyObj?.symbol || selectedCurrency}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </button>
      );
    }

    if (variant === 'minimal') {
      return (
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors duration-200 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${className}`}
        >
          <span className="text-sm font-medium">
            {selectedCurrencyObj?.symbol || selectedCurrency}
          </span>
          <span className="text-xs text-gray-400">{selectedCurrency}</span>
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </button>
      );
    }

    // Default variant - THE REFRESH BUTTON IS INSIDE THE TRIGGER BUTTON HERE!
    // We need to make the refresh button NOT a child of the main button
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-[#0D9488] dark:hover:border-[#0D9488] transition-all duration-200 ${
          isOpen ? 'border-[#0D9488] ring-2 ring-[#0D9488]/20' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        <div 
          className="flex items-center gap-2 min-w-[60px] flex-1"
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span className="text-lg font-semibold text-[#374151] dark:text-white">
            {selectedCurrencyObj?.symbol || selectedCurrency}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedCurrency}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Refresh currencies"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${
                isRefreshing ? 'animate-spin' : ''
              }`} />
            </button>
          )}
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            onClick={() => !disabled && setIsOpen(!isOpen)}
          />
        </div>
      </div>
    );
  };

  // =========================
  // RENDER DROPDOWN
  // =========================

  const renderDropdown = () => {
    if (!isOpen) return null;

    const alignmentClasses = {
      left: 'left-0',
      right: 'right-0',
      center: 'left-1/2 -translate-x-1/2',
    };

    return (
      <div
        className={`absolute top-full mt-1.5 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 ${alignmentClasses[align]}`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Select Currency
          </p>
        </div>

        {/* Currency List */}
        <div className="max-h-72 overflow-y-auto py-1">
          {currencies.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">No currencies available</p>
            </div>
          ) : (
            currencies.map((currency) => {
              const isSelected = currency.code === selectedCurrency;
              const isDefault = currency.isDefault;

              return (
                <div
                  key={currency.code}
                  onClick={() => handleCurrencySelect(currency.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#0D9488]/5 dark:hover:bg-[#0D9488]/10 transition-colors duration-150 cursor-pointer ${
                    isSelected ? 'bg-[#0D9488]/10 dark:bg-[#0D9488]/20' : ''
                  }`}
                >
                  {/* Currency Symbol */}
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-bold text-[#374151] dark:text-white">
                    {currency.symbol || currency.code.charAt(0)}
                  </div>

                  {/* Currency Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#374151] dark:text-white">
                        {currency.code}
                      </span>
                      {isDefault && (
                        <span className="text-[8px] font-semibold text-[#0D9488] bg-[#0D9488]/10 px-1.5 py-0.5 rounded-full uppercase">
                          Default
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#0D9488] ml-auto" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currency.name}
                    </p>
                  </div>

                  {/* Exchange Rate (if available) */}
                  {currency.exchangeRate && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {currency.exchangeRate.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
            {selectedCurrencyObj?.exchangeRate ? (
              <>1 {selectedCurrencyObj.code} = {selectedCurrencyObj.exchangeRate.toFixed(4)} RWF</>
            ) : (
              <>Exchange rates updated daily</>
            )}
          </p>
        </div>
      </div>
    );
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div ref={containerRef} className="relative inline-block">
      {showLabel && (
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
          Currency
        </label>
      )}
      {renderTrigger()}
      {renderDropdown()}
    </div>
  );
};

// =========================
// CURRENCY BADGE COMPONENT
// =========================

export const CurrencyBadge = ({ currency, amount, className = '', size = 'sm' }) => {
  const { formatAmount } = useCurrency();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] font-medium ${sizeClasses[size]} ${className}`}>
      <span>{currency}</span>
      {amount !== undefined && (
        <>
          <span className="opacity-30">•</span>
          <span>{formatAmount(amount, currency)}</span>
        </>
      )}
    </span>
  );
};

// =========================
// CURRENCY DISPLAY COMPONENT
// =========================

export const CurrencyDisplay = ({ amount, currency, className = '', variant = 'default' }) => {
  const { formatAmount } = useCurrency();

  const variantClasses = {
    default: 'text-[#374151] dark:text-white',
    muted: 'text-gray-500 dark:text-gray-400',
    success: 'text-[#0D9488]',
    warning: 'text-[#F59E0B]',
    error: 'text-red-600 dark:text-red-400',
  };

  return (
    <span className={`font-medium ${variantClasses[variant]} ${className}`}>
      {formatAmount(amount, currency)}
    </span>
  );
};

// =========================
// DEFAULT EXPORT
// =========================

export default CurrencySelector;