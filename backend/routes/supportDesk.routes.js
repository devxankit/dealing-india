import express from 'express';
import {
  getTickets,
  getTicket,
  updateStatus,
  assign,
  sendMessage,
} from '../controllers/admin-controllers/supportTicket.controller.js';
import {
  getTicketTypes,
  getTicketType,
  create as createTicketType,
  update as updateTicketType,
  remove as removeTicketType,
} from '../controllers/admin-controllers/ticketType.controller.js';
import {
  getChatSessions,
  getChatSession,
  getChatMessages,
  sendChatMessage,
  markAsRead,
} from '../controllers/admin-controllers/liveChat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Ticket Management Routes
router.get('/tickets', asyncHandler(getTickets));
router.get('/tickets/:id', asyncHandler(getTicket));
router.put('/tickets/:id/status', asyncHandler(updateStatus));
router.put('/tickets/:id/assign', asyncHandler(assign));
router.post('/tickets/:id/messages', asyncHandler(sendMessage));

// Ticket Types Routes
router.get('/ticket-types', asyncHandler(getTicketTypes));
router.get('/ticket-types/:id', asyncHandler(getTicketType));
router.post('/ticket-types', asyncHandler(createTicketType));
router.put('/ticket-types/:id', asyncHandler(updateTicketType));
router.delete('/ticket-types/:id', asyncHandler(removeTicketType));

// Live Chat Routes
router.get('/chat/sessions', asyncHandler(getChatSessions));
router.get('/chat/sessions/:id', asyncHandler(getChatSession));
router.get('/chat/sessions/:id/messages', asyncHandler(getChatMessages));
router.post('/chat/sessions/:id/messages', asyncHandler(sendChatMessage));
router.put('/chat/sessions/:id/read', asyncHandler(markAsRead));

export default router;

