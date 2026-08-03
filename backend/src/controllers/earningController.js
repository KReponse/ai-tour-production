// backend/src/controllers/earningController.js
// ✅ COMPLETE - All functions exported

import Stripe from "stripe";
import Booking from "../models/Booking.js";
import Earning from "../models/Earning.js";
import Withdrawal from "../models/Withdrawal.js";
import createNotification from "../utils/createNotification.js";

// =========================
// GET EARNINGS (Alias for getMyEarnings)
// =========================

export const getEarnings = async (req, res) => {
  try {
    const earnings = await Earning.find({
      provider: req.user._id
    }).populate("booking");

    const total = earnings.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      total,
      earnings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET MY EARNINGS
// =========================

export const getMyEarnings = async (req, res) => {
  try {
    const earnings = await Earning.find({
      provider: req.user._id
    }).populate("booking");

    const total = earnings.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      total,
      earnings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET EARNING SUMMARY
// =========================

export const getEarningSummary = async (req, res) => {
  try {
    const earnings = await Earning.find({
      provider: req.user._id
    });

    const total = earnings.reduce((sum, item) => sum + item.amount, 0);
    const available = earnings
      .filter(item => item.status === "available")
      .reduce((sum, item) => sum + item.amount, 0);
    const pending = earnings
      .filter(item => item.status === "pending")
      .reduce((sum, item) => sum + item.amount, 0);
    const withdrawn = earnings
      .filter(item => item.status === "withdrawn")
      .reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      summary: {
        total,
        available,
        pending,
        withdrawn
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET EARNING DETAILS
// =========================

export const getEarningDetails = async (req, res) => {
  try {
    const earning = await Earning.findById(req.params.id)
      .populate("booking")
      .populate("provider", "name email");

    if (!earning) {
      return res.status(404).json({
        success: false,
        message: "Earning not found"
      });
    }

    if (earning.provider._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    res.json({
      success: true,
      earning
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET PROVIDER WALLET
// =========================

export const getProviderWallet = async (req, res) => {
  try {
    const earnings = await Earning.find({
      provider: req.user._id
    });

    const availableBalance = earnings
      .filter(item => item.status === "available")
      .reduce((sum, item) => sum + item.amount, 0);

    const withdrawn = earnings
      .filter(item => item.status === "withdrawn")
      .reduce((sum, item) => sum + item.amount, 0);

    const totalEarned = earnings.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      wallet: {
        availableBalance,
        withdrawn,
        totalEarned
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET WITHDRAWABLE BALANCE
// =========================

export const getWithdrawableBalance = async (req, res) => {
  try {
    const earnings = await Earning.find({
      provider: req.user._id,
      status: "available"
    });

    const balance = earnings.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// REQUEST WITHDRAWAL
// =========================

export const requestWithdrawal = async (req, res) => {
  try {
    const { amount, method, accountDetails } = req.body;

    const earnings = await Earning.find({
      provider: req.user._id,
      status: "available"
    });

    const balance = earnings.reduce((sum, item) => sum + item.amount, 0);

    if (amount > balance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance"
      });
    }

    const withdrawal = await Withdrawal.create({
      provider: req.user._id,
      amount,
      method,
      accountDetails
    });

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted",
      withdrawal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET WITHDRAWAL HISTORY
// =========================

export const getWithdrawalHistory = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({
      provider: req.user._id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      withdrawals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET TRANSACTION HISTORY
// =========================

export const getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const earnings = await Earning.find({
      provider: req.user._id
    })
      .populate("booking")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Earning.countDocuments({
      provider: req.user._id
    });

    res.json({
      success: true,
      transactions: earnings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET PROVIDER EARNINGS
// =========================

export const getProviderEarnings = async (req, res) => {
  try {
    const earnings = await Earning.find({
      provider: req.user._id
    })
      .populate("booking")
      .sort({ createdAt: -1 });

    const total = earnings.reduce((sum, item) => sum + item.amount, 0);
    const available = earnings
      .filter(item => item.status === "available")
      .reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      total,
      available,
      earnings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET PROVIDER EARNING SUMMARY
// =========================

export const getProviderEarningSummary = async (req, res) => {
  try {
    const earnings = await Earning.find({
      provider: req.user._id
    });

    const total = earnings.reduce((sum, item) => sum + item.amount, 0);
    const available = earnings
      .filter(item => item.status === "available")
      .reduce((sum, item) => sum + item.amount, 0);
    const pending = earnings
      .filter(item => item.status === "pending")
      .reduce((sum, item) => sum + item.amount, 0);
    const withdrawn = earnings
      .filter(item => item.status === "withdrawn")
      .reduce((sum, item) => sum + item.amount, 0);

    const count = earnings.length;

    res.json({
      success: true,
      summary: {
        total,
        available,
        pending,
        withdrawn,
        count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET ADMIN EARNINGS
// =========================

export const getAdminEarnings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const earnings = await Earning.find(filter)
      .populate("provider", "name email")
      .populate("booking")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Earning.countDocuments(filter);
    const totalAmount = await Earning.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      success: true,
      earnings,
      total: totalAmount[0]?.total || 0,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// UPDATE WITHDRAWAL STATUS (Admin)
// =========================

export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!["pending", "processing", "completed", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const withdrawal = await Withdrawal.findByIdAndUpdate(
      id,
      {
        status,
        adminNotes,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal not found"
      });
    }

    if (status === "completed") {
      await Earning.updateMany(
        { provider: withdrawal.provider },
        { status: "withdrawn" }
      );
    }

    res.json({
      success: true,
      withdrawal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// GET PLATFORM FEES (Admin)
// =========================

export const getPlatformFees = async (req, res) => {
  try {
    const totalFees = await Earning.aggregate([
      { $group: { _id: null, total: { $sum: "$platformFee" } } }
    ]);

    const feesByProvider = await Earning.aggregate([
      {
        $group: {
          _id: "$provider",
          totalFees: { $sum: "$platformFee" },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "provider"
        }
      },
      { $unwind: "$provider" },
      {
        $project: {
          providerName: "$provider.name",
          providerEmail: "$provider.email",
          totalFees: 1,
          count: 1
        }
      },
      { $sort: { totalFees: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalFees: totalFees[0]?.total || 0,
        feesByProvider
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// STRIPE WEBHOOK
// =========================

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const booking = await Booking.findById(session.metadata.bookingId);

    if (!booking) {
      return res.json({ received: true });
    }

    booking.paymentStatus = "paid";
    booking.status = "confirmed";
    booking.paymentId = session.payment_intent;
    booking.paidAt = new Date();
    await booking.save();

    await Earning.create({
      provider: booking.provider,
      booking: booking._id,
      amount: booking.totalPrice,
      status: "available"
    });

    await createNotification(
      booking.provider,
      "Payment Received",
      `You received $${booking.totalPrice} from booking payment`,
      "payment"
    );

    console.log("Payment completed and earning created");
  }

  res.json({ received: true });
};