import SupportTicket from '../models/SupportTicket.model.js';
import SupportMessage from '../models/SupportMessage.model.js';
import TicketType from '../models/TicketType.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';

/**
 * Get vendor's tickets with filters and pagination
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { search, status, priority, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { tickets, total, page, totalPages }
 */
export const getVendorTickets = async (vendorId, filters = {}) => {
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

    const query = {
      createdBy: vendorId,
      createdByType: 'vendor',
    };

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Priority filter
    if (priority) {
      query.priority = priority;
    }

    // Search filter - search in ticket number or subject
    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
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
        .populate('assignedTo', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    // Transform tickets to match frontend expectations
    const transformedTickets = tickets.map((ticket) => {
      // Get last message for preview
      const lastMessage = ticket.lastMessageAt ? 'Last message' : 'No messages yet';

      return {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        type: ticket.type?.name || 'Unknown',
        priority: ticket.priority,
        status: ticket.status,
        description: ticket.description,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        lastMessageAt: ticket.lastMessageAt,
        assignedTo: ticket.assignedTo,
      };
    });

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
 * Get vendor ticket by ID with messages (with ownership verification)
 * @param {String} ticketId - Ticket ID
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Ticket object with messages
 */
export const getVendorTicketById = async (ticketId, vendorId) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      createdBy: vendorId,
      createdByType: 'vendor',
    })
      .populate('type', 'name description')
      .populate('assignedTo', 'name email')
      .lean();

    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    // Get messages
    const messages = await SupportMessage.find({ ticket: ticketId })
      .sort({ createdAt: 1 })
      .lean();

    // Manually populate sender based on senderType
    const populatedMessages = await Promise.all(
      messages.map(async (msg) => {
        if (msg.sender && msg.senderType) {
          try {
            let sender;
            if (msg.senderType === 'vendor') {
              sender = await Vendor.findById(msg.sender).select('name email').lean();
            } else if (msg.senderType === 'user') {
              sender = await User.findById(msg.sender).select('name email').lean();
            } else if (msg.senderType === 'admin') {
              sender = await Admin.findById(msg.sender).select('name email').lean();
            }
            msg.sender = sender || null;
          } catch (error) {
            msg.sender = null;
          }
        }
        return msg;
      })
    );

    // Transform messages to match frontend expectations
    const transformedMessages = populatedMessages.map((msg) => ({
      id: msg._id,
      sender: msg.senderType, // 'vendor', 'admin', or 'user'
      senderName: msg.sender?.name || 'Unknown',
      message: msg.message,
      time: msg.createdAt,
      isRead: msg.isRead,
    }));

    return {
      id: ticket._id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      type: ticket.type?.name || 'Unknown',
      priority: ticket.priority,
      status: ticket.status,
      description: ticket.description,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      lastMessageAt: ticket.lastMessageAt,
      assignedTo: ticket.assignedTo,
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
 * Create vendor support ticket
 * @param {String} vendorId - Vendor ID
 * @param {Object} ticketData - { subject, type, priority, description }
 * @returns {Promise<Object>} Created ticket
 */
export const createVendorTicket = async (vendorId, ticketData) => {
  try {
    const { subject, type, priority, description } = ticketData;

    // Handle ticket type - frontend sends string, backend expects ObjectId
    let ticketTypeId;
    if (typeof type === 'string') {
      // Find or create ticket type by name
      let ticketType = await TicketType.findOne({
        name: { $regex: new RegExp(`^${type}$`, 'i') },
        status: 'active',
      });

      if (!ticketType) {
        // Create new ticket type if it doesn't exist
        ticketType = await TicketType.create({
          name: type,
          description: `Support ticket type: ${type}`,
          status: 'active',
        });
      }

      ticketTypeId = ticketType._id;
    } else {
      // Already an ObjectId
      ticketTypeId = type;
    }

    // Generate ticket number before creating (fallback if pre-save hook fails)
    let ticketNumber;
    try {
      const count = await SupportTicket.countDocuments();
      const ticketNum = String(count + 1).padStart(6, '0');
      ticketNumber = `TKT-${ticketNum}`;
      
      // Check if ticket number already exists (handle race condition)
      const existing = await SupportTicket.findOne({ ticketNumber });
      if (existing) {
        // If duplicate, generate new number
        const newCount = await SupportTicket.countDocuments();
        const newTicketNum = String(newCount + 1).padStart(6, '0');
        ticketNumber = `TKT-${newTicketNum}`;
      }
    } catch (error) {
      // If count fails, use timestamp-based fallback
      const timestamp = Date.now().toString().slice(-8);
      ticketNumber = `TKT-${timestamp}`;
    }

    // Create ticket
    const ticket = await SupportTicket.create({
      ticketNumber, // Explicitly set ticket number
      createdBy: vendorId,
      createdByType: 'vendor',
      type: ticketTypeId,
      subject: subject.trim(),
      description: description.trim(),
      priority: priority || 'medium',
      status: 'open',
    });

    // Populate and return
    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('type', 'name description')
      .populate('assignedTo', 'name email')
      .lean();

    return {
      id: populatedTicket._id,
      ticketNumber: populatedTicket.ticketNumber,
      subject: populatedTicket.subject,
      type: populatedTicket.type?.name || 'Unknown',
      priority: populatedTicket.priority,
      status: populatedTicket.status,
      description: populatedTicket.description,
      createdAt: populatedTicket.createdAt,
      updatedAt: populatedTicket.updatedAt,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Add vendor message to ticket (with ownership verification)
 * @param {String} ticketId - Ticket ID
 * @param {String} vendorId - Vendor ID
 * @param {String} message - Message text
 * @returns {Promise<Object>} Created message
 */
export const addVendorMessageToTicket = async (ticketId, vendorId, message) => {
  try {
    // Verify ticket exists and belongs to vendor
    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      createdBy: vendorId,
      createdByType: 'vendor',
    });

    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    // Create message
    const supportMessage = await SupportMessage.create({
      ticket: ticketId,
      sender: vendorId,
      senderType: 'vendor',
      message: message.trim(),
    });

    // Update ticket's lastMessageAt and add message reference
    ticket.lastMessageAt = new Date();
    ticket.messages.push(supportMessage._id);
    await ticket.save();

    // Manually populate sender based on senderType
    let populatedMessage = await SupportMessage.findById(supportMessage._id).lean();
    if (populatedMessage.sender && populatedMessage.senderType) {
      try {
        let sender;
        if (populatedMessage.senderType === 'vendor') {
          sender = await Vendor.findById(populatedMessage.sender).select('name email').lean();
        } else if (populatedMessage.senderType === 'user') {
          sender = await User.findById(populatedMessage.sender).select('name email').lean();
        } else if (populatedMessage.senderType === 'admin') {
          sender = await Admin.findById(populatedMessage.sender).select('name email').lean();
        }
        populatedMessage.sender = sender || null;
      } catch (error) {
        populatedMessage.sender = null;
      }
    }

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

/**
 * Update vendor ticket status (vendor can only close their own tickets)
 * @param {String} ticketId - Ticket ID
 * @param {String} vendorId - Vendor ID
 * @param {String} status - New status
 * @returns {Promise<Object>} Updated ticket
 */
export const updateVendorTicketStatus = async (ticketId, vendorId, status) => {
  try {
    // Verify ticket belongs to vendor
    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      createdBy: vendorId,
      createdByType: 'vendor',
    });

    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    // Vendor can only close their own tickets, not set other statuses
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    // Vendor can only close tickets, admin controls other statuses
    if (status !== 'closed' && ticket.status !== 'open') {
      throw new Error('Vendor can only close tickets');
    }

    // Update status
    ticket.status = status;
    await ticket.save();

    // Populate and return
    const updatedTicket = await SupportTicket.findById(ticket._id)
      .populate('type', 'name description')
      .populate('assignedTo', 'name email')
      .lean();

    return {
      id: updatedTicket._id,
      ticketNumber: updatedTicket.ticketNumber,
      subject: updatedTicket.subject,
      type: updatedTicket.type?.name || 'Unknown',
      priority: updatedTicket.priority,
      status: updatedTicket.status,
      description: updatedTicket.description,
      createdAt: updatedTicket.createdAt,
      updatedAt: updatedTicket.updatedAt,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid ticket ID');
    }
    throw error;
  }
};

