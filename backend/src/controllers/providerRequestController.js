// backend/src/controllers/providerController.js
// ✅ FULLY FIXED - Correct file field names (nationalIdFile, businessRegistrationFile)
// ✅ Fixed: user assignment using req.user.id
// ✅ Added: Comprehensive defensive validation
// ✅ Added: Detailed logging for debugging
// ✅ Added: Proper error handling
// ✅ Added: Duplicate request prevention
// ✅ Added: User existence verification
// ✅ Maintained: All existing functionality
// ✅ FIXED: PDF uploads now work correctly

import ProviderRequest from "../models/ProviderRequest.js";
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Review from "../models/Review.js";
import { createNotification } from "../utils/notificationService.js";
import { createProviderProfileFromRequest } from "./providerProfileController.js";

/* ================= CREATE PROVIDER REQUEST ================= */

export const createProviderRequest = async (req, res) => {
  try {
    console.log("📁 ===== CREATE PROVIDER REQUEST =====");
    
    // ✅ DEFENSIVE VALIDATION: Check if user exists
    if (!req.user) {
      console.error("❌ No authenticated user found in request");
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login to submit a provider request"
      });
    }

    // ✅ DEBUG: Log the user object to see structure
    console.log("🔍 Authenticated user:", JSON.stringify(req.user, null, 2));
    console.log("🔍 User ID options:", {
      id: req.user.id,
      _id: req.user._id,
      userId: req.user.userId,
      'req.user.id type': typeof req.user.id,
      'req.user._id type': typeof req.user._id
    });

    // ✅ SAFE USER ID EXTRACTION: Use fallback chain
    const userId = req.user._id || req.user.id || req.user.userId;
    
    // ✅ DEFENSIVE VALIDATION: Check if user ID exists
    if (!userId) {
      console.error("❌ No user ID found in authenticated user:", req.user);
      return res.status(400).json({
        success: false,
        message: "User ID missing from authenticated session. Please login again."
      });
    }

    console.log(`✅ Resolved user ID: ${userId}`);

    // ✅ Verify user exists in database
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ User not found in database: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "User not found. Please login again."
      });
    }

    console.log(`✅ User found: ${user.email} (${user._id})`);

    // ✅ Check if user already has a provider request
    const existingRequest = await ProviderRequest.findOne({ user: userId });
    if (existingRequest) {
      console.log(`⚠️ User ${userId} already has a provider request: ${existingRequest.status}`);
      
      if (existingRequest.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: "You already have a pending provider request. Please wait for review.",
          data: { status: existingRequest.status }
        });
      }
      
      if (existingRequest.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: "Your provider account is already approved.",
          data: { status: existingRequest.status }
        });
      }
      
      if (existingRequest.status === 'rejected') {
        console.log(`✅ User ${userId} is re-applying after rejection`);
      }
    }

    console.log("📁 Body fields:", Object.keys(req.body));
    console.log("📁 Files:", req.files ? Object.keys(req.files) : "No files");

    // ✅ Clean up empty objects from request body
    const cleanBody = { ...req.body };
    
    // ✅ Remove empty objects from file fields
    ['logo', 'coverImage', 'nationalId', 'passport', 'rdbCertificate', 
     'tinCertificate', 'tourismLicense', 'businessRegistration', 'insurance']
      .forEach(field => {
        if (cleanBody[field] && typeof cleanBody[field] === 'object' && Object.keys(cleanBody[field]).length === 0) {
          delete cleanBody[field];
        }
      });
    
    // ✅ Parse JSON strings for array fields
    let languages = [];
    let specializations = [];
    let businessHours = {};
    
    if (cleanBody.languages) {
      try {
        languages = typeof cleanBody.languages === 'string' 
          ? JSON.parse(cleanBody.languages) 
          : cleanBody.languages;
      } catch (e) { languages = []; }
    }
    
    if (cleanBody.specializations) {
      try {
        specializations = typeof cleanBody.specializations === 'string'
          ? JSON.parse(cleanBody.specializations)
          : cleanBody.specializations;
      } catch (e) { specializations = []; }
    }
    
    if (cleanBody.businessHours) {
      try {
        businessHours = typeof cleanBody.businessHours === 'string'
          ? JSON.parse(cleanBody.businessHours)
          : cleanBody.businessHours;
      } catch (e) { businessHours = {}; }
    }

    // ============================================================
    // ✅ FIXED: File uploads with correct field names
    // ============================================================
    let logo = "";
    let coverImage = "";
    let nationalIdFile = "";
    let passportFile = "";
    let rdbCertificateFile = "";
    let tinCertificateFile = "";
    let tourismLicenseFile = "";
    let businessRegistrationFile = "";
    let insuranceFile = "";
    
    if (req.files) {
      // Logo
      if (req.files.logo && req.files.logo[0]) {
        logo = req.files.logo[0].filename;
        console.log("✅ Logo uploaded:", logo);
      }
      // Cover Image
      if (req.files.coverImage && req.files.coverImage[0]) {
        coverImage = req.files.coverImage[0].filename;
        console.log("✅ Cover uploaded:", coverImage);
      }
      
      // ✅ FIXED: Using correct field names from frontend
      if (req.files.nationalIdFile && req.files.nationalIdFile[0]) {
        nationalIdFile = req.files.nationalIdFile[0].filename;
        console.log("✅ National ID uploaded:", nationalIdFile);
      }
      if (req.files.passportFile && req.files.passportFile[0]) {
        passportFile = req.files.passportFile[0].filename;
      }
      if (req.files.rdbCertificateFile && req.files.rdbCertificateFile[0]) {
        rdbCertificateFile = req.files.rdbCertificateFile[0].filename;
      }
      if (req.files.tinCertificateFile && req.files.tinCertificateFile[0]) {
        tinCertificateFile = req.files.tinCertificateFile[0].filename;
      }
      if (req.files.tourismLicenseFile && req.files.tourismLicenseFile[0]) {
        tourismLicenseFile = req.files.tourismLicenseFile[0].filename;
      }
      // ✅ FIXED: Using correct field name from frontend
      if (req.files.businessRegistrationFile && req.files.businessRegistrationFile[0]) {
        businessRegistrationFile = req.files.businessRegistrationFile[0].filename;
        console.log("✅ Business Registration uploaded:", businessRegistrationFile);
      }
      if (req.files.insuranceFile && req.files.insuranceFile[0]) {
        insuranceFile = req.files.insuranceFile[0].filename;
      }
    }

    // ✅ Build COMPLETE provider request data
    const providerRequestData = {
      user: userId,
      
      // Personal
      fullName: cleanBody.fullName || "",
      email: cleanBody.email || cleanBody.businessEmail || "",
      phone: cleanBody.phone || "",
      whatsapp: cleanBody.whatsapp || "",
      nationality: cleanBody.nationality || "",
      businessEmail: cleanBody.businessEmail || "",
      alternatePhone: cleanBody.alternatePhone || "",
      
      // Business
      businessName: cleanBody.businessName || "",
      businessType: cleanBody.businessType || "other",
      description: cleanBody.description || "",
      country: cleanBody.country || "Rwanda",
      province: cleanBody.province || "",
      district: cleanBody.district || "",
      city: cleanBody.city || "",
      street: cleanBody.street || "",
      googleMaps: cleanBody.googleMaps || "",
      businessAddress: cleanBody.businessAddress || "",
      businessPhone: cleanBody.businessPhone || "",
      
      // Pricing
      price: cleanBody.price ? Number(cleanBody.price) : 0,
      currency: cleanBody.currency || "USD",
      availability: cleanBody.availability || "Monday-Friday",
      
      // Documents - ✅ Using the correct file variables
      nationalId: cleanBody.nationalIdNumber || cleanBody.nationalId || "",
      tinNumber: cleanBody.tinNumber || "",
      rdbRegistration: cleanBody.rdbRegistration || "",
      tourismLicense: cleanBody.tourismLicense || "",
      nationalIdFile: nationalIdFile,
      passportFile: passportFile,
      rdbCertificateFile: rdbCertificateFile,
      tinCertificateFile: tinCertificateFile,
      tourismLicenseFile: tourismLicenseFile,
      businessRegistrationFile: businessRegistrationFile,
      insuranceFile: insuranceFile,
      
      // Business Details
      website: cleanBody.website || "",
      languages: languages,
      specializations: specializations,
      yearsOfExperience: cleanBody.yearsOfExperience || "",
      employees: cleanBody.employees ? Number(cleanBody.employees) : 0,
      businessHours: businessHours,
      
      // Social Media
      facebook: cleanBody.facebook || "",
      instagram: cleanBody.instagram || "",
      twitter: cleanBody.twitter || "",
      linkedin: cleanBody.linkedin || "",
      youtube: cleanBody.youtube || "",
      tiktok: cleanBody.tiktok || "",
      
      // Branding
      logo: logo,
      coverImage: coverImage,
      
      // Payment
      paymentMethod: cleanBody.paymentMethod || "mobile_money",
      bankName: cleanBody.bankName || "",
      accountName: cleanBody.accountName || "",
      accountNumber: cleanBody.accountNumber || "",
      swiftCode: cleanBody.swiftCode || "",
      mobileMoney: cleanBody.mobileMoney || "",
      paymentCurrency: cleanBody.paymentCurrency || "USD",
      
      // Agreements
      agreeToTerms: cleanBody.agreeToTerms === "true" || cleanBody.agreeToTerms === true,
      agreeToPrivacy: cleanBody.agreeToPrivacy === "true" || cleanBody.agreeToPrivacy === true,
      agreeToConduct: cleanBody.agreeToConduct === "true" || cleanBody.agreeToConduct === true,
      agreeToCommission: cleanBody.agreeToCommission === "true" || cleanBody.agreeToCommission === true,
      agreeToTourism: cleanBody.agreeToTourism === "true" || cleanBody.agreeToTourism === true,
      agreeToAccurate: cleanBody.agreeToAccurate === "true" || cleanBody.agreeToAccurate === true,
      
      status: "pending",
    };

    console.log(`📁 Saving provider request with ${Object.keys(providerRequestData).length} fields`);
    console.log(`📁 User ID being saved: ${providerRequestData.user}`);
    console.log(`📁 National ID File: ${nationalIdFile || 'None'}`);
    console.log(`📁 Business Registration File: ${businessRegistrationFile || 'None'}`);

    // ✅ Create provider request
    const request = new ProviderRequest(providerRequestData);
    
    // ✅ Validate before saving
    const validationError = request.validateSync();
    if (validationError) {
      console.error("❌ Validation error:", validationError);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(validationError.errors).map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    await request.save();

    console.log(`✅ Provider request created: ${request._id}`);

    // ✅ Send notification to user
    try {
      await createNotification({
        recipient: userId,
        type: "system_alert",
        title: "Provider Application Submitted",
        message: "Your provider application has been submitted successfully. We will review it within 3-5 business days.",
        link: "/provider/status"
      });
      console.log("✅ Notification sent to user");
    } catch (notifError) {
      console.warn("⚠️ Failed to send notification:", notifError.message);
    }

    res.status(201).json({
      success: true,
      message: "Provider request submitted successfully",
      request: {
        _id: request._id,
        status: request.status,
        businessName: request.businessName,
        businessType: request.businessType,
        fullName: request.fullName,
        email: request.email,
        phone: request.phone,
        country: request.country,
        city: request.city,
        createdAt: request.createdAt,
        estimatedReviewTime: "3-5 business days"
      }
    });
  } catch (error) {
    console.error("❌ Create provider request error:", error);
    console.error("❌ Error stack:", error.stack);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A provider request already exists for this user",
        duplicate: Object.keys(error.keyPattern)
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create provider request"
    });
  }
};

