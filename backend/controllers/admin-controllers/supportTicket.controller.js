import {
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  assignTicket,
  addMessageToTicket,
} from '../../services/supportTicket.service.js';

/**
 * Get all tickets with filters
 * GET /api/admin/support/tickets
 */
export const getTickets = async (req, res, next) => {
  try {
    const {
      search = '',
      status = 'all',
      priority,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getAllTickets({
      search,
      status,
      priority,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Tickets retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket by ID with messages
 * GET /api/admin/support/tickets/:id
 */
export const getTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await getTicketById(id);

    res.status(200).json({
      success: true,
      message: 'Ticket retrieved successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket status
 * PUT /api/admin/support/tickets/:id/status
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const ticket = await updateTicketStatus(id, status);

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign ticket to admin
 * PUT /api/admin/support/tickets/:id/assign
 */
export const assign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required',
      });
    }

    const ticket = await assignTicket(id, adminId);

    res.status(200).json({
      success: true,
      message: 'Ticket assigned successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send message to ticket (REST fallback)
 * POST /api/admin/support/tickets/:id/messages
 */
export const sendMessage = async (req, res, next) => {
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

    const newMessage = await addMessageToTicket(id, messageData);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: newMessage },
    });
  } catch (error) {
    next(error);
  }
};

