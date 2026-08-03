// frontend/src/components/ui/CurrencyBadge.jsx
// ✅ NEW - Currency Badge Component for Multi-Currency Support

import React from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';

// =========================
// CURRENCY BADGE COMPONENT
// =========================

const CurrencyBadge = ({
  currency,
  amount,
  className = '',
  size = 'sm',
  variant = 'default',
  showSymbol = true,
  showCode = true,
  showAmount = true,
  icon = null,
  onClick = null,
}) => {
  const { getSymbol, formatAmount, getCurrencyInfo } = useCurrency();

  // =========================
  // GET CURRENCY INFO
  // =========================

  const currencyInfo = getCurrencyInfo(currency);
  const symbol = currencyInfo?.symbol || getSymbol(currency) || currency;
  const name = currencyInfo?.name || currency;

  // =========================
  // SIZE CLASSES
  // =========================

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-0.5',
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
    xl: 'px-4 py-2 text-lg gap-2',
  };

  // =========================
  // VARIANT CLASSES
  // =========================

  const variantClasses = {
    default: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20',
    success: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30',
    warning: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
    error: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30',
    info: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30',
    dark: 'bg-gray-700 text-white border-gray-600 dark:bg-gray-800 dark:text-gray-200',
    light: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    outline: 'border-2 border-[#0D9488] text-[#0D9488] bg-transparent',
    ghost: 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
  };

  // =========================
  // RENDER ICON
  // =========================

  const renderIcon = () => {
    if (icon) {
      return <span className="flex-shrink-0">{icon}</span>;
    }

    // Flag emoji based on currency
    const flagMap = {
      RWF: '🇷🇼',
      USD: '🇺🇸',
      EUR: '🇪🇺',
      GBP: '🇬🇧',
      KES: '🇰🇪',
      UGX: '🇺🇬',
      TZS: '🇹🇿',
    };

    const flag = flagMap[currency];
    if (flag) {
      return <span className="flex-shrink-0">{flag}</span>;
    }

    return null;
  };

  // =========================
  // RENDER CONTENT
  // =========================

  const renderContent = () => {
    const parts = [];

    if (showSymbol) {
      parts.push(
        <span key="symbol" className="font-bold">
          {symbol}
        </span>
      );
    }

    if (showCode && currency) {
      parts.push(
        <span key="code" className="font-medium">
          {currency}
        </span>
      );
    }

    if (showAmount && amount !== undefined && amount !== null) {
      parts.push(
        <span key="amount" className="font-semibold">
          {formatAmount(amount, currency)}
        </span>
      );
    }

    return parts;
  };

  // =========================
  // RENDER TOOLTIP
  // =========================

  const tooltip = `${name}${amount !== undefined && amount !== null ? `: ${formatAmount(amount, currency)}` : ''}`;

  // =========================
  // MAIN RENDER
  // =========================

  const badgeClasses = `
    inline-flex items-center rounded-full font-medium
    ${sizeClasses[size] || sizeClasses.sm}
    ${variantClasses[variant] || variantClasses.default}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `;

  return (
    <span
      className={badgeClasses}
      title={tooltip}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {renderIcon()}
      {renderContent()}
    </span>
  );
};

// =========================
// CURRENCY PRICE BADGE
// =========================

