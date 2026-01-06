import SupportTicketService from '../../services/supportTicket.service.js';

class UserSupportTicketController {
  /**
   * Create a new support ticket
   * POST /api/user/support-tickets
   */
  async createTicket(req, res) {
    try {
      const userId = req.user?.userId || req.userDoc?._id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found',
        });
      }

      const { subject, description, category, issueType, priority } = req.body;

      if (!subject || !description) {
        return res.status(400).json({
          success: false,
          message: 'Subject and description are required',
        });
      }

      const ticket = await SupportTicketService.createUserTicket(userId, {
        subject,
        description,
        category: category || 'other',
        issueType: issueType || 'other',
        priority: priority || 'medium',
      });

      // Get Socket.IO instance from app
      const io = req.app.get('io');
      if (io) {
        io.emit('ticket_created', ticket);
      }

      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket,
      });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create support ticket',
      });
    }
  }

  /**
   * Get user's tickets
   * GET /api/user/support-tickets
   */
  async getTickets(req, res) {
    try {
      const userId = req.user?.userId || req.userDoc?._id;
      console.log('Getting tickets for userId:', userId);
      console.log('Request user:', req.user);
      console.log('Request userDoc:', req.userDoc);
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found',
        });
      }

      const { status, category, priority } = req.query;
      console.log('Query filters:', { status, category, priority });

      const tickets = await SupportTicketService.getUserTickets(userId, {
        status,
        category,
        priority,
      });

      console.log('Found tickets:', tickets?.length || 0);
      console.log('Tickets:', tickets);

      res.status(200).json({
        success: true,
        data: Array.isArray(tickets) ? tickets : [],
        count: Array.isArray(tickets) ? tickets.length : 0,
      });
    } catch (error) {
      console.error('Error getting tickets:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get support tickets',
      });
    }
  }

  /**
   * Get single ticket
   * GET /api/user/support-tickets/:id
   */
  async getTicket(req, res) {
    try {
      const userId = req.user?.userId || req.userDoc?._id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found',
        });
      }

      const { id } = req.params;

      const ticket = await SupportTicketService.getTicketById(id, userId, 'user');

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found',
        });
      }

      // Get ticket messages
      const messages = await SupportTicketService.getTicketMessages(id);

      res.status(200).json({
        success: true,
        data: {
          ...ticket,
          messages,
        },
      });
    } catch (error) {
      console.error('Error getting ticket:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get ticket',
      });
    }
  }

  /**
   * Reply to ticket
   * POST /api/user/support-tickets/:id/reply
   */
  async replyToTicket(req, res) {
    try {
      const userId = req.user?.userId || req.user?._id || req.userDoc?._id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated properly',
        });
      }

      const { id } = req.params;
      const { message, attachments } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message is required',
        });
      }

      // Verify ticket belongs to user
      const ticket = await SupportTicketService.getTicketById(id, userId, 'user');
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found',
        });
      }

      const ticketMessage = await SupportTicketService.addTicketMessage(
        id,
        userId,
        'user',
        message,
        attachments || []
      );

      // Get Socket.IO instance from app
      const io = req.app.get('io');
      if (io) {
        io.to(`ticket_${id}`).emit('ticket_message', ticketMessage);
        io.to(`ticket_${id}`).emit('ticket_updated', { ticketId: id, message: ticketMessage });
      }

      res.status(201).json({
        success: true,
        message: 'Reply sent successfully',
        data: ticketMessage,
      });
    } catch (error) {
      console.error('Error replying to ticket:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reply to ticket',
      });
    }
  }
}

export default new UserSupportTicketController();

