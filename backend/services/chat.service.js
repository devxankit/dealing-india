import Chat from '../models/Chat.model.js';
import Message from '../models/Message.model.js';
import mongoose from 'mongoose';
import notificationService from './notification.service.js';
import { getSocket } from '../config/socket.io.js';

class ChatService {
  /**
   * Create or get conversation between user and vendor
   * @param {String} userId - User ID
   * @param {String} vendorId - Vendor ID
   * @returns {Promise<Object>} Conversation object
   */
  async createOrGetConversation(userId, vendorId) {
    console.log('ChatService.createOrGetConversation called with:', { userId, vendorId });
    try {
      // Validate IDs
      // Validate IDs
      const isUserValid = mongoose.Types.ObjectId.isValid(userId);
      const isVendorValid = mongoose.Types.ObjectId.isValid(vendorId);

      if (!isUserValid || !isVendorValid) {
        console.error('Invalid ID format in createOrGetConversation:', {
          userId,
          vendorId,
          isUserValid,
          isVendorValid,
          userIdType: typeof userId,
          vendorIdType: typeof vendorId
        });
        throw new Error(`Invalid user or vendor ID: User(${isUserValid ? 'valid' : 'invalid'}), Vendor(${isVendorValid ? 'valid' : 'invalid'})`);
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

      if (userObjectId.equals(vendorObjectId)) {
        throw new Error('Cannot create a chat with yourself');
      }

      // Check if conversation already exists using a more robust query
      // Handling both ObjectId and String formats just in case
      const existingChat = await Chat.findOne({
        $and: [
          {
            participants: {
              $elemMatch: {
                userId: { $in: [userObjectId, userId.toString()] },
                role: 'user'
              }
            }
          },
          {
            participants: {
              $elemMatch: {
                userId: { $in: [vendorObjectId, vendorId.toString()] },
                role: 'vendor'
              }
            }
          }
        ]
      })
        .populate('participants.userId', 'name email storeName')
        .populate('lastMessage')
        .lean();

      if (existingChat) {
        console.log('Existing conversation found:', existingChat._id);
        return existingChat;
      }

      console.log('Creating new conversation for user:', userId, 'and vendor:', vendorId);
      // Create new conversation
      const newChat = await Chat.create({
        participants: [
          {
            userId: userObjectId,
            role: 'user',
            roleModel: 'User',
          },
          {
            userId: vendorObjectId,
            role: 'vendor',
            roleModel: 'Vendor',
          },
        ],
        unreadCount: new Map([
          [`user_${userId.toString()}`, 0],
          [`vendor_${vendorId.toString()}`, 0],
        ]),
      });

      console.log('New conversation created:', newChat._id);
      return await Chat.findById(newChat._id)
        .populate('participants.userId', 'name email storeName')
        .lean();
    } catch (error) {
      console.error('Error in createOrGetConversation:', error);
      throw error;
    }
  }

  /**
   * Get user's conversations
   * @param {String} userId - User ID
   * @param {Object} filters - Optional filters (e.g., { vendorType: 'b2b' })
   * @returns {Promise<Array>} Array of conversations
   */
  async getUserConversations(userId, filters = {}) {
    try {
      console.log('--- ChatService.getUserConversations Debug ---');
      console.log('Original userId:', userId, 'Filters:', filters);

      const userObjectId = mongoose.isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(userId)
        : null;

      const query = {
        participants: {
          $elemMatch: {
            userId: userObjectId ? { $in: [userObjectId, userId.toString()] } : userId.toString(),
            role: 'user'
          }
        }
      };

      const conversations = await Chat.find(query)
        .populate({
          path: 'participants.userId',
          select: 'name email storeName storeLogo vendorType'
        })
        .populate('lastMessage')
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean();

      console.log(`Found ${conversations.length} raw conversations for user ${userId}`);

      // Deduplicate conversations by other participant ID and apply filters
      const filtered = [];
      const seenParticipants = new Set();

      for (const conv of conversations) {
        const otherParticipant = conv.participants.find(
          (p) => p.userId && (p.userId._id || p.userId).toString() !== userId.toString()
        );

        if (otherParticipant) {
          const otherId = (otherParticipant.userId._id || otherParticipant.userId).toString();

          // Apply vendorType filter if specified
          if (filters.vendorType && otherParticipant.role === 'vendor') {
            const vendorType = otherParticipant.userId?.vendorType;
            if (vendorType !== filters.vendorType) {
              continue; // Skip this conversation as it doesn't match the requested vendor type
            }
          }

          if (!seenParticipants.has(otherId)) {
            seenParticipants.add(otherId);

            // Transform and add
            let unreadCount = 0;
            if (conv.unreadCount) {
              const key = `user_${userId}`;
              if (conv.unreadCount instanceof Map) {
                unreadCount = conv.unreadCount.get(key) || 0;
              } else {
                unreadCount = conv.unreadCount[key] || 0;
              }
            }

            filtered.push({
              ...conv,
              otherParticipant,
              unreadCount,
            });
          }
        }
      }

      return filtered;
    } catch (error) {
      console.error('Error in getUserConversations:', error);
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
      console.log('--- ChatService.getVendorConversations Debug ---');
      console.log('Original vendorId:', vendorId);

      const vendorObjectId = mongoose.isValidObjectId(vendorId)
        ? new mongoose.Types.ObjectId(vendorId)
        : null;

      console.log('Converted vendorObjectId:', vendorObjectId);

      const query = {
        participants: {
          $elemMatch: {
            userId: vendorObjectId ? { $in: [vendorObjectId, vendorId.toString()] } : vendorId.toString(),
            role: 'vendor'
          }
        }
      };

      console.log('Query:', JSON.stringify(query, null, 2));

      const conversations = await Chat.find(query)
        .populate({
          path: 'participants.userId',
          select: 'name email storeName storeLogo'
        })
        .populate('lastMessage')
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean();

      console.log(`Found ${conversations.length} raw conversations for vendor ${vendorId}`);

      // Deduplicate conversations by other participant ID
      const deduplicated = [];
      const seenParticipants = new Set();

      for (const conv of conversations) {
        const otherParticipant = conv.participants.find(
          (p) => p.userId && (p.userId._id || p.userId).toString() !== vendorId.toString()
        );

        if (otherParticipant) {
          const otherId = (otherParticipant.userId._id || otherParticipant.userId).toString();
          if (!seenParticipants.has(otherId)) {
            seenParticipants.add(otherId);

            // Transform and add
            let unreadCount = 0;
            if (conv.unreadCount) {
              const key = `vendor_${vendorId}`;
              if (conv.unreadCount instanceof Map) {
                unreadCount = conv.unreadCount.get(key) || 0;
              } else {
                unreadCount = conv.unreadCount[key] || 0;
              }
            }

            deduplicated.push({
              ...conv,
              otherParticipant,
              unreadCount,
            });
          }
        }
      }

      return deduplicated;
    } catch (error) {
      console.error('Error in getVendorConversations:', error);
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
        (p) => {
          const pUserId = (p.userId?._id || p.userId).toString();
          return pUserId === userId.toString() && p.role === userRole;
        }
      );

      if (!isParticipant) {
        console.error('Access denied to conversation:', conversationId, 'for user:', userId, 'role:', userRole);
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

  async sendMessage(conversationId, senderId, senderRole, receiverIdParam, receiverRoleParam, message, messageType = 'text', metadata = null) {
    console.log('ChatService.sendMessage called with:', { conversationId, senderId, senderRole, messageType });
    try {
      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(conversationId)) {
        console.error('Invalid sender or conversation ID format');
        throw new Error('Invalid sender or conversation ID');
      }

      // Verify conversation exists
      const conversation = await Chat.findById(conversationId);
      if (!conversation) {
        console.error('Conversation not found:', conversationId);
        throw new Error('Conversation not found');
      }

      console.log('Conversation found:', conversation._id);

      // Identify sender and receiver from participants to ensure security
      // SECURE: We strictly fetch participants from the database conversation record
      const senderParticipant = conversation.participants.find(p =>
        (p.userId._id || p.userId).toString() === senderId.toString() && p.role === senderRole
      );

      if (!senderParticipant) {
        console.error('Access denied. Sender not a participant of this conversation.', {
          senderId,
          senderRole,
          participants: conversation.participants
        });
        throw new Error('Access denied: You are not authorized to send messages in this chat');
      }

      // Automatically find the "other" participant as the receiver
      const receiverParticipant = conversation.participants.find(p => {
        const pId = (p.userId?._id || p.userId).toString();
        // The other participant is anyone who is NOT the sender (considering both ID and Role)
        return pId !== senderId.toString() || p.role !== senderRole;
      });

      if (!receiverParticipant) {
        console.error('Receiver not found for conversation:', conversationId);
        throw new Error('This conversation only has one participant. Cannot send message.');
      }

      const receiverId = receiverParticipant.userId._id || receiverParticipant.userId;
      const receiverRole = receiverParticipant.role;
      const receiverRoleModel = receiverParticipant.roleModel;
      const senderRoleModel = senderParticipant.roleModel;

      console.log('Receiver identified:', { receiverId, receiverRole });

      // Create message document
      console.log('Creating message document...');
      const newMessage = await Message.create({
        conversationId,
        senderId: new mongoose.Types.ObjectId(senderId),
        senderRole,
        senderRoleModel,
        receiverId: new mongoose.Types.ObjectId(receiverId),
        receiverRole,
        receiverRoleModel,
        message: message || '', // Allow empty message for specific types if metadata exists
        messageType,
        metadata,
        readStatus: false,
      });
      console.log('Message created successfully:', newMessage._id);

      // Update conversation last message and timestamp
      if (!conversation.unreadCount) {
        conversation.unreadCount = new Map();
      } else if (!(conversation.unreadCount instanceof Map)) {
        try {
          const plainObj = conversation.unreadCount.toObject ? conversation.unreadCount.toObject() : conversation.unreadCount;
          conversation.unreadCount = new Map(Object.entries(plainObj));
        } catch (e) {
          console.error('Failed to convert unreadCount to Map:', e);
          conversation.unreadCount = new Map();
        }
      }

      const unreadKey = `${receiverRole}_${receiverId.toString()}`;
      const currentUnread = conversation.unreadCount.get(unreadKey) || 0;
      conversation.unreadCount.set(unreadKey, currentUnread + 1);

      conversation.lastMessage = newMessage._id;
      conversation.lastMessageAt = new Date();

      console.log('Saving conversation update with unread key:', unreadKey);
      await conversation.save();

      // Create notification for receiver if it's an inquiry related message
      try {
        if (messageType === 'inquiry' || (metadata && metadata.productId)) {
          // Determine actionUrl based on receiver role and type
          let actionUrl;
          if (receiverRole === 'user') {
            actionUrl = `/b2b/chat/${conversationId}`;
          } else if (receiverRole === 'vendor') {
            // Check if vendor is B2B vendor
            const Vendor = (await import('../models/Vendor.model.js')).default;
            const receiverVendor = await Vendor.findById(receiverId).select('vendorType').lean();
            if (receiverVendor && receiverVendor.vendorType === 'b2b') {
              actionUrl = `/b2b-vendor/messages`;
            } else {
              actionUrl = `/vendor/chat/${conversationId}`;
            }
          } else {
            actionUrl = `/vendor/chat/${conversationId}`;
          }

          await notificationService.createNotification({
            recipientId: receiverId,
            recipientType: receiverRole,
            type: 'inquiry',
            title: senderRole === 'user' ? 'New Inquiry Received' : 'Inquiry Response Received',
            message: message || (messageType === 'inquiry' ? 'You received a new inquiry' : 'You received a new inquiry update'),
            actionUrl,
            metadata: {
              conversationId,
              messageId: newMessage._id,
              ...metadata
            }
          }, io);
        }
      } catch (notifError) {
        console.error('Failed to create notification for message:', notifError);
      }

      const populatedMessage = await Message.findById(newMessage._id)
        .populate('senderId', 'name email storeName')
        .populate('receiverId', 'name email storeName')
        .lean();

      // Socket Emit restricted to participants
      const io = getSocket();
      if (io) {
        // Emit ONLY to the specific chat room
        const chatRoom = `chat_${conversationId}`;
        console.log(`Socket: Emitting to chat room: ${chatRoom}`);
        io.to(chatRoom).emit('receive_message', populatedMessage);

        // Emit to receiver's personal room for list updates
        const receiverRoom = `${receiverRole}_${receiverId}`;
        console.log(`Socket: Emitting to receiver room: ${receiverRoom}`);
        io.to(receiverRoom).emit('new_chat_message', populatedMessage);
      }

      return populatedMessage;
    } catch (error) {
      console.error('ChatService.sendMessage Error:', error);
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

      // Emit to socket room for real-time UI update
      const io = getSocket();
      if (io) {
        io.to(`chat_${message.conversationId}`).emit('message_read', {
          messageId: message._id,
          conversationId: message.conversationId
        });
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
  async markAllAsRead(conversationId, userId, role) {
    try {
      // Verify user has access to conversation
      const conversation = await Chat.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const isParticipant = conversation.participants.some(
        (p) => p.userId.toString() === userId.toString() && p.role === role
      );

      if (!isParticipant) {
        throw new Error('Access denied');
      }

      // Mark all unread messages as read
      const result = await Message.updateMany(
        {
          conversationId,
          receiverId: new mongoose.Types.ObjectId(userId),
          receiverRole: role,
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
      const unreadKey = `${role}_${userId.toString()}`;
      conversation.unreadCount.set(unreadKey, 0);
      await conversation.save();

      // Emit to socket room
      const io = getSocket();
      if (io) {
        io.to(`chat_${conversationId}`).emit('all_messages_read', {
          conversationId,
          userId,
          role
        });
      }

      return result;
    } catch (error) {
      throw error;
    }
  }
}

export default new ChatService();

