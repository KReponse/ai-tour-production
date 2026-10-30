// backend/src/controllers/earningController.js
//
// ✅ PRODUCTION-SAFE EARNING CONTROLLER
// ✅ Compatible with Withdrawal.js:
//      pending -> approved -> paid
//      pending/approved -> rejected
// ✅ Payment/Stripe logic stays in paymentController/paymentService
// ✅ Uses Earning.netAmount
// ✅ Currency-aware wallet
// ✅ Prevents normal and concurrent double-withdrawal requests
// ✅ Does NOT mark every Earning as withdrawn
// ✅ Supports legacy Earning.status === "withdrawn"
// ✅ MVP platform fee remains controlled by payment layer

import mongoose from "mongoose";
import Earning from "../models/Earning.js";
import Withdrawal from "../models/Withdrawal.js";

// ============================================================
// CONSTANTS
// ============================================================

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "RWF"];

const EARNING_STATUSES = [
  "pending",
  "available",
  "withdrawn",
  "failed",
  "refunded",
];

const WITHDRAWAL_STATUSES = [
  "pending",
  "approved",
  "paid",
  "rejected",
];

const WITHDRAWAL_RESERVED_STATUSES = [
  "pending",
  "approved",
];

const DEFAULT_CURRENCY = "RWF";

// ============================================================
// HELPERS
// ============================================================

const parsePositiveInteger = (
  value,
  fallback,
  max = 100
) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const roundMoney = (value) => {
  return (
    Math.round(
      (Number(value || 0) + Number.EPSILON) * 100
    ) / 100
  );
};

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const getProviderId = (req) => {
  return req.user?._id || req.user?.id;
};

const normalizeCurrency = (value) => {
  const currency = String(
    value || DEFAULT_CURRENCY
  )
    .trim()
    .toUpperCase();

  return SUPPORTED_CURRENCIES.includes(currency)
    ? currency
    : null;
};

const getRequestedCurrency = (req) => {
  return normalizeCurrency(
    req.query?.currency ||
      req.body?.currency ||
      DEFAULT_CURRENCY
  );
};

/**
 * Convert provider id safely to ObjectId.
 */
const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  return new mongoose.Types.ObjectId(value);
};

/**
 * Populate one earning query.
 */
const populateEarning = (query) => {
  return query
    .populate({
      path: "booking",
      select:
        "bookingCode bookingNumber status paymentStatus totalPrice startDate endDate listing user provider createdAt",
      populate: [
        {
          path: "listing",
          select:
            "title name images price currency provider",
        },
        {
          path: "user",
          select: "name email avatar",
        },
      ],
    })
    .populate({
      path: "payment",
      select:
        "amount currency status transactionId paymentMethod paidAt settlementCurrency settlementAmount",
    })
    .populate({
      path: "withdrawal",
      select:
        "amount currency method status reference transactionReference paidAt createdAt",
    })
    .populate(
      "provider",
      "name email avatar"
    );
};

/**
 * Get currencies in which this provider has earnings.
 */
