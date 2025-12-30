import {
  getVendorTickets,
  getVendorTicketById,
  createVendorTicket,
  addVendorMessageToTicket,
  updateVendorTicketStatus,
} from '../../services/vendorSupport.service.js';

/**
 * Get vendor's tickets with filters
 * GET /api/vendor/support/tickets
 */
export const getVendorTicketsController = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor authentication required',
      });
    }

    const {
      search = '',
      status = 'all',
      priority,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getVendorTickets(vendorId, {
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
      data: {
        tickets: result.tickets,
      },
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vendor ticket by ID with messages
 * GET /api/vendor/support/tickets/:id
 */
export const getVendorTicketController = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const { id } = req.params;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor authentication required',
      });
    }

    const ticket = await getVendorTicketById(id, vendorId);

    res.status(200).json({
      success: true,
      message: 'Ticket retrieved successfully',
      data: { ticket },
    });
  } catch (error) {
    if (error.message === 'Ticket not found or access denied') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Create new support ticket
 * POST /api/vendor/support/tickets
 */
export const createVendorTicketController = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const { subject, type, priority, description } = req.body;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor authentication required',
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required',
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Description is required',
      });
    }

    if (!type || !type.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Ticket type is required',
      });
    }

    const ticket = await createVendorTicket(vendorId, {
      subject,
      type,
      priority,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send message to ticket (REST fallback)
 * POST /api/vendor/support/tickets/:id/messages
 */
export const sendTicketMessageController = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const { id } = req.params;
    const { message } = req.body;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor authentication required',
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    const newMessage = await addVendorMessageToTicket(id, vendorId, message);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: newMessage },
    });
  } catch (error) {
    if (error.message === 'Ticket not found or access denied') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Update ticket status
 * PUT /api/vendor/support/tickets/:id/status
 */
export const updateTicketStatusController = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const { id } = req.params;
    const { status } = req.body;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor authentication required',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const ticket = await updateVendorTicketStatus(id, vendorId, status);

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      data: { ticket },
    });
  } catch (error) {
    if (error.message === 'Ticket not found or access denied') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message === 'Vendor can only close tickets') {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

