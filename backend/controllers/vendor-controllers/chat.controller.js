import ChatService from '../../services/chat.service.js';

class VendorChatController {
  /**
   * Get vendor's conversations with users
   * GET /api/vendor/chat/conversations
   */
  async getConversations(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found',
        });
      }

      const conversations = await ChatService.getVendorConversations(vendorId);

      res.status(200).json({
        success: true,
        data: conversations,
        count: conversations.length,
      });
    } catch (error) {
      console.error('Error getting conversations:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get conversations',
      });
    }
  }

  /**
   * Get messages for a conversation
   * GET /api/vendor/chat/conversations/:id/messages
   */
  async getMessages(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found',
        });
      }

      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const result = await ChatService.getMessages(
        id,
        vendorId,
        'vendor',
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result.messages,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get messages',
      });
    }
  }

  /**
   * Send a message
   * POST /api/vendor/chat/messages
   */
  async sendMessage(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found',
        });
      }

      const { conversationId, receiverId, message } = req.body;

      if (!conversationId || !receiverId || !message) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID, receiver ID, and message are required',
        });
      }

      const newMessage = await ChatService.sendMessage(
        conversationId,
        vendorId,
        'vendor',
        receiverId,
        'user',
        message
      );

      // Get Socket.IO instance from app
      if (io) {
        // Emit to conversation room
        io.to(`chat_${conversationId}`).emit('receive_message', newMessage);
        // Emit to receiver's personal room (user)
        io.to(`user_${receiverId}`).emit('new_chat_message', newMessage);
        // Also emit to user notification room
        io.to(`notifications_${receiverId}_user`).emit('new_notification', {
          type: 'chat_message',
          title: 'New message',
          message: `You have a new message from ${req.userDoc?.storeName || req.userDoc?.name || 'Vendor'}`,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: newMessage,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send message',
      });
    }
  }

  /**
   * Mark message as read
   * PUT /api/vendor/chat/messages/:id/read
   */
  async markMessageAsRead(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found',
        });
      }

      const { id } = req.params;

      const updatedMessage = await ChatService.markMessageAsRead(id, vendorId, 'vendor');

      res.status(200).json({
        success: true,
        message: 'Message marked as read',
        data: updatedMessage,
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark message as read',
      });
    }
  }

  /**
   * Mark all messages in conversation as read
   * PUT /api/vendor/chat/conversations/:id/read-all
   */
  async markAllAsRead(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found',
        });
      }

      const { id } = req.params;

      await ChatService.markAllAsRead(id, vendorId, 'vendor');

      res.status(200).json({
        success: true,
        message: 'All messages marked as read',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark all messages as read',
      });
    }
  }
}

export default new VendorChatController();

