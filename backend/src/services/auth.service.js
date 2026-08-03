// backend/src/services/auth.service.js
// ✅ COMPLETE FIXED - Added proper user ID handling and verification

import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository.js';
import { VerificationTokenRepository } from '../repositories/verificationToken.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { TokenService } from './token.service.js';
import EmailService from './email.service.js';
import { SecurityService } from './security.service.js';

// ─── Configurable Security Values ──────────────────────────────
const CONFIG = {
  // Login security
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  ACCOUNT_LOCK_TIME_MINUTES: parseInt(process.env.ACCOUNT_LOCK_TIME) || 3,
  
  // Token expiry (in milliseconds)
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  
  // Verification expiry (in minutes)
  EMAIL_VERIFICATION_EXPIRY_MINUTES: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY) || 1440, // 24 hours
  PASSWORD_RESET_EXPIRY_MINUTES: parseInt(process.env.PASSWORD_RESET_EXPIRY) || 15,
};

export class AuthService {
  static async register(userData) {
    const {
      name,
      email,
      password,
      phone,
      country = 'Rwanda'
    } = userData;

    console.log(`📝 [AuthService] Registering user: ${email}`);

    if (!name || !email || !password) {
      throw new Error('All fields are required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const normalizedEmail = email.toLowerCase();

    const exists = await UserRepository.exists(normalizedEmail);
    if (exists) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ─── Create verification token ──────────────────────────────
    const { token: verificationToken, hash: verificationHash } = TokenService.generateVerificationToken();
    const verificationExpiry = new Date(Date.now() + CONFIG.EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

    // ─── Create user ──────────────────────────────────────────────
    const user = await UserRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || undefined,
      country,
      isEmailVerified: false,
      verificationTokenHash: verificationHash,
      verificationTokenExpiry: verificationExpiry,
      passwordChangedAt: new Date(),
      tokenVersion: 1
    });

    console.log(`✅ [AuthService] User created: ${user.email} (ID: ${user._id})`);

    // ─── Send verification email (fire and forget) ──────────────
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    console.log(`📧 [AuthService] Verification URL: ${verificationUrl}`);
    
    EmailService.sendVerificationEmail(user, verificationUrl)
      .then(result => {
        console.log(`📧 [AuthService] Email send result for ${user.email}:`, result);
      })
      .catch(error => {
        console.error(`❌ [AuthService] Email failed for ${user.email}:`, error.message);
      });

    // ─── Generate tokens ──────────────────────────────────────────
    const accessToken = TokenService.generateAccessToken(user);
    const { token: refreshToken, tokenId } = TokenService.generateRefreshToken(user);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const hashedRefreshToken = TokenService.hashToken(refreshToken);
    
    await TokenService.storeRefreshToken(
      user._id,
      tokenId,
      hashedRefreshToken,
      expiresAt
    );

    return {
      user: user.sanitize(),
      accessToken,
      refreshToken,
      requiresVerification: true
    };
  }

  static async login(email, password, ip, userAgent) {
    const user = await UserRepository.findByEmailWithPassword(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // ─── Check if account is locked ─────────────────────────────
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw new Error(`Account locked. Try again in ${remainingMinutes} minutes`);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      // ✅ Increment failed attempts
      await UserRepository.incrementLoginAttempts(user._id);
      const attempts = user.loginAttempts + 1;
      const maxAttempts = CONFIG.MAX_LOGIN_ATTEMPTS;
      const remaining = Math.max(0, maxAttempts - attempts);
      
      // ✅ Check if account should be locked
      if (attempts >= maxAttempts) {
        const lockDurationMs = CONFIG.ACCOUNT_LOCK_TIME_MINUTES * 60 * 1000;
        const lockedUntil = new Date(Date.now() + lockDurationMs);
        
        // ✅ Update user with lock
        await UserRepository.update(user._id, {
          lockUntil: lockedUntil,
          loginAttempts: 0
        });
        
        throw new Error(`Account locked for ${CONFIG.ACCOUNT_LOCK_TIME_MINUTES} minutes.`);
      }
      
      // ✅ Different messages based on remaining attempts
      let message = 'Invalid credentials';
      if (remaining === 1) {
        message = 'Invalid credentials. Last attempt remaining.';
      } else if (remaining <= 2) {
        message = `Invalid credentials. ${remaining} attempts remaining. Consider resetting your password.`;
      } else {
        message = `Invalid credentials. ${remaining} attempts remaining.`;
      }
      
      throw new Error(message);
    }

    // ✅ Reset login attempts on successful login
    await UserRepository.resetLoginAttempts(user._id);
    await UserRepository.updateLastLogin(user._id, ip);

    const accessToken = TokenService.generateAccessToken(user);
    const { token: refreshToken, tokenId } = TokenService.generateRefreshToken(user);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const hashedRefreshToken = TokenService.hashToken(refreshToken);
    
    await TokenService.storeRefreshToken(
      user._id,
      tokenId,
      hashedRefreshToken,
      expiresAt,
      { ip, userAgent }
    );

    await SessionRepository.create({
      userId: user._id,
      refreshTokenId: tokenId,
      device: { ip, userAgent }
    });

    return {
      user: user.sanitize(),
      accessToken,
      refreshToken
    };
  }

  static async refresh(refreshToken, ip, userAgent) {
    const verification = TokenService.verifyRefreshToken(refreshToken);
    if (!verification.valid) {
      throw new Error('Invalid refresh token');
    }

    const { decoded } = verification;
    const hashedToken = TokenService.hashToken(refreshToken);
    const storedToken = await TokenService.getRefreshTokenByHash(hashedToken);
    
    if (!storedToken || !storedToken.isValid()) {
      throw new Error('Invalid refresh token');
    }

    const user = await UserRepository.findById(decoded.sub);
    if (!user) {
      throw new Error('User not found');
    }

    if (decoded.version && user.tokenVersion && decoded.version !== user.tokenVersion) {
      throw new Error('Token version mismatch');
    }

    await storedToken.revoke('refresh_used');

    const newAccessToken = TokenService.generateAccessToken(user);
    const { token: newRefreshToken, tokenId } = TokenService.generateRefreshToken(user);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const hashedNewRefreshToken = TokenService.hashToken(newRefreshToken);
    
    await TokenService.storeRefreshToken(
      user._id,
      tokenId,
      hashedNewRefreshToken,
      expiresAt,
      { ip, userAgent }
    );

    const session = await SessionRepository.findByRefreshTokenId(storedToken.tokenId);
    if (session) {
      await SessionRepository.revoke(session._id);
      await SessionRepository.create({
        userId: user._id,
        refreshTokenId: tokenId,
        device: { ip, userAgent }
      });
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  static async logout(userId, refreshToken) {
    if (refreshToken) {
      const hashedToken = TokenService.hashToken(refreshToken);
      const storedToken = await TokenService.getRefreshTokenByHash(hashedToken);
      if (storedToken) {
        await storedToken.revoke('logout');
        const session = await SessionRepository.findByRefreshTokenId(storedToken.tokenId);
        if (session) {
          await SessionRepository.revoke(session._id);
        }
      }
    }

    return { success: true };
  }

  static async logoutAll(userId) {
    await TokenService.revokeAllRefreshTokens(userId, 'logout_all');
    await SessionRepository.revokeAllByUserId(userId);
    return { success: true };
  }

  static async verifyEmail(token) {
    const hashedToken = TokenService.hashToken(token);
    
    const user = await UserRepository.findByVerificationToken(hashedToken);
    
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    if (user.isEmailVerified) {
      throw new Error('Email already verified');
    }

    await UserRepository.update(user._id, {
      isEmailVerified: true,
      verificationTokenHash: undefined,
      verificationTokenExpiry: undefined
    });

    return { success: true };
  }

  static async resendVerification(email) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isEmailVerified) {
      throw new Error('Email already verified');
    }

    const { token: verificationToken, hash: verificationHash } = TokenService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + CONFIG.EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

    await UserRepository.update(user._id, {
      verificationTokenHash: verificationHash,
      verificationTokenExpiry: expiresAt
    });

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    await EmailService.sendVerificationEmail(user, verificationUrl);

    return { success: true };
  }

  static async forgotPassword(email) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      // ✅ Don't reveal if user exists for security
      return { success: true };
    }

