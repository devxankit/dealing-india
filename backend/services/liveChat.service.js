import ChatSession from '../models/ChatSession.model.js';
import ChatMessage from '../models/ChatMessage.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';

/**
 * Get all chat sessions
 * @param {Object} filters - { status, search }
 * @returns {Promise<Array>} Array of chat sessions
 */
export const getAllChatSessions = async (filters = {}) => {
  try {
    const { status, search = '' } = filters;

    const query = {};

    // Status filter
    if (status) {
      query.status = status;
    }

    // Search filter - find by participant name
    if (search) {
      const userMatches = await User.find({
        name: { $regex: search, $options: 'i' },
      }).select('_id');
      const vendorMatches = await Vendor.find({
        name: { $regex: search, $options: 'i' },
      }).select('_id');

      const userIds = userMatches.map((u) => u._id);
      const vendorIds = vendorMatches.map((v) => v._id);

      query.participant = { $in: [...userIds, ...vendorIds] };
    }

    const sessions = await ChatSession.find(query)
      .populate('participant', 'name email')
      .sort({ lastMessageAt: -1 })
      .lean();

    // Transform sessions
    const transformedSessions = sessions.map((session) => ({
      id: session._id,
      customerName: session.participant?.name || 'Unknown',
      customerId: session.participant?._id || null,
      lastMessage: session.lastMessage || '',
      unreadCount: session.unreadCount || 0,
      status: session.status,
      lastActivity: session.lastMessageAt || session.createdAt,
    }));

    return transformedSessions;
  } catch (error) {
    throw error;
  }
};

/**
 * Get chat session by ID
 * @param {String} sessionId - Chat session ID
 * @returns {Promise<Object>} Chat session with messages
 */
export const getChatSessionById = async (sessionId) => {
  try {
    const session = await ChatSession.findById(sessionId)
      .populate('participant', 'name email')
      .lean();

    if (!session) {
      throw new Error('Chat session not found');
    }

    // Get messages
    const messages = await ChatMessage.find({ session: sessionId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    // Transform messages
    const transformedMessages = messages.map((msg) => ({
      id: msg._id,
      sender: msg.senderType === 'admin' ? 'admin' : 'customer',
      message: msg.message,
      time: msg.createdAt,
      isRead: msg.isRead,
    }));

    return {
      ...session,
      id: session._id,
      customerName: session.participant?.name || 'Unknown',
      customerId: session.participant?._id || null,
      messages: transformedMessages,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid chat session ID');
    }
    throw error;
  }
};

/**
 * Get or create chat session for participant
 * @param {String} participantId - User or Vendor ID
 * @param {String} participantType - 'user' or 'vendor'
 * @returns {Promise<Object>} Chat session
 */
export const getOrCreateChatSession = async (participantId, participantType) => {
  try {
    let session = await ChatSession.findOne({
      participant: participantId,
      participantType,
    })
      .populate('participant', 'name email')
      .lean();

    if (!session) {
      // Create new session
      const newSession = await ChatSession.create({
        participant: participantId,
        participantType,
        status: 'active',
      });

      session = await ChatSession.findById(newSession._id)
        .populate('participant', 'name email')
        .lean();
    }

    return session;
  } catch (error) {
    throw error;
  }
};

/**
 * Add message to chat session
 * @param {String} sessionId - Chat session ID
 * @param {Object} messageData - { sender, senderType, message }
 * @returns {Promise<Object>} Created message
 */
export const addMessageToChat = async (sessionId, messageData) => {
  try {
    const { sender, senderType, message } = messageData;

    // Verify session exists
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      throw new Error('Chat session not found');
    }

    // Create message
    const chatMessage = await ChatMessage.create({
      session: sessionId,
      sender,
      senderType,
      message: message.trim(),
    });

    // Update session's lastMessage, lastMessageAt, and unreadCount
    const isAdminMessage = senderType === 'admin';
    session.lastMessage = message.trim();
    session.lastMessageAt = new Date();
    if (!isAdminMessage) {
      // Increment unread count if message is from participant (not admin)
      session.unreadCount = (session.unreadCount || 0) + 1;
    }
    session.messages.push(chatMessage._id);
    await session.save();

    // Populate and return
    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate('sender', 'name email')
      .lean();

    return {
      id: populatedMessage._id,
      sender: populatedMessage.senderType === 'admin' ? 'admin' : 'customer',
      message: populatedMessage.message,
      time: populatedMessage.createdAt,
      isRead: populatedMessage.isRead,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid chat session ID');
    }
    throw error;
  }
};

/**
 * Mark chat messages as read
 * @param {String} sessionId - Chat session ID
 * @param {String} readerType - 'admin' to mark admin's unread messages as read
 * @returns {Promise<Object>} Updated session
 */
export const markChatMessagesAsRead = async (sessionId, readerType) => {
  try {
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      throw new Error('Chat session not found');
    }

    // Mark all non-admin messages as read if admin is reading
    if (readerType === 'admin') {
      await ChatMessage.updateMany(
        {
          session: sessionId,
          senderType: { $ne: 'admin' },
          isRead: false,
        },
        {
          $set: { isRead: true, readAt: new Date() },
        }
      );

      // Reset unread count
      session.unreadCount = 0;
      await session.save();
    }

    return session.toObject();
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid chat session ID');
    }
    throw error;
  }
};

