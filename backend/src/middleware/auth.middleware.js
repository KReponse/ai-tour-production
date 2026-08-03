// backend/src/middleware/auth.middleware.js
// ✅ COMPLETE FIXED - Consistent req.user structure with both _id and id
// ✅ Added defensive validation for user ID
// ✅ Added requireVerified middleware with proper development bypass
// ✅ Added logging for debugging

import { verifyToken, TOKEN_TYPES } from '../utils/jwt.utils.js';
import User from '../models/User.js';

export class AuthMiddleware {
  /**
   * ✅ Authenticate middleware - Attaches user to req.user with consistent structure
   * Always provides both _id and id for backward compatibility
   */
  static async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ No token provided');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const token = authHeader.split(' ')[1];
      
      console.log('🔑 Auth Middleware - Token received: Yes');

      // ✅ Verify token
      const verification = verifyToken(token, TOKEN_TYPES.ACCESS);
      
      if (!verification.valid) {
        console.log(`❌ Auth Middleware - Verification failed: ${verification.error}`);
        return res.status(401).json({
          success: false,
          message: verification.error === 'Token expired' ? 'Token expired. Please refresh.' : 'Invalid token'
        });
      }

      console.log('✅ Auth Middleware - Verification result: Valid');
      console.log('📌 Auth Middleware - Decoded token:', verification.decoded);

      // ✅ Extract user ID from token (handle different formats)
      const userId = verification.decoded.sub || 
                     verification.decoded.id || 
                     verification.decoded.userId || 
                     verification.decoded._id;

      if (!userId) {
        console.error('❌ No user ID found in token:', verification.decoded);
        return res.status(401).json({
          success: false,
          message: 'Invalid token - User ID missing'
        });
      }

      console.log(`🔍 Auth Middleware - Looking up user: ${userId}`);

      // ✅ Find user in database
      const user = await User.findById(userId)
        .select('-password -refreshTokenHash -refreshTokenId -tokenBlacklist')
        .lean();

      if (!user) {
        console.log('❌ Auth Middleware - User not found');
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isActive) {
        console.log('❌ Auth Middleware - User deactivated');
        return res.status(403).json({
          success: false,
          message: 'Account deactivated'
        });
      }

      // ✅ Ensure isEmailVerified has a default value
      if (user.isEmailVerified === undefined) {
        user.isEmailVerified = false;
        console.log('📌 Auth Middleware - isEmailVerified was undefined, set to false');
      }

      // ✅ Verify token version
      if (verification.decoded.version !== undefined && user.tokenVersion !== undefined) {
        if (verification.decoded.version !== user.tokenVersion) {
          console.log('❌ Auth Middleware - Token version mismatch');
          return res.status(401).json({
            success: false,
            message: 'Token version mismatch. Please login again.'
          });
        }
      }

      // ✅ CONSISTENT req.user STRUCTURE
      // Always provide both _id and id for backward compatibility
      req.user = {
        _id: user._id,
        id: user._id, // ✅ Always include id for compatibility
        userId: user._id, // ✅ Include userId for safety
        email: user.email,
        name: user.name || user.fullName || '',
        role: user.role || 'traveler',
        isEmailVerified: user.isEmailVerified || false,
        isActive: user.isActive !== false,
        avatar: user.avatar || '',
        phone: user.phone || '',
        country: user.country || '',
        city: user.city || '',
        ...user // ✅ Spread all other properties
      };
      
      console.log('✅ Auth Middleware - User authenticated:', user.email);
      console.log('📌 Auth Middleware - isEmailVerified:', user.isEmailVerified);
      console.log('📌 Auth Middleware - req.user structure:', {
        id: req.user.id,
        _id: req.user._id,
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role
      });
      
