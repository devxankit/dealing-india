import SupportTicketService from '../../services/supportTicket.service.js';

class VendorSupportTicketController {
  /**
   * Create a new support ticket
   * POST /api/vendor/support-tickets
   */
  async createTicket(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found',
        });
      }

      const { subject, description, category, issueType, priority, subscriptionId, transactionId, amount } = req.body;

      if (!subject || !description) {
        return res.status(400).json({
          success: false,
          message: 'Subject and description are required',
        });
      }

      const ticket = await SupportTicketService.createTicket(vendorId, {
        subject,
        description,
        category: category || 'subscription',
        issueType: issueType || 'other',
        priority: priority || 'medium',
        subscriptionId,
        transactionId,
        amount,
      });

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
   * Get vendor's tickets
   * GET /api/vendor/support-tickets
   */
  async getTickets(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found',
        });
      }

      const { status, category, priority } = req.query;

      const tickets = await SupportTicketService.getVendorTickets(vendorId, {
        status,
        category,
        priority,
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
   * Get single ticket
   * GET /api/vendor/support-tickets/:id
   */
  async getTicket(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found',
        });
      }

      const { id } = req.params;

      const ticket = await SupportTicketService.getTicketById(id, vendorId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found',
        });
      }

      res.status(200).json({
        success: true,
        data: ticket,
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
   * Update ticket status (vendor can close their own tickets)
   * PATCH /api/vendor/support-tickets/:id/status
   */
  async updateStatus(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID not found',
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

      // Vendor can only close their own tickets
      if (status !== 'closed') {
        return res.status(403).json({
          success: false,
          message: 'Vendors can only close tickets',
        });
      }

      const ticket = await SupportTicketService.updateTicketStatus(
        id,
        status,
        vendorId,
        'vendor',
        note || 'Ticket closed by vendor'
      );

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
}

export default new VendorSupportTicketController();

