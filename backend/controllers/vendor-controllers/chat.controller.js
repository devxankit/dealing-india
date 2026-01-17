import VendorChatService from '../../services/vendorChat.service.js';
import { uploadToCloudinary } from '../../utils/cloudinary.util.js';

class VendorChatController {
  /**
   * Create or get conversation with another vendor
   * POST /api/vendor/chat/conversations
   */
  async createOrGetConversation(req, res) {
    try {
      const vendor1Id = req.user?.vendorId || req.userDoc?._id;
      if (!vendor1Id) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found'
        });
      }

      const { vendorId: vendor2Id } = req.body;
      if (!vendor2Id) {
        return res.status(400).json({
          success: false,
          message: 'Target vendor ID is required'
        });
      }

      const conversation = await VendorChatService.createOrGetConversation(vendor1Id, vendor2Id);

      res.status(200).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('[VendorChatController] Error creating/getting conversation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create/get conversation'
      });
    }
  }

  /**
   * Get vendor's conversations with other vendors
   * GET /api/vendor/chat/conversations
   */
  async getConversations(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      console.log('[VendorChatController] getConversations for vendor:', vendorId);

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found'
        });
      }

      const conversations = await VendorChatService.getVendorConversations(vendorId);

      res.status(200).json({
        success: true,
        data: conversations,
        count: conversations.length
      });
    } catch (error) {
      console.error('[VendorChatController] Error getting conversations:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get conversations'
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
          message: 'Vendor ID not found'
        });
      }

      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const result = await VendorChatService.getMessages(
        id,
        vendorId,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: {
          messages: result.messages,
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('[VendorChatController] Error getting messages:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get messages'
      });
    }
  }

  /**
   * Send a message to another vendor
   * POST /api/vendor/chat/messages
   */
  async sendMessage(req, res) {
    try {
      const senderId = req.user?.vendorId || req.userDoc?._id;
      if (!senderId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found'
        });
      }

      const { conversationId, receiverId, message } = req.body;

      if (!conversationId || !receiverId || !message) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID, receiver ID, and message are required'
        });
      }

      const newMessage = await VendorChatService.sendMessage(
        conversationId,
        senderId,
        receiverId,
        message,
        req.body.messageType || 'text',
        req.body.metadata || null
      );

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: newMessage
      });
    } catch (error) {
      console.error('[VendorChatController] Error sending message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send message'
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
          message: 'Vendor ID not found'
        });
      }

      const { id } = req.params;

      const updatedMessage = await VendorChatService.markMessageAsRead(id, vendorId);

      res.status(200).json({
        success: true,
        message: 'Message marked as read',
        data: updatedMessage
      });
    } catch (error) {
      console.error('[VendorChatController] Error marking message as read:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark message as read'
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
          message: 'Vendor ID not found'
        });
      }

      const { id } = req.params;

      await VendorChatService.markAllAsRead(id, vendorId);

      res.status(200).json({
        success: true,
        message: 'All messages marked as read'
      });
    } catch (error) {
      console.error('[VendorChatController] Error marking all as read:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark all messages as read'
      });
    }
  }

  /**
   * Upload chat attachment
   * POST /api/vendor/chat/upload
   */
  async uploadAttachment(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      const result = await uploadToCloudinary(req.file.buffer, 'chat_attachments', {
        resource_type: 'auto'
      });

      res.status(200).json({
        success: true,
        data: {
          url: result.secure_url || result.url,
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
          originalName: req.file.originalname
        }
      });
    } catch (error) {
      console.error('[VendorChatController] Error uploading attachment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload attachment'
      });
    }
  }
}

export default new VendorChatController();
