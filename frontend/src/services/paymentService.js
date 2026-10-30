// frontend/src/services/paymentService.js
// ============================================================
// Drop-in for the whole file. Every function except
// verifyPayment is unchanged from your last paste — I only
// added `import axios` at the top and rewrote verifyPayment.
// ============================================================

import axios from 'axios';                // ✅ NEW
import API from './api';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ============================================================
// HELPERS
// ============================================================

const requireAuthentication = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }
  return token;
};

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      searchParams.append(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

// ============================================================
// GET PAYMENT PROVIDERS
// ============================================================

export const getPaymentProviders = async () => {
  try {
    requireAuthentication();
    return {
      success: true,
      providers: [
        {
          id: 'stripe',
          name: 'Stripe',
          supportedCurrencies: ['USD', 'EUR', 'GBP', 'RWF'],
          isTestMode: true,
          icon: 'credit-card',
          enabled: true,
        },
      ],
    };
  } catch (error) {
    console.error('❌ Get providers error:', error);
    throw error;
  }
};

// ============================================================
// CREATE CHECKOUT
// ============================================================

export const createCheckout = async (bookingId, providerId = 'stripe', options = {}) => {
  try {
    requireAuthentication();
    if (!bookingId) throw new Error('Booking ID is required');
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

export const createCheckoutSession = createCheckout;

// ============================================================
// VERIFY PAYMENT  ✅ FIXED — bulletproof
// ============================================================
// - Does NOT call requireAuthentication()
// - Does NOT go through the `API` axios instance
//   (avoids cache/dedup/401-refresh logic interfering with a
//   public verification endpoint)
// - Sends Authorization header ONLY if a token is present
// - Never throws "Authentication required" on its own
// ============================================================

export const verifyPayment = async (sessionId) => {
  if (!sessionId) {
    throw new Error('Stripe session ID is required');
  }

  const encodedSessionId = encodeURIComponent(sessionId);

  let token = null;
  try {
    token = localStorage.getItem('token');
  } catch {
    token = null;
  }

  const headers = {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    console.log('🔍 verifyPayment → GET', `${API_URL}/payments/verify/${encodedSessionId}`);

    const response = await axios.get(
      `${API_URL}/payments/verify/${encodedSessionId}`,
      { headers, timeout: 20000 }
    );

    console.log('✅ verifyPayment response:', response.status, response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Verify payment error:', error);
    if (error?.response) {
      console.error('❌ Verify payment status:', error.response.status);
      console.error('❌ Verify payment response:', error.response.data);
    }
    throw error;
  }
};

// ============================================================
// EVERYTHING BELOW — UNCHANGED FROM YOUR FILE
// ============================================================

export const getMyPayments = async (params = {}) => {
  try {
    requireAuthentication();
    const { page = 1, limit = 20, status, search, sort } = params;
    const query = buildQueryString({ page, limit, status, search, sort });
    const response = await API.get(`/payments/my-payments${query}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get my payments error:', error);
    throw error;
  }
};

export const getPaymentById = async (id) => {
  try {
    requireAuthentication();
    if (!id) throw new Error('Payment ID is required');
    const response = await API.get(`/payments/${id}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get payment by id error:', error);
    throw error;
  }
};

export const getPaymentReceipt = async (id) => {
  try {
    requireAuthentication();
    if (!id) throw new Error('Payment ID is required');
    const response = await API.get(`/payments/${id}/receipt`);
    return response.data;
  } catch (error) {
    console.error('❌ Get payment receipt error:', error);
    throw error;
  }
};

export const downloadReceipt = async (id) => {
  try {
    requireAuthentication();
    if (!id) throw new Error('Payment ID is required');
    const response = await API.get(`/payments/${id}/download`, { responseType: 'blob' });
    const blob = new Blob([response.data], {
      type: response.headers?.['content-type'] || 'application/pdf',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `receipt-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error('❌ Download receipt error:', error);
    throw error;
  }
};

export const requestRefund = async (id, reason) => {
  try {
    requireAuthentication();
    if (!id) throw new Error('Payment ID is required');
    const response = await API.post(`/payments/${id}/refund`, { reason });
    return response.data;
  } catch (error) {
    console.error('❌ Request refund error:', error);
    throw error;
  }
};

export const getProviderPayments = async (params = {}) => {
  try {
    requireAuthentication();
    const { page = 1, limit = 20, status, search, startDate, endDate } = params;
    const query = buildQueryString({ page, limit, status, search, startDate, endDate });
    const response = await API.get(`/payments/provider/payments${query}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get provider payments error:', error);
    throw error;
  }
};

export const getProviderPaymentStats = async () => {
  try {
    requireAuthentication();
    const response = await API.get('/payments/provider/payments/stats');
    return response.data;
  } catch (error) {
    console.error('❌ Get provider payment stats error:', error);
    throw error;
  }
};

export const getProviderEarnings = async () => {
  try {
    requireAuthentication();
    const response = await API.get('/payments/provider/earnings');
    return response.data;
  } catch (error) {
    console.error('❌ Get provider earnings error:', error);
    throw error;
  }
};

export const getWalletBalance = async (walletId = null) => {
  try {
    requireAuthentication();
    let url = '/wallets/provider/summary';
    if (walletId) url = `/wallets/${walletId}/balance`;
    const response = await API.get(url);
    return response.data;
  } catch (error) {
    console.error('❌ Get wallet balance error:', error);
    throw error;
  }
};

export const requestWithdrawal = async (data) => {
  try {
    requireAuthentication();
    if (!data || typeof data !== 'object') throw new Error('Withdrawal data is required');
    const response = await API.post('/wallets/withdraw/request', data);
    return response.data;
  } catch (error) {
    console.error('❌ Request withdrawal error:', error);
    throw error;
  }
};

export const getWithdrawalHistory = async (params = {}) => {
  try {
    requireAuthentication();
    const { page = 1, limit = 20, status } = params;
    const query = buildQueryString({ page, limit, status });
    const response = await API.get(`/wallets/withdrawals${query}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get withdrawal history error:', error);
    throw error;
  }
};

export const getTransactionHistory = async (params = {}) => {
  try {
    requireAuthentication();
    const { page = 1, limit = 20, type, status } = params;
    const query = buildQueryString({ page, limit, type, status });
    const response = await API.get(`/wallets/transactions${query}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get transaction history error:', error);
    throw error;
  }
};

export const getPaymentStats = async () => {
  try {
    requireAuthentication();
    const response = await API.get('/payments/stats');
    return response.data;
  } catch (error) {
    console.error('❌ Get payment stats error:', error);
    throw error;
  }
};

export const getAllPayments = async (params = {}) => {
  try {
    requireAuthentication();
    const { page = 1, limit = 20, status, search, startDate, endDate, provider } = params;
    const query = buildQueryString({ page, limit, status, search, startDate, endDate, provider });
    const response = await API.get(`/payments/admin/payments${query}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get all payments error:', error);
    throw error;
  }
};

export const getAdminPaymentStats = async () => {
  try {
    requireAuthentication();
    const response = await API.get('/payments/admin/payments/stats');
    return response.data;
  } catch (error) {
    console.error('❌ Get admin payment stats error:', error);
    throw error;
  }
};

export const processRefund = async (id, data) => {
  try {
    requireAuthentication();
    if (!id) throw new Error('Payment ID is required');
    const response = await API.post(`/payments/admin/payments/${id}/refund`, data);
    return response.data;
  } catch (error) {
    console.error('❌ Process refund error:', error);
    throw error;
  }
};

export const exportPaymentsCSV = async (params = {}) => {
  try {
    requireAuthentication();
    const { status, startDate, endDate } = params;
    const query = buildQueryString({ status, startDate, endDate });
    const response = await API.get(`/payments/admin/payments/export${query}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: response.headers?.['content-type'] || 'text/csv;charset=utf-8',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payments-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error('❌ Export payments CSV error:', error);
    throw error;
  }
};

export const getPaymentAnalytics = async (period = 'monthly') => {
  try {
    requireAuthentication();
    const safePeriod = encodeURIComponent(period);
    const response = await API.get(`/payments/admin/analytics?period=${safePeriod}`);
    return response.data;
  } catch (error) {
    console.error('❌ Get payment analytics error:', error);
    throw error;
  }
};

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