// frontend/src/services/paymentService.js
// ✅ COMPLETE FIXED - Removed broken getPaymentProviders endpoint
// ✅ Updated wallet functions to use correct wallet routes
// ✅ All exports properly defined

import axios from 'axios';
import API from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ============================================================
// ✅ GET PAYMENT PROVIDERS - FIXED (uses local config, not API)
// ============================================================

export const getPaymentProviders = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    // ✅ Return local provider configuration instead of calling non-existent API
    // This endpoint does not exist in the backend
    return {
      success: true,
      providers: [
        { 
          id: 'stripe', 
          name: 'Stripe', 
          supportedCurrencies: ['USD', 'EUR', 'GBP', 'RWF'],
          isTestMode: true,
          icon: 'credit-card'
        },
        { 
          id: 'momo', 
          name: 'MTN Mobile Money', 
          supportedCurrencies: ['RWF', 'USD'],
          isTestMode: true,
          icon: 'smartphone'
        },
        { 
          id: 'airtel', 
          name: 'Airtel Money', 
          supportedCurrencies: ['RWF', 'USD'],
          isTestMode: true,
          icon: 'smartphone'
        },
        { 
          id: 'paypal', 
          name: 'PayPal', 
          supportedCurrencies: ['USD', 'EUR', 'GBP'],
          isTestMode: true,
          icon: 'wallet'
        },
        { 
          id: 'bankTransfer', 
          name: 'Bank Transfer', 
          supportedCurrencies: ['RWF', 'USD', 'EUR', 'GBP'],
          isTestMode: true,
          icon: 'building'
        },
      ]
    };
  } catch (error) {
    console.error('❌ Get providers error:', error);
    // Fallback to Stripe only
    return {
      success: true,
      providers: [
        { id: 'stripe', name: 'Stripe', supportedCurrencies: ['USD', 'EUR', 'GBP'], isTestMode: true }
      ]
    };
  }
};

// ============================================================
// ✅ CREATE CHECKOUT (Main export)
// ============================================================

export const createCheckout = async (bookingId, providerId = 'stripe', options = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.post('/payments/checkout', {
      bookingId,
      providerId,
      ...options,
    });

    return response.data;
  } catch (error) {
    console.error('❌ Create checkout error:', error);
    throw error;
  }
};

// ✅ ALIAS FOR BACKWARD COMPATIBILITY
export const createCheckoutSession = createCheckout;

// ============================================================
// ✅ VERIFY PAYMENT
// ============================================================

