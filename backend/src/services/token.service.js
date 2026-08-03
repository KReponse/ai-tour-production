// backend/src/services/token.service.js
// ✅ UPDATED - Added centralized config constants

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository.js';

// ─── Configurable Security Values ──────────────────────────────
const CONFIG = {
  ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  JWT_ISSUER: process.env.JWT_ISSUER || 'aitour.rw',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'aitour-api',
  JWT_ALGORITHM: process.env.JWT_ALGORITHM || 'HS256',
};

export class TokenService {
  static getAccessSecret() {
    return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  }

  static getRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  }

  static generateAccessToken(user) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      version: user.tokenVersion
    };

    return jwt.sign(payload, this.getAccessSecret(), {
      expiresIn: CONFIG.ACCESS_TOKEN_EXPIRY,
      issuer: CONFIG.JWT_ISSUER,
      audience: CONFIG.JWT_AUDIENCE,
      algorithm: CONFIG.JWT_ALGORITHM,
      jwtid: crypto.randomBytes(16).toString('hex')
    });
  }

  static generateRefreshToken(user, device = null) {
    const tokenId = uuidv4();
    const payload = {
      sub: user._id.toString(),
      version: user.tokenVersion,
      jti: tokenId
    };

    const token = jwt.sign(payload, this.getRefreshSecret(), {
      expiresIn: CONFIG.REFRESH_TOKEN_EXPIRY,
      issuer: CONFIG.JWT_ISSUER,
      audience: CONFIG.JWT_AUDIENCE,
      algorithm: CONFIG.JWT_ALGORITHM
    });

    return { token, tokenId };
  }

  static verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.getAccessSecret(), {
        issuer: CONFIG.JWT_ISSUER,
        audience: CONFIG.JWT_AUDIENCE
      });
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  static verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.getRefreshSecret(), {
        issuer: CONFIG.JWT_ISSUER,
        audience: CONFIG.JWT_AUDIENCE
      });
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static generateVerificationToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = this.hashToken(token);
    return { token, hash };
  }

  static generateResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = this.hashToken(token);
    return { token, hash };
  }

  static async storeRefreshToken(userId, tokenId, tokenHash, expiresAt, device = null) {
    return RefreshTokenRepository.create({
      userId,
      tokenId,
      tokenHash,
      expiresAt,
      device: device ? {
        userAgent: device.userAgent,
        ip: device.ip,
        country: device.country,
        browser: device.browser,
        os: device.os
      } : null
    });
  }

  static async revokeRefreshToken(tokenId, reason = 'logout') {
    return RefreshTokenRepository.revokeByTokenId(tokenId, reason);
  }

  static async revokeAllRefreshTokens(userId, reason = 'logout') {
    return RefreshTokenRepository.revokeAllByUserId(userId, reason);
  }

  static async isRefreshTokenValid(tokenId, userId) {
    const token = await RefreshTokenRepository.findByTokenId(tokenId);
    if (!token) return false;
    if (token.userId.toString() !== userId.toString()) return false;
    return token.isValid();
  }

  static async getRefreshTokenByHash(hash) {
    return RefreshTokenRepository.findByTokenHash(hash);
  }
}

export default TokenService;