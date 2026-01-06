import Chat from '../models/Chat.model.js';
import Message from '../models/Message.model.js';
import mongoose from 'mongoose';

class ChatService {
  /**
   * Create or get conversation between user and vendor
   * @param {String} userId - User ID
   * @param {String} vendorId - Vendor ID
   * @returns {Promise<Object>} Conversation object
   */
  async createOrGetConversation(userId, vendorId) {
    try {
      // Check if conversation already exists
      const existingChat = await Chat.findOne({
        $and: [
          { 'participants.userId': new mongoose.Types.ObjectId(userId), 'participants.role': 'user' },
          { 'participants.userId': new mongoose.Types.ObjectId(vendorId), 'participants.role': 'vendor' },
        ],
      })
        .populate('participants.userId', 'name email storeName')
        .populate('lastMessage')
        .lean();

      if (existingChat) {
        return existingChat;
      }

      // Create new conversation
      const newChat = await Chat.create({
        participants: [
          {
            userId: new mongoose.Types.ObjectId(userId),
            role: 'user',
            roleModel: 'User',
          },
          {
            userId: new mongoose.Types.ObjectId(vendorId),
            role: 'vendor',
            roleModel: 'Vendor',
          },
        ],
        unreadCount: new Map([
          [`user_${userId}`, 0],
          [`vendor_${vendorId}`, 0],
        ]),
      });

      return await Chat.findById(newChat._id)
        .populate('participants.userId', 'name email storeName')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's conversations
   * @param {String} userId - User ID
   * @returns {Promise<Array>} Array of conversations
   */
  async getUserConversations(userId) {
    try {
      const conversations = await Chat.find({
        'participants.userId': new mongoose.Types.ObjectId(userId),
        'participants.role': 'user',
      })
        .populate('participants.userId', 'name email storeName storeLogo')
        .populate('lastMessage')
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean();

      // Transform conversations to include participant info
      return conversations.map((conv) => {
        const otherParticipant = conv.participants.find(
          (p) => p.userId._id.toString() !== userId.toString()
        );
        const unreadCount = conv.unreadCount?.get(`user_${userId}`) || 0;

        return {
          ...conv,
          otherParticipant,
          unreadCount,
        };
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vendor's conversations
   * @param {String} vendorId - Vendor ID
   * @returns {Promise<Array>} Array of conversations
   */
  async getVendorConversations(vendorId) {
    try {
      const conversations = await Chat.find({
        'participants.userId': new mongoose.Types.ObjectId(vendorId),
        'participants.role': 'vendor',
      })
        .populate('participants.userId', 'name email')
        .populate('lastMessage')
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean();

      // Transform conversations to include participant info
      return conversations.map((conv) => {
        const otherParticipant = conv.participants.find(
          (p) => p.userId._id.toString() !== vendorId.toString()
        );
        const unreadCount = conv.unreadCount?.get(`vendor_${vendorId}`) || 0;

        return {
          ...conv,
          otherParticipant,
          unreadCount,
        };
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get messages for a conversation with pagination
   * @param {String} conversationId - Conversation ID
   * @param {String} userId - User ID (for permission check)
   * @param {String} userRole - User role (user/vendor)
   * @param {Number} page - Page number
   * @param {Number} limit - Messages per page
   * @returns {Promise<Object>} Messages and pagination info
   */
  async getMessages(conversationId, userId, userRole, page = 1, limit = 50) {
    try {
      // Verify user has access to this conversation
      const conversation = await Chat.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const isParticipant = conversation.participants.some(
        (p) => p.userId.toString() === userId.toString() && p.role === userRole
      );

      if (!isParticipant) {
        throw new Error('Access denied');
      }

      const skip = (page - 1) * limit;

      const messages = await Message.find({ conversationId })
        .populate('senderId', 'name email storeName')
        .populate('receiverId', 'name email storeName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalMessages = await Message.countDocuments({ conversationId });

      return {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          limit,
          total: totalMessages,
          pages: Math.ceil(totalMessages / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send a message
   * @param {String} conversationId - Conversation ID
   * @param {String} senderId - Sender ID
   * @param {String} senderRole - Sender role (user/vendor)
   * @param {String} receiverId - Receiver ID
   * @param {String} receiverRole - Receiver role (user/vendor)
   * @param {String} message - Message text
   * @returns {Promise<Object>} Created message
   */
  async sendMessage(conversationId, senderId, senderRole, receiverId, receiverRole, message) {
    try {
      // Verify conversation exists and user is participant
      const conversation = await Chat.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const isParticipant = conversation.participants.some(
        (p) => p.userId.toString() === senderId.toString() && p.role === senderRole
      );

      if (!isParticipant) {
        throw new Error('Access denied');
      }

      // Create message
      const senderRoleModel = senderRole === 'user' ? 'User' : 'Vendor';
      const receiverRoleModel = receiverRole === 'user' ? 'User' : 'Vendor';

      const newMessage = await Message.create({
        conversationId,
        senderId: new mongoose.Types.ObjectId(senderId),
        senderRole,
        senderRoleModel,
        receiverId: new mongoose.Types.ObjectId(receiverId),
        receiverRole,
        receiverRoleModel,
        message,
        readStatus: false,
      });

      // Update conversation last message and timestamp
      const unreadKey = `${receiverRole}_${receiverId}`;
      const currentUnread = conversation.unreadCount?.get(unreadKey) || 0;
      conversation.unreadCount.set(unreadKey, currentUnread + 1);
      conversation.lastMessage = newMessage._id;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      // Create notification for receiver
      try {
        await notificationService.createNotification({
          recipientId: receiverId,
          recipientType: receiverRole,
          type: 'chat_message',
          title: `New message from ${senderRole === 'user' ? 'User' : 'Vendor'}`,
          message: message.substring(0, 100),
          actionUrl: senderRole === 'user' ? `/vendor/chat` : `/app/chat/${senderId}`,
          metadata: {
            conversationId: conversationId.toString(),
            messageId: newMessage._id.toString(),
            senderId: senderId.toString(),
            senderRole,
          },
        });
      } catch (notifError) {
        // Don't fail message send if notification fails
        console.error('Failed to create chat notification:', notifError);
      }

      return await Message.findById(newMessage._id)
        .populate('senderId', 'name email storeName')
        .populate('receiverId', 'name email storeName')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark message as read
   * @param {String} messageId - Message ID
   * @param {String} userId - User ID
   * @param {String} userRole - User role
   * @returns {Promise<Object>} Updated message
   */
  async markMessageAsRead(messageId, userId, userRole) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Verify user is the receiver
      if (
        message.receiverId.toString() !== userId.toString() ||
        message.receiverRole !== userRole
      ) {
        throw new Error('Access denied');
      }

      if (!message.readStatus) {
        message.readStatus = true;
        message.readAt = new Date();
        await message.save();

        // Update unread count in conversation
        const conversation = await Chat.findById(message.conversationId);
        if (conversation) {
          const unreadKey = `${userRole}_${userId}`;
          const currentUnread = conversation.unreadCount?.get(unreadKey) || 0;
          if (currentUnread > 0) {
            conversation.unreadCount.set(unreadKey, currentUnread - 1);
            await conversation.save();
          }
        }
      }

      return await Message.findById(messageId)
        .populate('senderId', 'name email storeName')
        .populate('receiverId', 'name email storeName')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark all messages in conversation as read
   * @param {String} conversationId - Conversation ID
   * @param {String} userId - User ID
   * @param {String} userRole - User role
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(conversationId, userId, userRole) {
    try {
      // Verify user has access to conversation
      const conversation = await Chat.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const isParticipant = conversation.participants.some(
        (p) => p.userId.toString() === userId.toString() && p.role === userRole
      );

      if (!isParticipant) {
        throw new Error('Access denied');
      }

      // Mark all unread messages as read
      const result = await Message.updateMany(
        {
          conversationId,
          receiverId: new mongoose.Types.ObjectId(userId),
          receiverRole: userRole,
          readStatus: false,
        },
        {
          $set: {
            readStatus: true,
            readAt: new Date(),
          },
        }
      );

      // Reset unread count
      const unreadKey = `${userRole}_${userId}`;
      conversation.unreadCount.set(unreadKey, 0);
      await conversation.save();

      return result;
    } catch (error) {
      throw error;
    }
  }
}

export default new ChatService();

