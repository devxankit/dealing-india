import api from '../../../shared/utils/api';

/**
 * Get vendor inventory report
 * @returns {Promise<Object>} { inventory, stats }
 */
export const getVendorInventoryReport = async () => {
  const response = await api.get('/vendor/inventory/reports');
  return response.data || response;
};

