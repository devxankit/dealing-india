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

      if (error.response?.status === 403) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            // Decode token to check role
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const decoded = JSON.parse(jsonPayload);

            if (decoded.role === 'vendor') {
              console.error('[ChatService] Error: Vendor token used for User Chat. Clearing invalid session.');
              // Clear the invalid user token since it's actually a vendor token
              localStorage.removeItem('token');

              // Also clear other potential conflicting tokens just to be safe
              // localStorage.removeItem('b2b-vendor-token'); // Optional: keep this if user wants to stay logged in as vendor elsewhere

              // Redirect to login with error
              window.location.href = '/b2b/login?error=invalid_role_vendor';
              return;
            }
          }
        } catch (e) {
          console.error('[ChatService] Error checking token:', e);
        }
      }
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
  async sendMessage(conversationId, receiverId, message, messageType = 'text', metadata = null) {
    try {
      const response = await api.post('/user/chat/messages', {
        conversationId,
        receiverId,
        message,
        messageType,
        metadata
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
   * Create or get conversation with another vendor
   */
  async createVendorConversation(vendorId) {
    try {
      const response = await api.post('/vendor/chat/conversations', { vendorId });
      return response;
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
  async sendVendorMessage(conversationId, receiverId, message, messageType = 'text', metadata = null) {
    try {
      const response = await api.post('/vendor/chat/messages', {
        conversationId,
        receiverId,
        message,
        messageType,
        metadata
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

