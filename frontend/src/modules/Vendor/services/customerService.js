import api from '../../../shared/utils/api';

/**
 * Get vendor customers
 * @param {Object} filters - { search, page, limit }
 * @returns {Promise<Object>} { customers, stats, meta }
 */
export const getVendorCustomers = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await api.get(`/vendor/customers?${params.toString()}`);
  return response.data || response;
};

/**
 * Get vendor customer by ID
 * @param {String} customerId - Customer ID
 * @returns {Promise<Object>} { customer, orders }
 */
export const getVendorCustomerById = async (customerId) => {
  const response = await api.get(`/vendor/customers/${customerId}`);
  return response.data || response;
};

