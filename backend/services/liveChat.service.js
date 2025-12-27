import ChatSession from '../models/ChatSession.model.js';
import ChatMessage from '../models/ChatMessage.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';
import SupportTicket from '../models/SupportTicket.model.js';
import SupportMessage from '../models/SupportMessage.model.js';

/**
 * Get all chat sessions (including support tickets as chat sessions)
 * @param {Object} filters - { status, search }
 * @returns {Promise<Array>} Array of chat sessions
 */
export const getAllChatSessions = async (filters = {}) => {
  try {
    const { status, search = '' } = filters;

    // Get support tickets as chat sessions
    const ticketQuery = {};
    if (status && status !== 'all') {
      // Map chat status to ticket status
      if (status === 'resolved') {
        ticketQuery.status = 'closed';
      } else if (status === 'active') {
        ticketQuery.status = { $in: ['open', 'in_progress'] };
      } else {
        ticketQuery.status = status;
      }
    }

    // Search filter for tickets
    if (search) {
      ticketQuery.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const tickets = await SupportTicket.find(ticketQuery)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    // Transform tickets to chat session format
    const ticketSessions = await Promise.all(
      tickets.map(async (ticket) => {
        // Get creator name
        let customerName = 'Unknown';
        if (ticket.createdBy && ticket.createdByType) {
          try {
            let creator;
            if (ticket.createdByType === 'vendor') {
              creator = await Vendor.findById(ticket.createdBy).select('name email').lean();
            } else if (ticket.createdByType === 'user') {
              creator = await User.findById(ticket.createdBy).select('name email').lean();
            }
            customerName = creator?.name || 'Unknown';
          } catch (error) {
            customerName = 'Unknown';
          }
        }

        // Get last message
        const lastMessageDoc = await SupportMessage.findOne({ ticket: ticket._id })
          .sort({ createdAt: -1 })
          .lean();
        const lastMessage = lastMessageDoc?.message || '';

        return {
          id: ticket._id.toString(),
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
          customerName,
          customerId: ticket.createdBy?.toString() || null,
          lastMessage,
          unreadCount: 0, // Can be enhanced with actual unread count
          status: ticket.status === 'closed' ? 'resolved' : 'active',
          lastActivity: ticket.lastMessageAt || ticket.createdAt,
          isTicket: true, // Flag to identify it's a ticket
        };
      })
    );

    // Get regular chat sessions
    const chatQuery = {};
    if (status && status !== 'all') {
      chatQuery.status = status;
    }

    // Search filter for chat sessions
    if (search) {
      const userMatches = await User.find({
        name: { $regex: search, $options: 'i' },
      }).select('_id');
      const vendorMatches = await Vendor.find({
        name: { $regex: search, $options: 'i' },
      }).select('_id');

      const userIds = userMatches.map((u) => u._id);
      const vendorIds = vendorMatches.map((v) => v._id);

      chatQuery.participant = { $in: [...userIds, ...vendorIds] };
    }

    const sessions = await ChatSession.find(chatQuery)
      .sort({ lastMessageAt: -1 })
      .lean();

    // Manually populate participant based on participantType
    const populatedSessions = await Promise.all(
      sessions.map(async (session) => {
        if (session.participant && session.participantType) {
          try {
            let participant;
            if (session.participantType === 'vendor') {
              participant = await Vendor.findById(session.participant).select('name email').lean();
            } else if (session.participantType === 'user') {
              participant = await User.findById(session.participant).select('name email').lean();
            }
            session.participant = participant || null;
          } catch (error) {
            session.participant = null;
          }
        }
        return session;
      })
    );

    // Transform chat sessions
    const transformedSessions = populatedSessions.map((session) => ({
      id: session._id.toString(),
      customerName: session.participant?.name || 'Unknown',
      customerId: session.participant?._id || null,
      lastMessage: session.lastMessage || '',
      unreadCount: session.unreadCount || 0,
      status: session.status,
      lastActivity: session.lastMessageAt || session.createdAt,
      isTicket: false, // Flag to identify it's a regular chat session
    }));

    // Combine tickets and chat sessions, sort by lastActivity
    const allSessions = [...ticketSessions, ...transformedSessions].sort(
      (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
    );

    return allSessions;
  } catch (error) {
    throw error;
  }
};

/**
 * Get chat session by ID (or support ticket by ID)
 * @param {String} sessionId - Chat session ID or Ticket ID
 * @returns {Promise<Object>} Chat session with messages
 */
export const getChatSessionById = async (sessionId) => {
  try {
    // First check if it's a support ticket
    const ticket = await SupportTicket.findById(sessionId).lean();

    if (ticket) {
      // It's a support ticket - return ticket messages as chat session
      let customerName = 'Unknown';
      if (ticket.createdBy && ticket.createdByType) {
        try {
          let creator;
          if (ticket.createdByType === 'vendor') {
            creator = await Vendor.findById(ticket.createdBy).select('name email').lean();
          } else if (ticket.createdByType === 'user') {
            creator = await User.findById(ticket.createdBy).select('name email').lean();
          }
          customerName = creator?.name || 'Unknown';
        } catch (error) {
          customerName = 'Unknown';
        }
      }

      // Get ticket messages
      const ticketMessages = await SupportMessage.find({ ticket: sessionId })
        .sort({ createdAt: 1 })
        .lean();

      // Manually populate sender based on senderType
      const populatedMessages = await Promise.all(
        ticketMessages.map(async (msg) => {
          if (msg.sender && msg.senderType) {
            try {
              let sender;
              if (msg.senderType === 'vendor') {
                sender = await Vendor.findById(msg.sender).select('name email').lean();
              } else if (msg.senderType === 'user') {
                sender = await User.findById(msg.sender).select('name email').lean();
              } else if (msg.senderType === 'admin') {
                sender = await Admin.findById(msg.sender).select('name email').lean();
              }
              msg.sender = sender || null;
            } catch (error) {
              msg.sender = null;
            }
          }
          return msg;
        })
      );

      // Transform messages
      const transformedMessages = populatedMessages.map((msg) => ({
        id: msg._id.toString(),
        sender: msg.senderType === 'admin' ? 'admin' : 'customer',
        message: msg.message,
        time: msg.createdAt,
        isRead: msg.isRead || false,
      }));

      return {
        id: ticket._id.toString(),
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        customerName,
        customerId: ticket.createdBy?.toString() || null,
        messages: transformedMessages,
        isTicket: true,
      };
    }

    // It's a regular chat session
    const session = await ChatSession.findById(sessionId).lean();

    if (!session) {
      throw new Error('Chat session not found');
    }

    // Manually populate participant based on participantType
    if (session.participant && session.participantType) {
      try {
        let participant;
        if (session.participantType === 'vendor') {
          participant = await Vendor.findById(session.participant).select('name email').lean();
        } else if (session.participantType === 'user') {
          participant = await User.findById(session.participant).select('name email').lean();
        }
        session.participant = participant || null;
      } catch (error) {
        session.participant = null;
      }
    }

    // Get messages
    const messages = await ChatMessage.find({ session: sessionId })
      .sort({ createdAt: 1 })
      .lean();

    // Manually populate sender based on senderType
    const populatedMessages = await Promise.all(
      messages.map(async (msg) => {
        if (msg.sender && msg.senderType) {
          try {
            let sender;
            if (msg.senderType === 'vendor') {
              sender = await Vendor.findById(msg.sender).select('name email').lean();
            } else if (msg.senderType === 'user') {
              sender = await User.findById(msg.sender).select('name email').lean();
            } else if (msg.senderType === 'admin') {
              sender = await Admin.findById(msg.sender).select('name email').lean();
            }
            msg.sender = sender || null;
          } catch (error) {
            msg.sender = null;
          }
        }
        return msg;
      })
    );

    // Transform messages
    const transformedMessages = populatedMessages.map((msg) => ({
      id: msg._id.toString(),
      sender: msg.senderType === 'admin' ? 'admin' : 'customer',
      message: msg.message,
      time: msg.createdAt,
      isRead: msg.isRead,
    }));

    return {
      ...session,
      id: session._id.toString(),
      customerName: session.participant?.name || 'Unknown',
      customerId: session.participant?._id || null,
      messages: transformedMessages,
      isTicket: false,
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
    }).lean();

    if (!session) {
      // Create new session
      const newSession = await ChatSession.create({
        participant: participantId,
        participantType,
        status: 'active',
      });

      session = await ChatSession.findById(newSession._id).lean();
    }

    // Manually populate participant based on participantType
    if (session.participant && session.participantType) {
      try {
        let participant;
        if (session.participantType === 'vendor') {
          participant = await Vendor.findById(session.participant).select('name email').lean();
        } else if (session.participantType === 'user') {
          participant = await User.findById(session.participant).select('name email').lean();
        }
        session.participant = participant || null;
      } catch (error) {
        session.participant = null;
      }
    }

    return session;
  } catch (error) {
    throw error;
  }
};

/**
 * Add message to chat session or support ticket
 * @param {String} sessionId - Chat session ID or Ticket ID
 * @param {Object} messageData - { sender, senderType, message }
 * @returns {Promise<Object>} Created message
 */
export const addMessageToChat = async (sessionId, messageData) => {
  try {
    const { sender, senderType, message } = messageData;

    // First check if it's a support ticket
    const ticket = await SupportTicket.findById(sessionId);

    if (ticket) {
      // It's a support ticket - add message to ticket
      const supportMessage = await SupportMessage.create({
        ticket: sessionId,
        sender,
        senderType,
        message: message.trim(),
      });

      // Update ticket's lastMessageAt and add message reference
      ticket.lastMessageAt = new Date();
      ticket.messages.push(supportMessage._id);
      await ticket.save();

      // Manually populate sender based on senderType
      let populatedMessage = await SupportMessage.findById(supportMessage._id).lean();
      if (populatedMessage.sender && populatedMessage.senderType) {
        try {
          let senderData;
          if (populatedMessage.senderType === 'vendor') {
            senderData = await Vendor.findById(populatedMessage.sender).select('name email').lean();
          } else if (populatedMessage.senderType === 'user') {
            senderData = await User.findById(populatedMessage.sender).select('name email').lean();
          } else if (populatedMessage.senderType === 'admin') {
            senderData = await Admin.findById(populatedMessage.sender).select('name email').lean();
          }
          populatedMessage.sender = senderData || null;
        } catch (error) {
          populatedMessage.sender = null;
        }
      }

      return {
        id: populatedMessage._id.toString(),
        sender: populatedMessage.senderType === 'admin' ? 'admin' : 'customer',
        message: populatedMessage.message,
        time: populatedMessage.createdAt,
        isRead: populatedMessage.isRead || false,
      };
    }

    // It's a regular chat session
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

    // Manually populate sender based on senderType
    let populatedMessage = await ChatMessage.findById(chatMessage._id).lean();
    if (populatedMessage.sender && populatedMessage.senderType) {
      try {
        let senderData;
        if (populatedMessage.senderType === 'vendor') {
          senderData = await Vendor.findById(populatedMessage.sender).select('name email').lean();
        } else if (populatedMessage.senderType === 'user') {
          senderData = await User.findById(populatedMessage.sender).select('name email').lean();
        } else if (populatedMessage.senderType === 'admin') {
          senderData = await Admin.findById(populatedMessage.sender).select('name email').lean();
        }
        populatedMessage.sender = senderData || null;
      } catch (error) {
        populatedMessage.sender = null;
      }
    }

    return {
      id: populatedMessage._id.toString(),
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