    // ✅ Forgot password works even if account is locked
    // We don't check lockUntil here - password reset is always allowed

    const { token: resetToken, hash: resetHash } = TokenService.generateResetToken();
    const expiresAt = new Date(Date.now() + CONFIG.PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

    await VerificationTokenRepository.create({
      userId: user._id,
      tokenHash: resetHash,
      type: 'password_reset',
      expiresAt
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await EmailService.sendPasswordResetEmail(user, resetUrl);

    return { success: true };
  }

  static async resetPassword(token, newPassword) {
    const hashedToken = TokenService.hashToken(token);
    
    const resetToken = await VerificationTokenRepository.findByTokenHash(hashedToken);
    
    if (!resetToken || !resetToken.isValid() || resetToken.type !== 'password_reset') {
      throw new Error('Invalid or expired reset token');
    }

    const user = await UserRepository.findByIdWithPassword(resetToken.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Promise.all([
      UserRepository.update(user._id, {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        tokenVersion: user.tokenVersion + 1
      }),
      resetToken.use(),
      TokenService.revokeAllRefreshTokens(user._id, 'password_change')
    ]);

    await EmailService.sendPasswordChangedEmail(user);

    return { success: true };
  }

  /**
   * ✅ FIXED: Get current user with proper ID handling
   */
  static async getCurrentUser(userId) {
    console.log(`📌 [AuthService] getCurrentUser called with userId: ${userId}`);
    
    // ✅ Handle both string and ObjectId
    const user = await UserRepository.findById(userId);
    
    if (!user) {
      console.log(`❌ [AuthService] User not found: ${userId}`);
      throw new Error('User not found');
    }
    
    console.log(`✅ [AuthService] User found: ${user.email}`);
    return user;
  }

  static async updateProfile(userId, data) {
    const updates = {};
    if (data.name) updates.name = data.name.trim();
    if (data.phone) updates.phone = data.phone;
    if (data.country) updates.country = data.country;
    if (data.bio) updates.bio = data.bio.trim();
    if (data.location) updates.location = data.location.trim();
    if (data.socialLinks) updates.socialLinks = data.socialLinks;

    const user = await UserRepository.update(userId, updates);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

export default AuthService;