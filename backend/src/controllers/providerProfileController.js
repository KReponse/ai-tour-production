// backend/src/controllers/providerProfileController.js
// ✅ COMPLETE FIXED - All fields properly copied from ProviderRequest, with debugging

import ProviderProfile from "../models/ProviderProfile.js";
import ProviderRequest from "../models/ProviderRequest.js";
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Review from "../models/Review.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── HELPERS ──────────────────────────────────────────────────────

/**
 * Safely parse JSON string, return fallback if invalid
 */
const safeParseJSON = (value, fallback = null) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/**
 * Delete file from uploads folder if it exists
 */
const deleteFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(__dirname, "..", "uploads", filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted file: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to delete file: ${filename}`, error.message);
    }
  }
};

/**
 * Get uploads directory path
 */
const getUploadsPath = () => {
  return path.join(__dirname, "..", "uploads");
};

// ─── CREATE PROVIDER PROFILE FROM REQUEST ──────────────────────

export const createProviderProfileFromRequest = async (requestId, adminId) => {
  try {
    console.log('📝 [createProviderProfileFromRequest] Starting for request:', requestId);
    
    const request = await ProviderRequest.findById(requestId);

    if (!request) {
      throw new Error("Provider request not found");
    }

    console.log('📝 Request found:', {
      id: request._id,
      user: request.user,
      businessName: request.businessName,
      status: request.status
    });

    // Check if profile already exists
    const existing = await ProviderProfile.findOne({ userId: request.user });
    
    if (existing) {
      // ✅ UPDATE existing profile with latest data
      console.log('📝 Updating existing provider profile for user:', request.user);
      
      // Basic Info
      existing.businessName = request.businessName || existing.businessName;
      existing.businessType = request.businessType || existing.businessType;
      existing.description = request.description || existing.description;
      
      // Location
      existing.country = request.country || existing.country || "Rwanda";
      existing.city = request.city || existing.city;
      
      // Business Details
      existing.languages = request.languages || existing.languages || [];
      existing.specializations = request.specializations || existing.specializations || [];
      existing.yearsOfExperience = request.yearsOfExperience || existing.yearsOfExperience;
      
      // Branding
      existing.logo = request.logo || existing.logo;
      existing.coverImage = request.coverImage || existing.coverImage;
      
      // Contact
      existing.phone = request.businessPhone || request.phone || existing.phone;
      existing.email = request.businessEmail || request.email || existing.email;
      existing.whatsapp = request.whatsapp || existing.whatsapp;
      
      // Social Links
      existing.socialLinks = {
        facebook: request.facebook || existing.socialLinks?.facebook || "",
        instagram: request.instagram || existing.socialLinks?.instagram || "",
        twitter: request.twitter || existing.socialLinks?.twitter || "",
        linkedin: request.linkedin || existing.socialLinks?.linkedin || "",
        youtube: request.youtube || existing.socialLinks?.youtube || "",
        tiktok: request.tiktok || existing.socialLinks?.tiktok || "",
      };
      
      // Business Hours
      existing.businessHours = request.businessHours || existing.businessHours || {};
      
      // Status
      existing.verified = true;
      existing.status = "active";
      
      await existing.save();
      console.log('✅ Provider profile updated:', existing._id);
      return existing;
    }

    // ✅ CREATE new profile
    console.log('📝 Creating new provider profile for user:', request.user);
    
    const profileData = {
      userId: request.user,
      businessName: request.businessName || "",
      businessType: request.businessType || "other",
      description: request.description || "",
      country: request.country || "Rwanda",
      city: request.city || "",
      languages: request.languages || [],
      specializations: request.specializations || [],
      yearsOfExperience: request.yearsOfExperience || "",
      logo: request.logo || "",
      coverImage: request.coverImage || "",
      socialLinks: {
        facebook: request.facebook || "",
        instagram: request.instagram || "",
        twitter: request.twitter || "",
        linkedin: request.linkedin || "",
        youtube: request.youtube || "",
        tiktok: request.tiktok || "",
      },
      businessHours: request.businessHours || {},
      phone: request.businessPhone || request.phone || "",
      email: request.businessEmail || request.email || "",
      whatsapp: request.whatsapp || "",
      verified: true,
      status: "active",
    };

    console.log('📝 Profile data:', {
      businessName: profileData.businessName,
      businessType: profileData.businessType,
      userId: profileData.userId,
      verified: profileData.verified
    });

    const profile = await ProviderProfile.create(profileData);

    console.log('✅ Provider profile created:', profile._id);
    return profile;
  } catch (error) {
    console.error("❌ Create provider profile error:", error);
    console.error("❌ Error stack:", error.stack);
    throw error;
  }
};

// ─── GET PUBLIC PROVIDER PROFILE ───────────────────────────────

export const getPublicProviderProfile = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📤 [getPublicProviderProfile] Fetching for userId:', id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required"
      });
    }

    // ✅ Find provider profile by userId
    const profile = await ProviderProfile.findOne({
      userId: id,
      status: "active",
    });

    if (!profile) {
      console.log('❌ Provider profile not found for userId:', id);
      return res.status(404).json({
        success: false,
        message: "Provider profile not found",
      });
    }

    console.log('✅ Profile found:', profile._id);

    // ✅ Get user info
    const user = await User.findById(profile.userId).select(
      "name email phone profileImage"
    );

    // ✅ Get listings count
    const totalTours = await Listing.countDocuments({
      provider: profile.userId,
      status: "approved",
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    });

    // ✅ Get reviews
    const listings = await Listing.find({ 
      provider: profile.userId,
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    }).select("_id");
    
    const listingIds = listings.map((l) => l._id);

    const reviews = await Review.find({
      listing: { $in: listingIds },
      status: "approved",
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    // ✅ Build response with ALL fields
    const response = {
      success: true,
      profile: {
        _id: profile._id,
        userId: profile.userId,
        businessName: profile.businessName || "",
        businessType: profile.businessType || "other",
        description: profile.description || "",
        country: profile.country || "Rwanda",
        city: profile.city || "",
        languages: profile.languages || [],
        specializations: profile.specializations || [],
        yearsOfExperience: profile.yearsOfExperience || "",
        logo: profile.logo || "",
        coverImage: profile.coverImage || "",
        socialLinks: profile.socialLinks || {},
        businessHours: profile.businessHours || {},
        phone: profile.phone || "",
        email: profile.email || "",
        whatsapp: profile.whatsapp || "",
        verified: profile.verified || false,
        status: profile.status || "active",
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        user: {
          name: user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
          profileImage: user?.profileImage || "",
        },
        totalTours: totalTours || 0,
        totalReviews: totalReviews || 0,
        averageRating: Math.round(averageRating * 10) / 10 || 0,
      }
    };

    console.log('✅ Response built with fields:', Object.keys(response.profile));
    res.json(response);
  } catch (error) {
    console.error("❌ Get public provider profile error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch provider profile",
    });
  }
};

// ─── GET MY PROVIDER PROFILE ────────────────────────────────────

export const getMyProviderProfile = async (req, res) => {
  try {
    console.log('📌 getMyProviderProfile called');
    console.log('📌 req.user:', req.user);

    const userId = req.user.id || req.user._id;
    console.log('📌 Looking for userId:', userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // ✅ Try both String and ObjectId
    let profile = await ProviderProfile.findOne({
      $or: [
        { userId: userId },
        { userId: userId.toString() }
      ]
    });

    if (!profile) {
      console.log('📌 No profile found, checking user...');
      
      const user = await User.findById(userId);
      if (!user) {
        console.error('❌ User not found');
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('📌 User role:', user.role);

      // ✅ Check if user is a provider
      if (user.role !== 'provider') {
        console.error('❌ User is not a provider');
        return res.status(403).json({
          success: false,
          message: 'User is not a provider. Please complete your application first.'
        });
      }

      // ✅ Check if request is approved
      const request = await ProviderRequest.findOne({
        user: userId,
        status: 'approved'
      });

      if (!request) {
        console.error('❌ No approved request found');
        return res.status(404).json({
          success: false,
          message: 'Provider request not approved yet. Please wait for admin review.'
        });
      }

      console.log('📌 Creating provider profile...');

      // ✅ Create profile from request data
      const profileData = {
        userId: user._id,
        businessName: request.businessName || user.name,
        businessType: request.businessType || 'tour_operator',
        description: request.description || '',
        country: request.country || 'Rwanda',
        city: request.city || '',
        languages: request.languages || [],
        specializations: request.specializations || [],
        yearsOfExperience: request.yearsOfExperience || '',
        logo: request.logo || '',
        coverImage: request.coverImage || '',
        socialLinks: {
          facebook: request.facebook || '',
          instagram: request.instagram || '',
          twitter: request.twitter || '',
          linkedin: request.linkedin || '',
          youtube: request.youtube || '',
          tiktok: request.tiktok || ''
        },
        businessHours: request.businessHours || {},
        phone: request.businessPhone || user.phone || '',
        email: request.businessEmail || user.email || '',
        whatsapp: request.whatsapp || '',
        verified: false,
        status: 'active'
      };

      const newProfile = await ProviderProfile.create(profileData);
      console.log('✅ Provider profile created:', newProfile._id);

      return res.json({
        success: true,
        profile: newProfile
      });
    }

    console.log('✅ Profile found:', profile._id);
    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('❌ Error in getMyProviderProfile:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch provider profile'
    });
  }
};

// ─── UPDATE MY PROVIDER PROFILE ─────────────────────────────────

export const updateMyProviderProfile = async (req, res) => {
  try {
    console.log("📁 ===== UPDATE PROVIDER PROFILE =====");
    console.log("📁 Body keys:", Object.keys(req.body));
    console.log("📁 Files:", req.files ? Object.keys(req.files) : "No files");

    const userId = req.user._id || req.user.id;
    const profile = await ProviderProfile.findOne({ userId: userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found",
      });
    }

    // ─── Parse request body ────────────────────────────────────
    const {
      description,
      city,
      languages,
      specializations,
      yearsOfExperience,
      phone,
      email,
      whatsapp,
      facebook,
      instagram,
      twitter,
      linkedin,
      youtube,
      tiktok,
      businessHours,
      businessName,
      businessType,
      country,
    } = req.body;

    // ─── Update basic fields ──────────────────────────────────
    if (businessName !== undefined && businessName !== null && businessName !== "") {
      profile.businessName = businessName;
    }

    if (businessType !== undefined && businessType !== null && businessType !== "") {
      profile.businessType = businessType;
    }

    if (description !== undefined && description !== null && description !== "") {
      profile.description = description;
    }

    if (country !== undefined && country !== null && country !== "") {
      profile.country = country;
    }

    if (city !== undefined && city !== null && city !== "") {
      profile.city = city;
    }

    if (phone !== undefined && phone !== null && phone !== "") {
      profile.phone = phone;
    }

    if (email !== undefined && email !== null && email !== "") {
      profile.email = email;
    }

    if (whatsapp !== undefined) {
      profile.whatsapp = whatsapp || "";
    }

    // ─── Parse arrays ──────────────────────────────────────────
    if (languages !== undefined && languages !== null && languages !== "") {
      const parsed = safeParseJSON(languages, null);
      if (parsed !== null && Array.isArray(parsed)) {
        profile.languages = parsed;
      }
    }

    if (specializations !== undefined && specializations !== null && specializations !== "") {
      const parsed = safeParseJSON(specializations, null);
      if (parsed !== null && Array.isArray(parsed)) {
        profile.specializations = parsed;
      }
    }

    if (businessHours !== undefined && businessHours !== null && businessHours !== "") {
      const parsed = safeParseJSON(businessHours, null);
      if (parsed !== null && typeof parsed === "object") {
        profile.businessHours = parsed;
      }
    }

    if (yearsOfExperience !== undefined && yearsOfExperience !== null && yearsOfExperience !== "") {
      profile.yearsOfExperience = yearsOfExperience;
    }

    // ─── Update social links ──────────────────────────────────
    const socialLinks = {};

    if (facebook !== undefined && facebook !== null && facebook !== "") {
      socialLinks.facebook = facebook;
    }
    if (instagram !== undefined && instagram !== null && instagram !== "") {
      socialLinks.instagram = instagram;
    }
    if (twitter !== undefined && twitter !== null && twitter !== "") {
      socialLinks.twitter = twitter;
    }
    if (linkedin !== undefined && linkedin !== null && linkedin !== "") {
      socialLinks.linkedin = linkedin;
    }
    if (youtube !== undefined && youtube !== null && youtube !== "") {
      socialLinks.youtube = youtube;
    }
    if (tiktok !== undefined && tiktok !== null && tiktok !== "") {
      socialLinks.tiktok = tiktok;
    }

    if (Object.keys(socialLinks).length > 0) {
      profile.socialLinks = {
        ...profile.socialLinks,
        ...socialLinks,
      };
    }

    // ─── Handle Logo upload ───────────────────────────────────
    if (req.files?.logo && req.files.logo[0]) {
      const newLogo = req.files.logo[0].filename;
      console.log(`✅ New logo uploaded: ${newLogo}`);

      if (profile.logo && profile.logo !== newLogo) {
        deleteFile(profile.logo);
      }

      profile.logo = newLogo;
    }

    // ─── Handle Cover Image upload ────────────────────────────
    if (req.files?.coverImage && req.files.coverImage[0]) {
      const newCover = req.files.coverImage[0].filename;
      console.log(`✅ New cover image uploaded: ${newCover}`);

      if (profile.coverImage && profile.coverImage !== newCover) {
        deleteFile(profile.coverImage);
      }

      profile.coverImage = newCover;
    }

    // ─── Save profile ─────────────────────────────────────────
    await profile.save();

    console.log(`✅ Profile updated for user: ${userId}`);

    // ─── Return response ─────────────────────────────────────
    const updatedProfile = await ProviderProfile.findOne({ userId: userId });
    const user = await User.findById(userId).select("name email phone");

    res.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        ...updatedProfile.toJSON(),
        user: {
          name: user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
        },
      },
    });
  } catch (error) {
    console.error("❌ Update provider profile error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};