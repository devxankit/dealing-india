import api from '../../../shared/utils/api';

/**
 * Get all FAQs for vendor's products
 * @param {Object} filters - { productId, status, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { faqs, pagination }
 */
export const getVendorFAQs = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.productId) params.append('productId', filters.productId);
  if (filters.status) params.append('status', filters.status);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await api.get(`/vendor/faqs?${params.toString()}`);
  // API interceptor returns response.data, so response is already { success, data: { faqs, pagination } }
  // Return the data object directly
  return response.data || response;
};

/**
 * Get FAQ by ID
 * @param {String} faqId - FAQ ID
 * @returns {Promise<Object>} FAQ object
 */
export const getVendorFAQById = async (faqId) => {
  const response = await api.get(`/vendor/faqs/${faqId}`);
  return response.data.faq;
};

/**
 * Create new FAQ
 * @param {Object} faqData - { productId, question, answer, order, status }
 * @returns {Promise<Object>} Created FAQ
 */
export const createVendorFAQ = async (faqData) => {
  const response = await api.post('/vendor/faqs', faqData);
  return response.data.faq;
};

/**
 * Update FAQ
 * @param {String} faqId - FAQ ID
 * @param {Object} faqData - Update data
 * @returns {Promise<Object>} Updated FAQ
 */
export const updateVendorFAQ = async (faqId, faqData) => {
  const response = await api.put(`/vendor/faqs/${faqId}`, faqData);
  return response.data.faq;
};

/**
 * Delete FAQ
 * @param {String} faqId - FAQ ID
 * @returns {Promise<void>}
 */
export const deleteVendorFAQ = async (faqId) => {
  await api.delete(`/vendor/faqs/${faqId}`);
};

