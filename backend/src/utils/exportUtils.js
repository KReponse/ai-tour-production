// backend/src/utils/exportUtils.js
// ✅ Export Utilities - CSV and JSON export functions

/**
 * Convert array of objects to CSV string
 */
export const exportToCSV = (data) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV rows
  const rows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] !== undefined && row[header] !== null ? row[header] : '';
        // Escape quotes and wrap in quotes if contains comma or quote
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ];

  return rows.join('\n');
};

/**
 * Convert array of objects to JSON
 */
export const exportToJSON = (data) => {
  if (!data || data.length === 0) {
    return '[]';
  }
  return JSON.stringify(data, null, 2);
};

/**
 * Download data as file
 */
export const downloadFile = (data, filename, contentType = 'text/csv') => {
  const blob = new Blob([data], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Format date for export
 */
export const formatDateForExport = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Format currency for export
 */
export const formatCurrencyForExport = (amount, currency = 'USD') => {
  if (amount === undefined || amount === null) return '';
  return `${currency} ${Number(amount).toFixed(2)}`;
};

/**
 * Export payments to CSV
 */
export const exportPaymentsToCSV = (payments) => {
  const data = payments.map(p => ({
    'Transaction ID': p.transactionId || p.stripePaymentId || 'N/A',
    'Booking Code': p.booking?.bookingCode || 'N/A',
    'Traveler Name': p.user?.name || 'N/A',
    'Traveler Email': p.user?.email || 'N/A',
    'Provider Name': p.provider?.businessName || p.provider?.name || 'N/A',
    'Listing Title': p.listing?.title || 'N/A',
    'Amount': p.amount || 0,
    'Currency': p.currency || 'USD',
    'Service Fee': p.serviceFee || 0,
    'Platform Fee': p.platformFee || 0,
    'Net Amount': p.providerAmount || p.amount - (p.platformFee || 0),
    'Status': p.status || 'pending',
    'Payment Method': p.paymentMethod || 'stripe',
    'Paid At': formatDateForExport(p.paidAt),
    'Refund Amount': p.refundAmount || 0,
    'Refund Reason': p.refundReason || '',
  }));

  return exportToCSV(data);
};

/**
 * Export earnings to CSV
 */
export const exportEarningsToCSV = (earnings) => {
  const data = earnings.map(e => ({
    'Earning ID': e._id || 'N/A',
    'Provider Name': e.provider?.name || 'N/A',
    'Booking Code': e.booking?.bookingCode || 'N/A',
    'Amount': e.amount || 0,
    'Platform Fee': e.platformFee || 0,
    'Net Amount': e.netAmount || 0,
    'Status': e.status || 'pending',
    'Payment ID': e.paymentId || 'N/A',
    'Paid At': formatDateForExport(e.paidAt),
    'Created At': formatDateForExport(e.createdAt),
  }));

  return exportToCSV(data);
};