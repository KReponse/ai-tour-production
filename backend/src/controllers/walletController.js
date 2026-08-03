// backend/src/controllers/walletController.js
// ✅ NEW - Wallet Controller for Production-Grade Financial System

import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import walletService from "../services/walletService.js";
import ledgerService from "../services/ledgerService.js";
import { createNotification } from "../utils/notificationService.js";

// ============================================================
// ✅ GET USER WALLETS
// ============================================================

export const getUserWallets = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await walletService.getUserWallets(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      wallets: result.wallets,
      summary: result.summary,
    });
  } catch (error) {
    console.error('❌ Error fetching user wallets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallets',
    });
  }
};

// ============================================================
// ✅ GET WALLET BY ID
// ============================================================

export const getWallet = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await walletService.getWallet(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    // Check if user owns this wallet or is admin
    const wallet = result.wallet;
    const isOwner = wallet.ownerId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error('❌ Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallet',
    });
  }
};

// ============================================================
// ✅ GET WALLET BALANCE
// ============================================================

export const getWalletBalance = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    const isOwner = wallet.ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const result = await walletService.getBalance(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      balance: result.balance,
      currency: result.currency,
    });
  } catch (error) {
    console.error('❌ Error fetching wallet balance:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch balance',
    });
  }
};

// ============================================================
// ✅ GET PROVIDER BALANCE SUMMARY
// ============================================================

export const getProviderBalanceSummary = async (req, res) => {
  try {
    const providerId = req.user._id;

    // Check if user is a provider
    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Provider role required.',
      });
    }

    const result = await walletService.getProviderBalanceSummary(providerId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      summary: result.summary,
      recentTransactions: result.recentTransactions,
    });
  } catch (error) {
    console.error('❌ Error fetching provider balance summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch balance summary',
    });
  }
};

// ============================================================
// ✅ GET PROVIDER WALLETS
// ============================================================

export const getProviderWallets = async (req, res) => {
  try {
    const providerId = req.user._id;

    const wallets = await Wallet.find({
      ownerId: providerId,
      type: { $in: ['provider', 'commission'] },
      status: 'active',
    }).sort({ currency: 1 });

    const summary = await Wallet.getBalanceSummary(providerId);

    res.json({
      success: true,
      wallets,
      summary,
    });
  } catch (error) {
    console.error('❌ Error fetching provider wallets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch provider wallets',
    });
  }
};

// ============================================================
// ✅ DEPOSIT TO WALLET (Admin)
// ============================================================

export const depositToWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description = '', metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    // Only admin can deposit
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can deposit to wallets',
      });
    }

    const result = await walletService.deposit(
      id,
      amount,
      description || `Admin deposit by ${req.user.email}`,
      null,
      {
        ...metadata,
        depositedBy: req.user._id,
        depositedAt: new Date(),
      }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    // Create notification for wallet owner
    await createNotification({
      recipient: wallet.ownerId,
      type: 'wallet_deposit',
      title: 'Wallet Deposit 💰',
      message: `$${amount} has been deposited to your ${wallet.type} wallet.`,
      data: {
        walletId: wallet._id,
        amount,
        currency: wallet.currency,
        newBalance: result.newBalance,
      },
      link: `/wallet/${wallet._id}`,
    });

    res.json({
      success: true,
      message: 'Deposit successful',
      wallet: result.wallet,
      transaction: result.transaction,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error('❌ Error depositing to wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to deposit',
    });
  }
};

// ============================================================
// ✅ REQUEST WITHDRAWAL (Provider)
// ============================================================

export const requestWithdrawal = async (req, res) => {
  try {
    const providerId = req.user._id;
    const { amount, currency = 'USD', paymentMethod = 'bank_transfer', accountDetails = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    // Check if user is a provider
    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Provider role required.',
      });
    }

    const result = await walletService.requestWithdrawal(
      providerId,
      amount,
      currency,
      paymentMethod,
      {
        accountDetails,
        requestedBy: req.user._id,
        requestedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawalId: result.withdrawalId,
      transaction: result.transaction,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error('❌ Error requesting withdrawal:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to request withdrawal',
    });
  }
};

// ============================================================
// ✅ GET WITHDRAWAL HISTORY (Provider)
// ============================================================

export const getWithdrawalHistory = async (req, res) => {
  try {
    const providerId = req.user._id;
    const { page = 1, limit = 20, status = null } = req.query;

    const filter = {
      initiator: providerId,
      type: 'withdrawal',
    };

    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      withdrawals: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching withdrawal history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch withdrawal history',
    });
  }
};

// ============================================================
// ✅ GET TRANSACTION HISTORY
// ============================================================

export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type = null, status = null, startDate = null, endDate = null } = req.query;

    const filter = {
      $or: [
        { initiator: userId },
        { recipient: userId },
        { provider: userId },
        { customer: userId },
      ],
    };

    if (type && type !== 'all') filter.type = type;
    if (status && status !== 'all') filter.status = status;
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('initiator', 'name email')
        .populate('recipient', 'name email')
        .populate('booking', 'bookingCode')
        .populate('payment', 'amount status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    // Get summary
    const summary = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDebit: {
            $sum: {
              $cond: [{ $eq: ['$type', 'withdrawal'] }, '$grossAmount', 0],
            },
          },
          totalCredit: {
            $sum: {
              $cond: [{ $eq: ['$type', 'payment'] }, '$grossAmount', 0],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: summary[0] || { totalDebit: 0, totalCredit: 0, count: 0 },
    });
  } catch (error) {
    console.error('❌ Error fetching transaction history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction history',
    });
  }
};

