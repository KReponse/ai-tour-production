// backend/src/controllers/newsletterController.js
// ✅ FIXED - Removed unused createNotification import

import Subscriber from '../models/Subscriber.js';

/**
 * Subscribe to newsletter
 * POST /api/newsletter/subscribe
 */
export const subscribe = async (req, res) => {
  try {
    const { email, name, source, ...metadata } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const subscriber = await Subscriber.subscribe(email, {
      name,
      source: source || 'footer',
      metadata,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      data: {
        email: subscriber.email,
        status: subscriber.status,
      },
    });
  } catch (error) {
    console.error('❌ Newsletter subscription error:', error);
    
    if (error.message === 'Email is already subscribed') {
      return res.status(409).json({
        success: false,
        message: 'This email is already subscribed to our newsletter',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to subscribe. Please try again later.',
    });
  }
};

/**
 * Unsubscribe from newsletter
 * POST /api/newsletter/unsubscribe
 */
export const unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const subscriber = await Subscriber.unsubscribe(email);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter',
      data: {
        email: subscriber.email,
        status: subscriber.status,
      },
    });
  } catch (error) {
    console.error('❌ Newsletter unsubscribe error:', error);

    if (error.message === 'Email not found in our system') {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our system',
      });
    }

    if (error.message === 'Email is already unsubscribed') {
      return res.status(400).json({
        success: false,
        message: 'Email is already unsubscribed',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe. Please try again later.',
    });
  }
};

/**
 * Get all subscribers (admin only)
 * GET /api/newsletter/subscribers
 */
export const getSubscribers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'subscribedAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [subscribers, total] = await Promise.all([
      Subscriber.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Subscriber.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: subscribers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscribers',
    });
  }
};

/**
 * Get subscriber statistics (admin only)
 * GET /api/newsletter/stats
 */
export const getStats = async (req, res) => {
  try {
    const [total, active, unsubscribed, recent] = await Promise.all([
      Subscriber.countDocuments(),
      Subscriber.countDocuments({ status: 'subscribed' }),
      Subscriber.countDocuments({ status: 'unsubscribed' }),
      Subscriber.find({ status: 'subscribed' })
        .sort({ subscribedAt: -1 })
        .limit(10)
        .select('email name subscribedAt'),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        unsubscribed,
        recent,
        engagementRate: total > 0 ? Math.round((active / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('❌ Get newsletter stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get newsletter statistics',
    });
  }
};

/**
 * Export subscribers as CSV (admin only)
 * GET /api/newsletter/export
 */
export const exportSubscribers = async (req, res) => {
  try {
    const { status = 'subscribed' } = req.query;

    const subscribers = await Subscriber.find({ status })
      .sort({ subscribedAt: -1 })
      .select('email name status subscribedAt source');

    if (subscribers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No subscribers found to export',
      });
    }

    // Generate CSV
    const headers = ['Email', 'Name', 'Status', 'Subscribed At', 'Source'];
    const rows = subscribers.map((s) => [
      s.email,
      s.name || '',
      s.status,
      new Date(s.subscribedAt).toISOString().split('T')[0],
      s.source || 'footer',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=subscribers-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Export subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export subscribers',
    });
  }
};