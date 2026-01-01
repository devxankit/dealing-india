import api from '../utils/api';

/**
 * Get wallet balance and stats
 * @returns {Promise<Object>} Wallet balance and stats
 */
export const getWallet = async () => {
  try {
    const response = await api.get('/user/wallet');
    return response.data;
  } catch (error) {
    console.error('Error fetching wallet:', error);
    throw error;
  }
};

/**
 * Get wallet transactions
 * @param {Object} filters - Filter options
 * @param {Number} filters.page - Page number
 * @param {Number} filters.limit - Items per page
 * @param {String} filters.type - Transaction type ('credit' or 'debit')
 * @returns {Promise<Object>} Transactions list with pagination
 */
export const getWalletTransactions = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.type) params.append('type', filters.type);

    const response = await api.get(`/user/wallet/transactions?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    throw error;
  }
};

/**
 * Add money to wallet
 * @param {Number} amount - Amount to add
 * @param {String} description - Transaction description
 * @returns {Promise<Object>} Created transaction
 */
export const addMoney = async (amount, description) => {
  try {
    const response = await api.post('/user/wallet/add-money', {
      amount,
      description,
    });
    return response.data;
  } catch (error) {
    console.error('Error adding money to wallet:', error);
    throw error;
  }
};

