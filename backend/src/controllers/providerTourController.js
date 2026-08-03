// backend/src/controllers/providerTourController.js
// ✅ UPDATED - Fixed exports

import Listing from "../models/Listing.js";
import User from "../models/User.js";
import { createNotification } from "../utils/notificationService.js";

/* ================= GET MY TOURS ================= */

export const getMyTours = async (req, res) => {
  try {
    const listings = await Listing.find({
      provider: req.user._id,
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    })
    .sort({ createdAt: -1 })
    .lean();

    res.json({
      success: true,
      count: listings.length,
      tours: listings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= CREATE TOUR ================= */

export const createProviderTour = async (req, res) => {
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
      category,
      includes,
      excludes,
      itinerary,
      highlights,
      included,
      excluded,
      meetingPoint,
      cancellationPolicy,
      requirements
    } = req.body;

    // Validation
    if (!title || !location || !price || !duration || !travelers || !description) {
      return res.status(400).json({
        success: false,
        message: "All tour fields are required"
      });
    }

    // Handle file uploads
    let coverImage = "";
    let galleryImages = [];
    let videos = [];

    if (req.files) {
      if (req.files.coverImage) {
        coverImage = req.files.coverImage[0].filename;
      }
      if (req.files.galleryImages) {
        galleryImages = req.files.galleryImages.map(file => file.filename);
      }
      if (req.files.videos) {
        videos = req.files.videos.map(file => file.filename);
      }
    }

    // ✅ Create as Listing instead of Tour
    const listing = await Listing.create({
      provider: req.user._id,
      providerName: req.user.name || req.user.businessName,
      providerVerified: req.user.isVerified || false,
      title,
      location,
      price: Number(price),
      duration,
      capacity: Number(travelers),
      description,
      businessType: category || 'tour_operator',
      tags: category ? [category] : [],
      features: includes ? (Array.isArray(includes) ? includes : JSON.parse(includes)) : [],
      amenities: [],
      highlights: highlights ? (Array.isArray(highlights) ? highlights : highlights.split(',').map(h => h.trim())) : [],
      included: included ? (Array.isArray(included) ? included : included.split(',').map(i => i.trim())) : [],
      excluded: excluded ? (Array.isArray(excluded) ? excluded : excluded.split(',').map(e => e.trim())) : [],
      meetingPoint: meetingPoint || '',
      cancellationPolicy: cancellationPolicy || '',
      requirements: requirements || '',
      coverImage,
      galleryImages,
      videos,
      status: "pending",
      createdAt: new Date()
    });

    // Notify admins about new tour
    const admins = await User.find({ role: 'ADMIN' });
    for (const admin of admins) {
      await createNotification({
        recipient: admin._id,
        sender: req.user._id,
        type: 'listing_created',
        title: 'New Tour Created',
        message: `${req.user.name} created a new tour: ${title}`,
        data: { listingId: listing._id },
        link: `/admin/listings/${listing._id}`
      });
    }

    // Notify provider
    await createNotification({
      recipient: req.user._id,
      sender: req.user._id,
      type: 'listing_created',
      title: 'Tour Created',
      message: `Your tour "${title}" has been created and is pending approval.`,
      data: { listingId: listing._id },
      link: `/provider/listings/${listing._id}`
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.user._id}`).emit('newNotification', {
        title: 'Tour Created',
        message: `Your tour "${title}" has been created and is pending approval.`,
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

/* ================= UPDATE TOUR ================= */

export const updateProviderTour = async (req, res) => {
  try {
    const listing = await Listing.findOne({
      _id: req.params.id,
      provider: req.user._id,
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    // Check if tour can be updated (only if pending or rejected)
    if (listing.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: "Cannot update an approved tour. Please contact admin."
      });
    }

    const {
      title,
      location,
      price,
      duration,
      travelers,
      description,
      category,
      includes,
      excludes,
      itinerary,
      highlights,
      included,
      excluded,
      meetingPoint,
      cancellationPolicy,
      requirements
    } = req.body;

    // Handle file uploads
    if (req.files) {
      if (req.files.coverImage) {
        listing.coverImage = req.files.coverImage[0].filename;
      }
      if (req.files.galleryImages) {
        listing.galleryImages = req.files.galleryImages.map(file => file.filename);
      }
      if (req.files.videos) {
        listing.videos = req.files.videos.map(file => file.filename);
      }
    }

    // Update fields
    if (title) listing.title = title;
    if (location) listing.location = location;
    if (price) listing.price = Number(price);
    if (duration) listing.duration = duration;
    if (travelers) listing.capacity = Number(travelers);
    if (description) listing.description = description;
    if (category) listing.businessType = category;
    if (includes) listing.features = Array.isArray(includes) ? includes : JSON.parse(includes);
    if (excludes) listing.excluded = Array.isArray(excludes) ? excludes : JSON.parse(excludes);
    if (highlights) listing.highlights = Array.isArray(highlights) ? highlights : highlights.split(',').map(h => h.trim());
    if (included) listing.included = Array.isArray(included) ? included : included.split(',').map(i => i.trim());
    if (excluded) listing.excluded = Array.isArray(excluded) ? excluded : excluded.split(',').map(e => e.trim());
    if (meetingPoint) listing.meetingPoint = meetingPoint;
    if (cancellationPolicy) listing.cancellationPolicy = cancellationPolicy;
    if (requirements) listing.requirements = requirements;

    // Reset status to pending if it was rejected
    if (listing.status === 'rejected') {
      listing.status = 'pending';
    }

    listing.updatedAt = new Date();
    await listing.save();

    res.json({
      success: true,
      message: "Tour updated successfully",
      tour: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET SINGLE TOUR (Provider) ================= */

export const getProviderTourById = async (req, res) => {
  try {
    const listing = await Listing.findOne({
      _id: req.params.id,
      provider: req.user._id,
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    res.json({
      success: true,
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

export const deleteProviderTour = async (req, res) => {
  try {
    const listing = await Listing.findOne({
      _id: req.params.id,
      provider: req.user._id,
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    // Check if tour has bookings
    const Booking = (await import('../models/Booking.js')).default;
    const bookings = await Booking.find({ 
      listing: listing._id, 
      status: { $ne: 'cancelled' } 
    });
    
    if (bookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete tour with existing bookings"
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

/* ================= TOGGLE TOUR STATUS (Provider) ================= */

export const toggleTourStatus = async (req, res) => {
  try {
    const listing = await Listing.findOne({
      _id: req.params.id,
      provider: req.user._id,
      businessType: { $in: ['tour_operator', 'guide', 'transport'] }
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    // Only toggle between active/inactive for approved tours
    if (listing.status === 'approved') {
      listing.status = 'inactive';
    } else if (listing.status === 'inactive') {
      listing.status = 'approved';
    } else {
      return res.status(400).json({
        success: false,
        message: "Cannot toggle this tour's status"
      });
    }

    listing.updatedAt = new Date();
    await listing.save();

    res.json({
      success: true,
      message: `Tour ${listing.status === 'approved' ? 'activated' : 'deactivated'}`,
      tour: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

