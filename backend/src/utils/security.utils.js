// backend/src/utils/security.utils.js
// ✅ Security Utilities

export class SecurityUtils {
  static validatePassword(password) {
    if (!password || password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    return { valid: true };
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { valid: false, message: 'Invalid email address' };
    }
    return { valid: true };
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static generateRandomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static getClientIP(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  static parseUserAgent(userAgent) {
    if (!userAgent) {
      return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    }

    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Unknown';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'Mac';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      device = 'Mobile';
    } else if (userAgent.includes('iPad')) {
      device = 'Tablet';
    } else {
      device = 'Desktop';
    }

    return { browser, os, device };
  }
}

export default SecurityUtils;