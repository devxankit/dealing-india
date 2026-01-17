import api from '../../../shared/utils/api';

/**
 * Get B2B Vendor Dashboard Data
 * @param {string} period - Time period (optional, defaults to 'month')
 * @returns {Promise<Object>} Dashboard data with metrics, recent inquiries, and top products
 */
export const getB2BVendorDashboardData = async (period = 'month') => {
  const response = await api.get('/b2b-vendor/dashboard', {
    params: { period }
  });
  return response;
};
