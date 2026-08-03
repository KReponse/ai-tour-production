// backend/src/services/settlementService.js
// ✅ COMPLETE FIXED - Proper import/export

import Currency from "../models/Currency.js";
import Earning from "../models/Earning.js";
import Payment from "../models/Payment.js";
import Withdrawal from "../models/Withdrawal.js";
import User from "../models/User.js";
import currencyService from "./currencyService.js";
import exchangeRateService from "./exchangeRateService.js";
import { currencyConfig } from "../config/currency.config.js";

// Try to import logger, fallback to console if not available
let logger;
try {
  const loggerModule = await import("../config/logger.js");
  logger = loggerModule.default || loggerModule;
} catch (error) {
  logger = {
    info: (...args) => console.log('ℹ️', ...args),
    error: (...args) => console.error('❌', ...args),
    warn: (...args) => console.warn('⚠️', ...args),
    debug: (...args) => console.debug('🔍', ...args),
  };
}

class SettlementService {
  constructor() {
    this.defaultSettlementCurrency = currencyConfig.settlement.defaultCurrency || "RWF";
    this.allowedSettlementCurrencies = currencyConfig.settlement.allowedCurrencies || ["RWF", "USD", "EUR", "GBP"];
    this.settlementFees = currencyConfig.settlement.settlementFees || {};
    this.minSettlementAmounts = currencyConfig.settlement.minSettlementAmounts || {};
    logger.info(`✅ Settlement Service initialized with default currency: ${this.defaultSettlementCurrency}`);
  }

  // =========================
  // GET PROVIDER SETTLEMENT PREFERENCE
  // =========================

  async getProviderSettlementCurrency(providerId) {
    try {
      const provider = await User.findById(providerId).select("preferredCurrency");
      if (provider?.preferredCurrency) {
        const isAllowed = await this.isCurrencyAllowedForSettlement(provider.preferredCurrency);
        if (isAllowed) {
          return provider.preferredCurrency;
        }
      }
      return this.defaultSettlementCurrency;
    } catch (error) {
      logger.error("Error getting provider settlement currency:", error);
      return this.defaultSettlementCurrency;
    }
  }

  async updateProviderSettlementCurrency(providerId, currencyCode) {
    const upperCode = currencyCode.toUpperCase();
    const isAllowed = await this.isCurrencyAllowedForSettlement(upperCode);
    if (!isAllowed) {
      throw new Error(`Currency ${upperCode} is not allowed for settlement`);
    }

    const provider = await User.findById(providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    provider.preferredCurrency = upperCode;
    await provider.save();

    logger.info(`✅ Provider ${providerId} settlement currency updated to ${upperCode}`);
    return provider;
  }

  async isCurrencyAllowedForSettlement(currencyCode) {
    const upperCode = currencyCode.toUpperCase();
    if (!this.allowedSettlementCurrencies.includes(upperCode)) {
      return false;
    }
    const currency = await Currency.findOne({
      code: upperCode,
      isActive: true,
      settlementAllowed: true,
    });
    return !!currency;
  }

  async getAllowedSettlementCurrencies() {
    return Currency.find({
      isActive: true,
      settlementAllowed: true,
    }).sort({ isDefault: -1, code: 1 });
  }

  // =========================
  // SETTLEMENT CALCULATION
  // =========================

  async calculateSettlement(payment, providerId = null) {
    try {
      const providerCurrency = providerId
        ? await this.getProviderSettlementCurrency(providerId)
        : this.defaultSettlementCurrency;

      const paymentCurrency = payment.currency || "USD";
      const paymentAmount = payment.providerAmount || payment.amount || 0;

      if (paymentCurrency === providerCurrency) {
        return {
          success: true,
          paymentAmount,
          settlementCurrency: providerCurrency,
          settlementAmount: paymentAmount,
          exchangeRate: 1,
          convertedFrom: paymentCurrency,
          fee: 0,
          netAmount: paymentAmount,
        };
      }

      const rateResult = await exchangeRateService.getRateWithConversion(
        paymentAmount,
        paymentCurrency,
        providerCurrency
      );

      if (!rateResult.success) {
        throw new Error(`Failed to get exchange rate for ${paymentCurrency}/${providerCurrency}`);
      }

      const settlementAmount = rateResult.convertedAmount;
      const fee = this.calculateSettlementFee(settlementAmount, providerCurrency);

      return {
        success: true,
        paymentAmount,
        paymentCurrency,
        settlementCurrency: providerCurrency,
        settlementAmount,
        exchangeRate: rateResult.rate,
        convertedFrom: paymentCurrency,
        fee,
        netAmount: settlementAmount - fee,
        rateSource: rateResult.source,
        effectiveDate: rateResult.effectiveDate,
      };
    } catch (error) {
      logger.error("Error calculating settlement:", error);
      return {
        success: false,
        error: error.message,
        paymentAmount: payment.amount || 0,
        settlementCurrency: this.defaultSettlementCurrency,
        settlementAmount: payment.amount || 0,
        exchangeRate: 1,
        fee: 0,
        netAmount: payment.amount || 0,
      };
    }
  }

  calculateSettlementFee(amount, currency) {
    const feePercentage = this.settlementFees[currency] || 0;
    return (amount * feePercentage) / 100;
  }

  getMinSettlementAmount(currency) {
    return this.minSettlementAmounts[currency] || 0;
  }

  validateSettlementAmount(amount, currency) {
    const minAmount = this.getMinSettlementAmount(currency);
    if (amount < minAmount) {
      return {
        valid: false,
        message: `Minimum settlement amount is ${currency} ${minAmount}`,
        minAmount,
      };
    }
    return { valid: true };
  }

  // =========================
  // PROCESS SETTLEMENT
  // =========================

  async processSettlement(paymentId, providerId = null) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.settlementStatus === "settled") {
        return {
          success: false,
          message: "Payment already settled",
          payment,
        };
      }

