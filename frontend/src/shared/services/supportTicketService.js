import api from '../utils/api';

class SupportTicketService {
  /**
   * Create a new support ticket (user)
   */
  async createTicket(ticketData) {
    try {
      const response = await api.post('/user/support-tickets', ticketData);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(filters = {}) {
    try {
      const response = await api.get('/user/support-tickets', { params: filters });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get single ticket (user)
   */
  async getUserTicket(ticketId) {
    try {
      const response = await api.get(`/user/support-tickets/${ticketId}`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Reply to ticket (user)
   */
  async replyToTicket(ticketId, message, attachments = []) {
    try {
      const response = await api.post(`/user/support-tickets/${ticketId}/reply`, {
        message,
        attachments,
      });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Vendor methods
  /**
   * Create a new support ticket (vendor)
   */
  async createVendorTicket(ticketData) {
    try {
      const response = await api.post('/vendor/support-tickets', ticketData);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get vendor's tickets
   */
  async getVendorTickets(filters = {}) {
    try {
      const response = await api.get('/vendor/support-tickets', { params: filters });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get single ticket (vendor)
   */
  async getVendorTicket(ticketId) {
    try {
      const response = await api.get(`/vendor/support-tickets/${ticketId}`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Admin methods
  /**
   * Get all tickets (admin)
   */
  async getAllTickets(filters = {}) {
    try {
      const response = await api.get('/admin/support-tickets', { params: filters });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get single ticket (admin)
   */
  async getAdminTicket(ticketId) {
    try {
      const response = await api.get(`/admin/support-tickets/${ticketId}`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Reply to ticket (admin)
   */
  async adminReplyToTicket(ticketId, response, status) {
    try {
      const responseData = await api.post(`/admin/support-tickets/${ticketId}/respond`, {
        response,
        status,
      });
      return responseData;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update ticket status (admin)
   */
  async updateTicketStatus(ticketId, status, note) {
    try {
      const response = await api.patch(`/admin/support-tickets/${ticketId}/status`, {
        status,
        note,
      });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get ticket statistics (admin)
   */
  async getTicketStats(vendorId = null) {
    try {
      const response = await api.get('/admin/support-tickets/stats', {
        params: vendorId ? { vendorId } : {},
      });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new SupportTicketService();

