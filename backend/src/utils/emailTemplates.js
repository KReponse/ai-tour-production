// backend/src/utils/emailTemplates.js
// ✅ Email Templates - Professional HTML emails for AI Tour

const BRAND = {
  name: 'AI Tour Rwanda',
  primaryColor: '#0D9488',
  secondaryColor: '#F59E0B',
  darkColor: '#374151',
  white: '#FFFFFF',
  year: new Date().getFullYear(),
  siteUrl: process.env.FRONTEND_URL || 'https://aitourrwanda.com',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@aitourrwanda.com',
};

const baseTemplate = (content, title) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f4f4f4;
  margin: 0;
  padding: 20px;
  -webkit-font-smoothing: antialiased;
">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          width: 100%;
        ">
          <!-- Header -->
          <tr>
            <td style="
              background: linear-gradient(135deg, #0D9488, #0f766e);
              padding: 32px 24px;
              text-align: center;
            ">
              <h1 style="
                margin: 0;
                color: #ffffff;
                font-size: 28px;
                font-weight: 800;
                letter-spacing: -0.5px;
              ">
                🌍 AI Tour Rwanda
              </h1>
              <p style="
                margin: 4px 0 0;
                color: rgba(255,255,255,0.85);
                font-size: 14px;
                font-weight: 400;
              ">
                Discover Rwanda with AI
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px; background-color: #ffffff;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              background-color: #f8faf8;
              padding: 24px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            ">
              <p style="
                margin: 0;
                color: #6b7280;
                font-size: 13px;
                line-height: 1.6;
              ">
                © ${BRAND.year} ${BRAND.name}. All rights reserved.
              </p>
              <p style="
                margin: 4px 0 0;
                color: #9ca3af;
                font-size: 12px;
              ">
                Kigali, Rwanda 🇷🇼
              </p>
              <p style="
                margin: 12px 0 0;
                color: #9ca3af;
                font-size: 12px;
              ">
                <a href="${BRAND.supportEmail}" style="color: #0D9488; text-decoration: none;">
                  ${BRAND.supportEmail}
                </a>
              </p>
              <p style="
                margin: 8px 0 0;
                color: #9ca3af;
                font-size: 11px;
              ">
                <a href="${BRAND.siteUrl}" style="color: #0D9488; text-decoration: none;">
                  ${BRAND.siteUrl}
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Button Helper ──────────────────────────────────────────────

const button = (text, url) => `
<table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <a href="${url}" style="
        display: inline-block;
        padding: 14px 40px;
        background: linear-gradient(135deg, #0D9488, #F59E0B);
        color: #ffffff;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 700;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
      ">
        ${text}
      </a>
    </td>
  </tr>
</table>
`;

// ─── Templates ──────────────────────────────────────────────────

export const emailTemplates = {
  /**
   * Welcome Email
   */
  welcome: (user) => {
    const content = `
      <h2 style="color: #374151; margin: 0 0 12px;">Welcome to AI Tour Rwanda! 🎉</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Hi <strong>${user.name || user.email}</strong>,
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Thank you for joining AI Tour Rwanda. We're excited to help you discover the beauty of Rwanda with AI-powered travel planning.
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Here's what you can do:
      </p>
      <ul style="color: #374151; line-height: 1.8; padding-left: 20px;">
        <li>Explore curated tours and experiences</li>
        <li>Get personalized recommendations from our AI</li>
        <li>Book directly with verified providers</li>
      </ul>
      ${button('Start Exploring', `${BRAND.siteUrl}/explore`)}
      <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0;">
        If you have any questions, reply to this email or contact us at ${BRAND.supportEmail}.
      </p>
    `;
    return baseTemplate(content, 'Welcome to AI Tour Rwanda');
  },

  /**
   * Email Verification
   */
  verifyEmail: (user, verificationUrl) => {
    const content = `
      <h2 style="color: #374151; margin: 0 0 12px;">Verify Your Email Address ✅</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Hi <strong>${user.name || user.email}</strong>,
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Please verify your email address to complete your registration and unlock all features.
      </p>
      ${button('Verify Email', verificationUrl)}
      <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0;">
        This link expires in 24 hours.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">
        If you didn't create an account, please ignore this email.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">
        Or copy and paste this link into your browser:
        <br>
        <a href="${verificationUrl}" style="color: #0D9488; word-break: break-all;">
          ${verificationUrl}
        </a>
      </p>
    `;
    return baseTemplate(content, 'Verify Your Email');
  },

  /**
   * Password Reset
   */
  passwordReset: (user, resetUrl) => {
    const content = `
      <h2 style="color: #374151; margin: 0 0 12px;">Reset Your Password 🔑</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Hi <strong>${user.name || user.email}</strong>,
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      ${button('Reset Password', resetUrl)}
      <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0;">
        This link expires in 15 minutes.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">
        If you didn't request this, please ignore this email.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">
        Or copy and paste this link into your browser:
        <br>
        <a href="${resetUrl}" style="color: #0D9488; word-break: break-all;">
          ${resetUrl}
        </a>
      </p>
    `;
    return baseTemplate(content, 'Reset Your Password');
  },

  /**
   * Password Changed Confirmation
   */
  passwordChanged: (user) => {
    const content = `
      <h2 style="color: #374151; margin: 0 0 12px;">Password Changed Successfully 🔐</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Hi <strong>${user.name || user.email}</strong>,
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Your password has been changed successfully.
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        If you didn't make this change, please contact us immediately at ${BRAND.supportEmail}.
      </p>
      ${button('Login to Your Account', `${BRAND.siteUrl}/login`)}
    `;
    return baseTemplate(content, 'Password Changed');
  },

  /**
   * Booking Confirmation
   */
  bookingConfirmation: (user, booking) => {
    const content = `
      <h2 style="color: #374151; margin: 0 0 12px;">Booking Confirmed! ✅</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Hi <strong>${user.name || user.email}</strong>,
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Your booking has been confirmed!
      </p>
      <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #f8faf8; border-radius: 8px; margin: 16px 0;">
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Booking ID</td>
          <td style="color: #374151;">${booking.bookingCode || booking._id}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Date</td>
          <td style="color: #374151;">${new Date(booking.startDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Total</td>
          <td style="color: #374151;">$${booking.totalPrice}</td>
        </tr>
      </table>
      ${button('View Booking', `${BRAND.siteUrl}/my-bookings/${booking._id}`)}
    `;
    return baseTemplate(content, 'Booking Confirmed');
  },

  /**
   * Booking Cancellation
   */
  bookingCancellation: (user, booking) => {
    const content = `
      <h2 style="color: #374151; margin: 0 0 12px;">Booking Cancelled ❌</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Hi <strong>${user.name || user.email}</strong>,
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Your booking has been cancelled.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0;">
        Booking ID: <strong>${booking.bookingCode || booking._id}</strong>
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">
        If you have any questions, please contact us at ${BRAND.supportEmail}.
      </p>
    `;
    return baseTemplate(content, 'Booking Cancelled');
  },

  /**
   * Payment Confirmation
   */
  paymentConfirmation: (user, payment) => {
    const content = `
      <h2 style="color: #374151; margin: 0 0 12px;">Payment Received 💳</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Hi <strong>${user.name || user.email}</strong>,
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Your payment has been received successfully!
      </p>
      <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #f8faf8; border-radius: 8px; margin: 16px 0;">
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Payment ID</td>
          <td style="color: #374151;">${payment._id}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Amount</td>
          <td style="color: #374151;">$${payment.amount}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Method</td>
          <td style="color: #374151;">${payment.paymentMethod || 'Card'}</td>
        </tr>
      </table>
      ${button('View Payment', `${BRAND.siteUrl}/payments/${payment._id}`)}
    `;
    return baseTemplate(content, 'Payment Confirmation');
  },

  /**
   * Provider - New Booking Notification
   */
  providerNewBooking: (provider, booking) => {
    const content = `
      <h2 style="color: #374151; margin: 0 0 12px;">New Booking Request! 🎉</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Hi <strong>${provider.name || provider.email}</strong>,
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        You have a new booking request!
      </p>
      <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #f8faf8; border-radius: 8px; margin: 16px 0;">
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Booking ID</td>
          <td style="color: #374151;">${booking.bookingCode || booking._id}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Traveler</td>
          <td style="color: #374151;">${booking.user?.name || 'Traveler'}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Date</td>
          <td style="color: #374151;">${new Date(booking.startDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-weight: 600;">Total</td>
          <td style="color: #374151;">$${booking.totalPrice}</td>
        </tr>
      </table>
      ${button('View Booking', `${BRAND.siteUrl}/provider/bookings/${booking._id}`)}
    `;
    return baseTemplate(content, 'New Booking Request');
  },

  /**
   * Provider - Listing Approved
   */
  providerListingApproved: (provider, listing) => {
    const content = `
      <h2 style="color: #374151; margin: 0 0 12px;">Your Tour is Approved! ✅</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Hi <strong>${provider.name || provider.email}</strong>,
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Congratulations! Your tour "${listing.title}" has been approved and is now visible to travelers.
      </p>
      ${button('View Tour', `${BRAND.siteUrl}/listing/${listing._id}`)}
    `;
    return baseTemplate(content, 'Tour Approved');
  },
};

export default emailTemplates;