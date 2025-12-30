import {
  getAllTicketTypes,
  getTicketTypeById,
  createTicketType,
  updateTicketType,
  deleteTicketType,
} from '../../services/ticketType.service.js';

/**
 * Get all ticket types
 * GET /api/admin/support/ticket-types
 */
export const getTicketTypes = async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const ticketTypes = await getAllTicketTypes({ status, search });

    res.status(200).json({
      success: true,
      message: 'Ticket types retrieved successfully',
      data: { ticketTypes },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket type by ID
 * GET /api/admin/support/ticket-types/:id
 */
export const getTicketType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticketType = await getTicketTypeById(id);

    res.status(200).json({
      success: true,
      message: 'Ticket type retrieved successfully',
      data: { ticketType },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new ticket type
 * POST /api/admin/support/ticket-types
 */
export const create = async (req, res, next) => {
  try {
    const typeData = req.body;
    const ticketType = await createTicketType(typeData);

    res.status(201).json({
      success: true,
      message: 'Ticket type created successfully',
      data: { ticketType },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket type
 * PUT /api/admin/support/ticket-types/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const ticketType = await updateTicketType(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Ticket type updated successfully',
      data: { ticketType },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete ticket type
 * DELETE /api/admin/support/ticket-types/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteTicketType(id);

    res.status(200).json({
      success: true,
      message: 'Ticket type deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

