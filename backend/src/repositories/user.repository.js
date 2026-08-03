// backend/src/repositories/user.repository.js
// ✅ FIXED - Added verification token methods

import User from '../models/User.js';

export class UserRepository {
  static async create(userData) {
    const user = new User(userData);
    await user.save();
    return user;
  }

  static async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
  }

  static async findById(id) {
    return User.findById(id).select('-password');
  }

  static async findByIdWithPassword(id) {
    return User.findById(id).select('+password');
  }

  static async update(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
  }

  static async updateLastLogin(id, ip, location = null) {
    const update = {
      lastLogin: new Date(),
      lastLoginIP: ip
    };
    if (location) {
      update.lastLoginLocation = location;
    }
    return User.findByIdAndUpdate(id, update, { new: true });
  }

  static async incrementLoginAttempts(id) {
    const user = await User.findById(id);
    if (!user) return null;
    return user.incrementLoginAttempts();
  }

  static async resetLoginAttempts(id) {
    const user = await User.findById(id);
    if (!user) return null;
    return user.resetLoginAttempts();
  }

  static async exists(email) {
    const count = await User.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }

  static async findByEmailWithPassword(email) {
    return User.findOne({ email: email.toLowerCase() }).select('+password');
  }

  // ✅ FIND BY VERIFICATION TOKEN
  static async findByVerificationToken(hashedToken) {
    return User.findOne({
      verificationTokenHash: hashedToken,
      verificationTokenExpiry: { $gt: new Date() }
    }).select('+verificationTokenHash +verificationTokenExpiry');
  }

  // ✅ UPDATE VERIFICATION TOKEN
  static async updateVerificationToken(userId, hashedToken, expiry) {
    return User.findByIdAndUpdate(userId, {
      verificationTokenHash: hashedToken,
      verificationTokenExpiry: expiry
    }, { new: true });
  }

  // ✅ CLEAR VERIFICATION TOKEN
  static async clearVerificationToken(userId) {
    return User.findByIdAndUpdate(userId, {
      verificationTokenHash: undefined,
      verificationTokenExpiry: undefined
    }, { new: true });
  }
}

export default UserRepository;