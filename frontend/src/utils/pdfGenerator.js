// frontend/src/utils/pdfGenerator.js
// ✅ PDF Generator - Provider Request PDF

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const TEAL = '#0D9488';
const GOLD = '#F59E0B';
const SLATE = '#374151';

/**
 * Generate PDF for Provider Request
 * @param {Object} request - Provider request data
 * @param {string} title - PDF title
 * @returns {Promise<void>}
 */
export const generateProviderRequestPDF = async (request, title = 'Provider Application') => {
  // Create a temporary container for rendering
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 794px;
    padding: 40px;
    background: white;
    font-family: Arial, Helvetica, sans-serif;
    color: #1a1a2e;
    line-height: 1.6;
    z-index: -1;
  `;
  container.innerHTML = buildPDFHTML(request, title);
  document.body.appendChild(container);

  try {
    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 794,
      height: container.scrollHeight,
      windowHeight: container.scrollHeight,
    });

    // Create PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297;

    // Add subsequent pages if content overflows
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    // Save PDF
    pdf.save(`${request.businessName || 'provider'}-application.pdf`);

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
};

/**
 * Build PDF HTML content
 */
const buildPDFHTML = (request, title) => {
  const statusMap = {
    pending: '⏳ Pending Review',
    approved: '✅ Approved',
    rejected: '❌ Rejected',
    needs_information: 'ℹ️ Needs Information',
  };

  const statusColor = {
    pending: '#F59E0B',
    approved: '#0D9488',
    rejected: '#EF4444',
    needs_information: '#F59E0B',
  };

  const status = request.status || 'pending';

  // Helper to format date
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—';

  // Helper to check if value exists
  const v = (val) => val || '—';

  // Helper for boolean check
  const check = (val) => val ? '✅ Yes' : '❌ No';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: white; }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 3px solid ${TEAL}; margin-bottom: 20px; }
        .header h1 { color: ${TEAL}; font-size: 28px; margin: 0; }
        .header p { color: #666; font-size: 14px; margin: 5px 0 0; }
        .status-badge { 
          display: inline-block; 
          padding: 6px 20px; 
          border-radius: 20px; 
          font-weight: bold; 
          font-size: 14px;
          background: ${statusColor[status]}20;
          color: ${statusColor[status]};
          border: 1px solid ${statusColor[status]}40;
          margin-top: 5px;
        }
        .section { margin-bottom: 20px; }
        .section-title { 
          font-size: 16px; 
          font-weight: bold; 
          color: ${TEAL}; 
          border-bottom: 2px solid ${TEAL}40;
          padding-bottom: 4px;
          margin-bottom: 10px;
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
        .grid-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
        .grid-item .label { font-size: 11px; color: #888; font-weight: 600; text-transform: uppercase; }
        .grid-item .value { font-size: 13px; color: #1a1a2e; font-weight: 500; text-align: right; }
        .full-width { grid-column: 1 / -1; }
        .description-box { 
          background: #f8f9fa; 
          padding: 10px 14px; 
          border-radius: 8px; 
          font-size: 13px; 
          color: #333;
          line-height: 1.5;
          margin-top: 4px;
        }
        .doc-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
        .doc-tag { 
          background: #f0f0f0; 
          padding: 4px 12px; 
          border-radius: 12px; 
          font-size: 11px; 
          color: #555;
          border: 1px solid #e0e0e0;
        }
        .agreement-item { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 4px 0; 
          font-size: 13px;
          border-bottom: 1px solid #f5f5f5;
        }
        .footer { 
          margin-top: 30px; 
          padding-top: 15px; 
          border-top: 2px solid ${TEAL};
          text-align: center;
          font-size: 11px;
          color: #999;
        }
        .footer strong { color: ${TEAL}; }
        .hour-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .hour-item { 
          background: #f8f9fa; 
          padding: 2px 10px; 
          border-radius: 6px; 
          font-size: 12px; 
          border: 1px solid #eee;
          display: inline-block;
        }
        .hour-item .day { font-weight: 600; color: ${SLATE}; }
        .hour-item .time { color: #555; }
        .hour-item .closed { color: #EF4444; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌍 AI Tour Rwanda</h1>
        <p>Provider Application Form</p>
        <div class="status-badge">${statusMap[status] || status}</div>
        <p style="font-size:12px;color:#999;margin-top:6px;">
          Application ID: ${request._id?.slice(-8).toUpperCase() || 'N/A'} 
          • Submitted: ${fmt(request.createdAt)}
        </p>
      </div>

      <!-- PERSONAL INFORMATION -->
      <div class="section">
        <div class="section-title">👤 Personal Information</div>
        <div class="grid">
          <div class="grid-item"><span class="label">Full Name</span><span class="value">${v(request.fullName)}</span></div>
          <div class="grid-item"><span class="label">Nationality</span><span class="value">${v(request.nationality)}</span></div>
          <div class="grid-item"><span class="label">Personal Phone</span><span class="value">${v(request.phone)}</span></div>
          <div class="grid-item"><span class="label">WhatsApp</span><span class="value">${v(request.whatsapp)}</span></div>
          <div class="grid-item"><span class="label">Business Email</span><span class="value">${v(request.businessEmail)}</span></div>
          <div class="grid-item"><span class="label">Alternate Phone</span><span class="value">${v(request.alternatePhone)}</span></div>
          <div class="grid-item full-width"><span class="label">Personal Email</span><span class="value">${v(request.email || request.user?.email)}</span></div>
        </div>
      </div>

      <!-- BUSINESS INFORMATION -->
      <div class="section">
        <div class="section-title">🏢 Business Information</div>
        <div class="grid">
          <div class="grid-item"><span class="label">Business Name</span><span class="value">${v(request.businessName)}</span></div>
          <div class="grid-item"><span class="label">Business Type</span><span class="value">${v(request.businessType?.replace(/_/g, ' '))}</span></div>
          <div class="grid-item"><span class="label">Business Phone</span><span class="value">${v(request.businessPhone)}</span></div>
          <div class="grid-item"><span class="label">Business Address</span><span class="value">${v(request.businessAddress)}</span></div>
          <div class="grid-item"><span class="label">Country</span><span class="value">${v(request.country)}</span></div>
          <div class="grid-item"><span class="label">Province</span><span class="value">${v(request.province)}</span></div>
          <div class="grid-item"><span class="label">District</span><span class="value">${v(request.district)}</span></div>
          <div class="grid-item"><span class="label">City</span><span class="value">${v(request.city)}</span></div>
          <div class="grid-item"><span class="label">Street</span><span class="value">${v(request.street)}</span></div>
          <div class="grid-item"><span class="label">Starting Price</span><span class="value">${request.price ? `${request.currency || 'USD'} ${Number(request.price).toLocaleString()}` : '—'}</span></div>
          <div class="grid-item"><span class="label">Availability</span><span class="value">${v(request.availability)}</span></div>
          <div class="grid-item"><span class="label">Website</span><span class="value">${v(request.website)}</span></div>
        </div>
      </div>

      <!-- LEGAL DOCUMENTS -->
      <div class="section">
        <div class="section-title">📜 Legal Documents</div>
        <div class="grid">
          <div class="grid-item"><span class="label">National ID Number</span><span class="value">${v(request.nationalId)}</span></div>
          <div class="grid-item"><span class="label">TIN Number</span><span class="value">${v(request.tinNumber)}</span></div>
          <div class="grid-item"><span class="label">RDB Registration</span><span class="value">${v(request.rdbRegistration)}</span></div>
          <div class="grid-item"><span class="label">Tourism License</span><span class="value">${v(request.tourismLicense)}</span></div>
        </div>
        <div style="margin-top:6px;">
          <div style="font-size:11px;color:#888;font-weight:600;text-transform:uppercase;margin-bottom:4px;">Uploaded Documents</div>
          <div class="doc-list">
            ${request.nationalIdFile ? `<span class="doc-tag">📄 National ID</span>` : ''}
            ${request.passportFile ? `<span class="doc-tag">📄 Passport</span>` : ''}
            ${request.rdbCertificateFile ? `<span class="doc-tag">📄 RDB Certificate</span>` : ''}
            ${request.tinCertificateFile ? `<span class="doc-tag">📄 TIN Certificate</span>` : ''}
            ${request.businessRegistrationFile ? `<span class="doc-tag">📄 Business Registration</span>` : ''}
            ${request.tourismLicenseFile ? `<span class="doc-tag">📄 Tourism License</span>` : ''}
            ${request.insuranceFile ? `<span class="doc-tag">📄 Insurance Certificate</span>` : ''}
            ${!request.nationalIdFile && !request.passportFile && !request.rdbCertificateFile && !request.tinCertificateFile && !request.businessRegistrationFile && !request.tourismLicenseFile && !request.insuranceFile ? '<span style="font-size:12px;color:#999;">No documents uploaded</span>' : ''}
          </div>
        </div>
      </div>

      <!-- BUSINESS PROFILE -->
      <div class="section">
        <div class="section-title">📝 Business Profile</div>
        ${request.description ? `<div class="description-box">${request.description}</div>` : '<div style="color:#999;font-size:13px;">No description provided</div>'}
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;">
          <div class="grid-item"><span class="label">Languages</span><span class="value">${request.languages?.length ? request.languages.join(', ') : '—'}</span></div>
          <div class="grid-item"><span class="label">Specializations</span><span class="value">${request.specializations?.length ? request.specializations.join(', ') : '—'}</span></div>
          <div class="grid-item"><span class="label">Years of Experience</span><span class="value">${v(request.yearsOfExperience)}</span></div>
        </div>
      </div>

      <!-- BUSINESS HOURS -->
      <div class="section">
        <div class="section-title">🕐 Business Hours</div>
        <div class="hour-row">
          ${['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
            const h = request.businessHours?.[day] || {};
            const label = day.charAt(0).toUpperCase() + day.slice(1);
            if (h.closed) {
              return `<span class="hour-item"><span class="day">${label}</span> <span class="closed">● Closed</span></span>`;
            }
            if (h.open && h.close) {
              return `<span class="hour-item"><span class="day">${label}</span> <span class="time">${h.open} – ${h.close}</span></span>`;
            }
            return `<span class="hour-item"><span class="day">${label}</span> <span style="color:#999;">Not set</span></span>`;
          }).join('')}
        </div>
      </div>

      <!-- PAYMENT INFORMATION -->
      <div class="section">
        <div class="section-title">💳 Payment Information</div>
        <div class="grid">
          <div class="grid-item"><span class="label">Payment Method</span><span class="value">${v(request.paymentMethod?.replace(/_/g, ' '))}</span></div>
          <div class="grid-item"><span class="label">Payment Currency</span><span class="value">${v(request.paymentCurrency)}</span></div>
          ${request.bankName ? `<div class="grid-item"><span class="label">Bank Name</span><span class="value">${v(request.bankName)}</span></div>` : ''}
          ${request.accountName ? `<div class="grid-item"><span class="label">Account Name</span><span class="value">${v(request.accountName)}</span></div>` : ''}
          ${request.accountNumber ? `<div class="grid-item"><span class="label">Account Number</span><span class="value">${v(request.accountNumber)}</span></div>` : ''}
          ${request.swiftCode ? `<div class="grid-item"><span class="label">SWIFT Code</span><span class="value">${v(request.swiftCode)}</span></div>` : ''}
          ${request.mobileMoney ? `<div class="grid-item"><span class="label">Mobile Money</span><span class="value">${v(request.mobileMoney)}</span></div>` : ''}
        </div>
      </div>

      <!-- SOCIAL MEDIA -->
      ${request.facebook || request.instagram || request.twitter || request.linkedin || request.youtube || request.tiktok ? `
      <div class="section">
        <div class="section-title">🌐 Social Media</div>
        <div class="grid">
          ${request.facebook ? `<div class="grid-item"><span class="label">Facebook</span><span class="value">${request.facebook}</span></div>` : ''}
          ${request.instagram ? `<div class="grid-item"><span class="label">Instagram</span><span class="value">${request.instagram}</span></div>` : ''}
          ${request.twitter ? `<div class="grid-item"><span class="label">X / Twitter</span><span class="value">${request.twitter}</span></div>` : ''}
          ${request.linkedin ? `<div class="grid-item"><span class="label">LinkedIn</span><span class="value">${request.linkedin}</span></div>` : ''}
          ${request.youtube ? `<div class="grid-item"><span class="label">YouTube</span><span class="value">${request.youtube}</span></div>` : ''}
          ${request.tiktok ? `<div class="grid-item"><span class="label">TikTok</span><span class="value">${request.tiktok}</span></div>` : ''}
        </div>
      </div>` : ''}

      <!-- AGREEMENTS -->
      <div class="section">
        <div class="section-title">✅ Terms & Agreements</div>
        <div>
          <div class="agreement-item">${check(request.agreeToTerms)} <strong>Terms of Service</strong></div>
          <div class="agreement-item">${check(request.agreeToPrivacy)} <strong>Privacy Policy</strong></div>
          <div class="agreement-item">${check(request.agreeToConduct)} <strong>Provider Code of Conduct</strong></div>
          <div class="agreement-item">${check(request.agreeToCommission)} <strong>Commission Agreement</strong></div>
          <div class="agreement-item">${check(request.agreeToTourism)} <strong>Tourism Compliance</strong></div>
          <div class="agreement-item">${check(request.agreeToAccurate)} <strong>Accurate Information</strong></div>
        </div>
      </div>

      <!-- APPLICATION STATUS -->
      <div class="section">
        <div class="section-title">📋 Application Status</div>
        <div class="grid">
          <div class="grid-item"><span class="label">Status</span><span class="value">${statusMap[status] || status}</span></div>
          <div class="grid-item"><span class="label">Submitted</span><span class="value">${fmt(request.createdAt)}</span></div>
          ${request.reviewedAt ? `<div class="grid-item"><span class="label">Reviewed</span><span class="value">${fmt(request.reviewedAt)}</span></div>` : ''}
          ${request.reviewedBy?.name ? `<div class="grid-item"><span class="label">Reviewed By</span><span class="value">${request.reviewedBy.name}</span></div>` : ''}
          ${request.adminNotes ? `<div class="grid-item full-width"><span class="label">Admin Notes</span><span class="value" style="text-align:left;font-weight:400;word-break:break-word;">${request.adminNotes}</span></div>` : ''}
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <strong>🌍 AI Tour Rwanda</strong> — ${new Date().getFullYear()} • Generated: ${new Date().toLocaleString()}<br>
        <span style="color:#bbb;">This document is for verification purposes only.</span>
      </div>
    </body>
    </html>
  `;
};

export default generateProviderRequestPDF;