import Chat from '../models/Chat.model.js';
import Message from '../models/Message.model.js';
import mongoose from 'mongoose';
import { getSocket } from '../config/socket.io.js';

class VendorChatService {
    /**
     * Create or get conversation between two vendors
     * @param {String} vendor1Id - First vendor ID
     * @param {String} vendor2Id - Second vendor ID
     * @returns {Promise<Object>} Conversation object
     */
    async createOrGetConversation(vendor1Id, vendor2Id) {
        console.log('[VendorChatService] createOrGetConversation:', { vendor1Id, vendor2Id });
        try {
            // Validate IDs
            if (!mongoose.Types.ObjectId.isValid(vendor1Id) || !mongoose.Types.ObjectId.isValid(vendor2Id)) {
                throw new Error('Invalid vendor IDs');
            }

            if (vendor1Id === vendor2Id) {
                throw new Error('Cannot create conversation with yourself');
            }

            const vendor1ObjectId = new mongoose.Types.ObjectId(vendor1Id);
            const vendor2ObjectId = new mongoose.Types.ObjectId(vendor2Id);

            // Check if conversation already exists (order-independent)
            const existingChat = await Chat.findOne({
                $and: [
                    { 'participants.userId': vendor1ObjectId },
                    { 'participants.userId': vendor2ObjectId }
                ]
            })
                .populate('participants.userId', 'storeName email phone storeLogo')
                .populate('lastMessage')
                .lean();

            if (existingChat) {
                console.log('[VendorChatService] Existing conversation found:', existingChat._id);
                return existingChat;
            }

            console.log('[VendorChatService] Creating new conversation');
            // Create new conversation
            const newChat = await Chat.create({
                participants: [
                    { userId: vendor1ObjectId, role: 'vendor', roleModel: 'Vendor' },
                    { userId: vendor2ObjectId, role: 'vendor', roleModel: 'Vendor' }
                ],
                unreadCount: new Map([
                    [`vendor_${vendor1Id.toString()}`, 0],
                    [`vendor_${vendor2Id.toString()}`, 0]
                ])
            });

            console.log('[VendorChatService] New conversation created:', newChat._id);
            return await Chat.findById(newChat._id)
                .populate('participants.userId', 'storeName email phone storeLogo')
                .lean();
        } catch (error) {
            console.error('[VendorChatService] Error in createOrGetConversation:', error);
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
            console.log('[VendorChatService] getVendorConversations for:', vendorId);

            const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

            const conversations = await Chat.find({
                'participants.userId': vendorObjectId
            })
                .populate({
                    path: 'participants.userId',
                    select: 'storeName email phone storeLogo name avatar'
                })
                .populate('lastMessage')
                .sort({ lastMessageAt: -1, updatedAt: -1 })
                .lean();

            console.log(`[VendorChatService] Found ${conversations.length} conversations`);

            // Deduplicate conversations by other participant ID - keep only the most recent one
            const deduplicated = [];
            const seenParticipants = new Map();

            for (const conv of conversations) {
                const otherParticipant = conv.participants.find(
                    p => p.userId && (p.userId._id || p.userId).toString() !== vendorId.toString()
                );

                if (otherParticipant) {
                    const otherId = (otherParticipant.userId._id || otherParticipant.userId).toString();
                    
                    // Check if we've seen this participant before
                    const existingConv = seenParticipants.get(otherId);
                    
                    if (!existingConv) {
                        // First time seeing this participant, add it
                        seenParticipants.set(otherId, conv);
                    } else {
                        // Compare timestamps - keep the conversation with the most recent message
                        const existingTime = existingConv.lastMessageAt || existingConv.updatedAt || existingConv.createdAt;
                        const currentTime = conv.lastMessageAt || conv.updatedAt || conv.createdAt;
                        
                        if (new Date(currentTime) > new Date(existingTime)) {
                            // Current conversation is more recent, replace it
                            seenParticipants.set(otherId, conv);
                        }
                    }
                }
            }

            // Transform deduplicated conversations to include other participant info
            const transformed = Array.from(seenParticipants.values()).map(conv => {
                const otherParticipant = conv.participants.find(
                    p => p.userId && (p.userId._id || p.userId).toString() !== vendorId.toString()
                );

                let unreadCount = 0;
                if (conv.unreadCount) {
                    const key = `vendor_${vendorId.toString()}`;
                    if (conv.unreadCount instanceof Map) {
                        unreadCount = conv.unreadCount.get(key) || 0;
                    } else {
                        unreadCount = conv.unreadCount[key] || 0;
                    }
                }

                return {
                    ...conv,
                    otherParticipant,
                    unreadCount
                };
            });

            // Sort again by lastMessageAt to maintain order
            transformed.sort((a, b) => {
                const timeA = a.lastMessageAt || a.updatedAt || a.createdAt;
                const timeB = b.lastMessageAt || b.updatedAt || b.createdAt;
                return new Date(timeB) - new Date(timeA);
            });

            return transformed;
        } catch (error) {
            console.error('[VendorChatService] Error in getVendorConversations:', error);
            throw error;
        }
    }

