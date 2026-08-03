// backend/src/controllers/exchangeRateController.js
// ✅ COMPLETE - Exchange Rate Controller for Admin

import ExchangeRate from "../models/ExchangeRate.js";
import exchangeRateService from "../services/exchangeRateService.js";

// ============================================================
// ✅ GET ALL EXCHANGE RATES (Admin)
// ============================================================
export const getAllExchangeRates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = null,
      search = null,
      sort = "-createdAt",
    } = req.query;

    const filter = {};
    if (status && status !== "all") {
      filter.isActive = status === "active";
    }

    if (search) {
      filter.$or = [
        { fromCurrency: { $regex: search, $options: "i" } },
        { toCurrency: { $regex: search, $options: "i" } },
        { source: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith("-") ? -1 : 1;

    const [rates, total] = await Promise.all([
      ExchangeRate.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ExchangeRate.countDocuments(filter),
    ]);

    // Add status field for frontend compatibility
    const ratesWithStatus = rates.map((rate) => ({
      ...rate,
      status: rate.isActive ? "active" : "inactive",
    }));

    res.json({
      success: true,
      data: ratesWithStatus,
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
    console.error("❌ Get all exchange rates error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET EXCHANGE RATE BY ID
// ============================================================
export const getExchangeRateById = async (req, res) => {
  try {
    const { id } = req.params;

    const rate = await ExchangeRate.findById(id).lean();

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: "Exchange rate not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...rate,
        status: rate.isActive ? "active" : "inactive",
      },
    });
  } catch (error) {
    console.error("❌ Get exchange rate by id error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ CREATE EXCHANGE RATE
// ============================================================
export const createExchangeRate = async (req, res) => {
  try {
    const {
      fromCurrency,
      toCurrency,
      rate,
      source = "manual",
      sourceProvider = "manual",
      expiresAt = null,
    } = req.body;

    if (!fromCurrency || !toCurrency || !rate) {
      return res.status(400).json({
        success: false,
        message: "From currency, to currency, and rate are required",
      });
    }

    if (rate <= 0) {
      return res.status(400).json({
        success: false,
        message: "Rate must be greater than 0",
      });
    }

    // Check if rate already exists
    const existing = await ExchangeRate.findOne({
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      isActive: true,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Exchange rate for ${fromCurrency}/${toCurrency} already exists`,
      });
    }

    const exchangeRate = await ExchangeRate.create({
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      rate: Number(rate),
      inverseRate: 1 / Number(rate),
      source,
      sourceProvider,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user._id,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Exchange rate created successfully",
      data: {
        ...exchangeRate.toObject(),
        status: "active",
      },
    });
  } catch (error) {
    console.error("❌ Create exchange rate error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ UPDATE EXCHANGE RATE
// ============================================================
export const updateExchangeRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { rate, expiresAt, source, sourceProvider } = req.body;

    const exchangeRate = await ExchangeRate.findById(id);

    if (!exchangeRate) {
      return res.status(404).json({
        success: false,
        message: "Exchange rate not found",
      });
    }

    if (rate) {
      if (rate <= 0) {
        return res.status(400).json({
          success: false,
          message: "Rate must be greater than 0",
        });
      }
      exchangeRate.rate = Number(rate);
      exchangeRate.inverseRate = 1 / Number(rate);
    }

    if (expiresAt) {
      exchangeRate.expiresAt = new Date(expiresAt);
    }

    if (source) {
      exchangeRate.source = source;
    }

    if (sourceProvider) {
      exchangeRate.sourceProvider = sourceProvider;
    }

    exchangeRate.updatedBy = req.user._id;

    await exchangeRate.save();

    res.json({
      success: true,
      message: "Exchange rate updated successfully",
      data: {
        ...exchangeRate.toObject(),
        status: exchangeRate.isActive ? "active" : "inactive",
      },
    });
  } catch (error) {
    console.error("❌ Update exchange rate error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ TOGGLE EXCHANGE RATE STATUS
// ============================================================
export const toggleExchangeRateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'inactive'",
      });
    }

    const exchangeRate = await ExchangeRate.findById(id);

    if (!exchangeRate) {
      return res.status(404).json({
        success: false,
        message: "Exchange rate not found",
      });
    }

    exchangeRate.isActive = status === "active";
    exchangeRate.updatedBy = req.user._id;
    await exchangeRate.save();

    res.json({
      success: true,
      message: `Exchange rate ${status === "active" ? "activated" : "deactivated"} successfully`,
      data: {
        ...exchangeRate.toObject(),
        status,
      },
    });
  } catch (error) {
    console.error("❌ Toggle exchange rate status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ DELETE EXCHANGE RATE (Soft Delete)
// ============================================================
export const deleteExchangeRate = async (req, res) => {
  try {
    const { id } = req.params;

    const exchangeRate = await ExchangeRate.findById(id);

    if (!exchangeRate) {
      return res.status(404).json({
        success: false,
        message: "Exchange rate not found",
      });
    }

    // Soft delete - set inactive instead of removing
    exchangeRate.isActive = false;
    exchangeRate.updatedBy = req.user._id;
    await exchangeRate.save();

    res.json({
      success: true,
      message: "Exchange rate deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete exchange rate error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ REFRESH EXCHANGE RATES (Admin)
// ============================================================
export const refreshExchangeRates = async (req, res) => {
  try {
    const result = await exchangeRateService.updateAllRates();

    res.json({
      success: true,
      message: "Exchange rates refreshed successfully",
      rates: result,
    });
  } catch (error) {
    console.error("❌ Refresh exchange rates error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET EXCHANGE RATE STATS (Admin)
// ============================================================
export const getExchangeRateStats = async (req, res) => {
  try {
    const stats = await ExchangeRate.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ Get exchange rate stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};