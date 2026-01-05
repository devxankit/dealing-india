import api from '../../../shared/utils/api';

/**
 * Get dashboard summary
 * @param {string} period - week, month, year
 * @returns {Promise<Object>}
 */
export const getDashboardSummary = async (period = 'month') => {
  return await api.get(`/admin/reports/dashboard-summary?period=${period}`);
};

/**
 * Get sales report
 * @param {Object} params - { startDate, endDate }
 * @returns {Promise<Object>}
 */
export const getSalesReport = async (params = {}) => {
  const searchParams = new URLSearchParams(params).toString();
  return await api.get(`/admin/reports/sales?${searchParams}`);
};

/**
 * Get inventory report
 * @returns {Promise<Object>}
 */
export const getInventoryReport = async () => {
  return await api.get(`/admin/reports/inventory`);
};
