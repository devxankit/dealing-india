import api from '../utils/api';

/**
 * Get all addresses for authenticated user
 * @returns {Promise<Object>} Addresses list
 */
export const getAddresses = async () => {
  try {
    const response = await api.get('/user/addresses');
    return response.data.data?.addresses || response.data.addresses || [];
  } catch (error) {
    console.error('Error fetching addresses:', error);
    throw error;
  }
};

/**
 * Get address by ID
 * @param {String} addressId - Address ID
 * @returns {Promise<Object>} Address details
 */
export const getAddressById = async (addressId) => {
  try {
    const response = await api.get(`/user/addresses/${addressId}`);
    return response.data.data?.address || response.data.address;
  } catch (error) {
    console.error('Error fetching address:', error);
    throw error;
  }
};

/**
 * Create a new address
 * @param {Object} addressData - Address data
 * @returns {Promise<Object>} Created address
 */
export const createAddress = async (addressData) => {
  try {
    const response = await api.post('/user/addresses', addressData);
    return response.data.data?.address || response.data.address || response.data;
  } catch (error) {
    console.error('Error creating address:', error);
    throw error;
  }
};

/**
 * Update an address
 * @param {String} addressId - Address ID
 * @param {Object} addressData - Updated address data
 * @returns {Promise<Object>} Updated address
 */
export const updateAddress = async (addressId, addressData) => {
  try {
    const response = await api.put(`/user/addresses/${addressId}`, addressData);
    return response.data.data?.address || response.data.address || response.data;
  } catch (error) {
    console.error('Error updating address:', error);
    throw error;
  }
};

/**
 * Delete an address
 * @param {String} addressId - Address ID
 * @returns {Promise<Object>} Success response
 */
export const deleteAddress = async (addressId) => {
  try {
    const response = await api.delete(`/user/addresses/${addressId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
};

/**
 * Set address as default
 * @param {String} addressId - Address ID
 * @returns {Promise<Object>} Updated address
 */
export const setDefaultAddress = async (addressId) => {
  try {
    const response = await api.put(`/user/addresses/${addressId}/default`);
    return response.data.data?.address || response.data.address || response.data;
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
};