/* ================= GET MY PROVIDER REQUEST ================= */

export const getMyProviderRequest = async (req, res) => {
  try {
    console.log('📌 getMyProviderRequest called');
    console.log('📌 req.user:', req.user);

    // ✅ Get user ID from authenticated user
    const userId = req.user.id || req.user._id;

    if (!userId) {
      console.error('❌ No user ID found');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log('📌 Looking for provider request with userId:', userId);

    // ✅ Find provider request for this user
    const request = await ProviderRequest.findOne({ user: userId });

    // ✅ FIXED: Return 200 with data: null instead of 404
    if (!request) {
      console.log('📌 No provider request found for user:', userId);
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No provider request found'
      });
    }

    console.log('✅ Provider request found:', request._id);
    console.log('📌 Status:', request.status);
    console.log('📌 Business:', request.businessName);

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('❌ Error in getMyProviderRequest:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET PROVIDER REQUESTS (ADMIN) ================= */

export const getProviderRequests = async (req, res) => {
  try {
    console.log("📥 GET /provider-requests - Query:", req.query);

    const { status, page = 1, limit = 20, search } = req.query;

    const filter = {};
    
    if (status && status !== 'all' && status !== 'undefined') {
      filter.status = status;
    }
    
    if (search && search.trim()) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessEmail: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit) || 20;

    console.log("🔍 Filter:", JSON.stringify(filter));
    console.log("📄 Skip:", skip, "Limit:", limitNum);

    const requests = await ProviderRequest.find(filter)
      .populate('user', 'name email phone')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await ProviderRequest.countDocuments(filter);

    console.log(`✅ Found ${requests.length} requests, Total: ${total}`);

    res.status(200).json({
      success: true,
      requests,
      total,
      page: parseInt(page),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("❌ Get provider requests error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch provider requests",
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/* ================= GET PROVIDER REQUEST BY ID ================= */

export const getProviderRequestById = async (req, res) => {
  try {
    const request = await ProviderRequest.findById(req.params.id)
      .populate("user", "name email profileImage phone")
      .populate("reviewedBy", "name email");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Provider request not found",
      });
    }

    res.status(200).json({
      success: true,
      request: {
        _id: request._id,
        user: request.user,
        reviewedBy: request.reviewedBy,
        fullName: request.fullName,
        phone: request.phone,
        whatsapp: request.whatsapp,
        nationality: request.nationality,
        businessEmail: request.businessEmail,
        alternatePhone: request.alternatePhone,
        businessName: request.businessName,
        businessType: request.businessType,
        description: request.description,
        businessPhone: request.businessPhone,
        businessAddress: request.businessAddress,
        country: request.country,
        province: request.province,
        district: request.district,
        city: request.city,
        street: request.street,
        googleMaps: request.googleMaps,
        documents: request.documents,
        nationalIdFile: request.nationalIdFile,
        passportFile: request.passportFile,
        rdbCertificateFile: request.rdbCertificateFile,
        tinCertificateFile: request.tinCertificateFile,
        tourismLicenseFile: request.tourismLicenseFile,
        businessRegistrationFile: request.businessRegistrationFile,
        insuranceFile: request.insuranceFile,
        logo: request.logo,
        coverImage: request.coverImage,
        profileImage: request.profileImage,
        price: request.price,
        currency: request.currency,
        availability: request.availability,
        website: request.website,
        facebook: request.facebook,
        instagram: request.instagram,
        twitter: request.twitter,
        linkedin: request.linkedin,
        youtube: request.youtube,
        tiktok: request.tiktok,
        nationalId: request.nationalId,
        tinNumber: request.tinNumber,
        rdbRegistration: request.rdbRegistration,
        tourismLicense: request.tourismLicense,
        languages: request.languages || [],
        specializations: request.specializations || [],
        yearsOfExperience: request.yearsOfExperience,
        employees: request.employees,
        businessHours: request.businessHours || {},
        paymentMethod: request.paymentMethod,
        bankName: request.bankName,
        accountName: request.accountName,
        accountNumber: request.accountNumber,
        swiftCode: request.swiftCode,
        mobileMoney: request.mobileMoney,
        paymentCurrency: request.paymentCurrency,
        agreeToTerms: request.agreeToTerms,
        agreeToPrivacy: request.agreeToPrivacy,
        agreeToConduct: request.agreeToConduct,
        agreeToCommission: request.agreeToCommission,
        agreeToTourism: request.agreeToTourism,
        agreeToAccurate: request.agreeToAccurate,
        status: request.status,
        adminNotes: request.adminNotes,
        reviewedAt: request.reviewedAt,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        isPending: request.isPending,
        isApproved: request.isApproved,
      },
    });
  } catch (error) {
    console.error("❌ Get provider request by id error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= UPDATE PROVIDER REQUEST STATUS (ADMIN) ================= */

export const updateProviderRequestStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login"
      });
    }

    const adminId = req.user._id || req.user.id || req.user.userId;

    const request = await ProviderRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Provider request not found",
      });
    }

    request.status = status;
    if (adminNotes) request.adminNotes = adminNotes;
    request.reviewedAt = new Date();
    request.reviewedBy = adminId;
    await request.save();

    const user = await User.findById(request.user);
    if (user) {
      if (status === "approved") {
        user.role = "provider";
        user.verificationStatus = "approved";
        user.providerApprovedDate = new Date();
        await user.save();

        await createNotification({
          recipient: user._id,
          sender: adminId,
          type: "system_alert",
          title: "Provider Approved ✅",
          message: "Congratulations! Your provider account has been approved. You can now create tours and manage your business.",
          data: { requestId: request._id },
          link: `/provider/dashboard`,
        });
      } else if (status === "rejected") {
        user.role = "traveler";
        user.verificationStatus = "rejected";
        await user.save();

        await createNotification({
          recipient: user._id,
          sender: adminId,
          type: "system_alert",
          title: "Provider Application Rejected ❌",
          message: `Your provider application has been rejected. Reason: ${adminNotes || "No reason provided"}`,
          data: { requestId: request._id },
          link: `/provider/request`,
        });
      } else if (status === "needs_information") {
        user.verificationStatus = "needs_information";
        await user.save();

        await createNotification({
          recipient: user._id,
          sender: adminId,
          type: "system_alert",
          title: "More Information Required",
          message: `Please provide additional information. Reason: ${adminNotes || "Missing information"}`,
          data: { requestId: request._id },
          link: `/provider/request`,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Provider request ${status}`,
      request,
    });
  } catch (error) {
    console.error("❌ Update provider request status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= APPROVE PROVIDER REQUEST (ADMIN) ================= */

export const approveProviderRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login"
      });
    }

    const adminId = req.user._id || req.user.id || req.user.userId;

    const request = await ProviderRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Provider request not found",
      });
    }

    request.status = "approved";
    request.reviewedAt = new Date();
    request.reviewedBy = adminId;
    await request.save();

    const user = await User.findById(request.user);
    if (user) {
      user.role = "provider";
      user.verificationStatus = "approved";
      user.providerApprovedDate = new Date();
      await user.save();
    }

    const profile = await createProviderProfileFromRequest(request._id, adminId);

    await createNotification({
      recipient: user._id,
      sender: adminId,
      type: "system_alert",
      title: "Provider Approved ✅",
      message: "Congratulations! Your provider account has been approved. You can now create tours.",
      data: { requestId: request._id, profileId: profile?._id },
      link: `/provider/dashboard`,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(user._id.toString()).emit("newNotification", {
        title: "Provider Approved ✅",
        message: "Congratulations! Your provider account has been approved.",
        type: "system_alert",
        data: { requestId: request._id },
      });
    }

    res.status(200).json({
      success: true,
      message: "Provider approved successfully",
      request,
      profile,
    });
  } catch (error) {
    console.error("❌ Approve provider request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= REJECT PROVIDER REQUEST (ADMIN) ================= */

export const rejectProviderRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login"
      });
    }

    const adminId = req.user._id || req.user.id || req.user.userId;

    const request = await ProviderRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Provider request not found",
      });
    }

    const { adminNotes } = req.body;

    request.status = "rejected";
    request.adminNotes = adminNotes || "";
    request.reviewedAt = new Date();
    request.reviewedBy = adminId;
    await request.save();

    const user = await User.findById(request.user);
    if (user) {
      user.role = "traveler";
      user.verificationStatus = "rejected";
      await user.save();

      await createNotification({
        recipient: user._id,
        sender: adminId,
        type: 'system_alert',
        title: 'Provider Request Rejected ❌',
        message: `Your provider application was rejected. Reason: ${request.adminNotes}`,
        data: { requestId: request._id },
        link: `/provider/request`
      });

      const io = req.app.get('io');
      if (io) {
        io.to(user._id.toString()).emit('newNotification', {
          title: 'Provider Request Rejected ❌',
          message: `Your provider application was rejected.`,
          type: 'system_alert',
          data: { requestId: request._id }
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Provider request rejected",
      request,
    });
  } catch (error) {
    console.error("❌ Reject provider request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= PROVIDER PROFILE ================= */

export const getProviderProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login"
      });
    }

    const userId = req.user._id || req.user.id || req.user.userId;

    const user = await User.findById(userId)
      .select("-password");

    res.status(200).json({
      success: true,
      profile: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= UPDATE PROVIDER PROFILE ================= */

export const updateProviderProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login"
      });
    }

    const userId = req.user._id || req.user.id || req.user.userId;
    const { name, phone, bio, location, socialLinks } = req.body;

    const user = await User.findById(userId);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (socialLinks) user.socialLinks = socialLinks;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= PUBLIC: GET PROVIDER PUBLIC PROFILE ================= */

export const getPublicProviderProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await User.findOne({
      _id: id,
      $or: [
        { role: "provider" },
        { role: "traveler", verificationStatus: "approved" }
      ]
    }).select("-password -resetPasswordToken -resetPasswordExpire");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    const providerRequest = await ProviderRequest.findOne({
      user: provider._id,
      status: "approved"
    });

    if (!providerRequest && provider.role !== "provider") {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found"
      });
    }

    const listings = await Listing.find({ 
      provider: provider._id, 
      status: "approved",
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    });
    
    const listingIds = listings.map(l => l._id);
    
    const reviews = await Review.find({
      listing: { $in: listingIds },
      status: "approved"
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const isVerified = provider.role === "provider" || provider.verificationStatus === "approved";

    const whatsappNumber = providerRequest?.whatsapp || 
                          providerRequest?.businessPhone || 
                          provider.phone || 
                          "";

    res.json({
      success: true,
      provider: {
        _id: provider._id,
        name: provider.name,
        email: provider.email || providerRequest?.businessEmail || "",
        phone: provider.phone || providerRequest?.businessPhone || "",
        avatar: provider.avatar || "",
        bio: provider.bio || providerRequest?.description || "",
        location: provider.location || providerRequest?.city || "",
        createdAt: provider.createdAt,
        memberSince: provider.createdAt,
        
        socialLinks: {
          facebook: provider.socialLinks?.facebook || providerRequest?.facebook || "",
          instagram: provider.socialLinks?.instagram || providerRequest?.instagram || "",
          twitter: provider.socialLinks?.twitter || providerRequest?.twitter || "",
          linkedin: provider.socialLinks?.linkedin || providerRequest?.linkedin || "",
          youtube: provider.socialLinks?.youtube || providerRequest?.youtube || "",
          tiktok: provider.socialLinks?.tiktok || providerRequest?.tiktok || "",
        },
        
        businessName: providerRequest?.businessName || provider.name,
        businessType: providerRequest?.businessType || "tour_operator",
        description: providerRequest?.description || "",
        country: providerRequest?.country || "",
        city: providerRequest?.city || "",
        province: providerRequest?.province || "",
        district: providerRequest?.district || "",
        street: providerRequest?.street || "",
        businessAddress: providerRequest?.businessAddress || "",
        price: providerRequest?.price || 0,
        currency: providerRequest?.currency || "USD",
        availability: providerRequest?.availability || "Monday-Friday",
        
        businessEmail: providerRequest?.businessEmail || provider.email || "",
        businessPhone: providerRequest?.businessPhone || provider.phone || "",
        whatsapp: whatsappNumber,
        website: providerRequest?.website || "",
        googleMaps: providerRequest?.googleMaps || "",
        
        logo: providerRequest?.logo || "",
        coverImage: providerRequest?.coverImage || "",
        
        languages: providerRequest?.languages || [],
        specializations: providerRequest?.specializations || [],
        yearsOfExperience: providerRequest?.yearsOfExperience || "",
        
        businessHours: providerRequest?.businessHours || {
          monday: { open: "08:00", close: "18:00", closed: false },
          tuesday: { open: "08:00", close: "18:00", closed: false },
          wednesday: { open: "08:00", close: "18:00", closed: false },
          thursday: { open: "08:00", close: "18:00", closed: false },
          friday: { open: "08:00", close: "18:00", closed: false },
          saturday: { open: "08:00", close: "18:00", closed: false },
          sunday: { open: "08:00", close: "18:00", closed: false }
        },
        
        totalTours: listings.length,
        totalReviews: totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        
        verified: isVerified,
        verificationStatus: provider.verificationStatus || "approved",
      }
    });
  } catch (error) {
    console.error("❌ Get public provider profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= PUBLIC: GET PROVIDER TOURS ================= */

export const getPublicProviderTours = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const listings = await Listing.find({
      provider: id,
      status: "approved",
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await Listing.countDocuments({
      provider: id,
      status: "approved",
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    });

    res.json({
      success: true,
      tours: listings,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error("❌ Get public provider tours error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= PUBLIC: GET PROVIDER REVIEWS ================= */

export const getPublicProviderReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const listings = await Listing.find({ 
      provider: id, 
      status: "approved",
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    }).select('_id');
    
    const listingIds = listings.map(l => l._id);

    const reviews = await Review.find({
      listing: { $in: listingIds },
      status: "approved"
    })
      .populate('user', 'name avatar')
      .populate('listing', 'title')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Review.countDocuments({
      listing: { $in: listingIds },
      status: "approved"
    });

    res.json({
      success: true,
      reviews,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error("❌ Get public provider reviews error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= UPDATE PROVIDER REQUEST (ADMIN) ================= */

export const updateProviderRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'needs_information'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const request = await ProviderRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Provider request not found"
      });
    }

    const adminId = req.user._id || req.user.id || req.user.userId;

    request.status = status;
    if (adminNotes) request.adminNotes = adminNotes;
    request.reviewedAt = new Date();
    request.reviewedBy = adminId;
    await request.save();

    await request.populate('user', 'name email');

    res.status(200).json({
      success: true,
      message: `Provider request ${status}`,
      request
    });
  } catch (error) {
    console.error("❌ Update provider request error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET ALL PROVIDERS (ADMIN) ================= */

export const getAllProviders = async (req, res) => {
  try {
    const providers = await User.find({
      $or: [
        { role: 'provider' },
        { verificationStatus: 'approved' }
      ]
    })
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 });

    const providerRequests = await ProviderRequest.find({
      user: { $in: providers.map(p => p._id) },
      status: 'approved'
    });

    const providersWithBusiness = providers.map(provider => {
      const request = providerRequests.find(r => 
        r.user.toString() === provider._id.toString()
      );
      
      return {
        _id: provider._id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone,
        avatar: provider.avatar,
        role: provider.role,
        verificationStatus: provider.verificationStatus,
        providerApprovedDate: provider.providerApprovedDate,
        createdAt: provider.createdAt,
        businessName: request?.businessName || provider.name,
        businessType: request?.businessType || 'tour_operator',
        description: request?.description || '',
        country: request?.country || '',
        city: request?.city || '',
        price: request?.price || 0,
        currency: request?.currency || 'USD',
        logo: request?.logo || '',
        coverImage: request?.coverImage || '',
        businessPhone: request?.businessPhone || provider.phone,
        businessEmail: request?.businessEmail || provider.email,
        languages: request?.languages || [],
        specializations: request?.specializations || [],
        yearsOfExperience: request?.yearsOfExperience || '',
        website: request?.website || '',
        facebook: request?.facebook || '',
        instagram: request?.instagram || '',
        twitter: request?.twitter || '',
        linkedin: request?.linkedin || '',
        youtube: request?.youtube || '',
        tiktok: request?.tiktok || '',
        status: request?.status || 'pending',
      };
    });

    res.status(200).json({
      success: true,
      count: providersWithBusiness.length,
      providers: providersWithBusiness
    });
  } catch (error) {
    console.error('❌ Get all providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch providers',
      error: error.message
    });
  }
};