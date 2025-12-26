import api from '../../../shared/utils/api';

/**
 * Get all reels for vendor
 * @param {Object} filters - { search, status, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { reels, pagination }
 */
export const getVendorReels = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await api.get(`/vendor/reels?${params.toString()}`);
  // API interceptor returns response.data, so response is already { success, data: { reels }, pagination }
  // Return response directly (it already has data and pagination)
  return response;
};

/**
 * Get reel by ID
 * @param {String} reelId - Reel ID
 * @returns {Promise<Object>} Reel object
 */
export const getVendorReelById = async (reelId) => {
  const response = await api.get(`/vendor/reels/${reelId}`);
  // API interceptor returns response.data, so response is already { success, data: { reel } }
  return response.data?.reel || response.reel;
};

/**
 * Create new reel
 * @param {Object} reelData - Reel data
 * @returns {Promise<Object>} Created reel
 */
export const createVendorReel = async (reelData) => {
  const response = await api.post('/vendor/reels', reelData);
  return response.data.reel;
};

/**
 * Update reel
 * @param {String} reelId - Reel ID
 * @param {Object} reelData - Update data
 * @returns {Promise<Object>} Updated reel
 */
export const updateVendorReel = async (reelId, reelData) => {
  const response = await api.put(`/vendor/reels/${reelId}`, reelData);
  return response.data.reel;
};

/**
 * Delete reel
 * @param {String} reelId - Reel ID
 * @returns {Promise<void>}
 */
export const deleteVendorReel = async (reelId) => {
  await api.delete(`/vendor/reels/${reelId}`);
};

/**
 * Update reel status
 * @param {String} reelId - Reel ID
 * @param {String} status - New status
 * @returns {Promise<Object>} Updated reel
 */
export const updateVendorReelStatus = async (reelId, status) => {
  const response = await api.patch(`/vendor/reels/${reelId}/status`, { status });
  return response.data.reel;
};

