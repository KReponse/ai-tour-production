// backend/src/services/security.service.js
// ✅ Authentication v2 - Security Service

import { RateLimiter } from '../utils/rateLimiter.utils.js';
import { SecurityUtils } from '../utils/security.utils.js';

export class SecurityService {
  static validatePassword(password) {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    return { valid: true };
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Invalid email address' };
    }
    return { valid: true };
  }

  static parseUserAgent(userAgent) {
    // Simple parser - can be enhanced
    const browser = userAgent?.includes('Chrome') ? 'Chrome' :
                   userAgent?.includes('Firefox') ? 'Firefox' :
                   userAgent?.includes('Safari') ? 'Safari' : 'Unknown';
    const os = userAgent?.includes('Windows') ? 'Windows' :
              userAgent?.includes('Mac') ? 'Mac' :
              userAgent?.includes('Linux') ? 'Linux' : 'Unknown';
    return { browser, os };
  }

  static getClientIP(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  static async checkRateLimit(key, maxRequests, windowMs) {
    const limiter = new RateLimiter(key, maxRequests, windowMs);
    return limiter.check();
  }
}

export default SecurityService;