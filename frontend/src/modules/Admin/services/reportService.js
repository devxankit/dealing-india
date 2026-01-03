import api from '../../../shared/utils/api';

/**
 * Get dashboard summary
 * @param {string} period - week, month, year
 * @returns {Promise<Object>}
 */
export const getDashboardSummary = async (period = 'month') => {
  const response = await api.get(`/admin/reports/dashboard-summary?period=${period}`);
  return response.data;
};

/**
 * Get sales report
 * @param {Object} params - { startDate, endDate }
 * @returns {Promise<Object>}
 */
export const getSalesReport = async (params = {}) => {
  const searchParams = new URLSearchParams(params).toString();
  const response = await api.get(`/admin/reports/sales?${searchParams}`);
  return response.data;
};

/**
 * Get inventory report
 * @returns {Promise<Object>}
 */
export const getInventoryReport = async () => {
  const response = await api.get(`/admin/reports/inventory`);
  return response.data;
};
