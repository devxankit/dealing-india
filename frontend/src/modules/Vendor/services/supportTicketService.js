import api from '../../../shared/utils/api';

/**
 * Get all support tickets for vendor
 * @param {Object} filters - { search, status, priority, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { tickets, pagination }
 */
export const getVendorTickets = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await api.get(`/vendor/support/tickets?${params.toString()}`);
  // API interceptor returns response.data, so response is already { success, data: { tickets }, pagination }
  return response;
};

/**
 * Get ticket by ID with messages
 * @param {String} ticketId - Ticket ID
 * @returns {Promise<Object>} Ticket object with messages
 */
export const getVendorTicket = async (ticketId) => {
  const response = await api.get(`/vendor/support/tickets/${ticketId}`);
  // API interceptor returns response.data, so response is already { success, data: { ticket } }
  return response;
};

/**
 * Create new support ticket
 * @param {Object} ticketData - { subject, type, priority, description }
 * @returns {Promise<Object>} Created ticket
 */
export const createVendorTicket = async (ticketData) => {
  const response = await api.post('/vendor/support/tickets', ticketData);
  // API interceptor returns response.data, so response is already { success, data: { ticket } }
  return response;
};

/**
 * Send message to ticket (REST fallback)
 * @param {String} ticketId - Ticket ID
 * @param {String} message - Message text
 * @returns {Promise<Object>} Created message
 */
export const sendTicketMessage = async (ticketId, message) => {
  const response = await api.post(`/vendor/support/tickets/${ticketId}/messages`, { message });
  // API interceptor returns response.data, so response is already { success, data: { message } }
  return response;
};

/**
 * Update ticket status
 * @param {String} ticketId - Ticket ID
 * @param {String} status - New status
 * @returns {Promise<Object>} Updated ticket
 */
export const updateTicketStatus = async (ticketId, status) => {
  const response = await api.put(`/vendor/support/tickets/${ticketId}/status`, { status });
  // API interceptor returns response.data, so response is already { success, data: { ticket } }
  return response;
};

/**
 * Get all active ticket types for vendor ticket creation
 * @param {Object} filters - { status: 'active' } (optional)
 * @returns {Promise<Object>} { ticketTypes }
 */
export const getTicketTypes = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);

  const queryString = params.toString();
  const url = `/vendor/support/ticket-types${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  // API interceptor returns response.data, so response is already { success, data: { ticketTypes } }
  return response;
};

