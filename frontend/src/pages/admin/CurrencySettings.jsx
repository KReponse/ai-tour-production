// frontend/src/pages/admin/CurrencySettings.jsx
// ✅ NEW - Currency Settings Page for Admin

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  X,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Globe,
  AlertCircle,
  Shield,
  Save,
  Eye,
  EyeOff,
  Settings,
  TrendingUp,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  getCurrencies,
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
} from '../../services/currencyService';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';

// =========================
// CURRENCY FORM MODAL
// =========================

const CurrencyFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  editingCurrency = null,
}) => {
  const { user } = useAuth();
  const isEditing = !!editingCurrency;

  const [formData, setFormData] = useState({
    code: '',
    symbol: '',
    name: '',
    decimalPlaces: 2,
    exchangeRate: 1,
    platformFeePercentage: 10,
    paymentMethods: [],
    settlementAllowed: true,
    isActive: true,
    isDefault: false,
    isBaseCurrency: false,
    format: {
      locale: 'en-US',
      currencyDisplay: 'symbol',
      position: 'before',
    },
    countryCodes: [],
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Payment method options
  const paymentMethodOptions = [
    { value: 'stripe', label: 'Stripe' },
    { value: 'momo', label: 'MTN Mobile Money' },
    { value: 'airtel', label: 'Airtel Money' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'card', label: 'Card' },
    { value: 'paypal', label: 'PayPal' },
  ];

  // Currency position options
  const positionOptions = [
    { value: 'before', label: 'Before (e.g., $100)' },
    { value: 'after', label: 'After (e.g., 100$)' },
  ];

  // Locale options
  const localeOptions = [
    { value: 'en-US', label: 'United States (en-US)' },
    { value: 'en-GB', label: 'United Kingdom (en-GB)' },
    { value: 'rw-RW', label: 'Rwanda (rw-RW)' },
    { value: 'en-EU', label: 'Europe (en-EU)' },
    { value: 'fr-FR', label: 'France (fr-FR)' },
    { value: 'sw-KE', label: 'Kenya (sw-KE)' },
    { value: 'sw-TZ', label: 'Tanzania (sw-TZ)' },
  ];

  useEffect(() => {
    if (editingCurrency) {
      setFormData({
        code: editingCurrency.code || '',
        symbol: editingCurrency.symbol || '',
        name: editingCurrency.name || '',
        decimalPlaces: editingCurrency.decimalPlaces || 2,
        exchangeRate: editingCurrency.exchangeRate || 1,
        platformFeePercentage: editingCurrency.platformFeePercentage || 10,
        paymentMethods: editingCurrency.paymentMethods || [],
        settlementAllowed: editingCurrency.settlementAllowed !== false,
        isActive: editingCurrency.isActive !== false,
        isDefault: editingCurrency.isDefault || false,
        isBaseCurrency: editingCurrency.isBaseCurrency || false,
        format: editingCurrency.format || {
          locale: 'en-US',
          currencyDisplay: 'symbol',
          position: 'before',
        },
        countryCodes: editingCurrency.countryCodes || [],
      });
    } else {
      setFormData({
        code: '',
        symbol: '',
        name: '',
        decimalPlaces: 2,
        exchangeRate: 1,
        platformFeePercentage: 10,
        paymentMethods: [],
        settlementAllowed: true,
        isActive: true,
        isDefault: false,
        isBaseCurrency: false,
        format: {
          locale: 'en-US',
          currencyDisplay: 'symbol',
          position: 'before',
        },
        countryCodes: [],
      });
    }
    setErrors({});
  }, [editingCurrency, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleFormatChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      format: { ...prev.format, [field]: value },
    }));
  };

  const handlePaymentMethodToggle = (method) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter(m => m !== method)
        : [...prev.paymentMethods, method],
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.code) newErrors.code = 'Currency code is required';
    if (!formData.symbol) newErrors.symbol = 'Currency symbol is required';
    if (!formData.name) newErrors.name = 'Currency name is required';
    if (formData.exchangeRate <= 0) newErrors.exchangeRate = 'Exchange rate must be greater than 0';
    if (formData.platformFeePercentage < 0) newErrors.platformFeePercentage = 'Platform fee cannot be negative';
    if (formData.decimalPlaces < 0) newErrors.decimalPlaces = 'Decimal places cannot be negative';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = {
        ...formData,
        code: formData.code.toUpperCase(),
      };

      let response;
      if (isEditing) {
        response = await updateCurrency(formData.code, data);
      } else {
        response = await createCurrency(data);
      }

      if (response.success) {
        toast.success(isEditing ? 'Currency updated successfully' : 'Currency created successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(response.message || 'Failed to save currency');
      }
    } catch (error) {
      console.error('Error saving currency:', error);
      toast.error(error.response?.data?.message || 'Failed to save currency');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 flex items-center justify-center">
                {isEditing ? (
                  <Edit2 className="w-5 h-5 text-[#0D9488]" />
                ) : (
                  <Plus className="w-5 h-5 text-[#0D9488]" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#374151] dark:text-white">
                  {isEditing ? 'Edit Currency' : 'Add New Currency'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isEditing ? `Editing ${editingCurrency?.code}` : 'Create a new currency for the platform'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Currency Code <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="USD, RWF, EUR..."
                disabled={isEditing}
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && (
                <p className="text-xs text-red-500 mt-1">{errors.code}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Symbol <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.symbol}
                onChange={(e) => handleChange('symbol', e.target.value)}
                placeholder="$", "₣", "€"...
                className={errors.symbol ? 'border-red-500' : ''}
              />
              {errors.symbol && (
                <p className="text-xs text-red-500 mt-1">{errors.symbol}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Currency Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="US Dollar, Rwandan Franc..."
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Exchange Rate & Fees */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Exchange Rate <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
                value={formData.exchangeRate}
                onChange={(e) => handleChange('exchangeRate', parseFloat(e.target.value) || 0)}
                className={errors.exchangeRate ? 'border-red-500' : ''}
              />
              {errors.exchangeRate && (
                <p className="text-xs text-red-500 mt-1">{errors.exchangeRate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Platform Fee (%)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.platformFeePercentage}
                onChange={(e) => handleChange('platformFeePercentage', parseFloat(e.target.value) || 0)}
                className={errors.platformFeePercentage ? 'border-red-500' : ''}
              />
              {errors.platformFeePercentage && (
                <p className="text-xs text-red-500 mt-1">{errors.platformFeePercentage}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Decimal Places
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                max="4"
                value={formData.decimalPlaces}
                onChange={(e) => handleChange('decimalPlaces', parseInt(e.target.value) || 0)}
                className={errors.decimalPlaces ? 'border-red-500' : ''}
              />
              {errors.decimalPlaces && (
                <p className="text-xs text-red-500 mt-1">{errors.decimalPlaces}</p>
              )}
            </div>
          </div>

          {/* Format Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Locale
              </label>
              <select
                value={formData.format.locale}
                onChange={(e) => handleFormatChange('locale', e.target.value)}
                className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
              >
                {localeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Symbol Position
              </label>
              <select
                value={formData.format.position}
                onChange={(e) => handleFormatChange('position', e.target.value)}
                className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
              >
                {positionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Supported Payment Methods
            </label>
            <div className="flex flex-wrap gap-2">
              {paymentMethodOptions.map(method => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => handlePaymentMethodToggle(method.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    formData.paymentMethods.includes(method.value)
                      ? 'bg-[#0D9488] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => handleChange('isDefault', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Default</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBaseCurrency}
                onChange={(e) => handleChange('isBaseCurrency', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Base</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.settlementAllowed}
                onChange={(e) => handleChange('settlementAllowed', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Settlement Allowed</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 rounded-xl bg-[#0D9488] text-white hover:bg-[#0D9488]/80 transition"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Update Currency' : 'Create Currency'}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-12 rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================
// EXCHANGE RATE MODAL
// =========================

const ExchangeRateModal = ({
  isOpen,
  onClose,
  currency,
  onSuccess,
}) => {
  const [rate, setRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && currency) {
      setRate(currency.exchangeRate || '');
      fetchHistory();
    }
  }, [isOpen, currency]);

  const fetchHistory = async () => {
    if (!currency) return;
    setLoadingHistory(true);
    try {
      const response = await getExchangeRateHistory(currency.code, { limit: 10 });
      if (response.success) {
        setHistory(response.history || []);
      }
    } catch (error) {
      console.error('Error fetching rate history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rate || parseFloat(rate) <= 0) {
      toast.error('Please enter a valid exchange rate');
      return;
    }

    setLoading(true);
    try {
      const response = await updateExchangeRate(currency.code, parseFloat(rate));
      if (response.success) {
        toast.success('Exchange rate updated successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(response.message || 'Failed to update exchange rate');
      }
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      toast.error(error.response?.data?.message || 'Failed to update exchange rate');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !currency) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full shadow-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#374151] dark:text-white">
                Update Exchange Rate
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currency.code} - {currency.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Current Exchange Rate (1 {currency.code} = ? RWF)
            </label>
            <Input
              type="number"
              step="0.0001"
              min="0.0001"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Enter exchange rate..."
              className="text-lg font-semibold"
            />
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {currency.exchangeRateUpdatedAt 
                ? new Date(currency.exchangeRateUpdatedAt).toLocaleString()
                : 'Never'}
            </p>
          </div>

          {/* History */}
          {loadingHistory ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : history.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recent Changes
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {history.map((h, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-gray-500">
                    <span>{new Date(h.effectiveDate).toLocaleDateString()}</span>
                    <span>{h.rate}</span>
                    <span className="capitalize">{h.source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 rounded-xl bg-[#0D9488] text-white hover:bg-[#0D9488]/80 transition"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Rate
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-12 rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================
// MAIN CURRENCY SETTINGS PAGE
// =========================

const CurrencySettings = () => {
  const { user } = useAuth();
  const { refreshCurrencies } = useCurrency();
  
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  const fetchCurrencies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCurrencies();
      if (response.success) {
        setCurrencies(response.currencies || []);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast.error('Failed to load currencies');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const response = await getCurrencyStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
    fetchStats();
  }, [fetchCurrencies, fetchStats]);

  const handleToggleStatus = async (currency) => {
    try {
      const response = await toggleCurrencyStatus(currency.code);
      if (response.success) {
        toast.success(`Currency ${response.currency.status}`);
        fetchCurrencies();
        refreshCurrencies();
      }
    } catch (error) {
      console.error('Error toggling currency status:', error);
      toast.error(error.response?.data?.message || 'Failed to toggle currency status');
    }
  };

  const handleSetDefault = async (currency) => {
    try {
      const response = await setDefaultCurrency(currency.code);
      if (response.success) {
        toast.success(`Default currency set to ${currency.code}`);
        fetchCurrencies();
        refreshCurrencies();
      }
    } catch (error) {
      console.error('Error setting default currency:', error);
      toast.error(error.response?.data?.message || 'Failed to set default currency');
    }
  };

  const handleSetBase = async (currency) => {
    try {
      const response = await setBaseCurrency(currency.code);
      if (response.success) {
        toast.success(`Base currency set to ${currency.code}`);
        fetchCurrencies();
        refreshCurrencies();
      }
    } catch (error) {
      console.error('Error setting base currency:', error);
      toast.error(error.response?.data?.message || 'Failed to set base currency');
    }
  };

  const handleDelete = async (currency) => {
    if (!confirm(`Are you sure you want to delete ${currency.code}?`)) return;
    
    try {
      const response = await deleteCurrency(currency.code);
      if (response.success) {
        toast.success(`Currency ${currency.code} deleted`);
        fetchCurrencies();
        refreshCurrencies();
      }
    } catch (error) {
      console.error('Error deleting currency:', error);
      toast.error(error.response?.data?.message || 'Failed to delete currency');
    }
  };

  const handleEdit = (currency) => {
    setEditingCurrency(currency);
    setShowModal(true);
  };

  const handleOpenRateModal = (currency) => {
    setSelectedCurrency(currency);
    setShowRateModal(true);
  };

  const toggleExpand = (code) => {
    setExpandedRows(prev => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const filteredCurrencies = currencies.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase()) ||
                          c.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
                          (filterStatus === 'active' && c.isActive) ||
                          (filterStatus === 'inactive' && !c.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#374151] dark:text-white">
              Currency Settings
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage currencies, exchange rates, and platform fees
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingCurrency(null);
            setShowModal(true);
          }}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg hover:scale-[1.02] transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Currency
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Currencies</p>
            <p className="text-2xl font-black text-[#374151] dark:text-white">{stats.total || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            <p className="text-2xl font-black text-[#0D9488]">{stats.active || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Default</p>
            <p className="text-2xl font-black text-[#F59E0B]">{stats.defaultCurrency || 'N/A'}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Base</p>
            <p className="text-2xl font-black text-[#374151] dark:text-white">{stats.baseCurrency || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search currencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => { fetchCurrencies(); fetchStats(); }}
          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Currency Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading currencies...</p>
          </div>
        ) : filteredCurrencies.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#374151] dark:text-white">No Currencies Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {search ? 'Try adjusting your search' : 'Create your first currency'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchange Rate</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredCurrencies.map((currency) => (
                  <React.Fragment key={currency.code}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-bold text-[#374151] dark:text-white">
                            {currency.symbol || currency.code.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-[#374151] dark:text-white">
                              {currency.code}
                              {currency.isDefault && (
                                <span className="ml-2 text-[8px] font-semibold text-[#0D9488] bg-[#0D9488]/10 px-1.5 py-0.5 rounded-full uppercase">Default</span>
                              )}
                              {currency.isBase && (
                                <span className="ml-2 text-[8px] font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full uppercase">Base</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{currency.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-[#374151] dark:text-white">
                            {currency.exchangeRate?.toFixed(4) || '1.0000'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Updated: {currency.exchangeRateUpdatedAt 
                              ? new Date(currency.exchangeRateUpdatedAt).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-[#374151] dark:text-white">
                          {currency.platformFeePercentage || 0}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          currency.isActive
                            ? 'bg-[#0D9488]/10 text-[#0D9488]'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}>
                          {currency.isActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] animate-pulse" />
                              Active
                            </>
                          ) : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenRateModal(currency)}
                            className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition group"
                            title="Update exchange rate"
                          >
                            <TrendingUp className="w-4 h-4 text-gray-400 group-hover:text-[#0D9488]" />
                          </button>
                          <button
                            onClick={() => handleEdit(currency)}
                            className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition group"
                            title="Edit currency"
                          >
                            <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-[#0D9488]" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(currency)}
                            className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition group"
                            title={currency.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {currency.isActive ? (
                              <EyeOff className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-400 group-hover:text-[#0D9488]" />
                            )}
                          </button>
                          {!currency.isDefault && (
                            <button
                              onClick={() => handleSetDefault(currency)}
                              className="p-2 rounded-xl hover:bg-[#F59E0B]/10 transition group"
                              title="Set as default"
                            >
                              <Shield className="w-4 h-4 text-gray-400 group-hover:text-[#F59E0B]" />
                            </button>
                          )}
                          {!currency.isBase && (
                            <button
                              onClick={() => handleSetBase(currency)}
                              className="p-2 rounded-xl hover:bg-blue-100/10 transition group"
                              title="Set as base"
                            >
                              <Settings className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </button>
                          )}
                          {!currency.isDefault && !currency.isBase && (
                            <button
                              onClick={() => handleDelete(currency)}
                              className="p-2 rounded-xl hover:bg-red-100/10 transition group"
                              title="Delete currency"
                            >
                              <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                            </button>
                          )}
                          <button
                            onClick={() => toggleExpand(currency.code)}
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          >
                            {expandedRows[currency.code] ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows[currency.code] && (
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan="5" className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Symbol</p>
                              <p className="font-medium text-[#374151] dark:text-white">{currency.symbol}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Decimal Places</p>
                              <p className="font-medium text-[#374151] dark:text-white">{currency.decimalPlaces}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Settlement Allowed</p>
                              <p className="font-medium text-[#374151] dark:text-white">
                                {currency.settlementAllowed ? '✅ Yes' : '❌ No'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Payment Methods</p>
                              <p className="font-medium text-[#374151] dark:text-white">
                                {currency.paymentMethods?.length > 0 
                                  ? currency.paymentMethods.join(', ')
                                  : 'None'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Locale</p>
                              <p className="font-medium text-[#374151] dark:text-white">{currency.format?.locale}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Symbol Position</p>
                              <p className="font-medium text-[#374151] dark:text-white">{currency.format?.position}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Created</p>
                              <p className="font-medium text-[#374151] dark:text-white">
                                {currency.createdAt ? new Date(currency.createdAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Last Updated</p>
                              <p className="font-medium text-[#374151] dark:text-white">
                                {currency.updatedAt ? new Date(currency.updatedAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CurrencyFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCurrency(null);
        }}
        onSuccess={() => {
          fetchCurrencies();
          refreshCurrencies();
        }}
        editingCurrency={editingCurrency}
      />

      <ExchangeRateModal
        isOpen={showRateModal}
        onClose={() => {
          setShowRateModal(false);
          setSelectedCurrency(null);
        }}
        currency={selectedCurrency}
        onSuccess={() => {
          fetchCurrencies();
          refreshCurrencies();
        }}
      />
    </div>
  );
};

export default CurrencySettings;