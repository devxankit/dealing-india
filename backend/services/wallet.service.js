import Wallet from '../models/Wallet.model.js';
import WalletTransaction from '../models/WalletTransaction.model.js';
import mongoose from 'mongoose';

/**
 * Get or create wallet for user
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Wallet object
 */
const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0 });
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
 * @returns {Promise<Object>} Created transaction
 */
export const createWalletTransaction = async (
  userId,
  type,
  amount,
  description,
  referenceId = null,
  referenceType = 'order'
) => {
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
          type,
          amount,
          description,
          referenceId,
          referenceType,
          status: 'completed',
        },
      ],
      { session }
    );

    // Update wallet balance
    if (type === 'credit') {
      wallet.balance += amount;
    } else if (type === 'debit') {
      wallet.balance = Math.max(0, wallet.balance - amount);
    }
    await wallet.save({ session });

    await session.commitTransaction();
    
    return transaction[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
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

