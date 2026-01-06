import SupportTicketService from '../../services/supportTicket.service.js';

class AdminSupportTicketController {
  /**
   * Get all support tickets (admin)
   * GET /api/admin/support-tickets
   */
  async getAllTickets(req, res) {
    try {
      const { status, category, priority, vendorId, userId, createdByRole } = req.query;

      const tickets = await SupportTicketService.getAllTickets({
        status,
        category,
        priority,
        vendorId,
        userId,
        createdByRole,
      });

      res.status(200).json({
        success: true,
        data: tickets,
        count: tickets.length,
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
   * Get single ticket (admin)
   * GET /api/admin/support-tickets/:id
   */
  async getTicket(req, res) {
    try {
      const { id } = req.params;

      const ticket = await SupportTicketService.getTicketById(id);

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
   * Respond to ticket (admin)
   * POST /api/admin/support-tickets/:id/respond
   */
  async respondToTicket(req, res) {
    try {
      const adminId = req.admin?._id || req.userDoc?._id;
      if (!adminId) {
        return res.status(400).json({
          success: false,
          message: 'Admin ID not found',
        });
      }

      const { id } = req.params;
      const { response, status } = req.body;

      if (!response || !response.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Response is required',
        });
      }

      // Add message to ticket
      const ticketMessage = await SupportTicketService.addTicketMessage(
        id,
        adminId,
        'admin',
        response,
        []
      );

      // Update ticket status if provided
      let ticket;
      if (status) {
        ticket = await SupportTicketService.updateTicketStatus(
          id,
          status,
          adminId,
          'admin',
          'Admin responded'
        );
      } else {
        ticket = await SupportTicketService.getTicketById(id);
      }

      // Get Socket.IO instance from app
      const io = req.app.get('io');
      if (io) {
        io.to(`ticket_${id}`).emit('ticket_message', ticketMessage);
        io.to(`ticket_${id}`).emit('ticket_updated', { ticketId: id, message: ticketMessage });
        if (status) {
          io.to(`ticket_${id}`).emit('ticket_status_changed', { ticketId: id, status, ticket });
        }
      }

      res.status(200).json({
        success: true,
        message: 'Response sent successfully',
        data: {
          ...ticket,
          messages: await SupportTicketService.getTicketMessages(id),
        },
      });
    } catch (error) {
      console.error('Error responding to ticket:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to respond to ticket',
      });
    }
  }

  /**
   * Update ticket status (admin)
   * PATCH /api/admin/support-tickets/:id/status
   */
  async updateStatus(req, res) {
    try {
      const adminId = req.admin?._id || req.userDoc?._id;
      if (!adminId) {
        return res.status(400).json({
          success: false,
          message: 'Admin ID not found',
        });
      }

      const { id } = req.params;
      const { status, note } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
        });
      }

      const ticket = await SupportTicketService.updateTicketStatus(
        id,
        status,
        adminId,
        'admin',
        note || 'Status updated by admin'
      );

      // Get Socket.IO instance from app
      const io = req.app.get('io');
      if (io) {
        io.to(`ticket_${id}`).emit('ticket_status_changed', { ticketId: id, status, ticket });
        io.to(`ticket_${id}`).emit('ticket_updated', { ticketId: id, status, ticket });
      }

      res.status(200).json({
        success: true,
        message: 'Ticket status updated successfully',
        data: ticket,
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update ticket status',
      });
    }
  }

  /**
   * Get ticket statistics (admin)
   * GET /api/admin/support-tickets/stats
   */
  async getStats(req, res) {
    try {
      const { vendorId } = req.query;

      const stats = await SupportTicketService.getTicketStats(vendorId || null);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting ticket stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get ticket statistics',
      });
    }
  }
}

export default new AdminSupportTicketController();

