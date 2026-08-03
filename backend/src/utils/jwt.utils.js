// backend/src/utils/jwt.utils.js
// ✅ FIXED - Added TOKEN_TYPES export

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ─── Token Types ──────────────────────────────────────────────────

export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  VERIFICATION: 'verification',
  RESET: 'reset'
};

// ─── Secret Getters ──────────────────────────────────────────────

const getAccessSecret = () => {
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
};

const getRefreshSecret = () => {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
};

const getIssuer = () => {
  return process.env.JWT_ISSUER || 'aitour.rw';
};

const getAudience = () => {
  return process.env.JWT_AUDIENCE || 'aitour-api';
};

const getAlgorithm = () => {
  return process.env.JWT_ALGORITHM || 'HS256';
};

// ─── Token Generation ─────────────────────────────────────────────

export const generateAccessToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    version: user.tokenVersion || 1
  };

  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    issuer: getIssuer(),
    audience: getAudience(),
    algorithm: getAlgorithm(),
    jwtid: crypto.randomBytes(16).toString('hex')
  });
};

export const generateRefreshToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    version: user.tokenVersion || 1
  };

  return jwt.sign(payload, getRefreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: getIssuer(),
    audience: getAudience(),
    algorithm: getAlgorithm(),
    jwtid: crypto.randomBytes(16).toString('hex')
  });
};

// ─── Token Verification ───────────────────────────────────────────

export const verifyToken = (token, type = TOKEN_TYPES.ACCESS) => {
  try {
    const secret = type === TOKEN_TYPES.REFRESH ? getRefreshSecret() : getAccessSecret();
    
    const decoded = jwt.verify(token, secret, {
      issuer: getIssuer(),
      audience: getAudience()
    });

    return { valid: true, decoded };
  } catch (error) {
    let message = 'Invalid token';
    if (error.name === 'TokenExpiredError') {
      message = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token signature';
    }
    return { valid: false, error: message };
  }
};

// ─── Token Utilities ─────────────────────────────────────────────

export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateVerificationToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
};

export const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
};

export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
};

export const getTokenRemainingTime = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;
  const remaining = decoded.exp - Math.floor(Date.now() / 1000);
  return Math.max(0, remaining);
};

export const getUserIdFromToken = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.sub) return null;
  return decoded.sub;
};

export const getTokenType = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.type) return null;
  return decoded.type;
};

// ─── Blacklist (placeholder) ─────────────────────────────────────

export const blacklistToken = async (tokenId, expiry) => {
  // Placeholder for Redis implementation
  console.log(`⚫ Token blacklisted (will expire in ${expiry}s)`);
  return true;
};

export const isTokenBlacklisted = async (tokenId) => {
  // Placeholder for Redis implementation
  return false;
};

// ─── Default Export ──────────────────────────────────────────────

export default {
  TOKEN_TYPES,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  hashToken,
  generateVerificationToken,
  generateResetToken,
  isTokenExpired,
  getTokenRemainingTime,
  getUserIdFromToken,
  getTokenType,
  blacklistToken,
  isTokenBlacklisted
};