// backend/src/controllers/listingController.js
// ✅ SIMPLIFIED - No media uploads (only saves URLs from frontend)
// ✅ All media URLs are already Cloudinary URLs from frontend
// ✅ Backward compatible with existing local filenames

import Listing from "../models/Listing.js";
import User from "../models/User.js";
import ProviderProfile from "../models/ProviderProfile.js";
import { createNotification } from "../utils/notificationService.js";

// ✅ Cache to prevent duplicate requests
let lastListingsRequestTime = 0;
let lastListingsResult = null;

// ===============================
// ✅ HELPER: Get existing media from request
// ===============================
const getExistingMedia = (req) => {
  let existingImages = [];
  let existingVideos = [];
  
  try {
    if (req.body.existingImages) {
      existingImages = typeof req.body.existingImages === 'string'
        ? JSON.parse(req.body.existingImages)
        : req.body.existingImages;
    }
    if (req.body.existingVideos) {
      existingVideos = typeof req.body.existingVideos === 'string'
        ? JSON.parse(req.body.existingVideos)
        : req.body.existingVideos;
    }
  } catch (e) {
    console.warn('⚠️ Failed to parse existing media:', e.message);
  }
  
  // Ensure arrays
  if (!Array.isArray(existingImages)) existingImages = [];
  if (!Array.isArray(existingVideos)) existingVideos = [];
  
  return { existingImages, existingVideos };
};

/* ================= CREATE LISTING ================= */