      const settlement = await this.calculateSettlement(payment, providerId);
      if (!settlement.success) {
        throw new Error(settlement.error);
      }

      payment.settlementCurrency = settlement.settlementCurrency;
      payment.settlementAmount = settlement.settlementAmount;
      payment.settlementExchangeRate = settlement.exchangeRate;
      payment.settlementFee = settlement.fee;
      payment.settlementStatus = "settled";
      payment.settledAt = new Date();

      await payment.save();

      await this.updateEarningForSettlement(payment, settlement);

      logger.info(`✅ Payment ${paymentId} settled in ${settlement.settlementCurrency}`);
      return {
        success: true,
        payment,
        settlement,
      };
    } catch (error) {
      logger.error(`Error processing settlement for payment ${paymentId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateEarningForSettlement(payment, settlement) {
    try {
      const earning = await Earning.findOne({ payment: payment._id });

      if (!earning) {
        const newEarning = new Earning({
          provider: payment.provider,
          booking: payment.booking,
          payment: payment._id,
          amount: settlement.netAmount,
          platformFee: payment.platformFee || 0,
          netAmount: settlement.netAmount,
          bookingType: "listing",
          status: "available",
          paymentId: payment.transactionId || payment.stripePaymentId,
          paidAt: payment.paidAt || new Date(),
          settlementCurrency: settlement.settlementCurrency,
          settlementAmount: settlement.settlementAmount,
          settlementExchangeRate: settlement.exchangeRate,
          settlementFee: settlement.fee,
        });

        await newEarning.save();
        logger.info(`✅ Earning created for payment ${payment._id}`);
        return newEarning;
      }

      earning.settlementCurrency = settlement.settlementCurrency;
      earning.settlementAmount = settlement.settlementAmount;
      earning.settlementExchangeRate = settlement.exchangeRate;
      earning.settlementFee = settlement.fee;
      earning.amount = settlement.netAmount;
      earning.netAmount = settlement.netAmount;

      await earning.save();
      logger.info(`✅ Earning updated for payment ${payment._id}`);
      return earning;
    } catch (error) {
      logger.error(`Error updating earning for payment ${payment._id}:`, error);
      throw error;
    }
  }

  // =========================
  // PROVIDER EARNINGS
  // =========================

  async getProviderEarnings(providerId, currency = null) {
    try {
      const settlementCurrency = currency || await this.getProviderSettlementCurrency(providerId);

      const earnings = await Earning.find({
        provider: providerId,
        status: { $in: ["available", "pending"] },
      });

      let total = 0;
      const formattedEarnings = [];

      for (const earning of earnings) {
        let amount = earning.netAmount || earning.amount || 0;
        let earningCurrency = earning.settlementCurrency || this.defaultSettlementCurrency;

        if (earningCurrency !== settlementCurrency) {
          const converted = await this.convertEarningAmount(
            amount,
            earningCurrency,
            settlementCurrency
          );
          amount = converted.amount;
          earningCurrency = settlementCurrency;
        }

        total += amount;
        formattedEarnings.push({
          ...earning.toObject(),
          convertedAmount: amount,
          displayCurrency: settlementCurrency,
        });
      }

      return {
        success: true,
        total,
        currency: settlementCurrency,
        earnings: formattedEarnings,
        count: earnings.length,
      };
    } catch (error) {
      logger.error(`Error getting earnings for provider ${providerId}:`, error);
      return {
        success: false,
        error: error.message,
        total: 0,
        currency: this.defaultSettlementCurrency,
        earnings: [],
        count: 0,
      };
    }
  }

  async convertEarningAmount(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return { amount, rate: 1 };
    }

    const rate = await exchangeRateService.getRate(fromCurrency, toCurrency);
    if (!rate) {
      return { amount, rate: 1 };
    }

    return {
      amount: amount * rate.rate,
      rate: rate.rate,
      source: rate.source,
    };
  }

  // =========================
  // PROVIDER BALANCE
  // =========================

  async getProviderBalance(providerId, currency = null) {
    try {
      const settlementCurrency = currency || await this.getProviderSettlementCurrency(providerId);

      const earnings = await Earning.find({
        provider: providerId,
        status: "available",
      });

      let available = 0;

      for (const earning of earnings) {
        let amount = earning.netAmount || earning.amount || 0;
        let earningCurrency = earning.settlementCurrency || this.defaultSettlementCurrency;

        if (earningCurrency !== settlementCurrency) {
          const converted = await this.convertEarningAmount(
            amount,
            earningCurrency,
            settlementCurrency
          );
          amount = converted.amount;
        }

        available += amount;
      }

      const pendingWithdrawals = await Withdrawal.find({
        provider: providerId,
        status: { $in: ["pending", "processing"] },
      });

      let pending = 0;
      for (const withdrawal of pendingWithdrawals) {
        if (withdrawal.currency === settlementCurrency) {
          pending += withdrawal.amount;
        } else {
          const converted = await this.convertEarningAmount(
            withdrawal.amount,
            withdrawal.currency,
            settlementCurrency
          );
          pending += converted.amount;
        }
      }

      return {
        success: true,
        available: Math.round(available * 100) / 100,
        pending: Math.round(pending * 100) / 100,
        total: Math.round((available - pending) * 100) / 100,
        currency: settlementCurrency,
      };
    } catch (error) {
      logger.error(`Error getting balance for provider ${providerId}:`, error);
      return {
        success: false,
        error: error.message,
        available: 0,
        pending: 0,
        total: 0,
        currency: this.defaultSettlementCurrency,
      };
    }
  }

  // =========================
  // WITHDRAWAL
  // =========================

  async processWithdrawalRequest(providerId, amount, currency, method, accountDetails) {
    try {
      const minAmount = this.getMinSettlementAmount(currency);
      if (amount < minAmount) {
        throw new Error(`Minimum withdrawal amount is ${currency} ${minAmount}`);
      }

      const balance = await this.getProviderBalance(providerId, currency);
      if (amount > balance.available) {
        throw new Error(`Insufficient balance. Available: ${currency} ${balance.available}`);
      }

      const withdrawal = new Withdrawal({
        provider: providerId,
        amount,
        currency,
        method,
        accountDetails,
        status: "pending",
        requestedAt: new Date(),
      });

      await withdrawal.save();

      await Earning.updateMany(
        {
          provider: providerId,
          status: "available",
        },
        { status: "pending_withdrawal" }
      );

      logger.info(`✅ Withdrawal request created for provider ${providerId}: ${amount} ${currency}`);
      return {
        success: true,
        withdrawal,
      };
    } catch (error) {
      logger.error(`Error processing withdrawal request for provider ${providerId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async approveWithdrawal(withdrawalId, adminId) {
    try {
      const withdrawal = await Withdrawal.findById(withdrawalId);
      if (!withdrawal) {
        throw new Error("Withdrawal not found");
      }

      if (withdrawal.status !== "pending") {
        throw new Error(`Withdrawal is ${withdrawal.status}, cannot approve`);
      }

      withdrawal.status = "processing";
      withdrawal.approvedAt = new Date();
      withdrawal.approvedBy = adminId;
      await withdrawal.save();

      logger.info(`✅ Withdrawal ${withdrawalId} approved`);
      return {
        success: true,
        withdrawal,
      };
    } catch (error) {
      logger.error(`Error approving withdrawal ${withdrawalId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async completeWithdrawal(withdrawalId, reference = null) {
    try {
      const withdrawal = await Withdrawal.findById(withdrawalId);
      if (!withdrawal) {
        throw new Error("Withdrawal not found");
      }

      if (withdrawal.status !== "processing") {
        throw new Error(`Withdrawal is ${withdrawal.status}, cannot complete`);
      }

      withdrawal.status = "completed";
      withdrawal.completedAt = new Date();
      if (reference) withdrawal.reference = reference;
      await withdrawal.save();

      await Earning.updateMany(
        {
          provider: withdrawal.provider,
          status: "pending_withdrawal",
        },
        { status: "withdrawn" }
      );

      logger.info(`✅ Withdrawal ${withdrawalId} completed`);
      return {
        success: true,
        withdrawal,
      };
    } catch (error) {
      logger.error(`Error completing withdrawal ${withdrawalId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async rejectWithdrawal(withdrawalId, reason, adminId) {
    try {
      const withdrawal = await Withdrawal.findById(withdrawalId);
      if (!withdrawal) {
        throw new Error("Withdrawal not found");
      }

      if (withdrawal.status !== "pending" && withdrawal.status !== "processing") {
        throw new Error(`Withdrawal is ${withdrawal.status}, cannot reject`);
      }

      withdrawal.status = "rejected";
      withdrawal.rejectionReason = reason;
      withdrawal.rejectedAt = new Date();
      withdrawal.rejectedBy = adminId;
      await withdrawal.save();

      await Earning.updateMany(
        {
          provider: withdrawal.provider,
          status: "pending_withdrawal",
        },
        { status: "available" }
      );

      logger.info(`✅ Withdrawal ${withdrawalId} rejected`);
      return {
        success: true,
        withdrawal,
      };
    } catch (error) {
      logger.error(`Error rejecting withdrawal ${withdrawalId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =========================
  // SETTLEMENT STATISTICS
  // =========================

  async getSettlementStats(providerId = null) {
    try {
      const filter = providerId ? { provider: providerId } : {};

      const stats = await Payment.aggregate([
        { $match: { ...filter, settlementStatus: "settled" } },
        {
          $group: {
            _id: "$settlementCurrency",
            totalSettled: { $sum: "$settlementAmount" },
            count: { $sum: 1 },
            totalFees: { $sum: "$settlementFee" },
          },
        },
      ]);

      const totalSettled = stats.reduce((sum, s) => sum + s.totalSettled, 0);
      const totalFees = stats.reduce((sum, s) => sum + s.totalFees, 0);

      return {
        success: true,
        byCurrency: stats,
        totalSettled,
        totalFees,
        netSettled: totalSettled - totalFees,
      };
    } catch (error) {
      logger.error("Error getting settlement stats:", error);
      return {
        success: false,
        error: error.message,
        byCurrency: [],
        totalSettled: 0,
        totalFees: 0,
        netSettled: 0,
      };
    }
  }

  async getWithdrawalStats(providerId = null) {
    try {
      const filter = providerId ? { provider: providerId } : {};

      const stats = await Withdrawal.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]);

      const byStatus = {};
      stats.forEach((s) => {
        byStatus[s._id] = {
          total: s.total,
          count: s.count,
        };
      });

      return {
        success: true,
        byStatus,
      };
    } catch (error) {
      logger.error("Error getting withdrawal stats:", error);
      return {
        success: false,
        error: error.message,
        byStatus: {},
      };
    }
  }
}

// =========================
// ✅ SINGLETON EXPORT
// =========================

const settlementService = new SettlementService();
export default settlementService;