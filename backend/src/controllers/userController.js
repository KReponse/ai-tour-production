// backend/src/controllers/userController.js
// ✅ COMPLETE FIXED - Proper user ID handling with fallbacks

import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";

// ============================================================
// ✅ GET CURRENT USER - FIXED
// ============================================================
export const getMe = async (req, res) => {
  console.log('📌 getMe controller called');
  console.log('👤 req.user:', req.user);
  
  try {
    // ✅ FIXED: Use _id first, then fallback to id
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      console.error('❌ No user ID in request');
      console.error('📌 req.user keys:', Object.keys(req.user || {}));
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - user not found'
      });
    }

    console.log(`📌 Looking for user with ID: ${userId}`);

    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      console.error('❌ User not found in database:', userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log('✅ User found:', user.email);
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ Get user error:", error.message);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ UPDATE PROFILE
// ============================================================
export const updateMe = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - user not found'
      });
    }

    console.log(`📝 Updating profile for user: ${userId}`);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const allowedFields = ['name', 'email', 'phone', 'country', 'bio', 'location', 'avatar'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        user[field] = req.body[field];
      }
    });

    if (req.body.socialLinks && typeof req.body.socialLinks === 'object') {
      const socialFields = ['instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'youtube'];
      if (!user.socialLinks) user.socialLinks = {};
      
      socialFields.forEach(field => {
        if (req.body.socialLinks[field] !== undefined) {
          user.socialLinks[field] = req.body.socialLinks[field];
        }
      });
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password -__v");

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ USER STATS
// ============================================================
export const getMyStats = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const bookings = await Booking.countDocuments({ user: userId });
    const reviews = await Review.countDocuments({ user: userId });

    res.json({
      success: true,
      stats: {
        bookings,
        reviews,
      },
    });
  } catch (error) {
    console.error("❌ Get stats error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ ADMIN FUNCTIONS
// ============================================================

export const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("❌ Get all users error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("❌ Get user by id error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    const validRoles = ['traveler', 'provider', 'admin'];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = role.toLowerCase();
    await user.save();

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user
    });
  } catch (error) {
    console.error("❌ Update user role error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      user
    });
  } catch (error) {
    console.error("❌ Toggle user status error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error("❌ Delete user error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};