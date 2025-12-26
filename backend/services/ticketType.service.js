import TicketType from '../models/TicketType.model.js';

/**
 * Get all ticket types
 * @param {Object} filters - { status, search }
 * @returns {Promise<Array>} Array of ticket types
 */
export const getAllTicketTypes = async (filters = {}) => {
  try {
    const { status, search = '' } = filters;

    const query = {};

    // Status filter
    if (status) {
      query.status = status;
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const ticketTypes = await TicketType.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return ticketTypes;
  } catch (error) {
    throw error;
  }
};

/**
 * Get ticket type by ID
 * @param {String} typeId - Ticket type ID
 * @returns {Promise<Object>} Ticket type object
 */
export const getTicketTypeById = async (typeId) => {
  try {
    const ticketType = await TicketType.findById(typeId).lean();
    if (!ticketType) {
      throw new Error('Ticket type not found');
    }
    return ticketType;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid ticket type ID');
    }
    throw error;
  }
};

/**
 * Create a new ticket type
 * @param {Object} typeData - { name, description, status }
 * @returns {Promise<Object>} Created ticket type
 */
export const createTicketType = async (typeData) => {
  try {
    const { name, description, status } = typeData;

    if (!name || !name.trim()) {
      throw new Error('Ticket type name is required');
    }

    // Check if ticket type already exists
    const existingType = await TicketType.findOne({
      name: name.trim(),
    });

    if (existingType) {
      throw new Error('Ticket type with this name already exists');
    }

    const ticketType = await TicketType.create({
      name: name.trim(),
      description: description || '',
      status: status || 'active',
    });

    return ticketType.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Ticket type with this name already exists');
    }
    throw error;
  }
};

/**
 * Update ticket type
 * @param {String} typeId - Ticket type ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated ticket type
 */
export const updateTicketType = async (typeId, updateData) => {
  try {
    const { name, description, status } = updateData;

    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (description !== undefined) updateObj.description = description || '';
    if (status !== undefined) updateObj.status = status;

    // Check if name is being updated and if it conflicts
    if (name) {
      const existingType = await TicketType.findOne({
        name: name.trim(),
        _id: { $ne: typeId },
      });

      if (existingType) {
        throw new Error('Ticket type with this name already exists');
      }
    }

    const ticketType = await TicketType.findByIdAndUpdate(
      typeId,
      updateObj,
      { new: true, runValidators: true }
    ).lean();

    if (!ticketType) {
      throw new Error('Ticket type not found');
    }

    return ticketType;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid ticket type ID');
    }
    if (error.code === 11000) {
      throw new Error('Ticket type with this name already exists');
    }
    throw error;
  }
};

/**
 * Delete ticket type
 * @param {String} typeId - Ticket type ID
 * @returns {Promise<Object>} Deleted ticket type
 */
export const deleteTicketType = async (typeId) => {
  try {
    const ticketType = await TicketType.findByIdAndDelete(typeId).lean();

    if (!ticketType) {
      throw new Error('Ticket type not found');
    }

    return ticketType;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid ticket type ID');
    }
    throw error;
  }
};

