// backend/src/repositories/session.repository.js
// ✅ Authentication v2 - Session Repository

import Session from '../models/Session.js';

export class SessionRepository {
  static async create(data) {
    const session = new Session(data);
    await session.save();
    return session;
  }

  static async findByRefreshTokenId(refreshTokenId) {
    return Session.findOne({ refreshTokenId });
  }

  static async findActiveByUserId(userId) {
    return Session.find({
      userId,
      isActive: true
    }).sort({ lastActivity: -1 });
  }

  static async updateActivity(id) {
    return Session.findByIdAndUpdate(id, {
      lastActivity: new Date()
    }, { new: true });
  }

  static async revoke(id) {
    return Session.findByIdAndUpdate(id, {
      isActive: false
    }, { new: true });
  }

  static async revokeAllByUserId(userId) {
    return Session.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );
  }

  static async revokeAllExcept(userId, refreshTokenId) {
    return Session.updateMany(
      { userId, isActive: true, refreshTokenId: { $ne: refreshTokenId } },
      { isActive: false }
    );
  }
}

export default SessionRepository;