const getProviderCurrencies = async (
  providerId,
  session = null
) => {
  const aggregate = Earning.aggregate([
    {
      $match: {
        provider: toObjectId(providerId),
        status: {
          $in: [
            "pending",
            "available",
            "withdrawn",
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          $ifNull: [
            "$currency",
            DEFAULT_CURRENCY,
          ],
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  if (session) {
    aggregate.session(session);
  }

  const result = await aggregate;

  return result
    .map((row) =>
      normalizeCurrency(row._id)
    )
    .filter(Boolean);
};

/**
 * Provider wallet calculation for ONE currency.
 *
 * Important accounting rules:
 *
 * 1. available earnings
 *    = earning documents currently available.
 *
 * 2. legacy withdrawn earnings
 *    = old earnings already marked withdrawn.
 *      They count toward lifetime earnings,
 *      but NEVER toward withdrawable balance.
 *
 * 3. pending + approved withdrawals
 *    = reserved money.
 *
 * 4. paid withdrawals
 *    = money already paid to provider.
 *
 * New withdrawal flow does NOT mutate all earning documents.
 * Therefore paid withdrawals are deducted from the still-available
 * earning pool.
 */
const calculateProviderWallet = async (
  providerId,
  {
    currency = DEFAULT_CURRENCY,
    session = null,
  } = {}
) => {
  const normalizedCurrency =
    normalizeCurrency(currency);

  if (!normalizedCurrency) {
    throw new Error(
      "Unsupported wallet currency"
    );
  }

  const providerObjectId =
    toObjectId(providerId);

  const earningAggregation =
    Earning.aggregate([
      {
        $match: {
          provider: providerObjectId,
          currency: normalizedCurrency,
        },
      },
      {
        $group: {
          _id: "$status",

          netAmount: {
            $sum: {
              $ifNull: [
                "$netAmount",
                "$amount",
              ],
            },
          },

          grossAmount: {
            $sum: "$amount",
          },

          platformFees: {
            $sum: "$platformFee",
          },

          count: {
            $sum: 1,
          },
        },
      },
    ]);

  const withdrawalAggregation =
    Withdrawal.aggregate([
      {
        $match: {
          provider: providerObjectId,
          currency: normalizedCurrency,
        },
      },
      {
        $group: {
          _id: "$status",

          amount: {
            $sum: "$amount",
          },

          netAmount: {
            $sum: "$netAmount",
          },

          count: {
            $sum: 1,
          },
        },
      },
    ]);

  if (session) {
    earningAggregation.session(session);
    withdrawalAggregation.session(session);
  }

  const [
    earningTotals,
    withdrawalTotals,
  ] = await Promise.all([
    earningAggregation,
    withdrawalAggregation,
  ]);

  const earnings = {
    pending: 0,
    available: 0,
    withdrawn: 0,
    failed: 0,
    refunded: 0,
  };

  const earningCounts = {
    pending: 0,
    available: 0,
    withdrawn: 0,
    failed: 0,
    refunded: 0,
  };

  let grossEarnings = 0;
  let totalPlatformFees = 0;

  for (const row of earningTotals) {
    if (
      Object.prototype.hasOwnProperty.call(
        earnings,
        row._id
      )
    ) {
      earnings[row._id] = Number(
        row.netAmount || 0
      );

      earningCounts[row._id] = Number(
        row.count || 0
      );
    }

    if (
      ["available", "withdrawn"].includes(
        row._id
      )
    ) {
      grossEarnings += Number(
        row.grossAmount || 0
      );

      totalPlatformFees += Number(
        row.platformFees || 0
      );
    }
  }

  const withdrawals = {
    pending: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
  };

  const withdrawalNet = {
    paid: 0,
  };

  const withdrawalCounts = {
    pending: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
  };

  for (const row of withdrawalTotals) {
    if (
      Object.prototype.hasOwnProperty.call(
        withdrawals,
        row._id
      )
    ) {
      withdrawals[row._id] = Number(
        row.amount || 0
      );

      withdrawalCounts[row._id] = Number(
        row.count || 0
      );
    }

    if (row._id === "paid") {
      withdrawalNet.paid = Number(
        row.netAmount || 0
      );
    }
  }

  /**
   * Legacy withdrawn Earning records are already settled,
   * therefore only currently "available" earnings form
   * the active wallet pool.
   */
  const activeAvailableEarnings = Number(
    earnings.available || 0
  );

  const reservedWithdrawals =
    Number(withdrawals.pending || 0) +
    Number(withdrawals.approved || 0);

  const paidWithdrawals = Number(
    withdrawals.paid || 0
  );

  /**
   * New withdrawals do not mutate Earning documents,
   * therefore paid withdrawals are subtracted here.
   *
   * Legacy Earning.status="withdrawn" is excluded from
   * activeAvailableEarnings, preventing double subtraction.
   */
  const withdrawableBalance = Math.max(
    0,
    activeAvailableEarnings -
      reservedWithdrawals -
      paidWithdrawals
  );

  /**
   * Lifetime successfully-earned provider amount.
   *
   * Paid withdrawals are NOT earnings.
   * They are only payout movements.
   */
  const totalEarned =
    Number(earnings.available || 0) +
    Number(earnings.withdrawn || 0);

  return {
    currency: normalizedCurrency,

    totalEarned:
      roundMoney(totalEarned),

    grossEarnings:
      roundMoney(grossEarnings),

    totalPlatformFees:
      roundMoney(totalPlatformFees),

    activeAvailableEarnings:
      roundMoney(
        activeAvailableEarnings
      ),

    withdrawableBalance:
      roundMoney(
        withdrawableBalance
      ),

    reservedWithdrawals:
      roundMoney(
        reservedWithdrawals
      ),

    pendingWithdrawals:
      roundMoney(
        withdrawals.pending
      ),

    approvedWithdrawals:
      roundMoney(
        withdrawals.approved
      ),

    paidWithdrawals:
      roundMoney(
        paidWithdrawals
      ),

    paidNetAmount:
      roundMoney(
        withdrawalNet.paid
      ),

    rejectedWithdrawals:
      roundMoney(
        withdrawals.rejected
      ),

    pendingEarnings:
      roundMoney(
        earnings.pending
      ),

    legacyWithdrawnEarnings:
      roundMoney(
        earnings.withdrawn
      ),

    refundedEarnings:
      roundMoney(
        earnings.refunded
      ),

    failedEarnings:
      roundMoney(
        earnings.failed
      ),

    counts: {
      earnings:
        Object.values(
          earningCounts
        ).reduce(
          (sum, count) =>
            sum + Number(count || 0),
          0
        ),

      earningStatuses:
        earningCounts,

      withdrawals:
        withdrawalCounts,

      reservedWithdrawals:
        Number(
          withdrawalCounts.pending || 0
        ) +
        Number(
          withdrawalCounts.approved || 0
        ),
    },
  };
};

/**
 * Build wallets for every provider currency.
 */
const calculateAllProviderWallets =
  async (
    providerId,
    session = null
  ) => {
    const currencies =
      await getProviderCurrencies(
        providerId,
        session
      );

    if (!currencies.length) {
      currencies.push(
        DEFAULT_CURRENCY
      );
    }

    const wallets =
      await Promise.all(
        currencies.map((currency) =>
          calculateProviderWallet(
            providerId,
            {
              currency,
              session,
            }
          )
        )
      );

    return wallets;
  };

/**
 * Concurrency lock.
 *
 * Every withdrawal request for one provider writes the
 * same lock document inside its transaction.
 *
 * MongoDB therefore serializes conflicting withdrawal
 * requests for that provider instead of allowing two
 * independent transactions to reserve the same balance.
 */
const acquireProviderWithdrawalLock =
  async (
    providerId,
    session
  ) => {
    const collection =
      mongoose.connection.collection(
        "withdrawal_locks"
      );

    await collection.findOneAndUpdate(
      {
        _id: toObjectId(providerId),
      },
      {
        $inc: {
          version: 1,
        },

        $set: {
          updatedAt: new Date(),
        },

        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        session,
      }
    );
  };

/**
 * Retry transaction on transient MongoDB conflicts.
 */
const runWithdrawalTransaction =
  async (
    callback,
    maxAttempts = 3
  ) => {
    let lastError;

    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt += 1
    ) {
      const session =
        await mongoose.startSession();

      try {
        let result;

        await session.withTransaction(
          async () => {
            result =
              await callback(session);
          },
          {
            readConcern: {
              level: "snapshot",
            },

            writeConcern: {
              w: "majority",
            },
          }
        );

        await session.endSession();

        return result;
      } catch (error) {
        lastError = error;

        await session.endSession();

        const retryable =
          error?.hasErrorLabel?.(
            "TransientTransactionError"
          ) ||
          error?.hasErrorLabel?.(
            "UnknownTransactionCommitResult"
          ) ||
          error?.code === 112;

        if (
          !retryable ||
          attempt === maxAttempts
        ) {
          throw error;
        }
      }
    }

    throw lastError;
  };

// ============================================================
// GET EARNINGS
// ============================================================

export const getEarnings = async (
  req,
  res
) => {
  return getMyEarnings(req, res);
};

// ============================================================
// GET MY EARNINGS
// ============================================================

export const getMyEarnings = async (
  req,
  res
) => {
  try {
    const providerId =
      getProviderId(req);

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const page =
      parsePositiveInteger(
        req.query.page,
        1
      );

    const limit =
      parsePositiveInteger(
        req.query.limit,
        20,
        100
      );

    const skip =
      (page - 1) * limit;

    const filter = {
      provider: providerId,
    };

    if (req.query.status) {
      if (
        !EARNING_STATUSES.includes(
          req.query.status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid earning status",
          });
      }

      filter.status =
        req.query.status;
    }

    if (req.query.currency) {
      const currency =
        normalizeCurrency(
          req.query.currency
        );

      if (!currency) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid currency",
          });
      }

      filter.currency =
        currency;
    }

    const [
      earnings,
      total,
      wallets,
    ] = await Promise.all([
      populateEarning(
        Earning.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
      ),

      Earning.countDocuments(
        filter
      ),

      calculateAllProviderWallets(
        providerId
      ),
    ]);

    return res.json({
      success: true,

      earnings,

      wallets,

      /**
       * Backward-compatible scalar fields.
       *
       * Only reliable as a single value when provider has
       * one wallet currency.
       */
      total:
        wallets.length === 1
          ? wallets[0].totalEarned
          : null,

      available:
        wallets.length === 1
          ? wallets[0]
              .withdrawableBalance
          : null,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          total === 0
            ? 0
            : Math.ceil(
                total / limit
              ),
      },
    });
  } catch (error) {
    console.error(
      "getMyEarnings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load earnings",
    });
  }
};

