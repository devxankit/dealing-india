import api from '../../../shared/utils/api';

/**
 * Get all available campaigns for vendor
 * @param {Object} filters - { search, status, type, page, limit }
 * @returns {Promise<Object>} { campaigns, pagination }
 */
export const getVendorCampaigns = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.type && filters.type !== 'all') params.append('type', filters.type);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await api.get(`/vendor/campaigns?${params.toString()}`);
  // API interceptor returns response.data, so response is already { success, data: { campaigns }, pagination }
  return response;
};

/**
 * Get campaign by ID for vendor
 * @param {String} campaignId - Campaign ID
 * @returns {Promise<Object>} Campaign object
 */
export const getVendorCampaignById = async (campaignId) => {
  const response = await api.get(`/vendor/campaigns/${campaignId}`);
  return response.data.campaign;
};

















