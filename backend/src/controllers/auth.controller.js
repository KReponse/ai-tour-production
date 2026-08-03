// backend/src/controllers/auth.controller.js
// ✅ COMPLETE FIXED - Fixed getCurrentUser with proper user ID handling

import { AuthService } from '../services/auth.service.js';
import { SecurityService } from '../services/security.service.js';
import { ResponseUtils } from '../utils/response.utils.js';
import { UserRepository } from '../repositories/user.repository.js';
import { TokenService } from '../services/token.service.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// ─── Configurable Security Values ──────────────────────────────
const CONFIG = {
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  ACCOUNT_LOCK_TIME_MINUTES: parseInt(process.env.ACCOUNT_LOCK_TIME) || 3,
};

export class AuthController {
  static async register(req, res) {
    try {
      console.log(`📝 [AuthController] Register request: ${req.body.email}`);
      const result = await AuthService.register(req.body);
      console.log(`✅ [AuthController] User registered: ${req.body.email}`);
      
      return ResponseUtils.created(res, {
        success: true,
        message: 'Registration successful. Please check your email for verification.',
        requiresVerification: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      console.error('❌ [AuthController] Register error:', error.message);
      return ResponseUtils.error(res, error.message, 400);
    }
  }

  static async login(req, res) {
    try {
      const ip = SecurityService.getClientIP(req);
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.login(
        req.body.email,
        req.body.password,
        ip,
        userAgent
      );

      console.log(`✅ [AuthController] User logged in: ${result.user.email} (verified: ${result.user.isEmailVerified})`);
      
      return ResponseUtils.success(res, {
        success: true,
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      console.error('❌ [AuthController] Login error:', error.message);
      
      const errorMessage = error.message;
      
      if (errorMessage.includes('Account locked')) {
        const minutesMatch = errorMessage.match(/(\d+)\s*minutes?/);
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : CONFIG.ACCOUNT_LOCK_TIME_MINUTES;
        
        return ResponseUtils.error(res, errorMessage, 403, {
          code: 'ACCOUNT_LOCKED',
          lockedUntil: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
          lockedForMinutes: minutes,
          canResetPassword: true,
          action: 'Use forgot-password to reset your password'
        });
      }
      
      if (errorMessage.includes('attempts remaining') || errorMessage.includes('Last attempt remaining')) {
        const remainingMatch = errorMessage.match(/(\d+)\s*attempts?/);
        const remaining = remainingMatch ? parseInt(remainingMatch[1]) : 0;
        const maxAttempts = CONFIG.MAX_LOGIN_ATTEMPTS;
        
        const response = {
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: remaining,
          maxAttempts: maxAttempts,
        };
        
        if (remaining <= 2) {
          response.suggestResetPassword = true;
          response.message = errorMessage + ' Consider resetting your password.';
        } else {
          response.message = errorMessage;
        }
        
        return ResponseUtils.error(res, response.message, 401, response);
      }
      
      return ResponseUtils.error(res, errorMessage, 401);
    }
  }

  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      console.log(`📧 [AuthController] Verifying email with token: ${token?.substring(0, 20)}...`);

      if (!token) {
        return ResponseUtils.error(res, 'Verification token is required', 400);
      }

      await AuthService.verifyEmail(token);
      console.log('✅ [AuthController] Email verified successfully');
      
      return ResponseUtils.success(res, {
        success: true,
        message: 'Email verified successfully. You can now log in.'
      });
    } catch (error) {
      console.error('❌ [AuthController] Verify email error:', error.message);
      return ResponseUtils.error(res, error.message, 400);
    }
  }

  static async resendVerification(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return ResponseUtils.error(res, 'Email is required', 400);
      }

      console.log(`📧 [AuthController] Resending verification to: ${email}`);
      await AuthService.resendVerification(email);
      
      return ResponseUtils.success(res, {
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      console.error('❌ [AuthController] Resend verification error:', error.message);
      return ResponseUtils.error(res, error.message, 400);
    }
  }

  static async refresh(req, res) {
    try {
      const { refreshToken } = req.body;
      const ip = SecurityService.getClientIP(req);
      const userAgent = req.headers['user-agent'];

      if (!refreshToken) {
        return ResponseUtils.error(res, 'Refresh token is required', 400);
      }

      const result = await AuthService.refresh(refreshToken, ip, userAgent);
      return ResponseUtils.success(res, {
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      console.error('❌ [AuthController] Refresh error:', error.message);
      return ResponseUtils.error(res, error.message, 401);
    }
  }

  static async logout(req, res) {
    try {
      const userId = req.user.id || req.user._id;
      const refreshToken = req.body.refreshToken;

      await AuthService.logout(userId, refreshToken);
      return ResponseUtils.success(res, {
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('❌ [AuthController] Logout error:', error.message);
      return ResponseUtils.error(res, error.message, 400);
    }
  }

  static async logoutAll(req, res) {
    try {
      const userId = req.user.id || req.user._id;
      await AuthService.logoutAll(userId);
      return ResponseUtils.success(res, {
        success: true,
        message: 'Logged out from all devices successfully'
      });
    } catch (error) {
      console.error('❌ [AuthController] LogoutAll error:', error.message);
      return ResponseUtils.error(res, error.message, 400);
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return ResponseUtils.error(res, 'Email is required', 400);
      }

      await AuthService.forgotPassword(email);
      return ResponseUtils.success(res, {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    } catch (error) {
      console.error('❌ [AuthController] Forgot password error:', error.message);
      return ResponseUtils.error(res, error.message, 400);
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!token || !password) {
        return ResponseUtils.error(res, 'Token and password are required', 400);
      }

      await AuthService.resetPassword(token, password);
      return ResponseUtils.success(res, {
        success: true,
        message: 'Password reset successful. Please log in with your new password.'
      });
    } catch (error) {
      console.error('❌ [AuthController] Reset password error:', error.message);
      return ResponseUtils.error(res, error.message, 400);
    }
  }

  /**
   * ✅ FIXED: Get current user with proper error handling
   * Now uses req.user._id or req.user.id for compatibility
   */
  static async getCurrentUser(req, res) {
    try {
      // ✅ FIXED: Use both _id and id for compatibility
      const userId = req.user?._id || req.user?.id;
      
      if (!userId) {
        console.error('❌ [AuthController] No user ID found in request');
        return ResponseUtils.error(res, 'User not authenticated', 401);
      }

      console.log(`📌 [AuthController] Getting current user: ${userId}`);

      // ✅ Find user directly to avoid service layer issues
      const user = await User.findById(userId)
        .select('-password -refreshTokenHash -refreshTokenId -tokenBlacklist')
        .lean();

      if (!user) {
        console.error(`❌ [AuthController] User not found: ${userId}`);
        return ResponseUtils.error(res, 'User not found', 404);
      }

      console.log(`✅ [AuthController] Current user retrieved: ${user.email}`);
      
      return ResponseUtils.success(res, {
        success: true,
        user: user
      });
    } catch (error) {
      console.error('❌ [AuthController] Get current user error:', error.message);
      console.error('❌ Error stack:', error.stack);
      return ResponseUtils.error(res, error.message || 'Failed to get user', 500);
    }
  }

  static async updateProfile(req, res) {
    try {
      const userId = req.user.id || req.user._id;
      const user = await AuthService.updateProfile(userId, req.body);
      return ResponseUtils.success(res, {
        success: true,
        message: 'Profile updated successfully',
        user: user.sanitize()
      });
    } catch (error) {
      console.error('❌ [AuthController] Update profile error:', error.message);
      return ResponseUtils.error(res, error.message, 400);
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return ResponseUtils.error(res, 'Current password and new password are required', 400);
      }

      const validation = SecurityService.validatePassword(newPassword);
      if (!validation.valid) {
        return ResponseUtils.error(res, validation.message, 400);
      }

      const userId = req.user.id || req.user._id;
      const user = await UserRepository.findByIdWithPassword(userId);
      if (!user) {
        return ResponseUtils.error(res, 'User not found', 404);
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return ResponseUtils.error(res, 'Current password is incorrect', 401);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await UserRepository.update(user._id, {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        tokenVersion: user.tokenVersion + 1
      });

      await AuthService.logoutAll(user._id);

      return ResponseUtils.success(res, {
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('❌ [AuthController] Change password error:', error.message);
      return ResponseUtils.error(res, error.message, 400);
    }
  }
}

export default AuthController;