// ============================================================
// GET EARNING SUMMARY
// ============================================================

export const getEarningSummary =
  async (req, res) => {
    try {
      const providerId =
        getProviderId(req);

      if (!providerId) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication required",
          });
      }

      const wallets =
        await calculateAllProviderWallets(
          providerId
        );

      return res.json({
        success: true,

        wallets,

        summary:
          wallets.length === 1
            ? {
                currency:
                  wallets[0]
                    .currency,

                total:
                  wallets[0]
                    .totalEarned,

                available:
                  wallets[0]
                    .withdrawableBalance,

                pending:
                  wallets[0]
                    .pendingEarnings,

                withdrawn:
                  wallets[0]
                    .paidWithdrawals,

                refunded:
                  wallets[0]
                    .refundedEarnings,

                reserved:
                  wallets[0]
                    .reservedWithdrawals,

                count:
                  wallets[0]
                    .counts
                    .earnings,
              }
            : null,
      });
    } catch (error) {
      console.error(
        "getEarningSummary error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load earning summary",
        });
    }
  };

// ============================================================
// GET EARNING DETAILS
// ============================================================

export const getEarningDetails =
  async (req, res) => {
    try {
      const providerId =
        getProviderId(req);

      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid earning id",
          });
      }

      const earning =
        await populateEarning(
          Earning.findById(
            req.params.id
          )
        );

      if (!earning) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Earning not found",
          });
      }

      const earningProviderId =
        earning.provider?._id ||
        earning.provider;

      const isOwner =
        earningProviderId
          ?.toString() ===
        providerId?.toString();

      const isAdmin =
        req.user?.role ===
        "admin";

      if (
        !isOwner &&
        !isAdmin
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Not authorized",
          });
      }

      return res.json({
        success: true,
        earning,
      });
    } catch (error) {
      console.error(
        "getEarningDetails error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load earning",
        });
    }
  };

