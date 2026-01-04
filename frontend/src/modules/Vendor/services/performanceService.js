import api from '../../../shared/utils/api';

/**
 * Get vendor performance metrics
 * @param {string} period - Time period (week, month, year)
 * @returns {Promise<Object>} { metrics, earnings }
 */
export const getVendorPerformanceMetrics = async (period = 'month') => {
  const response = await api.get(`/vendor/performance/metrics?period=${period}`);
  return response.data || response;
};

