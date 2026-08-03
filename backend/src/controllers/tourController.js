// backend/src/controllers/tourController.js
// ✅ COMPLETE REWRITE - Uses Listing model instead of Tour

import Listing from "../models/Listing.js";
import User from "../models/User.js";
import { createNotification } from "../utils/notificationService.js";
import { transformToExperiences } from "../ai/utils/experienceTransformer.js";

/* ================= CREATE TOUR (as Listing) ================= */

export const createTour = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const {
      title,
      location,
      price,
      duration,
      travelers,
      description,
      highlights,
      included,
      excluded,
      meetingPoint,
      cancellationPolicy,
      requirements,
      businessType = 'tour_operator'
    } = req.body;

    // VALIDATION
    if (!title || !location || !price || !duration || !travelers || !description) {
      return res.status(400).json({
        success: false,
        message: "All tour fields are required"
      });
    }

    const coverImage = req.files?.coverImage?.[0]?.filename || "";
    const galleryImages = req.files?.galleryImages
      ? req.files.galleryImages.map(file => file.filename)
      : [];
    const videos = req.files?.videos
      ? req.files.videos.map(file => file.filename)
      : [];

    // ✅ Create as Listing instead of Tour
    const listing = await Listing.create({
      title,
      location,
      price: Number(price),
      duration,
      capacity: Number(travelers),
      description,
      highlights: highlights ? highlights.split(',').map(h => h.trim()) : [],
      included: included ? included.split(',').map(i => i.trim()) : [],
      excluded: excluded ? excluded.split(',').map(e => e.trim()) : [],
      meetingPoint,
      cancellationPolicy,
      requirements,
      coverImage,
      galleryImages,
      videos,
      businessType: businessType,
      provider: req.user._id,
      status: "pending",
      providerName: req.user.name || req.user.businessName,
      providerVerified: req.user.isVerified || false,
      createdAt: new Date()
    });

    // Send notification
    await createNotification({
      recipient: req.user._id,
      sender: req.user._id,
      type: 'listing_created',
      title: 'Tour Created 📝',
      message: `Your tour "${listing.title}" has been created and is pending approval.`,
      data: { listingId: listing._id },
      link: `/provider/listings/${listing._id}`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('newNotification', {
        title: 'Tour Created 📝',
        message: `Your tour "${listing.title}" has been created and is pending approval.`,
        type: 'listing_created',
        data: { listingId: listing._id }
      });
    }

    res.status(201).json({
      success: true,
      message: "Tour created successfully",
      tour: listing
    });
  } catch (error) {
    console.log("CREATE TOUR ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= PUBLIC TOURS ================= */

export const getTours = async (req, res) => {
  try {
    const listings = await Listing.find({ 
      status: "approved",
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    })
      .populate("provider", "name email businessName")
      .sort({ createdAt: -1 })
      .lean();

    const tours = transformToExperiences(listings);

    res.json({
      success: true,
      count: tours.length,
      tours
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET SINGLE TOUR ================= */

export const getSingleTour = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("provider", "name email businessName")
      .lean();

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    const tour = transformToExperiences([listing])[0];

    res.json({
      success: true,
      tour
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET PROVIDER TOURS ================= */

export const getProviderTours = async (req, res) => {
  try {
    console.log('========================================');
    console.log('🔍 getProviderTours called');
    console.log('👤 User object:', req.user);
    console.log('🆔 User ID:', req.user?._id);
    console.log('========================================');

    if (!req.user || !req.user._id) {
      console.error('❌ User not authenticated');
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    console.log(`🔍 Querying listings for provider: ${req.user._id}`);

    let listings = [];
    try {
      listings = await Listing.find({ 
        provider: req.user._id,
        businessType: { $in: ['tour_operator', 'guide', 'transport'] }
      })
        .sort({ createdAt: -1 })
        .lean();
      
      console.log(`✅ Found ${listings.length} listings for provider`);
      
    } catch (dbError) {
      console.error('❌ DATABASE ERROR:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database error: ' + dbError.message,
        errorType: dbError.name
      });
    }

    const tours = transformToExperiences(listings);

    res.json({
      success: true,
      count: tours.length,
      tours: tours || []
    });

  } catch (error) {
    console.error('❌ CATCH ALL ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch tours',
      errorType: error.name || 'UnknownError'
    });
  }
};

/* ================= ADMIN: GET ALL TOURS ================= */

export const getAllTours = async (req, res) => {
  try {
    const listings = await Listing.find({
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    })
      .populate('provider', 'name email businessName')
      .sort({ createdAt: -1 })
      .lean();

    const tours = transformToExperiences(listings);

    res.json({
      success: true,
      count: tours.length,
      tours
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= ADMIN: GET PENDING TOURS ================= */

export const getPendingTours = async (req, res) => {
  try {
    const listings = await Listing.find({ 
      status: 'pending',
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    })
      .populate('provider', 'name email businessName')
      .sort({ createdAt: -1 })
      .lean();

    const tours = transformToExperiences(listings);

    res.json({
      success: true,
      count: tours.length,
      tours
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= ADMIN: APPROVE TOUR ================= */

export const approveTour = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    listing.status = "approved";
    listing.approvedAt = new Date();
    await listing.save();

    await createNotification({
      recipient: listing.provider,
      sender: req.user._id,
      type: 'listing_approved',
      title: 'Tour Approved ✅',
      message: `Your tour "${listing.title}" has been approved and is now visible to travelers.`,
      data: { listingId: listing._id },
      link: `/provider/listings/${listing._id}`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(listing.provider.toString()).emit('newNotification', {
        title: 'Tour Approved ✅',
        message: `Your tour "${listing.title}" has been approved and is now visible to travelers.`,
        type: 'listing_approved',
        data: { listingId: listing._id }
      });
    }

    res.json({
      success: true,
      message: "Tour approved successfully",
      tour: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= ADMIN: REJECT TOUR ================= */

export const rejectTour = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    const { reason } = req.body;

    listing.status = "rejected";
    listing.rejectionReason = reason;
    await listing.save();

    await createNotification({
      recipient: listing.provider,
      sender: req.user._id,
      type: 'listing_rejected',
      title: 'Tour Rejected ❌',
      message: `Your tour "${listing.title}" has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
      data: { listingId: listing._id },
      link: `/provider/listings/${listing._id}`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(listing.provider.toString()).emit('newNotification', {
        title: 'Tour Rejected ❌',
        message: `Your tour "${listing.title}" has been rejected.`,
        type: 'listing_rejected',
        data: { listingId: listing._id }
      });
    }

    res.json({
      success: true,
      message: "Tour rejected successfully",
      tour: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= DELETE TOUR ================= */

export const deleteTour = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    if (listing.provider.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this tour"
      });
    }

    await listing.deleteOne();

    res.json({
      success: true,
      message: "Tour deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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
        message: "Tour not found"
      });
    }

    if (!listing.likes) {
      listing.likes = [];
    }
    if (!listing.likesCount) {
      listing.likesCount = 0;
    }

    const liked = listing.likes.includes(req.user._id);
    
    if (liked) {
      listing.likes = listing.likes.filter(
        id => id.toString() !== req.user._id.toString()
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
        type: 'system_alert',
        title: 'Tour Liked ❤️',
        message: `${req.user.name} liked your tour "${listing.title}"`,
        data: { listingId: listing._id },
        link: `/tours/${listing._id}`
      });

      const io = req.app.get('io');
      if (io) {
        io.to(listing.provider.toString()).emit('newNotification', {
          title: 'Tour Liked ❤️',
          message: `${req.user.name} liked your tour "${listing.title}"`,
          type: 'system_alert',
          data: { listingId: listing._id }
        });
      }
    }

    res.json({
      success: true,
      liked: !liked,
      likesCount: listing.likesCount,
      message: liked ? 'Tour unliked' : 'Tour liked'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET LIKES ================= */

export const getLikes = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('likes', 'name profileImage');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    res.json({
      success: true,
      likesCount: listing.likesCount || 0,
      likes: listing.likes || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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
        message: "Tour not found"
      });
    }

    const liked = listing.likes ? listing.likes.includes(req.user._id) : false;

    res.json({
      success: true,
      liked
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET TOURS BY LOCATION ================= */

export const getToursByLocation = async (req, res) => {
  try {
    const { location } = req.params;

    const listings = await Listing.find({
      status: 'approved',
      businessType: { $in: ['tour_operator', 'guide', 'transport'] },
      location: { $regex: location, $options: 'i' }
    })
      .populate('provider', 'name email businessName')
      .sort({ createdAt: -1 })
      .lean();

    const tours = transformToExperiences(listings);

    res.json({
      success: true,
      count: tours.length,
      tours
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET POPULAR TOURS ================= */

export const getPopularTours = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const listings = await Listing.find({ 
      status: 'approved',
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    })
      .sort({ likesCount: -1, averageRating: -1 })
      .limit(parseInt(limit))
      .populate('provider', 'name email businessName')
      .lean();

    const tours = transformToExperiences(listings);

    res.json({
      success: true,
      count: tours.length,
      tours
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= UPDATE TOUR ================= */

export const updateTour = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      location,
      price,
      duration,
      travelers,
      description,
      highlights,
      included,
      excluded,
      meetingPoint,
      cancellationPolicy,
      businessType,
      requirements
    } = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    if (listing.provider.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this tour"
      });
    }

    listing.title = title || listing.title;
    listing.location = location || listing.location;
    listing.price = price ? Number(price) : listing.price;
    listing.duration = duration || listing.duration;
    listing.capacity = travelers ? Number(travelers) : listing.capacity;
    listing.description = description || listing.description;
    listing.highlights = highlights ? highlights.split(',').map(h => h.trim()) : listing.highlights;
    listing.included = included ? included.split(',').map(i => i.trim()) : listing.included;
    listing.excluded = excluded ? excluded.split(',').map(e => e.trim()) : listing.excluded;
    listing.meetingPoint = meetingPoint || listing.meetingPoint;
    listing.cancellationPolicy = cancellationPolicy || listing.cancellationPolicy;
    listing.businessType = businessType || listing.businessType;
    listing.requirements = requirements || listing.requirements;
    listing.updatedAt = new Date();

    if (req.files?.coverImage?.[0]) {
      listing.coverImage = req.files.coverImage[0].filename;
    }
    if (req.files?.galleryImages) {
      const newGallery = req.files.galleryImages.map(file => file.filename);
      listing.galleryImages = [...(listing.galleryImages || []), ...newGallery];
    }
    if (req.files?.videos) {
      const newVideos = req.files.videos.map(file => file.filename);
      listing.videos = [...(listing.videos || []), ...newVideos];
    }

    if (listing.status === 'approved') {
      listing.status = 'pending';
    }

    await listing.save();

    res.json({
      success: true,
      message: "Tour updated successfully",
      tour: listing
    });
  } catch (error) {
    console.error("❌ Update tour error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};