// ============================================================
// GET PROVIDER WALLET
// ============================================================

export const getProviderWallet =
  async (req, res) => {
    try {
      const providerId =
        getProviderId(req);

      if (!providerId) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication required",
          });
      }

      const wallets =
        await calculateAllProviderWallets(
          providerId
        );

      return res.json({
        success: true,

        wallets,

        wallet:
          wallets.length === 1
            ? wallets[0]
            : null,
      });
    } catch (error) {
      console.error(
        "getProviderWallet error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load provider wallet",
        });
    }
  };

// ============================================================
// GET WITHDRAWABLE BALANCE
// ============================================================

export const getWithdrawableBalance =
  async (req, res) => {
    try {
      const providerId =
        getProviderId(req);

      if (!providerId) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication required",
          });
      }

      const wallets =
        await calculateAllProviderWallets(
          providerId
        );

      return res.json({
        success: true,

        balances:
          wallets.map(
            (wallet) => ({
              currency:
                wallet.currency,

              balance:
                wallet.withdrawableBalance,

              reserved:
                wallet.reservedWithdrawals,

              paid:
                wallet.paidWithdrawals,

              totalEarned:
                wallet.totalEarned,
            })
          ),

        /**
         * Compatibility for a single-currency wallet.
         */
        balance:
          wallets.length === 1
            ? wallets[0]
                .withdrawableBalance
            : null,

        currency:
          wallets.length === 1
            ? wallets[0].currency
            : null,
      });
    } catch (error) {
      console.error(
        "getWithdrawableBalance error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load withdrawable balance",
        });
    }
  };

