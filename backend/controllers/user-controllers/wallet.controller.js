import {
  getWalletBalance,
  getWalletTransactions,
  addMoney,
  calculateStats,
  initiateAddMoney,
  completeAddMoney,
} from '../../services/wallet.service.js';

/**
 * Get wallet balance and stats
 * GET /api/user/wallet
 */
export const getWallet = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const balanceData = await getWalletBalance(userId);
    const stats = await calculateStats(userId);

    res.status(200).json({
      success: true,
      message: 'Wallet retrieved successfully',
      data: {
        balance: balanceData.balance,
        totalCredit: stats.totalCredit,
        totalDebit: stats.totalDebit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get wallet transactions
 * GET /api/user/wallet/transactions
 */
export const getTransactions = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { page, limit, type } = req.query;

    const filters = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      type,
    };

    const result = await getWalletTransactions(userId, filters);

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add money to wallet (legacy - direct add without payment)
 * POST /api/user/wallet/add-money
 */
export const addMoneyController = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
    }

    const transaction = await addMoney(
      userId,
      amount,
      description || 'Money added to wallet'
    );

    res.status(201).json({
      success: true,
      message: 'Money added to wallet successfully',
      data: {
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate wallet recharge via Razorpay
 * POST /api/user/wallet/initiate-add-money
 */
export const initiateAddMoneyController = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
    }

    const result = await initiateAddMoney(userId, parseFloat(amount));

    res.status(200).json({
      success: true,
      message: 'Payment order created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify wallet recharge payment and credit wallet
 * POST /api/user/wallet/verify-add-money
 */
export const verifyAddMoneyController = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment data',
      });
    }

    const result = await completeAddMoney(userId, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    res.status(200).json({
      success: true,
      message: 'Wallet recharged successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
