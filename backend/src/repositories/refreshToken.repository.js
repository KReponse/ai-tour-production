// backend/src/repositories/refreshToken.repository.js
// ✅ Authentication v2 - Refresh Token Repository

import RefreshToken from '../models/RefreshToken.js';

export class RefreshTokenRepository {
  static async create(data) {
    const token = new RefreshToken(data);
    await token.save();
    return token;
  }

  static async findByTokenHash(hash) {
    return RefreshToken.findOne({ tokenHash: hash });
  }

  static async findByTokenId(id) {
    return RefreshToken.findOne({ tokenId: id });
  }

  static async findActiveByUserId(userId) {
    return RefreshToken.find({
      userId,
      isActive: true,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    });
  }

  static async revokeByTokenId(id, reason = 'logout') {
    const token = await RefreshToken.findOne({ tokenId: id });
    if (token) {
      await token.revoke(reason);
      return token;
    }
    return null;
  }

  static async revokeAllByUserId(userId, reason = 'logout') {
    const tokens = await RefreshToken.find({
      userId,
      isActive: true,
      revokedAt: null
    });
    await Promise.all(tokens.map(t => t.revoke(reason)));
    return tokens;
  }

  static async deleteExpired() {
    return RefreshToken.deleteMany({
      expiresAt: { $lt: new Date() }
    });
  }

  static async findByUserId(userId) {
    return RefreshToken.find({ userId }).sort({ createdAt: -1 });
  }
}

export default RefreshTokenRepository;