// ============================================================
// REQUEST WITHDRAWAL
// ============================================================

export const requestWithdrawal =
  async (req, res) => {
    try {
      const providerId =
        getProviderId(req);

      if (!providerId) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication required",
          });
      }

      const {
        amount,
        method,
        accountDetails,
      } = req.body;

      const withdrawalAmount =
        roundMoney(
          Number(amount)
        );

      if (
        !Number.isFinite(
          withdrawalAmount
        ) ||
        withdrawalAmount <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Withdrawal amount must be greater than 0",
          });
      }

      const allowedMethods = [
        "bank",
        "mobile_money",
        "paypal",
      ];

      const normalizedMethod =
        String(method || "")
          .trim()
          .toLowerCase();

      if (
        !allowedMethods.includes(
          normalizedMethod
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid withdrawal method",
          });
      }

      const cleanAccountDetails =
        String(
          accountDetails || ""
        ).trim();

      if (!cleanAccountDetails) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Account details are required",
          });
      }

      let currency;

      if (req.body.currency) {
        currency =
          normalizeCurrency(
            req.body.currency
          );

        if (!currency) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Unsupported withdrawal currency",
            });
        }
      } else {
        /**
         * If provider has exactly one earning currency,
         * safely infer it.
         *
         * Multiple currencies require explicit selection.
         */
        const currencies =
          await getProviderCurrencies(
            providerId
          );

        if (
          currencies.length > 1
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Currency is required because this wallet contains multiple currencies",

              currencies,
            });
        }

        currency =
          currencies[0] ||
          DEFAULT_CURRENCY;
      }

      const transactionResult =
        await runWithdrawalTransaction(
          async (session) => {
            /**
             * Serialize withdrawal requests from this provider.
             */
            await acquireProviderWithdrawalLock(
              providerId,
              session
            );

            /**
             * Recalculate balance AFTER acquiring the lock.
             */
            const wallet =
              await calculateProviderWallet(
                providerId,
                {
                  currency,
                  session,
                }
              );

            if (
              withdrawalAmount >
              wallet.withdrawableBalance
            ) {
              const error =
                new Error(
                  "Insufficient withdrawable balance"
                );

              error.code =
                "INSUFFICIENT_BALANCE";

              error.availableBalance =
                wallet.withdrawableBalance;

              throw error;
            }

            const created =
              await Withdrawal.create(
                [
                  {
                    provider:
                      providerId,

                    amount:
                      withdrawalAmount,

                    currency,

                    method:
                      normalizedMethod,

                    accountDetails:
                      cleanAccountDetails,

                    status:
                      "pending",

                    fee: 0,
                  },
                ],
                {
                  session,
                }
              );

            return {
              withdrawal:
                created[0],

              previousBalance:
                wallet.withdrawableBalance,

              remainingBalance:
                roundMoney(
                  wallet.withdrawableBalance -
                    withdrawalAmount
                ),
            };
          }
        );

      /**
       * Reload without accountDetails.
       */
      const safeWithdrawal =
        await Withdrawal.findById(
          transactionResult
            .withdrawal._id
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Withdrawal request submitted",

          withdrawal:
            safeWithdrawal,

          wallet: {
            currency,

            previousAvailableBalance:
              transactionResult
                .previousBalance,

            remainingAvailableBalance:
              transactionResult
                .remainingBalance,
          },
        });
    } catch (error) {
      console.error(
        "requestWithdrawal error:",
        error
      );

      if (
        error.code ===
        "INSUFFICIENT_BALANCE"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Insufficient withdrawable balance",

            availableBalance:
              error.availableBalance,
          });
      }

      if (
        error?.name ===
        "ValidationError"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              error.message,
          });
      }

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to request withdrawal",
        });
    }
  };

// ============================================================
// GET WITHDRAWAL HISTORY
// ============================================================

