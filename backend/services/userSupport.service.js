import SupportTicket from '../models/SupportTicket.model.js';
import SupportMessage from '../models/SupportMessage.model.js';
import TicketType from '../models/TicketType.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';

/**
 * Get user's tickets with filters and pagination
 * @param {String} userId - User ID
 * @param {Object} filters - { search, status, priority, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { tickets, total, page, totalPages }
 */
export const getUserTickets = async (userId, filters = {}) => {
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
            createdBy: userId,
            createdByType: 'user',
        };

        // Status filter
        if (status && status !== 'all') {
            query.status = status;
        }

        // Priority filter
        if (priority) {
            query.priority = priority;
        }

        // Search filter
        if (search) {
            query.$or = [
                { ticketNumber: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [tickets, total] = await Promise.all([
            SupportTicket.find(query)
                .populate('type', 'name description')
                .populate('relatedVendor', 'name storeName')
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            SupportTicket.countDocuments(query),
        ]);

        const transformedTickets = tickets.map((ticket) => {
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
                relatedVendor: ticket.relatedVendor,
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
 * Get user ticket by ID with messages
 * @param {String} ticketId - Ticket ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Ticket object with messages
 */
export const getUserTicketById = async (ticketId, userId) => {
    try {
        const ticket = await SupportTicket.findOne({
            _id: ticketId,
            createdBy: userId,
            createdByType: 'user',
        })
            .populate('type', 'name description')
            .populate('relatedVendor', 'name storeName')
            .lean();

        if (!ticket) {
            throw new Error('Ticket not found or access denied');
        }

        const messages = await SupportMessage.find({ ticket: ticketId })
            .sort({ createdAt: 1 })
            .lean();

        const populatedMessages = await Promise.all(
            messages.map(async (msg) => {
                if (msg.sender && msg.senderType) {
                    try {
                        let sender;
                        if (msg.senderType === 'vendor') {
                            sender = await Vendor.findById(msg.sender).select('name storeName').lean();
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

        const transformedMessages = populatedMessages.map((msg) => ({
            id: msg._id,
            sender: msg.senderType,
            senderName: msg.sender?.name || msg.sender?.storeName || 'Unknown',
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
            relatedVendor: ticket.relatedVendor,
            messages: transformedMessages,
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Create user support ticket
 * @param {String} userId - User ID
 * @param {Object} ticketData - { subject, type, priority, description, vendorId }
 * @returns {Promise<Object>} Created ticket
 */
export const createUserTicket = async (userId, ticketData) => {
    try {
        const { subject, type, priority, description, vendorId } = ticketData;

        let ticketTypeId;
        // Default strict type matching or creation not allowed for users usually, but keeping consistent
        if (typeof type === 'string') {
            let ticketType = await TicketType.findOne({
                name: { $regex: new RegExp(`^${type}$`, 'i') },
                status: 'active',
            });

            // If not found, use a default "General" type or error
            if (!ticketType) {
                // Create for now to ensure it works
                ticketType = await TicketType.create({
                    name: type,
                    description: `User ticket type: ${type}`,
                    status: 'active',
                });
            }
            ticketTypeId = ticketType._id;
        } else {
            ticketTypeId = type;
        }

        // Generate ticket number
        let ticketNumber;
        try {
            const count = await SupportTicket.countDocuments();
            const ticketNum = String(count + 1).padStart(6, '0');
            ticketNumber = `TKT-${ticketNum}`;

            const existing = await SupportTicket.findOne({ ticketNumber });
            if (existing) {
                const newCount = await SupportTicket.countDocuments();
                const newTicketNum = String(newCount + 1).padStart(6, '0');
                ticketNumber = `TKT-${newTicketNum}`;
            }
        } catch (error) {
            const timestamp = Date.now().toString().slice(-8);
            ticketNumber = `TKT-${timestamp}`;
        }

        const ticket = await SupportTicket.create({
            ticketNumber,
            createdBy: userId,
            createdByType: 'user',
            type: ticketTypeId,
            subject: subject.trim(),
            description: description.trim(),
            priority: priority || 'medium',
            status: 'open',
            relatedVendor: vendorId || null, // Link to vendor if provided
        });

        return ticket;
    } catch (error) {
        throw error;
    }
};

/**
 * Add user message to ticket
 * @param {String} ticketId
 * @param {String} userId
 * @param {String} message
 */
export const addUserMessageToTicket = async (ticketId, userId, message) => {
    try {
        const ticket = await SupportTicket.findOne({
            _id: ticketId,
            createdBy: userId,
            createdByType: 'user',
        });

        if (!ticket) {
            throw new Error('Ticket not found or access denied');
        }

        if (ticket.status === 'closed') {
            // creating a new message effectively re-opens it if needed, or error
            // ticket.status = 'open'; 
        }

        const supportMessage = await SupportMessage.create({
            ticket: ticketId,
            sender: userId,
            senderType: 'user',
            message: message.trim(),
        });

        ticket.lastMessageAt = new Date();
        ticket.messages.push(supportMessage._id);
        await ticket.save();

        return supportMessage;
    } catch (error) {
        throw error;
    }
};