export const CurrencyPriceBadge = ({
  price,
  currency,
  originalPrice = null,
  originalCurrency = null,
  className = '',
  size = 'md',
  showDiscount = false,
}) => {
  const { formatAmount, convert, selectedCurrency } = useCurrency();
  const [convertedPrice, setConvertedPrice] = useState(null);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const doConvert = async () => {
      if (!price || !currency) return;

      // If already in selected currency, no conversion needed
      if (currency === selectedCurrency) {
        setConvertedPrice({
          amount: price,
          currency: currency,
          formatted: formatAmount(price, currency),
        });
        return;
      }

      setIsConverting(true);
      const result = await convert(price, currency, selectedCurrency);
      setIsConverting(false);

      if (result.success) {
        setConvertedPrice({
          amount: result.convertedAmount,
          currency: selectedCurrency,
          formatted: formatAmount(result.convertedAmount, selectedCurrency),
          rate: result.rate,
        });
      }
    };

    doConvert();
  }, [price, currency, selectedCurrency, convert, formatAmount]);

  // =========================
  // CALCULATE DISCOUNT
  // =========================

  const getDiscount = () => {
    if (!originalPrice || !originalCurrency) return null;
    
    const originalFormatted = formatAmount(originalPrice, originalCurrency);
    const currentFormatted = formatAmount(price, currency);
    
    if (originalPrice > price) {
      const discountPercent = ((originalPrice - price) / originalPrice) * 100;
      return {
        percent: Math.round(discountPercent),
        original: originalFormatted,
        current: currentFormatted,
      };
    }
    return null;
  };

  const discount = showDiscount ? getDiscount() : null;

  // =========================
  // SIZE CLASSES
  // =========================

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Main Price */}
      <span className={`font-bold text-[#0D9488] ${sizeClasses[size] || sizeClasses.md}`}>
        {convertedPrice?.formatted || formatAmount(price, currency)}
      </span>

      {/* Original Price (if discounted) */}
      {discount && (
        <>
          <span className="text-sm text-gray-400 line-through">
            {discount.original}
          </span>
          <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
            -{discount.percent}%
          </span>
        </>
      )}

      {/* Exchange Rate Note */}
      {convertedPrice?.rate && convertedPrice.rate !== 1 && (
        <span className="text-[10px] text-gray-400">
          ≈ 1 {currency} = {convertedPrice.rate.toFixed(4)} {selectedCurrency}
        </span>
      )}
    </div>
  );
};

// =========================
// CURRENCY STATUS BADGE
// =========================

export const CurrencyStatusBadge = ({
  isActive,
  isDefault,
  isBase,
  className = '',
  size = 'sm',
}) => {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const statuses = [];

  if (isDefault) {
    statuses.push(
      <span
        key="default"
        className={`inline-flex items-center rounded-full bg-[#0D9488]/10 text-[#0D9488] font-medium ${sizeClasses[size]} ${className}`}
      >
        Default
      </span>
    );
  }

  if (isBase) {
    statuses.push(
      <span
        key="base"
        className={`inline-flex items-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-medium ${sizeClasses[size]} ${className}`}
      >
        Base
      </span>
    );
  }

  if (!isActive) {
    statuses.push(
      <span
        key="inactive"
        className={`inline-flex items-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium ${sizeClasses[size]} ${className}`}
      >
        Inactive
      </span>
    );
  }

  if (statuses.length === 0) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 font-medium ${sizeClasses[size]} ${className}`}
      >
        Active
      </span>
    );
  }

  return <>{statuses}</>;
};

// =========================
// CURRENCY AMOUNT DISPLAY
// =========================

export const CurrencyAmountDisplay = ({
  amount,
  currency,
  className = '',
  size = 'md',
  variant = 'default',
  showCurrency = true,
  compact = false,
}) => {
  const { formatAmount, getSymbol } = useCurrency();

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  };

  const variantClasses = {
    default: 'text-[#374151] dark:text-white',
    muted: 'text-gray-500 dark:text-gray-400',
    success: 'text-[#0D9488]',
    warning: 'text-[#F59E0B]',
    error: 'text-red-600 dark:text-red-400',
    white: 'text-white',
  };

  const symbol = getSymbol(currency);

  if (compact) {
    return (
      <span className={`font-semibold ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
        {symbol}{amount?.toLocaleString()}
      </span>
    );
  }

  return (
    <span className={`font-semibold ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {formatAmount(amount, currency)}
      {!showCurrency && (
        <span className="ml-1 text-sm font-normal text-gray-500">{currency}</span>
      )}
    </span>
  );
};

// =========================
// DEFAULT EXPORT
// =========================

export default CurrencyBadge;