export const getWithdrawalHistory =
  async (req, res) => {
    try {
      const providerId =
        getProviderId(req);

      if (!providerId) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication required",
          });
      }

      const page =
        parsePositiveInteger(
          req.query.page,
          1
        );

      const limit =
        parsePositiveInteger(
          req.query.limit,
          20,
          100
        );

      const skip =
        (page - 1) * limit;

      const filter = {
        provider: providerId,
      };

      if (req.query.status) {
        if (
          !WITHDRAWAL_STATUSES.includes(
            req.query.status
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid withdrawal status",
            });
        }

        filter.status =
          req.query.status;
      }

      if (req.query.currency) {
        const currency =
          normalizeCurrency(
            req.query.currency
          );

        if (!currency) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid currency",
            });
        }

        filter.currency =
          currency;
      }

      const [
        withdrawals,
        total,
      ] = await Promise.all([
        Withdrawal.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit),

        Withdrawal.countDocuments(
          filter
        ),
      ]);

      return res.json({
        success: true,

        withdrawals,

        pagination: {
          page,
          limit,
          total,

          totalPages:
            total === 0
              ? 0
              : Math.ceil(
                  total / limit
                ),
        },
      });
    } catch (error) {
      console.error(
        "getWithdrawalHistory error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load withdrawal history",
        });
    }
  };

// ============================================================
// GET TRANSACTION HISTORY
// ============================================================

export const getTransactionHistory =
  async (req, res) => {
    try {
      const providerId =
        getProviderId(req);

      if (!providerId) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication required",
          });
      }

      const page =
        parsePositiveInteger(
          req.query.page,
          1
        );

      const limit =
        parsePositiveInteger(
          req.query.limit,
          20,
          100
        );

      const skip =
        (page - 1) * limit;

      const filter = {
        provider: providerId,
      };

      if (req.query.status) {
        if (
          !EARNING_STATUSES.includes(
            req.query.status
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid earning status",
            });
        }

        filter.status =
          req.query.status;
      }

      if (req.query.currency) {
        const currency =
          normalizeCurrency(
            req.query.currency
          );

        if (!currency) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid currency",
            });
        }

        filter.currency =
          currency;
      }

      const [
        transactions,
        total,
      ] = await Promise.all([
        populateEarning(
          Earning.find(filter)
            .sort({
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
        ),

        Earning.countDocuments(
          filter
        ),
      ]);

      return res.json({
        success: true,

        transactions,

        pagination: {
          page,
          limit,
          total,

          totalPages:
            total === 0
              ? 0
              : Math.ceil(
                  total / limit
                ),
        },
      });
    } catch (error) {
      console.error(
        "getTransactionHistory error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load transaction history",
        });
    }
  };

// ============================================================
// PROVIDER ALIASES
// ============================================================

export const getProviderEarnings =
  async (req, res) => {
    return getMyEarnings(
      req,
      res
    );
  };

export const getProviderEarningSummary =
  async (req, res) => {
    return getEarningSummary(
      req,
      res
    );
  };

// ============================================================
// GET ADMIN EARNINGS
// ============================================================

