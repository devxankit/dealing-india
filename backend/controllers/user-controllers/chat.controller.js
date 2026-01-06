import ChatService from '../../services/chat.service.js';

class UserChatController {
  /**
   * Create or get conversation with vendor
   * POST /api/user/chat/conversations
   */
  async createOrGetConversation(req, res) {
    try {
      const userId = req.user?.userId || req.userDoc?._id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found',
        });
      }

      const { vendorId } = req.body;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required',
        });
      }

      const conversation = await ChatService.createOrGetConversation(userId, vendorId);

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      console.error('Error creating/getting conversation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create/get conversation',
      });
    }
  }

  /**
   * Get user's conversations
   * GET /api/user/chat/conversations
   */
  async getConversations(req, res) {
    try {
      const userId = req.user?.userId || req.userDoc?._id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found',
        });
      }

      const conversations = await ChatService.getUserConversations(userId);

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
   * GET /api/user/chat/conversations/:id/messages
   */
  async getMessages(req, res) {
    try {
      const userId = req.user?.userId || req.userDoc?._id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found',
        });
      }

      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const result = await ChatService.getMessages(
        id,
        userId,
        'user',
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
   * POST /api/user/chat/messages
   */
  async sendMessage(req, res) {
    try {
      const userId = req.user?.userId || req.userDoc?._id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found',
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
        userId,
        'user',
        receiverId,
        'vendor',
        message
      );

      // Get Socket.IO instance from app
      const io = req.app.get('io');
      if (io) {
        // Emit to conversation room
        io.to(`chat_${conversationId}`).emit('receive_message', newMessage);
        // Emit to receiver's personal room (vendor)
        io.to(`user_${receiverId}`).emit('new_chat_message', newMessage);
        // Also emit to vendor notification room
        io.to(`notifications_${receiverId}_vendor`).emit('new_notification', {
          type: 'chat_message',
          title: 'New message',
          message: `You have a new message from ${req.userDoc?.name || 'User'}`,
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
   * PUT /api/user/chat/messages/:id/read
   */
  async markMessageAsRead(req, res) {
    try {
      const userId = req.user?.userId || req.userDoc?._id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found',
        });
      }

      const { id } = req.params;

      const updatedMessage = await ChatService.markMessageAsRead(id, userId, 'user');

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
   * PUT /api/user/chat/conversations/:id/read-all
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user?.userId || req.userDoc?._id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found',
        });
      }

      const { id } = req.params;

      await ChatService.markAllAsRead(id, userId, 'user');

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

export default new UserChatController();

