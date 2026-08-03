// backend/src/controllers/requestController.js
import Request from "../models/Request.js";
import { createNotification } from '../utils/notificationService.js';

/* ================= CREATE REQUEST ================= */

export const createRequest = async (req, res) => {
  try {
    const { type, subject, message, data } = req.body;

    if (!type || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Type, subject, and message are required'
      });
    }

    const request = await Request.create({
      user: req.user._id,
      type,
      subject,
      message,
      data: data || {},
      status: 'pending'
    });

    // Notify admins
    const User = (await import('../models/User.js')).default;
    const admins = await User.find({ role: 'ADMIN' });
    
    for (const admin of admins) {
      await createNotification({
        recipient: admin._id,
        sender: req.user._id,
        type: 'system_alert',
        title: 'New Request',
        message: `${req.user.name} created a new request: ${subject}`,
        data: { requestId: request._id },
        link: `/admin/requests/${request._id}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET MY REQUESTS ================= */

export const getMyRequests = async (req, res) => {
  try {
    const requests = await Request.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET ALL REQUESTS (ADMIN) ================= */

export const getAllRequests = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const requests = await Request.find(filter)
      .populate('user', 'name email profileImage')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Request.countDocuments(filter);

    res.json({
      success: true,
      requests,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET REQUEST BY ID ================= */

export const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await Request.findById(id)
      .populate('user', 'name email profileImage phone');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check if user owns request or is admin
    if (request.user._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request'
      });
    }

    res.json({
      success: true,
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= UPDATE REQUEST STATUS ================= */

export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const request = await Request.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Only admin can update status
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update request status'
      });
    }

    request.status = status;
    if (adminNote) {
      request.adminNote = adminNote;
    }
    if (status === 'resolved' || status === 'rejected') {
      request.resolvedAt = new Date();
      request.resolvedBy = req.user._id;
    }

    await request.save();

    // Notify user
    await createNotification({
      recipient: request.user,
      sender: req.user._id,
      type: 'system_alert',
      title: `Request ${status}`,
      message: `Your request "${request.subject}" has been ${status}`,
      data: { requestId: request._id },
      link: `/requests/${request._id}`
    });

    res.json({
      success: true,
      message: `Request ${status}`,
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= DELETE REQUEST ================= */

export const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await Request.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check if user owns request or is admin
    if (request.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this request'
      });
    }

    await request.deleteOne();

    res.json({
      success: true,
      message: 'Request deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET REQUESTS (Legacy - Remove if not needed) ================= */

export const getRequests = async (req, res) => {
  try {
    const requests = await Request.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