// ============================================================
// ✅ GET TRANSACTION BY REFERENCE
// ============================================================

export const getTransactionByReference = async (req, res) => {
  try {
    const { reference } = req.params;

    const result = await walletService.getTransactionByReference(reference);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    const transaction = result.transaction;
    const userId = req.user._id.toString();

    // Check if user has access to this transaction
    const hasAccess =
      (transaction.initiator && transaction.initiator._id.toString() === userId) ||
      (transaction.recipient && transaction.recipient._id.toString() === userId) ||
      (transaction.provider && transaction.provider.toString() === userId) ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction',
    });
  }
};

// ============================================================
// ✅ PROCESS WITHDRAWAL (Admin)
// ============================================================

export const processWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes = '' } = req.body;

    if (!status || !['completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be completed, failed, or cancelled',
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can process withdrawals',
      });
    }

    const result = await walletService.processWithdrawal(id, status, adminNotes);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    // Log action
    console.log(`💰 Admin ${req.user.email} processed withdrawal ${id} as ${status}`);

    res.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error('❌ Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process withdrawal',
    });
  }
};

// ============================================================
// ✅ GET ADMIN WALLET SUMMARY (Admin)
// ============================================================

export const getAdminWalletSummary = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const [
      platformSummary,
      totalWallets,
      activeWallets,
      totalBalance,
      pendingBalance,
      totalLifetime,
    ] = await Promise.all([
      walletService.getPlatformWalletSummary(),
      Wallet.countDocuments({}),
      Wallet.countDocuments({ status: 'active' }),
      Wallet.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$balances.available' } } },
      ]),
      Wallet.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$balances.pending' } } },
      ]),
      Wallet.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$totalLifetimeEarnings' } } },
      ]),
    ]);

    res.json({
      success: true,
      platform: platformSummary,
      stats: {
        totalWallets,
        activeWallets,
        suspendedWallets: totalWallets - activeWallets,
        totalAvailableBalance: totalBalance[0]?.total || 0,
        totalPendingBalance: pendingBalance[0]?.total || 0,
        totalLifetimeEarnings: totalLifetime[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching admin wallet summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallet summary',
    });
  }
};

// ============================================================
// ✅ FREEZE WALLET (Admin)
// ============================================================

export const freezeWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'No reason provided' } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can freeze wallets',
      });
    }

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    await wallet.freeze(reason, req.user._id);

    // Create notification
    await createNotification({
      recipient: wallet.ownerId,
      type: 'wallet_frozen',
      title: 'Wallet Frozen ❄️',
      message: `Your wallet has been frozen. Reason: ${reason}`,
      data: {
        walletId: wallet._id,
        reason,
      },
      link: `/wallet/${wallet._id}`,
    });

    res.json({
      success: true,
      message: 'Wallet frozen successfully',
      wallet,
    });
  } catch (error) {
    console.error('❌ Error freezing wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to freeze wallet',
    });
  }
};

// ============================================================
// ✅ UNFREEZE WALLET (Admin)
// ============================================================

export const unfreezeWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'No reason provided' } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can unfreeze wallets',
      });
    }

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    await wallet.unfreeze(reason, req.user._id);

    // Create notification
    await createNotification({
      recipient: wallet.ownerId,
      type: 'wallet_unfrozen',
      title: 'Wallet Unfrozen 🔓',
      message: `Your wallet has been unfrozen. Reason: ${reason}`,
      data: {
        walletId: wallet._id,
        reason,
      },
      link: `/wallet/${wallet._id}`,
    });

    res.json({
      success: true,
      message: 'Wallet unfrozen successfully',
      wallet,
    });
  } catch (error) {
    console.error('❌ Error unfreezing wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to unfreeze wallet',
    });
  }
};

// ============================================================
// ✅ GET WALLET STATS (Admin)
// ============================================================

export const getWalletStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const stats = await walletService.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('❌ Error fetching wallet stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallet stats',
    });
  }
};

// ============================================================
// ✅ GET WALLET TRANSACTIONS
// ============================================================

export const getWalletTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    // Check ownership
    const isOwner = wallet.ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const result = await wallet.getTransactionHistory({
      limit: parseInt(limit),
      page: parseInt(page),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error fetching wallet transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallet transactions',
    });
  }
};

// ============================================================
// ✅ GET ALL WALLETS (Admin)
// ============================================================

export const getAllWallets = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { page = 1, limit = 20, status = null, type = null, search = null } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.type = type;
    if (search) {
      filter.$or = [
        { ownerId: { $in: await User.find({ name: { $regex: search, $options: 'i' } }).distinct('_id') } },
        { currency: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [wallets, total] = await Promise.all([
      Wallet.find(filter)
        .populate('ownerId', 'name email businessName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Wallet.countDocuments(filter),
    ]);

    // Get summary
    const summary = await Wallet.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAvailable: { $sum: '$balances.available' },
          totalPending: { $sum: '$balances.pending' },
          totalHeld: { $sum: '$balances.held' },
          totalFrozen: { $sum: '$balances.frozen' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      wallets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: summary[0] || {
        totalAvailable: 0,
        totalPending: 0,
        totalHeld: 0,
        totalFrozen: 0,
        count: 0,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching all wallets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallets',
    });
  }
};