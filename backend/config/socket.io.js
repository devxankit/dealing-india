import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.util.js';
import Admin from '../models/Admin.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import {
  addMessageToTicket,
  updateTicketStatus,
  assignTicket,
} from '../services/supportTicket.service.js';
import {
  addMessageToChat,
  getOrCreateChatSession,
  markChatMessagesAsRead,
} from '../services/liveChat.service.js';

/**
 * Setup Socket.io server
 * 
 * Environment Variables Required:
 * - SOCKET_CORS_ORIGIN: Comma-separated list of allowed CORS origins for Socket.io connections
 *   Example: "http://localhost:5173,http://localhost:3000,https://yourdomain.com"
 *   Default: "http://localhost:5173,http://localhost:3000" (if not set)
 * 
 * Socket.io uses CORS to restrict which frontend origins can connect.
 * The token is passed via auth.token in the socket handshake for authentication.
 * 
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export const setupSocketIO = (httpServer) => {
  const corsOrigins = process.env.SOCKET_CORS_ORIGIN
    ? process.env.SOCKET_CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token
      const decoded = verifyToken(token);

      // Attach user info to socket
      socket.user = decoded;

      // Fetch full user document based on role
      if (decoded.role === 'admin' && decoded.adminId) {
        const admin = await Admin.findById(decoded.adminId);
        if (!admin || !admin.isActive) {
          return next(new Error('Admin account not found or inactive'));
        }
        socket.userDoc = admin;
      } else if (decoded.role === 'user' && decoded.userId) {
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
          return next(new Error('User account not found or inactive'));
        }
        socket.userDoc = user;
      } else if (decoded.role === 'vendor' && decoded.vendorId) {
        const vendor = await Vendor.findById(decoded.vendorId);
        if (!vendor || !vendor.isActive) {
          return next(new Error('Vendor account not found or inactive'));
        }
        socket.userDoc = vendor;
      }

      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  // Socket.io connection handler
  io.on('connection', (socket) => {
    const userRole = socket.user.role;
    const userId = socket.user.adminId || socket.user.userId || socket.user.vendorId;

    // Join user's personal room
    socket.join(`user_${userId}`);

    // Admin-specific handlers
    if (userRole === 'admin') {
      // Join ticket room
      socket.on('join_ticket_room', async (data) => {
        try {
          const { ticketId } = data;
          if (!ticketId) {
            socket.emit('error', { message: 'Ticket ID is required' });
            return;
          }

          const room = `ticket_${ticketId}`;
          socket.join(room);
          socket.emit('joined_ticket_room', { ticketId, room });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Join chat session room
      socket.on('join_chat_session', async (data) => {
        try {
          const { sessionId } = data;
          if (!sessionId) {
            socket.emit('error', { message: 'Session ID is required' });
            return;
          }

          const room = `chat_${sessionId}`;
          socket.join(room);
          socket.emit('joined_chat_session', { sessionId, room });

          // Mark messages as read when admin joins
          await markChatMessagesAsRead(sessionId, 'admin');
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Send message in ticket
      socket.on('send_message', async (data) => {
        try {
          const { ticketId, message } = data;

          if (!ticketId || !message || !message.trim()) {
            socket.emit('error', { message: 'Ticket ID and message are required' });
            return;
          }

          const messageData = {
            sender: userId,
            senderType: 'admin',
            message: message.trim(),
          };

          const newMessage = await addMessageToTicket(ticketId, messageData);

          // Emit to all users in the ticket room
          io.to(`ticket_${ticketId}`).emit('message_received', {
            ticketId,
            message: newMessage,
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Send message in chat session
      socket.on('send_chat_message', async (data) => {
        try {
          const { sessionId, message } = data;

          if (!sessionId || !message || !message.trim()) {
            socket.emit('error', { message: 'Session ID and message are required' });
            return;
          }

          const messageData = {
            sender: userId,
            senderType: 'admin',
            message: message.trim(),
          };

          const newMessage = await addMessageToChat(sessionId, messageData);

          // Mark messages as read
          await markChatMessagesAsRead(sessionId, 'admin');

          // Emit to all users in the chat session room
          io.to(`chat_${sessionId}`).emit('message_received', {
            sessionId,
            message: newMessage,
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Update ticket status
      socket.on('update_ticket_status', async (data) => {
        try {
          const { ticketId, status } = data;

          if (!ticketId || !status) {
            socket.emit('error', { message: 'Ticket ID and status are required' });
            return;
          }

          const ticket = await updateTicketStatus(ticketId, status);

          // Emit to all users in the ticket room
          io.to(`ticket_${ticketId}`).emit('ticket_updated', {
            ticketId,
            ticket,
            updateType: 'status',
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Assign ticket
      socket.on('assign_ticket', async (data) => {
        try {
          const { ticketId, adminId } = data;

          if (!ticketId || !adminId) {
            socket.emit('error', { message: 'Ticket ID and admin ID are required' });
            return;
          }

          const ticket = await assignTicket(ticketId, adminId);

          // Emit to all users in the ticket room
          io.to(`ticket_${ticketId}`).emit('ticket_updated', {
            ticketId,
            ticket,
            updateType: 'assignment',
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });
    }

    // User/Vendor handlers (for future use when they can create tickets/chats)
    if (userRole === 'user' || userRole === 'vendor') {
      // Join ticket room
      socket.on('join_ticket_room', async (data) => {
        try {
          const { ticketId } = data;
          if (!ticketId) {
            socket.emit('error', { message: 'Ticket ID is required' });
            return;
          }

          const room = `ticket_${ticketId}`;
          socket.join(room);
          socket.emit('joined_ticket_room', { ticketId, room });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Join chat session room
      socket.on('join_chat_session', async (data) => {
        try {
          const { sessionId } = data;
          if (!sessionId) {
            socket.emit('error', { message: 'Session ID is required' });
            return;
          }

          const room = `chat_${sessionId}`;
          socket.join(room);
          socket.emit('joined_chat_session', { sessionId, room });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Send message in ticket
      socket.on('send_message', async (data) => {
        try {
          const { ticketId, message } = data;

          if (!ticketId || !message || !message.trim()) {
            socket.emit('error', { message: 'Ticket ID and message are required' });
            return;
          }

          const messageData = {
            sender: userId,
            senderType: userRole,
            message: message.trim(),
          };

          const newMessage = await addMessageToTicket(ticketId, messageData);

          // Emit to all users in the ticket room
          io.to(`ticket_${ticketId}`).emit('message_received', {
            ticketId,
            message: newMessage,
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Send message in chat session
      socket.on('send_chat_message', async (data) => {
        try {
          const { sessionId, message } = data;

          if (!sessionId || !message || !message.trim()) {
            socket.emit('error', { message: 'Session ID and message are required' });
            return;
          }

          const messageData = {
            sender: userId,
            senderType: userRole,
            message: message.trim(),
          };

          const newMessage = await addMessageToChat(sessionId, messageData);

          // Emit to all users in the chat session room
          io.to(`chat_${sessionId}`).emit('message_received', {
            sessionId,
            message: newMessage,
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });
    }

    // Typing indicators (optional)
    socket.on('typing_start', (data) => {
      const { ticketId, sessionId } = data;
      if (ticketId) {
        socket.to(`ticket_${ticketId}`).emit('user_typing', {
          ticketId,
          userId,
          userName: socket.userDoc?.name || 'User',
        });
      }
      if (sessionId) {
        socket.to(`chat_${sessionId}`).emit('user_typing', {
          sessionId,
          userId,
          userName: socket.userDoc?.name || 'User',
        });
      }
    });

    socket.on('typing_stop', (data) => {
      const { ticketId, sessionId } = data;
      if (ticketId) {
        socket.to(`ticket_${ticketId}`).emit('user_stopped_typing', {
          ticketId,
          userId,
        });
      }
      if (sessionId) {
        socket.to(`chat_${sessionId}`).emit('user_stopped_typing', {
          sessionId,
          userId,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Cleanup if needed
    });
  });

  return io;
};