      next();
    } catch (error) {
      console.error('❌ Auth Middleware - Error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }

  /**
   * ✅ Require role middleware
   * Checks if user has the required role
   */
  static requireRole(role) {
    return (req, res, next) => {
      if (!req.user) {
        console.log('❌ requireRole - No user found in request');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role?.toLowerCase();
      const requiredRole = role.toLowerCase();

      if (userRole !== requiredRole) {
        console.log(`❌ Auth Middleware - Role mismatch: ${userRole} !== ${requiredRole}`);
        return res.status(403).json({
          success: false,
          message: `Access denied. ${requiredRole} role required.`
        });
      }

      console.log(`✅ Auth Middleware - Role verified: ${userRole}`);
      next();
    };
  }

  /**
   * ✅ Require one of multiple roles
   * Checks if user has any of the allowed roles
   */
  static requireAnyRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        console.log('❌ requireAnyRole - No user found in request');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role?.toLowerCase();
      const allowedRoles = roles.map(r => r.toLowerCase());

      if (!allowedRoles.includes(userRole)) {
        console.log(`❌ Auth Middleware - Role not allowed: ${userRole} not in ${allowedRoles.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${roles.join(', ')}`
        });
      }

      console.log(`✅ Auth Middleware - Role verified: ${userRole}`);
      next();
    };
  }

  /**
   * ✅ Require email verification
   * Use this middleware for routes that require verified email
   * In development mode, this check is bypassed automatically
   */
  static requireVerified(req, res, next) {
    if (!req.user) {
      console.log('❌ requireVerified - No user found in request');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // ✅ DEVELOPMENT MODE - Skip verification entirely
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                          process.env.NODE_ENV === 'dev' ||
                          process.env.NODE_ENV === 'test';
    
    if (isDevelopment) {
      console.log('ℹ️ Development mode - Email verification skipped for:', req.user.email);
      return next();
    }

    // ✅ PRODUCTION MODE - Check email verification
    const isVerified = req.user.isEmailVerified === true;
    
    if (!isVerified) {
      console.log('❌ Email not verified for user:', req.user.email);
      console.log('📌 isEmailVerified value:', req.user.isEmailVerified);
      
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address first'
      });
    }

    console.log('✅ Email verified for user:', req.user.email);
    next();
  }

  /**
   * ✅ Require email verification with custom error message
   * Use this for routes where you want a custom message
   */
  static requireVerifiedWithMessage(message) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // ✅ DEVELOPMENT MODE - Skip verification
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                            process.env.NODE_ENV === 'dev' ||
                            process.env.NODE_ENV === 'test';
      
      if (isDevelopment) {
        console.log('ℹ️ Development mode - Email verification skipped for:', req.user.email);
        return next();
      }

      // ✅ PRODUCTION MODE - Check email verification
      const isVerified = req.user.isEmailVerified === true;
      
      if (!isVerified) {
        console.log('❌ Email not verified for user:', req.user.email);
        return res.status(403).json({
          success: false,
          message: message || 'Please verify your email address first'
        });
      }

      next();
    };
  }

  /**
   * ✅ Optional authentication - Attaches user if token exists, doesn't fail if not
   * Use for routes that work with or without authentication
   */
  static optionalAuthenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('ℹ️ Optional Auth - No token provided, continuing as guest');
        return next();
      }

      const token = authHeader.split(' ')[1];
      
      const verification = verifyToken(token, TOKEN_TYPES.ACCESS);
      
      if (!verification.valid) {
        console.log('ℹ️ Optional Auth - Invalid token, continuing as guest');
        return next();
      }

      const userId = verification.decoded.sub || 
                     verification.decoded.id || 
                     verification.decoded.userId || 
                     verification.decoded._id;

      if (!userId) {
        console.log('ℹ️ Optional Auth - No user ID in token, continuing as guest');
        return next();
      }

      User.findById(userId)
        .select('-password -refreshTokenHash -refreshTokenId -tokenBlacklist')
        .lean()
        .then(user => {
          if (user && user.isActive !== false) {
            // ✅ CONSISTENT req.user STRUCTURE for optional auth too
            req.user = {
              _id: user._id,
              id: user._id,
              userId: user._id,
              email: user.email,
              name: user.name || user.fullName || '',
              role: user.role || 'traveler',
              isEmailVerified: user.isEmailVerified || false,
              isActive: user.isActive !== false,
              avatar: user.avatar || '',
              phone: user.phone || '',
              country: user.country || '',
              city: user.city || '',
              ...user
            };
            console.log('✅ Optional Auth - User attached:', user.email);
          }
          next();
        })
        .catch(error => {
          console.error('❌ Optional Auth - Error finding user:', error.message);
          next(); // Continue even if user lookup fails
        });
    } catch (error) {
      console.error('❌ Optional Auth - Error:', error.message);
      next(); // Continue even on error
    }
  }

  /**
   * ✅ Get authenticated user ID safely
   * Helper method to extract user ID from req.user
   */
  static getUserId(req) {
    if (!req.user) return null;
    return req.user._id || req.user.id || req.user.userId || null;
  }

  /**
   * ✅ Check if user is authenticated
   */
  static isAuthenticated(req) {
    return !!(req.user && this.getUserId(req));
  }

  /**
   * ✅ Check if user has role
   */
  static hasRole(req, role) {
    if (!this.isAuthenticated(req)) return false;
    return req.user.role?.toLowerCase() === role.toLowerCase();
  }

  /**
   * ✅ Check if user has any of the roles
   */
  static hasAnyRole(req, roles) {
    if (!this.isAuthenticated(req)) return false;
    const userRole = req.user.role?.toLowerCase();
    return roles.some(r => r.toLowerCase() === userRole);
  }
}

// ✅ Export default for backward compatibility
export default AuthMiddleware;

// ✅ Export individual middleware functions for easier importing
export const authenticate = AuthMiddleware.authenticate.bind(AuthMiddleware);
export const requireRole = AuthMiddleware.requireRole.bind(AuthMiddleware);
export const requireAnyRole = AuthMiddleware.requireAnyRole.bind(AuthMiddleware);
export const requireVerified = AuthMiddleware.requireVerified.bind(AuthMiddleware);
export const requireVerifiedWithMessage = AuthMiddleware.requireVerifiedWithMessage.bind(AuthMiddleware);
export const optionalAuthenticate = AuthMiddleware.optionalAuthenticate.bind(AuthMiddleware);
export const getUserId = AuthMiddleware.getUserId.bind(AuthMiddleware);
export const isAuthenticated = AuthMiddleware.isAuthenticated.bind(AuthMiddleware);
export const hasRole = AuthMiddleware.hasRole.bind(AuthMiddleware);
export const hasAnyRole = AuthMiddleware.hasAnyRole.bind(AuthMiddleware);