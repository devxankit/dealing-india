import api from '../../../shared/utils/api';

/**
 * Get vendor performance metrics
 * @returns {Promise<Object>} { metrics, earnings }
 */
export const getVendorPerformanceMetrics = async () => {
  const response = await api.get('/vendor/performance/metrics');
  return response.data || response;
};

