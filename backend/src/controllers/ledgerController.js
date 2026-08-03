// backend/src/controllers/ledgerController.js
// ✅ COMPLETE FIXED - All exports properly defined

import Ledger from "../models/Ledger.js";
import { exportToCSV } from "../utils/exportUtils.js";

// ============================================================
// ✅ GET LEDGER ENTRIES (Admin)
// ============================================================
export const getLedgerEntries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = null,
      account = null,
      search = null,
      startDate = null,
      endDate = null,
      sort = "-createdAt",
    } = req.query;

    const filter = {};

    if (type && type !== "all") {
      filter.type = type;
    }

    if (account && account !== "all") {
      filter.account = account;
    }

    if (search) {
      filter.$or = [
        { reference: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { account: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith("-") ? -1 : 1;

    const [entries, total] = await Promise.all([
      Ledger.find(filter)
        .populate("relatedTo", "bookingCode email name")
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Ledger.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: entries,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("❌ Get ledger entries error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET LEDGER ENTRY BY ID (Admin)
// ============================================================
export const getLedgerEntryById = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await Ledger.findById(id)
      .populate("relatedTo", "bookingCode email name")
      .lean();

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Ledger entry not found",
      });
    }

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error("❌ Get ledger entry by id error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET LEDGER SUMMARY (Admin)
// ============================================================
export const getLedgerSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [summary] = await Ledger.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDebit: {
            $sum: {
              $cond: [{ $in: ["$type", ["debit", "payment", "refund"]] }, "$amount", 0],
            },
          },
          totalCredit: {
            $sum: {
              $cond: [{ $in: ["$type", ["credit", "settlement"]] }, "$amount", 0],
            },
          },
          totalFees: {
            $sum: {
              $cond: [{ $eq: ["$type", "fee"] }, "$amount", 0],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const byType = await Ledger.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const byAccount = await Ledger.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$account",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      summary: {
        totalDebit: summary?.totalDebit || 0,
        totalCredit: summary?.totalCredit || 0,
        totalFees: summary?.totalFees || 0,
        netBalance: (summary?.totalCredit || 0) - (summary?.totalDebit || 0),
        count: summary?.count || 0,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = { total: item.total, count: item.count };
          return acc;
        }, {}),
        byAccount: byAccount,
      },
    });
  } catch (error) {
    console.error("❌ Get ledger summary error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET LEDGER STATS (Admin)
// ============================================================
export const getLedgerStats = async (req, res) => {
  try {
    const [total, byType, byAccount, dateRange] = await Promise.all([
      Ledger.countDocuments({}),
      Ledger.aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            total: { $sum: "$amount" },
          },
        },
      ]),
      Ledger.aggregate([
        {
          $group: {
            _id: "$account",
            count: { $sum: 1 },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      Ledger.aggregate([
        {
          $group: {
            _id: null,
            oldest: { $min: "$createdAt" },
            newest: { $max: "$createdAt" },
          },
        },
      ]),
    ]);

    const dailyStats = await Ledger.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
      { $limit: 30 },
    ]);

    res.json({
      success: true,
      stats: {
        total,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = { count: item.count, total: item.total };
          return acc;
        }, {}),
        byAccount: byAccount,
        dateRange: dateRange[0] || null,
        dailyStats: dailyStats.map((d) => ({
          date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
          count: d.count,
          total: d.total,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Get ledger stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ EXPORT LEDGER AS CSV (Admin)
// ============================================================
export const exportLedgerCSV = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    const filter = {};
    if (type && type !== "all") filter.type = type;
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

    const entries = await Ledger.find(filter)
      .populate("relatedTo", "bookingCode email name")
      .sort({ createdAt: -1 })
      .lean();

    const csvData = entries.map((entry) => ({
      Reference: entry.reference || entry._id,
      Description: entry.description || "",
      Account: entry.account || "",
      Type: entry.type || "",
      Amount: entry.amount || 0,
      Currency: entry.currency || "USD",
      "Related To": entry.relatedTo?.bookingCode || entry.relatedTo?.email || "",
      Status: entry.status || "completed",
      Created: entry.createdAt ? new Date(entry.createdAt).toISOString() : "",
    }));

    const csv = exportToCSV(csvData);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ledger-${new Date().toISOString().split("T")[0]}.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export ledger CSV error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ CREATE LEDGER ENTRY (Internal - For Service Use)
// ============================================================
export const createLedgerEntry = async (req, res) => {
  try {
    const {
      reference,
      description,
      account,
      type,
      amount,
      currency = "USD",
      relatedTo = null,
      metadata = {},
    } = req.body;

    if (!reference || !description || !account || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: "Reference, description, account, type, and amount are required",
      });
    }

    const entry = await Ledger.create({
      reference,
      description,
      account,
      type,
      amount,
      currency,
      relatedTo,
      metadata,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Ledger entry created successfully",
      data: entry,
    });
  } catch (error) {
    console.error("❌ Create ledger entry error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ REVERSE LEDGER ENTRY (Admin)
// ============================================================
export const reverseLedgerEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const original = await Ledger.findById(id);

    if (!original) {
      return res.status(404).json({
        success: false,
        message: "Ledger entry not found",
      });
    }

    if (original.status === "reversed") {
      return res.status(400).json({
        success: false,
        message: "This entry has already been reversed",
      });
    }

    // Create reversal entry
    const reversal = await Ledger.create({
      reference: `REV-${original.reference}`,
      description: `Reversal: ${original.description}`,
      account: original.account,
      type: original.type === "debit" ? "credit" : "debit",
      amount: original.amount,
      currency: original.currency,
      relatedTo: original.relatedTo,
      metadata: {
        originalEntryId: original._id,
        reason: reason || "No reason provided",
        reversedBy: req.user._id,
      },
      createdBy: req.user._id,
    });

    // Mark original as reversed
    original.status = "reversed";
    original.metadata = {
      ...original.metadata,
      reversedBy: req.user._id,
      reversedAt: new Date(),
      reversalId: reversal._id,
      reason: reason || "No reason provided",
    };
    await original.save();

    res.json({
      success: true,
      message: "Ledger entry reversed successfully",
      data: {
        original,
        reversal,
      },
    });
  } catch (error) {
    console.error("❌ Reverse ledger entry error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ RECONCILE LEDGER (Admin)
// ============================================================
export const reconcileLedger = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const filter = {};
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

    const entries = await Ledger.find(filter).sort({ createdAt: 1 }).lean();

    let runningBalance = 0;
    const reconciled = entries.map((entry) => {
      const amount = entry.type === "debit" || entry.type === "payment" || entry.type === "refund"
        ? -entry.amount
        : entry.amount;
      runningBalance += amount;
      return {
        ...entry,
        runningBalance,
      };
    });

    const totalDebit = entries
      .filter((e) => ["debit", "payment", "refund"].includes(e.type))
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCredit = entries
      .filter((e) => ["credit", "settlement"].includes(e.type))
      .reduce((sum, e) => sum + e.amount, 0);

    res.json({
      success: true,
      reconciliation: {
        startDate: startDate || null,
        endDate: endDate || null,
        totalEntries: entries.length,
        totalDebit,
        totalCredit,
        netBalance: totalCredit - totalDebit,
        runningBalance,
        entries: reconciled,
      },
    });
  } catch (error) {
    console.error("❌ Reconcile ledger error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};