export const getAdminEarnings =
  async (req, res) => {
    try {
      const page =
        parsePositiveInteger(
          req.query.page,
          1
        );

      const limit =
        parsePositiveInteger(
          req.query.limit,
          20,
          100
        );

      const skip =
        (page - 1) * limit;

      const filter = {};

      if (req.query.status) {
        if (
          !EARNING_STATUSES.includes(
            req.query.status
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid earning status",
            });
        }

        filter.status =
          req.query.status;
      }

      if (req.query.provider) {
        if (
          !isValidObjectId(
            req.query.provider
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid provider id",
            });
        }

        filter.provider =
          req.query.provider;
      }

      if (req.query.currency) {
        const currency =
          normalizeCurrency(
            req.query.currency
          );

        if (!currency) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid currency",
            });
        }

        filter.currency =
          currency;
      }

      const aggregateMatch = {
        ...filter,
      };

      if (
        aggregateMatch.provider
      ) {
        aggregateMatch.provider =
          toObjectId(
            aggregateMatch.provider
          );
      }

      const [
        earnings,
        total,
        totalsByCurrency,
      ] = await Promise.all([
        populateEarning(
          Earning.find(filter)
            .sort({
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
        ),

        Earning.countDocuments(
          filter
        ),

        Earning.aggregate([
          {
            $match:
              aggregateMatch,
          },
          {
            $group: {
              _id: {
                $ifNull: [
                  "$currency",
                  DEFAULT_CURRENCY,
                ],
              },

              grossAmount: {
                $sum: "$amount",
              },

              providerNetAmount: {
                $sum: "$netAmount",
              },

              platformFees: {
                $sum: "$platformFee",
              },

              count: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ]),
      ]);

      const normalizedTotals =
        totalsByCurrency.map(
          (row) => ({
            currency:
              normalizeCurrency(
                row._id
              ) ||
              DEFAULT_CURRENCY,

            grossAmount:
              roundMoney(
                row.grossAmount
              ),

            providerNetAmount:
              roundMoney(
                row.providerNetAmount
              ),

            platformFees:
              roundMoney(
                row.platformFees
              ),

            count:
              row.count || 0,
          })
        );

      return res.json({
        success: true,

        earnings,

        totalsByCurrency:
          normalizedTotals,

        totals:
          normalizedTotals.length ===
          1
            ? normalizedTotals[0]
            : null,

        totalAmount:
          normalizedTotals.length ===
          1
            ? normalizedTotals[0]
                .providerNetAmount
            : null,

        pagination: {
          page,
          limit,
          total,

          totalPages:
            total === 0
              ? 0
              : Math.ceil(
                  total / limit
                ),
        },
      });
    } catch (error) {
      console.error(
        "getAdminEarnings error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load admin earnings",
        });
    }
  };

// ============================================================
// UPDATE WITHDRAWAL STATUS - ADMIN
// ============================================================

export const updateWithdrawalStatus =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        status,
        adminNote,
        adminNotes,
        transactionReference,
        payoutReference,
        rejectionReason,
      } = req.body;

      if (!isValidObjectId(id)) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid withdrawal id",
          });
      }

      if (
        !WITHDRAWAL_STATUSES.includes(
          status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid withdrawal status",
          });
      }

      const withdrawal =
        await Withdrawal.findById(
          id
        ).select(
          "+accountDetails"
        );

      if (!withdrawal) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Withdrawal not found",
          });
      }

      const currentStatus =
        withdrawal.status;

      const adminId =
        req.user?._id ||
        req.user?.id;

      const note =
        adminNote ??
        adminNotes ??
        null;

      const externalReference =
        transactionReference ??
        payoutReference ??
        null;

      /**
       * Same-state update:
       * allow harmless admin-note update.
       */
      if (
        status ===
        currentStatus
      ) {
        if (note) {
          await withdrawal.addAdminNote(
            note
          );
        }

        const safeWithdrawal =
          await Withdrawal.findById(
            withdrawal._id
          );

        return res.json({
          success: true,
          message: `Withdrawal remains ${status}`,
          withdrawal:
            safeWithdrawal,
        });
      }

      /**
       * Terminal states cannot be reopened.
       */
      if (
        ["paid", "rejected"].includes(
          currentStatus
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Withdrawal is already ${currentStatus}`,
          });
      }

      /**
       * Exact canonical transitions:
       *
       * pending  -> approved
       * pending  -> rejected
       * approved -> paid
       * approved -> rejected
       */
      if (
        status === "approved"
      ) {
        if (
          currentStatus !==
          "pending"
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message: `Cannot approve withdrawal from ${currentStatus}`,
            });
        }

        await withdrawal.approve(
          adminId,
          note
        );
      } else if (
        status === "paid"
      ) {
        if (
          currentStatus !==
          "approved"
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Withdrawal must be approved before it can be marked paid",
            });
        }

        if (
          externalReference
        ) {
          withdrawal.transactionReference =
            String(
              externalReference
            ).trim();
        }

        if (adminId) {
          withdrawal.processedBy =
            adminId;
        }

        if (note) {
          withdrawal.adminNote =
            String(note).trim();
        }

        await withdrawal.markAsPaid(
          withdrawal.transactionReference
        );
      } else if (
        status === "rejected"
      ) {
        if (
          ![
            "pending",
            "approved",
          ].includes(
            currentStatus
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message: `Cannot reject withdrawal from ${currentStatus}`,
            });
        }

        const reason =
          String(
            rejectionReason ||
              note ||
              ""
          ).trim();

        if (!reason) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Rejection reason is required",
            });
        }

        await withdrawal.reject(
          adminId,
          reason
        );
      } else {
        /**
         * "pending" is only the initial state.
         * Existing withdrawals may never move backwards into pending.
         */
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Cannot move an existing withdrawal back to pending",
          });
      }

      const updatedWithdrawal =
        await Withdrawal.findById(
          id
        )
          .populate(
            "provider",
            "name email avatar"
          )
          .populate(
            "processedBy",
            "name email"
          );

      return res.json({
        success: true,

        message: `Withdrawal marked as ${status}`,

        withdrawal:
          updatedWithdrawal,
      });
    } catch (error) {
      console.error(
        "updateWithdrawalStatus error:",
        error
      );

      if (
        error?.name ===
        "ValidationError"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              error.message,
          });
      }

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to update withdrawal",
        });
    }
  };

// ============================================================
// GET PLATFORM FEES - ADMIN
// ============================================================

export const getPlatformFees =
  async (req, res) => {
    try {
      /**
       * Never combine currencies into one numeric total.
       */
      const [
        summaryByCurrency,
        feesByProvider,
      ] = await Promise.all([
        Earning.aggregate([
          {
            $match: {
              status: {
                $in: [
                  "available",
                  "withdrawn",
                ],
              },
            },
          },
          {
            $group: {
              _id: {
                currency: {
                  $ifNull: [
                    "$currency",
                    DEFAULT_CURRENCY,
                  ],
                },
              },

              totalFees: {
                $sum:
                  "$platformFee",
              },

              grossAmount: {
                $sum:
                  "$amount",
              },

              providerNetAmount: {
                $sum:
                  "$netAmount",
              },

              count: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              "_id.currency": 1,
            },
          },
        ]),

        Earning.aggregate([
          {
            $match: {
              status: {
                $in: [
                  "available",
                  "withdrawn",
                ],
              },
            },
          },
          {
            $group: {
              _id: {
                provider:
                  "$provider",

                currency: {
                  $ifNull: [
                    "$currency",
                    DEFAULT_CURRENCY,
                  ],
                },
              },

              totalFees: {
                $sum:
                  "$platformFee",
              },

              grossAmount: {
                $sum:
                  "$amount",
              },

              providerNetAmount: {
                $sum:
                  "$netAmount",
              },

              count: {
                $sum: 1,
              },
            },
          },
          {
            $lookup: {
              from: "users",

              localField:
                "_id.provider",

              foreignField:
                "_id",

              as: "provider",
            },
          },
          {
            $unwind: {
              path: "$provider",

              preserveNullAndEmptyArrays:
                true,
            },
          },
          {
            $project: {
              _id: 0,

              providerId:
                "$_id.provider",

              currency:
                "$_id.currency",

              providerName:
                "$provider.name",

              providerEmail:
                "$provider.email",

              totalFees: 1,
              grossAmount: 1,
              providerNetAmount: 1,
              count: 1,
            },
          },
          {
            $sort: {
              totalFees: -1,
            },
          },
        ]),
      ]);

      return res.json({
        success: true,

        data: {
          /**
           * MVP commission is expected to be 0,
           * but we report stored values rather than hardcoding it.
           */
          summaryByCurrency:
            summaryByCurrency.map(
              (row) => ({
                currency:
                  normalizeCurrency(
                    row._id
                      ?.currency
                  ) ||
                  DEFAULT_CURRENCY,

                totalFees:
                  roundMoney(
                    row.totalFees
                  ),

                grossAmount:
                  roundMoney(
                    row.grossAmount
                  ),

                providerNetAmount:
                  roundMoney(
                    row.providerNetAmount
                  ),

                count:
                  row.count || 0,
              })
            ),

          feesByProvider:
            feesByProvider.map(
              (row) => ({
                ...row,

                currency:
                  normalizeCurrency(
                    row.currency
                  ) ||
                  DEFAULT_CURRENCY,

                totalFees:
                  roundMoney(
                    row.totalFees
                  ),

                grossAmount:
                  roundMoney(
                    row.grossAmount
                  ),

                providerNetAmount:
                  roundMoney(
                    row.providerNetAmount
                  ),
              })
            ),
        },
      });
    } catch (error) {
      console.error(
        "getPlatformFees error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load platform fees",
        });
    }
  };