    /**
     * Get messages for a conversation
     * @param {String} conversationId - Conversation ID
     * @param {String} vendorId - Vendor ID (for permission check)
     * @param {Number} page - Page number
     * @param {Number} limit - Messages per page
     * @returns {Promise<Object>} Messages and pagination info
     */
    async getMessages(conversationId, vendorId, page = 1, limit = 50) {
        try {
            // Verify vendor has access to this conversation
            const conversation = await Chat.findById(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            const isParticipant = conversation.participants.some(
                p => p.userId.toString() === vendorId.toString()
            );

            if (!isParticipant) {
                console.error('[VendorChatService] Access denied to conversation:', conversationId);
                throw new Error('Access denied');
            }

            const skip = (page - 1) * limit;

            const messages = await Message.find({ conversationId })
                .populate('senderId', 'storeName email phone')
                .populate('receiverId', 'storeName email phone')
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
                    pages: Math.ceil(totalMessages / limit)
                }
            };
        } catch (error) {
            console.error('[VendorChatService] Error in getMessages:', error);
            throw error;
        }
    }

    async sendMessage(conversationId, senderId, receiverId, message, messageType = 'text', metadata = null) {
        console.log('[VendorChatService] sendMessage:', { conversationId, senderId, receiverId, messageType });
        try {
            // Validate IDs
            if (!mongoose.Types.ObjectId.isValid(senderId) ||
                !mongoose.Types.ObjectId.isValid(conversationId) ||
                !mongoose.Types.ObjectId.isValid(receiverId)) {
                throw new Error('Invalid IDs');
            }

            // Verify conversation exists and sender is a participant
            const conversation = await Chat.findById(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            const senderIsParticipant = conversation.participants.some(
                p => p.userId.toString() === senderId.toString() && p.role === 'vendor'
            );

            const receiverIsParticipant = conversation.participants.some(
                p => p.userId.toString() === receiverId.toString() && (p.role === 'vendor' || p.role === 'user')
            );

            if (!senderIsParticipant || !receiverIsParticipant) {
                console.error('[VendorChatService] Participant validation failed:', {
                    senderId, senderIsParticipant,
                    receiverId, receiverIsParticipant
                });
                throw new Error('Access denied: Invalid participants');
            }

            const newMessage = await Message.create({
                conversationId,
                senderId: new mongoose.Types.ObjectId(senderId),
                senderRole: 'vendor',
                senderRoleModel: 'Vendor',
                receiverId: new mongoose.Types.ObjectId(receiverId),
                receiverRole: receiverIsParticipant ? 'vendor' : 'user', // Determine receiver role
                receiverRoleModel: receiverIsParticipant ? 'Vendor' : 'User',
                message,
                messageType,
                metadata,
                readStatus: false
            });

            console.log('[VendorChatService] Message created:', newMessage._id);

            // Update conversation
            if (!conversation.unreadCount) {
                conversation.unreadCount = new Map();
            } else if (!(conversation.unreadCount instanceof Map)) {
                const plainObj = conversation.unreadCount.toObject ?
                    conversation.unreadCount.toObject() : conversation.unreadCount;
                conversation.unreadCount = new Map(Object.entries(plainObj));
            }

            const unreadKey = `vendor_${receiverId.toString()}`;
            const currentUnread = conversation.unreadCount.get(unreadKey) || 0;
            conversation.unreadCount.set(unreadKey, currentUnread + 1);

            conversation.lastMessage = newMessage._id;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            const populatedMessage = await Message.findById(newMessage._id)
                .populate('senderId', 'storeName email phone storeLogo')
                .populate('receiverId', 'storeName email phone storeLogo')
                .lean();

            // Socket emit
            const io = getSocket();
            if (io) {
                const chatRoom = `chat_${conversationId}`;
                console.log(`[VendorChatService] Emitting to room: ${chatRoom}`);
                io.to(chatRoom).emit('receive_message', populatedMessage);

                const receiverRoom = `vendor_${receiverId}`;
                io.to(receiverRoom).emit('new_chat_message', populatedMessage);
            }

            return populatedMessage;
        } catch (error) {
            console.error('[VendorChatService] Error in sendMessage:', error);
            throw error;
        }
    }

    /**
     * Mark message as read
     * @param {String} messageId - Message ID
     * @param {String} vendorId - Vendor ID
     * @returns {Promise<Object>} Updated message
     */
    async markMessageAsRead(messageId, vendorId) {
        try {
            const message = await Message.findById(messageId);
            if (!message) {
                throw new Error('Message not found');
            }

            // Verify vendor is the receiver
            if (message.receiverId.toString() !== vendorId.toString()) {
                throw new Error('Access denied');
            }

            if (!message.readStatus) {
                message.readStatus = true;
                message.readAt = new Date();
                await message.save();

                // Update unread count
                const conversation = await Chat.findById(message.conversationId);
                if (conversation) {
                    const unreadKey = `vendor_${vendorId.toString()}`;
                    const currentUnread = conversation.unreadCount?.get(unreadKey) || 0;
                    if (currentUnread > 0) {
                        conversation.unreadCount.set(unreadKey, currentUnread - 1);
                        await conversation.save();
                    }
                }

                // Socket emit
                const io = getSocket();
                if (io) {
                    io.to(`chat_${message.conversationId}`).emit('message_read', {
                        messageId: message._id,
                        conversationId: message.conversationId
                    });
                }
            }

            return await Message.findById(messageId)
                .populate('senderId', 'storeName email phone')
                .populate('receiverId', 'storeName email phone')
                .lean();
        } catch (error) {
            console.error('[VendorChatService] Error in markMessageAsRead:', error);
            throw error;
        }
    }

    /**
     * Mark all messages in conversation as read
     * @param {String} conversationId - Conversation ID
     * @param {String} vendorId - Vendor ID
     * @returns {Promise<Object>} Update result
     */
    async markAllAsRead(conversationId, vendorId) {
        try {
            // Verify vendor has access
            const conversation = await Chat.findById(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            const isParticipant = conversation.participants.some(
                p => p.userId.toString() === vendorId.toString()
            );

            if (!isParticipant) {
                throw new Error('Access denied');
            }

            // Mark all unread messages as read
            const result = await Message.updateMany(
                {
                    conversationId,
                    receiverId: new mongoose.Types.ObjectId(vendorId),
                    receiverRole: 'vendor',
                    readStatus: false
                },
                {
                    $set: {
                        readStatus: true,
                        readAt: new Date()
                    }
                }
            );

            // Reset unread count
            const unreadKey = `vendor_${vendorId.toString()}`;
            conversation.unreadCount.set(unreadKey, 0);
            await conversation.save();

            // Socket emit
            const io = getSocket();
            if (io) {
                io.to(`chat_${conversationId}`).emit('all_messages_read', {
                    conversationId,
                    vendorId
                });
            }

            return result;
        } catch (error) {
            console.error('[VendorChatService] Error in markAllAsRead:', error);
            throw error;
        }
    }
}

export default new VendorChatService();
