// backend/src/repositories/verificationToken.repository.js
// ✅ NEW - Verification Token Repository

import VerificationToken from '../models/VerificationToken.js';

export class VerificationTokenRepository {
  static async create(data) {
    const token = new VerificationToken(data);
    await token.save();
    return token;
  }

  static async findByTokenHash(hash) {
    return VerificationToken.findOne({ tokenHash: hash });
  }

  static async findByUserId(userId) {
    return VerificationToken.findOne({ userId });
  }

  static async findValidByUserId(userId, type) {
    return VerificationToken.findOne({
      userId,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
  }

  static async update(id, data) {
    return VerificationToken.findByIdAndUpdate(id, data, { new: true });
  }

  static async deleteExpired() {
    return VerificationToken.deleteMany({
      expiresAt: { $lt: new Date() }
    });
  }

  static async deleteByUserId(userId) {
    return VerificationToken.deleteMany({ userId });
  }
}

export default VerificationTokenRepository;