// backend/src/utils/receiptUtils.js
// ✅ Receipt Utilities - Generate receipt numbers and formatting

/**
 * Generate a unique receipt number
 * Format: RCP-YYYYMMDD-XXXXX
 */
export const generateReceiptNumber = (payment) => {
  const date = payment?.paidAt || payment?.createdAt || new Date();
  const dateStr = new Date(date).toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `RCP-${dateStr}-${random}`;
};

/**
 * Format receipt data for display
 */
export const formatReceiptData = (payment) => {
  return {
    receiptNumber: payment.receiptNumber || generateReceiptNumber(payment),
    date: payment.paidAt || payment.createdAt,
    traveler: {
      name: payment.user?.name || 'N/A',
      email: payment.user?.email || 'N/A',
      phone: payment.user?.phone || 'N/A',
    },
    provider: {
      name: payment.provider?.businessName || payment.provider?.name || 'N/A',
      email: payment.provider?.email || 'N/A',
    },
    listing: {
      title: payment.listing?.title || 'N/A',
      location: payment.listing?.location || 'N/A',
    },
    booking: {
      code: payment.booking?.bookingCode || 'N/A',
      startDate: payment.booking?.startDate || null,
      endDate: payment.booking?.endDate || null,
      numberOfPeople: payment.booking?.numberOfPeople || 1,
    },
    payment: {
      amount: payment.amount,
      currency: payment.currency || 'USD',
      method: payment.paymentMethod || 'stripe',
      status: payment.status,
      transactionId: payment.transactionId || payment.stripePaymentId || 'N/A',
      paidAt: payment.paidAt,
      subtotal: (payment.amount || 0) - (payment.tax || 0) - (payment.serviceFee || 0),
      tax: payment.tax || 0,
      serviceFee: payment.serviceFee || 0,
      total: payment.amount || 0,
    },
  };
};

/**
 * Generate receipt HTML for PDF generation
 */
export const generateReceiptHTML = (receiptData) => {
  const { receiptNumber, date, traveler, provider, listing, booking, payment } = receiptData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt ${receiptNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #0D9488; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #0D9488; font-size: 28px; margin: 0; }
        .header p { color: #666; margin: 5px 0; }
        .receipt-number { background: #f5f5f5; padding: 8px 16px; border-radius: 4px; display: inline-block; font-weight: bold; }
        .section { margin-bottom: 25px; }
        .section-title { font-weight: bold; color: #0D9488; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 12px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; }
        .row-label { color: #666; }
        .row-value { font-weight: 500; }
        .total-row { border-top: 2px solid #0D9488; padding-top: 12px; margin-top: 12px; font-size: 18px; }
        .total-row .row-value { color: #0D9488; font-weight: bold; }
        .footer { text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px; }
        .badge { background: #0D9488; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>AI Tour Rwanda</h1>
        <p>Official Payment Receipt</p>
        <div class="receipt-number">${receiptNumber}</div>
      </div>

      <div class="section">
        <div class="section-title">Payment Details</div>
        <div class="row">
          <span class="row-label">Status</span>
          <span class="row-value"><span class="badge">${payment.status.toUpperCase()}</span></span>
        </div>
        <div class="row">
          <span class="row-label">Date</span>
          <span class="row-value">${new Date(date).toLocaleString()}</span>
        </div>
        <div class="row">
          <span class="row-label">Transaction ID</span>
          <span class="row-value" style="font-family: monospace; font-size: 12px;">${payment.transactionId}</span>
        </div>
        <div class="row">
          <span class="row-label">Payment Method</span>
          <span class="row-value">${payment.method.toUpperCase()}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Booking Information</div>
        <div class="row">
          <span class="row-label">Booking Code</span>
          <span class="row-value">${booking.code}</span>
        </div>
        ${booking.startDate ? `
        <div class="row">
          <span class="row-label">Travel Date</span>
          <span class="row-value">${new Date(booking.startDate).toLocaleDateString()}</span>
        </div>
        ` : ''}
        ${booking.numberOfPeople ? `
        <div class="row">
          <span class="row-label">Travelers</span>
          <span class="row-value">${booking.numberOfPeople}</span>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Experience</div>
        <div class="row">
          <span class="row-label">Title</span>
          <span class="row-value">${listing.title}</span>
        </div>
        ${listing.location ? `
        <div class="row">
          <span class="row-label">Location</span>
          <span class="row-value">${listing.location}</span>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Traveler</div>
        <div class="row">
          <span class="row-label">Name</span>
          <span class="row-value">${traveler.name}</span>
        </div>
        <div class="row">
          <span class="row-label">Email</span>
          <span class="row-value">${traveler.email}</span>
        </div>
        ${traveler.phone ? `
        <div class="row">
          <span class="row-label">Phone</span>
          <span class="row-value">${traveler.phone}</span>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Provider</div>
        <div class="row">
          <span class="row-label">Name</span>
          <span class="row-value">${provider.name}</span>
        </div>
        ${provider.email ? `
        <div class="row">
          <span class="row-label">Email</span>
          <span class="row-value">${provider.email}</span>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Amount Breakdown</div>
        <div class="row">
          <span class="row-label">Subtotal</span>
          <span class="row-value">${payment.currency} ${payment.subtotal.toFixed(2)}</span>
        </div>
        ${payment.tax > 0 ? `
        <div class="row">
          <span class="row-label">Tax</span>
          <span class="row-value">${payment.currency} ${payment.tax.toFixed(2)}</span>
        </div>
        ` : ''}
        ${payment.serviceFee > 0 ? `
        <div class="row">
          <span class="row-label">Service Fee</span>
          <span class="row-value">${payment.currency} ${payment.serviceFee.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="row total-row">
          <span class="row-label">Total</span>
          <span class="row-value">${payment.currency} ${payment.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for choosing AI Tour Rwanda!</p>
        <p>This is a computer-generated receipt. No signature required.</p>
        <p>For support, contact: support@aitour.rw</p>
      </div>
    </body>
    </html>
  `;
};