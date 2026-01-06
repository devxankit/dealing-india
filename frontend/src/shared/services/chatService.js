import api from '../utils/api';

class ChatService {
  /**
   * Create or get conversation with vendor
   */
  async createOrGetConversation(vendorId) {
    try {
      const response = await api.post('/user/chat/conversations', { vendorId });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get user's conversations
   */
  async getUserConversations() {
    try {
      const response = await api.get('/user/chat/conversations');
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId, page = 1, limit = 50) {
    try {
      const response = await api.get(`/user/chat/conversations/${conversationId}/messages`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(conversationId, receiverId, message) {
    try {
      const response = await api.post('/user/chat/messages', {
        conversationId,
        receiverId,
        message,
      });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId) {
    try {
      const response = await api.put(`/user/chat/messages/${messageId}/read`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Mark all messages in conversation as read
   */
  async markAllAsRead(conversationId) {
    try {
      const response = await api.put(`/user/chat/conversations/${conversationId}/read-all`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get vendor's conversations
   */
  async getVendorConversations() {
    try {
      const response = await api.get('/vendor/chat/conversations');
      return response; // Return the whole response object { success, data, count }
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get messages for a conversation (vendor)
   */
  async getVendorMessages(conversationId, page = 1, limit = 50) {
    try {
      const response = await api.get(`/vendor/chat/conversations/${conversationId}/messages`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Send a message (vendor)
   */
  async sendVendorMessage(conversationId, receiverId, message) {
    try {
      const response = await api.post('/vendor/chat/messages', {
        conversationId,
        receiverId,
        message,
      });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Mark message as read (vendor)
   */
  async markVendorMessageAsRead(messageId) {
    try {
      const response = await api.put(`/vendor/chat/messages/${messageId}/read`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Mark all messages as read (vendor)
   */
  async markVendorAllAsRead(conversationId) {
    try {
      const response = await api.put(`/vendor/chat/conversations/${conversationId}/read-all`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new ChatService();