export const createListing = async (req, res) => {
  try {
    console.log("📁 ===== CREATE LISTING =====");
    console.log("📁 Body:", JSON.stringify(req.body, null, 2));

    if (!req.body || Object.keys(req.body).length === 0) {
      console.error("❌ Request body is empty!");
      return res.status(400).json({
        success: false,
        message: "No data received. Please check the request format.",
      });
    }

    const {
      title,
      location,
      price,
      duration,
      capacity,
      description,
      businessType,
      listingType,
      category,
      highlights,
      included,
      excluded,
      meetingPoint,
      cancellationPolicy,
      requirements,
      amenities,
      menu,
      cuisine,
      vehicleType,
      seats,
      dynamicFields,
      coverMedia,        // ✅ Already Cloudinary URL
      coverMediaType,    // ✅ 'image' or 'video'
      coverImage,        // ✅ Already Cloudinary URL
      galleryImages,     // ✅ Array of Cloudinary URLs
      videos,            // ✅ Array of Cloudinary URLs
    } = req.body;

    // ✅ Validate required fields
    const missingFields = [];
    if (!title) missingFields.push("title");
    if (!location) missingFields.push("location");
    if (!price) missingFields.push("price");
    if (!description) missingFields.push("description");
    if (!businessType) missingFields.push("businessType");
    if (!listingType) missingFields.push("listingType");

    if (missingFields.length > 0) {
      console.error("❌ Missing required fields:", missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        missingFields,
      });
    }

    const validBusinessTypes = [
      "tour_operator", "guide", "hotel", "lodge", "restaurant",
      "cafe", "transport", "events", "shop", "other",
    ];
    
    if (!validBusinessTypes.includes(businessType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid businessType: ${businessType}`,
      });
    }

    const finalCategory = category || businessType;

    // ✅ Parse dynamic fields
    let parsedDynamicFields = {};
    if (dynamicFields) {
      try {
        parsedDynamicFields = typeof dynamicFields === "string"
          ? JSON.parse(dynamicFields)
          : dynamicFields;
      } catch (e) {
        parsedDynamicFields = {};
      }
    }

    // ✅ Get provider ID
    const providerId = req.user?._id || req.user?.id || req.user?.sub || req.userData?._id || req.userData?.id;

    if (!providerId) {
      console.error("❌ No provider ID found!");
      return res.status(401).json({
        success: false,
        message: "User not authenticated. Please login again.",
      });
    }

    console.log("✅ Provider ID found:", providerId);
    console.log("📸 Cover Media URL:", coverMedia || 'None');
    console.log("📸 Gallery Images:", galleryImages?.length || 0);
    console.log("🎬 Videos:", videos?.length || 0);

    // ✅ Create listing with Cloudinary URLs (NO uploads)
    const listing = await Listing.create({
      title,
      location,
      price: Number(price),
      duration: duration || "",
      capacity: capacity ? Number(capacity) : 1,
      description,
      businessType,
      listingType,
      category: finalCategory,
      highlights: highlights || "",
      included: included || "",
      excluded: excluded || "",
      meetingPoint: meetingPoint || "",
      cancellationPolicy: cancellationPolicy || "",
      requirements: requirements || "",
      amenities: amenities || "",
      menu: menu || "",
      cuisine: cuisine || "",
      vehicleType: vehicleType || "",
      seats: seats ? Number(seats) : 0,
      dynamicFields: parsedDynamicFields,
      coverMedia: coverMedia || "",
      coverMediaType: coverMediaType || 'image',
      coverImage: coverImage || coverMedia || "",
      galleryImages: galleryImages || [],
      videos: videos || [],
      provider: providerId,
      userId: providerId,
      status: "pending",
    });

    console.log("✅ Listing created:", listing._id);

    // ✅ Send notifications to admins
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification({
        recipient: admin._id,
        sender: req.user._id || req.user.id || providerId,
        type: "listing_created",
        title: "New Listing Created 📋",
        message: `${req.user.name || req.user.email || 'A provider'} created a new listing: "${listing.title}"`,
        data: { listingId: listing._id },
        link: `/admin/listings/${listing._id}`,
      });
    }

    const io = req.app.get("io");
    if (io) {
      for (const admin of admins) {
        io.to(admin._id.toString()).emit("newNotification", {
          title: "New Listing Created 📋",
          message: `${req.user.name || req.user.email || 'A provider'} created a new listing: "${listing.title}"`,
          type: "listing_created",
          data: { listingId: listing._id },
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      listing,
    });
  } catch (error) {
    console.error("❌ CREATE LISTING ERROR:", error);
    console.error("❌ Error stack:", error.stack);
    
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET PUBLIC LISTINGS ================= */

export const getListings = async (req, res) => {
  try {
    const {
      businessType,
      listingType,
      category,
      search,
      sort = 'createdAt',
      order = 'desc',
      limit = 20,
      page = 1,
      minPrice,
      maxPrice,
      location,
      rating,
      provider,
    } = req.query;

    const filter = { status: "approved" };
    
    if (provider) filter.provider = provider;
    if (businessType) filter.businessType = businessType;
    if (listingType) filter.listingType = listingType;
    if (category) filter.category = category;
    if (location) filter.location = { $regex: location, $options: 'i' };
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    if (rating) {
      filter.averageRating = { $gte: Number(rating) };
    }
    
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const validSortFields = ['createdAt', 'price', 'averageRating', 'likesCount', 'title', 'location'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate("provider", "name email profileImage verified")
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
      filters: {
        businessType,
        listingType,
        category,
        search,
        minPrice,
        maxPrice,
        location,
        rating,
        provider: provider || null,
        sort,
        order,
      },
    });
  } catch (error) {
    console.error("❌ GET LISTINGS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET SINGLE LISTING ================= */

export const getSingleListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("provider", "name email profileImage verified");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    res.json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error("❌ GET SINGLE LISTING ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET PROVIDER LISTINGS ================= */

export const getProviderListings = async (req, res) => {
  try {
    const now = Date.now();
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = req.query;
    
    const useCache = page == 1 && !status && !search && sort === 'createdAt' && order === 'desc';
    
    if (useCache && now - lastListingsRequestTime < 500) {
      console.log('⏳ Duplicate listings request blocked (cache)');
      if (lastListingsResult) {
        return res.json(lastListingsResult);
      }
    }

    const userId = req.user?.id || req.user?._id || req.userData?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const filter = { provider: userId };
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const validSortFields = ['createdAt', 'price', 'averageRating', 'likesCount', 'title', 'status'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    const result = {
      success: true,
      data: listings,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
      filters: {
        status,
        search,
        sort,
        order,
      },
    };
    
    if (useCache) {
      lastListingsRequestTime = now;
      lastListingsResult = result;
    }

    res.json(result);
  } catch (error) {
    console.error('❌ GET PROVIDER LISTINGS ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch listings',
    });
  }
};

/* ================= GET LISTINGS BY PROVIDER ID ================= */

export const getListingsByProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 20, status = 'approved' } = req.query;

    if (!providerId || providerId === 'undefined' || providerId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider ID',
      });
    }

    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    const filter = { 
      provider: providerId,
      status: 'approved',
    };

    if (req.user && req.user._id && req.user._id.toString() === providerId) {
      delete filter.status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('provider', 'name email businessName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    res.json({
      success: true,
      listings,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error('❌ Get listings by provider error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch provider listings',
    });
  }
};

/* ================= UPDATE LISTING - SIMPLIFIED ================= */

export const updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      location,
      price,
      duration,
      capacity,
      description,
      businessType,
      listingType,
      highlights,
      included,
      excluded,
      meetingPoint,
      cancellationPolicy,
      requirements,
      amenities,
      menu,
      cuisine,
      vehicleType,
      seats,
      dynamicFields,
      coverMediaType,
      coverMedia,        // ✅ Already Cloudinary URL
      coverImage,        // ✅ Already Cloudinary URL
      galleryImages,     // ✅ Array of Cloudinary URLs
      videos,            // ✅ Array of Cloudinary URLs
    } = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this listing",
      });
    }

    // ✅ Track old media for cleanup (if needed)
    const oldGalleryImages = [...listing.galleryImages];
    const oldVideos = [...listing.videos];
    const oldCoverMedia = listing.coverMedia;

    // ✅ Parse existing media from frontend
    const { existingImages, existingVideos } = getExistingMedia(req);
    console.log('📸 Existing images to keep:', existingImages);
    console.log('🎬 Existing videos to keep:', existingVideos);

    // =========================
    // ✅ UPDATE BASIC FIELDS
    // =========================
    listing.title = title || listing.title;
    listing.location = location || listing.location;
    listing.price = price ? Number(price) : listing.price;
    listing.duration = duration || listing.duration;
    listing.capacity = capacity ? Number(capacity) : listing.capacity;
    listing.description = description || listing.description;
    listing.businessType = businessType || listing.businessType;
    listing.listingType = listingType || listing.listingType;
    listing.highlights = highlights || listing.highlights;
    listing.included = included || listing.included;
    listing.excluded = excluded || listing.excluded;
    listing.meetingPoint = meetingPoint || listing.meetingPoint;
    listing.cancellationPolicy = cancellationPolicy || listing.cancellationPolicy;
    listing.requirements = requirements || listing.requirements;
    listing.amenities = amenities || listing.amenities;
    listing.menu = menu || listing.menu;
    listing.cuisine = cuisine || listing.cuisine;
    listing.vehicleType = vehicleType || listing.vehicleType;
    listing.seats = seats ? Number(seats) : listing.seats;

    if (coverMediaType) {
      listing.coverMediaType = coverMediaType;
    }

    if (dynamicFields) {
      try {
        listing.dynamicFields = typeof dynamicFields === "string"
          ? JSON.parse(dynamicFields)
          : dynamicFields;
      } catch (e) {
        listing.dynamicFields = {};
      }
    }

    // =========================
    // ✅ UPDATE MEDIA URLs (Direct assignment - NO uploads)
    // =========================
    if (coverMedia !== undefined) {
      listing.coverMedia = coverMedia || "";
    }
    if (coverImage !== undefined) {
      listing.coverImage = coverImage || "";
    }
    if (coverMediaType !== undefined) {
      listing.coverMediaType = coverMediaType || 'image';
    }

    // ✅ Gallery: existingImages (from frontend) + any new URLs
    if (galleryImages !== undefined) {
      listing.galleryImages = galleryImages;
      console.log('✅ Gallery updated:', listing.galleryImages.length);
    } else if (existingImages.length > 0) {
      listing.galleryImages = existingImages;
    }

    // ✅ Videos: existingVideos (from frontend) + any new URLs
    if (videos !== undefined) {
      listing.videos = videos;
      console.log('✅ Videos updated:', listing.videos.length);
    } else if (existingVideos.length > 0) {
      listing.videos = existingVideos;
    }

    // =========================
    // ✅ SAVE THE LISTING
    // =========================
    await listing.save();

    console.log('✅ Listing update complete');
    console.log('📸 Current gallery:', listing.galleryImages);
    console.log('🎬 Current videos:', listing.videos);

    res.json({
      success: true,
      message: "Listing updated successfully",
      listing,
    });
  } catch (error) {
    console.error("❌ UPDATE LISTING ERROR:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= DELETE LISTING ================= */

export const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this listing",
      });
    }

    await listing.deleteOne();

    res.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("❌ DELETE LISTING ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= TOGGLE LISTING STATUS ================= */

export const toggleListingStatus = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this listing",
      });
    }

    if (listing.status === "pending") {
      listing.status = "approved";
    } else if (listing.status === "approved") {
      listing.status = "pending";
    } else {
      listing.status = "pending";
    }

    await listing.save();

    res.json({
      success: true,
      message: `Listing status updated to ${listing.status}`,
      listing,
    });
  } catch (error) {
    console.error("❌ TOGGLE LISTING STATUS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= TOGGLE LIKE ================= */

export const toggleLike = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    const liked = listing.likes.includes(req.user._id);

    if (liked) {
      listing.likes = listing.likes.filter(
        (id) => id.toString() !== req.user._id.toString()
      );
      listing.likesCount--;
    } else {
      listing.likes.push(req.user._id);
      listing.likesCount++;
    }

    await listing.save();

    if (!liked && listing.provider.toString() !== req.user._id.toString()) {
      await createNotification({
        recipient: listing.provider,
        sender: req.user._id,
        type: "system_alert",
        title: "Listing Liked ❤️",
        message: `${req.user.name} liked your listing "${listing.title}"`,
        data: { listingId: listing._id },
        link: `/listings/${listing._id}`,
      });

      const io = req.app.get("io");
      if (io) {
        io.to(listing.provider.toString()).emit("newNotification", {
          title: "Listing Liked ❤️",
          message: `${req.user.name} liked your listing "${listing.title}"`,
          type: "system_alert",
          data: { listingId: listing._id },
        });
      }
    }

    res.json({
      success: true,
      liked: !liked,
      likesCount: listing.likesCount,
      message: liked ? "Listing unliked" : "Listing liked",
    });
  } catch (error) {
    console.error("❌ TOGGLE LIKE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET LIKES ================= */

export const getLikes = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("likes", "name profileImage");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    res.json({
      success: true,
      likesCount: listing.likesCount,
      likes: listing.likes,
    });
  } catch (error) {
    console.error("❌ GET LIKES ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= CHECK IF USER LIKED ================= */

export const checkLike = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    const liked = listing.likes.includes(req.user._id);

    res.json({
      success: true,
      liked,
    });
  } catch (error) {
    console.error("❌ CHECK LIKE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= ADMIN FUNCTIONS ================= */

export const getAllListings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      provider,
      businessType,
      category,
      sort = 'createdAt',
      order = 'desc',
      startDate,
      endDate,
    } = req.query;

    const filter = {};
    
    if (status && status !== 'all') filter.status = status;
    if (provider) filter.provider = provider;
    if (businessType) filter.businessType = businessType;
    if (category) filter.category = category;
    
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { 'provider.name': { $regex: search, $options: 'i' } },
      ];
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const validSortFields = ['createdAt', 'price', 'averageRating', 'likesCount', 'title', 'status'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('provider', 'name email profileImage')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
      filters: {
        status,
        search,
        provider,
        businessType,
        category,
        sort,
        order,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("❌ GET ALL LISTINGS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPendingListings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    const filter = { status: "pending" };
    
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'provider.name': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('provider', 'name email')
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
      filters: {
        search,
        sort,
        order,
      },
    });
  } catch (error) {
    console.error("❌ GET PENDING LISTINGS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const approveListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    listing.status = "approved";
    listing.approvedBy = req.user._id;
    listing.approvedAt = new Date();
    await listing.save();

    await createNotification({
      recipient: listing.provider,
      sender: req.user._id,
      type: "listing_approved",
      title: "Listing Approved ✅",
      message: `Your listing "${listing.title}" has been approved and is now visible to travelers.`,
      data: { listingId: listing._id },
      link: `/provider/listings/${listing._id}`,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(listing.provider.toString()).emit("newNotification", {
        title: "Listing Approved ✅",
        message: `Your listing "${listing.title}" has been approved and is now visible to travelers.`,
        type: "listing_approved",
        data: { listingId: listing._id },
      });
    }

    res.json({
      success: true,
      message: "Listing approved successfully",
      listing,
    });
  } catch (error) {
    console.error("❌ APPROVE LISTING ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const rejectListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    const { reason } = req.body;

    listing.status = "rejected";
    listing.rejectedBy = req.user._id;
    listing.rejectedAt = new Date();
    listing.rejectReason = reason || "No reason provided";

    await listing.save();

    await createNotification({
      recipient: listing.provider,
      sender: req.user._id,
      type: "listing_rejected",
      title: "Listing Rejected ❌",
      message: `Your listing "${listing.title}" has been rejected. ${reason ? `Reason: ${reason}` : ""}`,
      data: { listingId: listing._id },
      link: `/provider/listings/${listing._id}`,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(listing.provider.toString()).emit("newNotification", {
        title: "Listing Rejected ❌",
        message: `Your listing "${listing.title}" has been rejected.`,
        type: "listing_rejected",
        data: { listingId: listing._id },
      });
    }

    res.json({
      success: true,
      message: "Listing rejected successfully",
      listing,
    });
  } catch (error) {
    console.error("❌ REJECT LISTING ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const suspendListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    const { reason } = req.body;

    listing.status = "suspended";
    listing.suspendedBy = req.user._id;
    listing.suspendedAt = new Date();
    listing.suspendReason = reason || "No reason provided";

    await listing.save();

    await createNotification({
      recipient: listing.provider,
      sender: req.user._id,
      type: "listing_suspended",
      title: "Listing Suspended ⛔",
      message: `Your listing "${listing.title}" has been suspended. ${reason ? `Reason: ${reason}` : ""}`,
      data: { listingId: listing._id },
      link: `/provider/listings/${listing._id}`,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(listing.provider.toString()).emit("newNotification", {
        title: "Listing Suspended ⛔",
        message: `Your listing "${listing.title}" has been suspended.`,
        type: "listing_suspended",
        data: { listingId: listing._id },
      });
    }

    res.json({
      success: true,
      message: "Listing suspended successfully",
      listing,
    });
  } catch (error) {
    console.error("❌ SUSPEND LISTING ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteListingAdmin = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    const providerId = listing.provider;
    const listingTitle = listing.title;

    await listing.deleteOne();

    await createNotification({
      recipient: providerId,
      sender: req.user._id,
      type: "listing_deleted",
      title: "Listing Deleted 🗑️",
      message: `Your listing "${listingTitle}" has been deleted by an administrator.`,
      data: { listingId: listing._id },
      link: `/provider/listings`,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(providerId.toString()).emit("newNotification", {
        title: "Listing Deleted 🗑️",
        message: `Your listing "${listingTitle}" has been deleted by an administrator.`,
        type: "listing_deleted",
        data: { listingId: listing._id },
      });
    }

    res.json({
      success: true,
      message: "Listing deleted successfully by admin",
    });
  } catch (error) {
    console.error("❌ ADMIN DELETE LISTING ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};