export const verifyPayment = async (sessionId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get(`/payments/verify/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Verify payment error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET MY PAYMENTS (Traveler)
// ============================================================

export const getMyPayments = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const { page = 1, limit = 20, status, search, sort } = params;
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(status && status !== 'all' && { status }),
      ...(search && { search }),
      ...(sort && { sort }),
    });

    const response = await API.get(`/payments/my-payments?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get my payments error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET PAYMENT BY ID
// ============================================================

export const getPaymentById = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get(`/payments/${id}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get payment by id error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET PAYMENT RECEIPT
// ============================================================

export const getPaymentReceipt = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get(`/payments/${id}/receipt`);
    return response.data;
  } catch (error) {
    console.error('❌ Get payment receipt error:', error);
    throw error;
  }
};

// ============================================================
// ✅ DOWNLOAD RECEIPT
// ============================================================

export const downloadReceipt = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get(`/payments/${id}/download`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `receipt-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    return { success: true };
  } catch (error) {
    console.error('❌ Download receipt error:', error);
    throw error;
  }
};

// ============================================================
// ✅ REQUEST REFUND (Traveler)
// ============================================================

export const requestRefund = async (id, reason) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.post(`/payments/${id}/refund`, { reason });
    return response.data;
  } catch (error) {
    console.error('❌ Request refund error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET PROVIDER PAYMENTS
// ============================================================

export const getProviderPayments = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const { page = 1, limit = 20, status, search, startDate, endDate } = params;
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(status && status !== 'all' && { status }),
      ...(search && { search }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    });

    const response = await API.get(`/payments/provider/payments?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get provider payments error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET PROVIDER PAYMENT STATS
// ============================================================

export const getProviderPaymentStats = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/payments/provider/payments/stats');
    return response.data;
  } catch (error) {
    console.error('❌ Get provider payment stats error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET PROVIDER EARNINGS
// ============================================================

export const getProviderEarnings = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/payments/provider/earnings');
    return response.data;
  } catch (error) {
    console.error('❌ Get provider earnings error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET WALLET BALANCE - FIXED (uses correct wallet endpoint)
// ============================================================

export const getWalletBalance = async (walletId = null) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    // ✅ Use correct wallet endpoint
    let url = '/wallets';
    if (walletId) {
      url = `/wallets/${walletId}/balance`;
    } else {
      url = '/wallets/provider/summary';
    }

    const response = await API.get(url);
    return response.data;
  } catch (error) {
    console.error('❌ Get wallet balance error:', error);
    throw error;
  }
};

// ============================================================
// ✅ REQUEST WITHDRAWAL - FIXED (uses correct wallet endpoint)
// ============================================================

export const requestWithdrawal = async (data) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    // ✅ Use correct wallet endpoint
    const response = await API.post('/wallets/withdraw/request', data);
    return response.data;
  } catch (error) {
    console.error('❌ Request withdrawal error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET WITHDRAWAL HISTORY - FIXED (uses correct wallet endpoint)
// ============================================================

export const getWithdrawalHistory = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const { page = 1, limit = 20, status } = params;
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(status && status !== 'all' && { status }),
    });

    // ✅ Use correct wallet endpoint
    const response = await API.get(`/wallets/withdrawals?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get withdrawal history error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET TRANSACTION HISTORY - FIXED (uses correct wallet endpoint)
// ============================================================

export const getTransactionHistory = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const { page = 1, limit = 20, type, status } = params;
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(type && { type }),
      ...(status && { status }),
    });

    // ✅ Use correct wallet endpoint
    const response = await API.get(`/wallets/transactions?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get transaction history error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET PAYMENT STATS (Traveler)
// ============================================================

export const getPaymentStats = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/payments/stats');
    return response.data;
  } catch (error) {
    console.error('❌ Get payment stats error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET ALL PAYMENTS (Admin)
// ============================================================

export const getAllPayments = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const { page = 1, limit = 20, status, search, startDate, endDate, provider } = params;
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(status && status !== 'all' && { status }),
      ...(search && { search }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(provider && { provider }),
    });

    const response = await API.get(`/payments/admin/payments?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get all payments error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET ADMIN PAYMENT STATS
// ============================================================

export const getAdminPaymentStats = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get('/payments/admin/payments/stats');
    return response.data;
  } catch (error) {
    console.error('❌ Get admin payment stats error:', error);
    throw error;
  }
};

// ============================================================
// ✅ PROCESS REFUND (Admin)
// ============================================================

export const processRefund = async (id, data) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.post(`/payments/admin/payments/${id}/refund`, data);
    return response.data;
  } catch (error) {
    console.error('❌ Process refund error:', error);
    throw error;
  }
};

// ============================================================
// ✅ EXPORT PAYMENTS CSV (Admin)
// ============================================================

export const exportPaymentsCSV = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const { status, startDate, endDate } = params;
    const queryParams = new URLSearchParams({
      ...(status && status !== 'all' && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    });

    const response = await API.get(`/payments/admin/payments/export?${queryParams}`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payments-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    return { success: true };
  } catch (error) {
    console.error('❌ Export payments CSV error:', error);
    throw error;
  }
};

// ============================================================
// ✅ GET PAYMENT ANALYTICS (Admin)
// ============================================================

export const getPaymentAnalytics = async (period = 'monthly') => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await API.get(`/payments/admin/analytics?period=${period}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get payment analytics error:', error);
    throw error;
  }
};

// ============================================================
// ✅ DEFAULT EXPORT
// ============================================================

export default {
  getPaymentProviders,
  createCheckout,
  createCheckoutSession,
  verifyPayment,
  getMyPayments,
  getPaymentById,
  getPaymentReceipt,
  downloadReceipt,
  requestRefund,
  getProviderPayments,
  getProviderPaymentStats,
  getProviderEarnings,
  getWalletBalance,
  requestWithdrawal,
  getWithdrawalHistory,
  getTransactionHistory,
  getPaymentStats,
  getAllPayments,
  getAdminPaymentStats,
  processRefund,
  exportPaymentsCSV,
  getPaymentAnalytics,
};