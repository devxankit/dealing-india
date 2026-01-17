import ChatService from '../../services/chat.service.js';
import mongoose from 'mongoose';
import { uploadToCloudinary } from '../../utils/cloudinary.util.js';

class ChatController {
    /**
     * Create or get conversation with a vendor
     * POST /api/user/chat/conversations
     */
    async createOrGetConversation(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id;
            const { vendorId } = req.body;

            console.log('[ChatController] createOrGetConversation Request:', {
                userId,
                userFromToken: req.user,
                body: req.body
            });

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid user session. Please login again.'
                });
            }

            if (!vendorId) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor ID is required'
                });
            }

            const conversation = await ChatService.createOrGetConversation(userId, vendorId);

            res.status(200).json({
                success: true,
                data: conversation
            });
        } catch (error) {
            console.error('[ChatController] Error creating/getting conversation:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create/get conversation'
            });
        }
    }

    /**
     * Get user's conversations
     * GET /api/user/chat/conversations
     */
    async getConversations(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id;
            const { vendorType } = req.query;
            const conversations = await ChatService.getUserConversations(userId, { vendorType });

            res.status(200).json({
                success: true,
                data: conversations,
                count: conversations.length
            });
        } catch (error) {
            console.error('[ChatController] Error getting conversations:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get conversations'
            });
        }
    }

    /**
     * Get messages for a conversation
     * GET /api/user/chat/conversations/:id/messages
     */
    async getMessages(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id;
            const { id: conversationId } = req.params;
            const { page = 1, limit = 50 } = req.query;

            const result = await ChatService.getMessages(
                conversationId,
                userId,
                'user',
                parseInt(page),
                parseInt(limit)
            );

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('[ChatController] Error getting messages:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get messages'
            });
        }
    }

    /**
     * Send a message to a vendor
     * POST /api/user/chat/messages
     */
    async sendMessage(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id;
            const { conversationId, receiverId, message } = req.body;

            if (!conversationId || !receiverId || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Conversation ID, receiver ID, and message are required'
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

            res.status(201).json({
                success: true,
                message: 'Message sent successfully',
                data: newMessage
            });
        } catch (error) {
            console.error('[ChatController] Error sending message:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to send message'
            });
        }
    }

    /**
     * Mark message as read
     * PUT /api/user/chat/messages/:id/read
     */
    async markMessageAsRead(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id;
            const { id: messageId } = req.params;

            const updatedMessage = await ChatService.markMessageAsRead(messageId, userId, 'user');

            res.status(200).json({
                success: true,
                message: 'Message marked as read',
                data: updatedMessage
            });
        } catch (error) {
            console.error('[ChatController] Error marking message as read:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to mark message as read'
            });
        }
    }

    /**
     * Mark all messages in conversation as read
     * PUT /api/user/chat/conversations/:id/read-all
     */
    async markAllAsRead(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id;
            const { id: conversationId } = req.params;

            await ChatService.markAllAsRead(conversationId, userId, 'user');

            res.status(200).json({
                success: true,
                message: 'All messages marked as read'
            });
        } catch (error) {
            console.error('[ChatController] Error marking all as read:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to mark all messages as read'
            });
        }
    }
    /**
     * Upload chat attachment
     * POST /api/user/chat/upload
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
            console.error('[ChatController] Error uploading attachment:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload attachment'
            });
        }
    }

    /**
     * Check if user has sent inquiry for a product
     * GET /api/user/inquiries/check/:productId
     */
    async checkInquiryForProduct(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id;
            const { productId } = req.params;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID is required'
                });
            }

            // Import Message model
            const Message = (await import('../../models/Message.model.js')).default;

            // Check if user has sent an inquiry message with this productId in metadata
            const inquiryMessage = await Message.findOne({
                senderId: userId,
                senderRole: 'user',
                messageType: { $in: ['inquiry', 'file'] }, // file type can also contain inquiry
                $or: [
                    { 'metadata.productId': productId },
                    { 'metadata.productId': new mongoose.Types.ObjectId(productId) }
                ]
            }).lean();

            const hasInquiry = !!inquiryMessage;

            res.status(200).json({
                success: true,
                data: {
                    hasInquiry,
                    inquiryId: inquiryMessage?._id || null
                }
            });
        } catch (error) {
            console.error('[ChatController] Error checking inquiry:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to check inquiry status'
            });
        }
    }
}

export default new ChatController();
