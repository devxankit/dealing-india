import {
  getAllChatSessions,
  getChatSessionById,
  addMessageToChat,
  markChatMessagesAsRead,
} from '../../services/liveChat.service.js';

/**
 * Get all chat sessions
 * GET /api/admin/support/chat/sessions
 */
export const getChatSessions = async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const sessions = await getAllChatSessions({ status, search });

    res.status(200).json({
      success: true,
      message: 'Chat sessions retrieved successfully',
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get chat session by ID with messages
 * GET /api/admin/support/chat/sessions/:id
 */
export const getChatSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await getChatSessionById(id);

    res.status(200).json({
      success: true,
      message: 'Chat session retrieved successfully',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages for a chat session
 * GET /api/admin/support/chat/sessions/:id/messages
 */
export const getChatMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await getChatSessionById(id);

    res.status(200).json({
      success: true,
      message: 'Messages retrieved successfully',
      data: { messages: session.messages || [] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send message to chat session (REST fallback)
 * POST /api/admin/support/chat/sessions/:id/messages
 */
export const sendChatMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const adminId = req.user.adminId;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required',
      });
    }

    const messageData = {
      sender: adminId,
      senderType: 'admin',
      message: message.trim(),
    };

    const newMessage = await addMessageToChat(id, messageData);

    // Mark messages as read when admin sends a message
    await markChatMessagesAsRead(id, 'admin');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: newMessage },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark chat messages as read
 * PUT /api/admin/support/chat/sessions/:id/read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await markChatMessagesAsRead(id, 'admin');

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

