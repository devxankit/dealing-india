import Wallet from '../models/Wallet.model.js';
import WalletTransaction from '../models/WalletTransaction.model.js';
import mongoose from 'mongoose';
import razorpayService from './razorpay.service.js';

/**
 * Get or create wallet for user
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Wallet object
 */
/**
 * Get or create wallet for user
 * @param {String} userId - User ID
 * @param {Object} session - Mongoose session (optional)
 * @returns {Promise<Object>} Wallet object
 */
const getOrCreateWallet = async (userId, session = null) => {
  let query = Wallet.findOne({ userId });
  if (session) {
    query = query.session(session);
  }
  let wallet = await query;

  if (!wallet) {
    const options = session ? { session } : {};
    const wallets = await Wallet.create([{ userId, balance: 0 }], options);
    wallet = wallets[0];
  }

  return wallet;
};


/**
 * Get wallet balance and stats for user
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Wallet balance and stats
 */
export const getWalletBalance = async (userId) => {
  try {
    const wallet = await getOrCreateWallet(userId);

    // Calculate stats from transactions
    const transactions = await WalletTransaction.find({
      userId,
      status: 'completed',
    }).lean();

    const totalCredit = transactions
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebit = transactions
      .filter((t) => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      balance: wallet.balance,
      totalCredit,
      totalDebit,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get wallet transactions for user
 * @param {String} userId - User ID
 * @param {Object} filters - Filter options (page, limit, type)
 * @returns {Promise<Object>} Transactions with pagination
 */
export const getWalletTransactions = async (userId, filters = {}) => {
  try {
    const { page = 1, limit = 20, type } = filters;
    const skip = (page - 1) * limit;

    const query = { userId, status: 'completed' };
    if (type) {
      query.type = type;
    }

    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await WalletTransaction.countDocuments(query);

    return {
      transactions: transactions.map((tx) => ({
        id: tx._id.toString(),
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        date: tx.createdAt,
        status: tx.status,
        referenceId: tx.referenceId,
        referenceType: tx.referenceType,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Add money to wallet (for future use)
 * @param {String} userId - User ID
 * @param {Number} amount - Amount to add
 * @param {String} description - Transaction description
 * @returns {Promise<Object>} Created transaction
 */
export const addMoney = async (userId, amount, description = 'Money added to wallet') => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await getOrCreateWallet(userId);

    // Create transaction
    const transaction = await WalletTransaction.create(
      [
        {
          walletId: wallet._id,
          userId,
          type: 'credit',
          amount,
          description,
          referenceType: 'manual',
          status: 'completed',
        },
      ],
      { session }
    );

    // Update wallet balance
    wallet.balance += amount;
    await wallet.save({ session });

    await session.commitTransaction();

    return {
      id: transaction[0]._id.toString(),
      type: transaction[0].type,
      amount: transaction[0].amount,
      description: transaction[0].description,
      date: transaction[0].createdAt,
      status: transaction[0].status,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Create wallet transaction (used by order service)
 * @param {String} userId - User ID
 * @param {String} type - 'credit' or 'debit'
 * @param {Number} amount - Transaction amount
 * @param {String} description - Transaction description
 * @param {String} referenceId - Order ID or other reference
 * @param {String} referenceType - Type of reference
 * @param {Object} session - Mongoose session (optional)
 * @returns {Promise<Object>} Created transaction
 */
export const createWalletTransaction = async (
  userId,
  type,
  amount,
  description,
  referenceId = null,
  referenceType = 'order',
  session = null
) => {
  const localSession = session || await mongoose.startSession();
  if (!session) localSession.startTransaction();

  try {
    const wallet = await getOrCreateWallet(userId, localSession);

    // Create transaction
    const transaction = await WalletTransaction.create(
      [
        {
          walletId: wallet._id,
          userId,
          type,
          amount,
          description,
          referenceId,
          referenceType,
          status: 'completed',
        },
      ],
      { session: localSession }
    );

    // Update wallet balance
    if (type === 'credit') {
      wallet.balance += amount;
    } else if (type === 'debit') {
      wallet.balance = Math.max(0, wallet.balance - amount);
    }
    await wallet.save({ session: localSession });

    if (!session) await localSession.commitTransaction();

    return transaction[0];
  } catch (error) {
    if (!session) await localSession.abortTransaction();
    throw error;
  } finally {
    if (!session) localSession.endSession();
  }
};

/**
 * Calculate wallet stats
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Wallet statistics
 */
export const calculateStats = async (userId) => {
  try {
    const transactions = await WalletTransaction.find({
      userId,
      status: 'completed',
    }).lean();

    const totalCredit = transactions
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebit = transactions
      .filter((t) => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalCredit,
      totalDebit,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Initiate wallet recharge via Razorpay
 * Creates a Razorpay order for the specified amount
 * @param {String} userId - User ID
 * @param {Number} amount - Amount to add in rupees
 * @returns {Promise<Object>} Razorpay order details
 */
export const initiateAddMoney = async (userId, amount) => {
  try {
    // Validate amount
    if (!amount || amount < 1) {
      const err = new Error('Minimum recharge amount is ₹1');
      err.status = 400;
      throw err;
    }

    if (amount > 50000) {
      const err = new Error('Maximum recharge amount is ₹50,000');
      err.status = 400;
      throw err;
    }

    // Ensure wallet exists
    await getOrCreateWallet(userId);

    // Create Razorpay order
    // Create Razorpay order
    // Receipt must be <= 40 chars. userId is 24, Date.now() is 13.
    // wallet_ + 24 + 1 + 13 = 45 (Too long).
    // Using shorter format: wal_ + last 6 of user + _ + timestamp
    const shortUserId = userId.toString().slice(-6);
    const receipt = `wal_${shortUserId}_${Date.now()}`;
    const razorpayOrder = await razorpayService.createOrder(
      amount,
      'INR',
      receipt,
      {
        userId,
        type: 'wallet_recharge',
      }
    );

    if (!razorpayOrder || !razorpayOrder.id) {
      throw new Error('Failed to create payment order');
    }

    return {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Complete wallet recharge after Razorpay payment
 * Verifies payment and credits wallet
 * @param {String} userId - User ID
 * @param {Object} paymentData - Razorpay payment response
 * @returns {Promise<Object>} Updated wallet and transaction details
 */
export const completeAddMoney = async (userId, paymentData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = paymentData;

    // Validate required fields
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      const err = new Error('Invalid payment data');
      err.status = 400;
      throw err;
    }

    // Verify payment signature
    const isValid = razorpayService.verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      const err = new Error('Payment verification failed');
      err.status = 400;
      throw err;
    }

    // Get payment details from Razorpay
    const paymentDetails = await razorpayService.getPaymentDetails(razorpayPaymentId);

    // Calculate amount in rupees (Razorpay returns amount in paise)
    const amountInRupees = paymentDetails.amount / 100;

    const wallet = await getOrCreateWallet(userId);

    // Create wallet transaction
    const transaction = await WalletTransaction.create(
      [
        {
          walletId: wallet._id,
          userId,
          type: 'credit',
          amount: amountInRupees,
          description: 'Wallet recharge via Razorpay',
          referenceId: razorpayPaymentId,
          referenceType: 'razorpay_recharge',
          status: 'completed',
          metadata: {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            paymentMethod: paymentDetails.method,
          },
        },
      ],
      { session }
    );

    // Update wallet balance
    wallet.balance += amountInRupees;
    await wallet.save({ session });

    await session.commitTransaction();

    return {
      success: true,
      newBalance: wallet.balance,
      transaction: {
        id: transaction[0]._id.toString(),
        type: transaction[0].type,
        amount: transaction[0].amount,
        description: transaction[0].description,
        date: transaction[0].createdAt,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Deduct amount from wallet (for checkout)
 * @param {String} userId - User ID
 * @param {Number} amount - Amount to deduct
 * @param {String} orderId - Order ID for reference
 * @param {Object} session - Mongoose session (optional)
 * @returns {Promise<Object>} Deduction result
 */
export const deductFromWallet = async (userId, amount, orderId, session = null) => {
  const localSession = session || await mongoose.startSession();
  if (!session) localSession.startTransaction();

  try {
    const wallet = await getOrCreateWallet(userId, localSession); // Use the session!

    if (wallet.balance < amount) {
      const err = new Error('Insufficient wallet balance');
      err.status = 400;
      throw err;
    }

    // Create debit transaction
    const transaction = await WalletTransaction.create(
      [
        {
          walletId: wallet._id,
          userId,
          type: 'debit',
          amount,
          description: `Payment for order ${orderId}`,
          referenceId: orderId,
          referenceType: 'order_payment',
          status: 'completed',
        },
      ],
      { session: localSession }
    );

    // Update wallet balance
    wallet.balance = Math.max(0, wallet.balance - amount);
    await wallet.save({ session: localSession });

    if (!session) await localSession.commitTransaction();

    return {
      success: true,
      deductedAmount: amount,
      newBalance: wallet.balance,
      transactionId: transaction[0]._id.toString(),
    };
  } catch (error) {
    if (!session) await localSession.abortTransaction();
    throw error;
  } finally {
    if (!session) localSession.endSession();
  }
};
