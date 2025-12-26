import SupportTicket from '../models/SupportTicket.model.js';
import SupportMessage from '../models/SupportMessage.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import TicketType from '../models/TicketType.model.js';

/**
 * Get all tickets with filters and pagination
 * @param {Object} filters - { search, status, priority, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { tickets, total, page, totalPages }
 */
export const getAllTickets = async (filters = {}) => {
  try {
    const {
      search = '',
      status,
      priority,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Priority filter
    if (priority) {
      query.priority = priority;
    }

    // Search filter - search in ticket number, subject, or customer name
    if (search) {
      // First, find matching users/vendors by name
      const userMatches = await User.find({
        name: { $regex: search, $options: 'i' },
      }).select('_id');
      const vendorMatches = await Vendor.find({
        name: { $regex: search, $options: 'i' },
      }).select('_id');

      const userIds = userMatches.map((u) => u._id);
      const vendorIds = vendorMatches.map((v) => v._id);

      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { createdBy: { $in: [...userIds, ...vendorIds] } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with population
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate('type', 'name description')
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    // Transform tickets to include customerName
    const transformedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        let customerName = 'Unknown';
        if (ticket.createdBy) {
          customerName = ticket.createdBy.name || 'Unknown';
        }

        return {
          ...ticket,
          id: ticket._id,
          customerName,
          type: ticket.type?.name || 'Unknown',
          lastUpdate: ticket.lastMessageAt || ticket.updatedAt,
        };
      })
    );

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      tickets: transformedTickets,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get ticket by ID with messages
 * @param {String} ticketId - Ticket ID
 * @returns {Promise<Object>} Ticket object with messages
 */
export const getTicketById = async (ticketId) => {
  try {
    const ticket = await SupportTicket.findById(ticketId)
      .populate('type', 'name description')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean();

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Get messages
    const messages = await SupportMessage.find({ ticket: ticketId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    // Transform messages
    const transformedMessages = messages.map((msg) => ({
      id: msg._id,
      sender: msg.senderType,
      senderName: msg.sender?.name || 'Unknown',
      message: msg.message,
      time: msg.createdAt,
      isRead: msg.isRead,
    }));

    // Get customer name
    let customerName = 'Unknown';
    if (ticket.createdBy) {
      customerName = ticket.createdBy.name || 'Unknown';
    }

    return {
      ...ticket,
      id: ticket._id,
      customerName,
      type: ticket.type?.name || 'Unknown',
      messages: transformedMessages,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid ticket ID');
    }
    throw error;
  }
};

/**
 * Update ticket status
 * @param {String} ticketId - Ticket ID
 * @param {String} status - New status
 * @returns {Promise<Object>} Updated ticket
 */
export const updateTicketStatus = async (ticketId, status) => {
  try {
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { status },
      { new: true, runValidators: true }
    )
      .populate('type', 'name description')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean();

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid ticket ID');
    }
    throw error;
  }
};

/**
 * Assign ticket to admin
 * @param {String} ticketId - Ticket ID
 * @param {String} adminId - Admin ID
 * @returns {Promise<Object>} Updated ticket
 */
export const assignTicket = async (ticketId, adminId) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { assignedTo: adminId },
      { new: true, runValidators: true }
    )
      .populate('type', 'name description')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean();

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid ticket ID');
    }
    throw error;
  }
};

/**
 * Add message to ticket
 * @param {String} ticketId - Ticket ID
 * @param {Object} messageData - { sender, senderType, message }
 * @returns {Promise<Object>} Created message
 */
export const addMessageToTicket = async (ticketId, messageData) => {
  try {
    const { sender, senderType, message } = messageData;

    // Verify ticket exists
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Create message
    const supportMessage = await SupportMessage.create({
      ticket: ticketId,
      sender,
      senderType,
      message: message.trim(),
    });

    // Update ticket's lastMessageAt and add message reference
    ticket.lastMessageAt = new Date();
    ticket.messages.push(supportMessage._id);
    await ticket.save();

    // Populate and return
    const populatedMessage = await SupportMessage.findById(supportMessage._id)
      .populate('sender', 'name email')
      .lean();

    return {
      id: populatedMessage._id,
      sender: populatedMessage.senderType,
      senderName: populatedMessage.sender?.name || 'Unknown',
      message: populatedMessage.message,
      time: populatedMessage.createdAt,
      isRead: populatedMessage.isRead,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid ticket ID');
    }
    throw error;
  }
};

