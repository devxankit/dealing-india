import SupportTicket from '../models/SupportTicket.model.js';
import mongoose from 'mongoose';
import SubscriptionService from './subscription.service.js';

class SupportTicketService {
  /**
   * Create a new support ticket
   */
  async createTicket(vendorId, ticketData) {
    try {
      // Auto-fetch subscriptionId if not provided and category is subscription-related
      let subscriptionId = null;
      
      if (ticketData.subscriptionId) {
        // Validate provided subscriptionId
        if (mongoose.Types.ObjectId.isValid(ticketData.subscriptionId)) {
          subscriptionId = new mongoose.Types.ObjectId(ticketData.subscriptionId);
        } else {
          console.warn(`Invalid subscriptionId provided: ${ticketData.subscriptionId}, will auto-fetch`);
        }
      }
      
      // If subscriptionId is still null and category is subscription-related, auto-fetch
      if (!subscriptionId && (ticketData.category === 'subscription' || ticketData.category === 'billing' || ticketData.category === 'payment')) {
        try {
          const subscription = await SubscriptionService.getVendorSubscription(vendorId);
          if (subscription && subscription._id) {
            subscriptionId = subscription._id;
            console.log(`Auto-fetched subscriptionId: ${subscriptionId} for vendor ${vendorId}`);
          }
        } catch (error) {
          console.warn(`Failed to auto-fetch subscriptionId:`, error.message);
          // Continue without subscriptionId - it's optional
        }
      }

      // Generate ticket number before creating (to ensure it's set)
      const year = new Date().getFullYear();
      const count = await SupportTicket.countDocuments({
        ticketNumber: new RegExp(`^TKT-${year}-`)
      });
      const ticketNumber = `TKT-${year}-${String(count + 1).padStart(4, '0')}`;

      const ticket = await SupportTicket.create({
        ticketNumber, // Set ticketNumber explicitly to avoid pre-save hook issues
        vendorId,
        subject: ticketData.subject,
        description: ticketData.description,
        category: ticketData.category || 'subscription',
        issueType: ticketData.issueType || 'other',
        priority: ticketData.priority || 'medium',
        subscriptionId,
        transactionId: ticketData.transactionId || null,
        amount: ticketData.amount || null,
        statusHistory: [{
          status: 'open',
          changedBy: vendorId,
          changedByModel: 'Vendor',
          changedByRole: 'vendor',
          note: 'Ticket created',
        }],
        metadata: ticketData.metadata || {},
      });

      return await SupportTicket.findById(ticket._id)
        .populate('vendorId', 'businessName storeName email')
        .populate('subscriptionId')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get tickets for a vendor
   */
  async getVendorTickets(vendorId, filters = {}) {
    try {
      const { status, category, priority } = filters;
      
      const query = { vendorId };
      
      if (status && status !== 'all') {
        query.status = status;
      }
      
      if (category) {
        query.category = category;
      }
      
      if (priority) {
        query.priority = priority;
      }

      const tickets = await SupportTicket.find(query)
        .populate('vendorId', 'businessName storeName email')
        .populate('subscriptionId')
        .populate('respondedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      return tickets;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single ticket by ID
   */
  async getTicketById(ticketId, vendorId = null) {
    try {
      const query = { _id: ticketId };
      
      // If vendorId provided, ensure ticket belongs to vendor
      if (vendorId) {
        query.vendorId = vendorId;
      }

      const ticket = await SupportTicket.findOne(query)
        .populate('vendorId', 'businessName storeName email phone')
        .populate('subscriptionId')
        .populate('respondedBy', 'name email')
        .populate('statusHistory.changedBy', 'name email businessName storeName')
        .lean();

      return ticket;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update ticket status (vendor or admin)
   */
  async updateTicketStatus(ticketId, newStatus, changedBy, changedByRole, note = '') {
    try {
      const ticket = await SupportTicket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const changedByModel = changedByRole === 'admin' ? 'Admin' : 'Vendor';

      ticket.status = newStatus;
      ticket.statusHistory.push({
        status: newStatus,
        changedBy,
        changedByModel,
        changedByRole,
        note,
      });

      await ticket.save();

      return await SupportTicket.findById(ticketId)
        .populate('vendorId', 'businessName storeName email')
        .populate('subscriptionId')
        .populate('respondedBy', 'name email')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin responds to ticket
   */
  async respondToTicket(ticketId, adminId, response, status = 'in_progress') {
    try {
      const ticket = await SupportTicket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      ticket.adminResponse = response;
      ticket.respondedBy = adminId;
      ticket.respondedAt = new Date();
      ticket.status = status;

      ticket.statusHistory.push({
        status: status,
        changedBy: adminId,
        changedByModel: 'Admin',
        changedByRole: 'admin',
        note: 'Admin responded',
      });

      await ticket.save();

      return await SupportTicket.findById(ticketId)
        .populate('vendorId', 'businessName storeName email')
        .populate('subscriptionId')
        .populate('respondedBy', 'name email')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all tickets (admin)
   */
  async getAllTickets(filters = {}) {
    try {
      const { status, category, priority, vendorId } = filters;
      
      const query = {};
      
      if (status && status !== 'all') {
        query.status = status;
      }
      
      if (category) {
        query.category = category;
      }
      
      if (priority) {
        query.priority = priority;
      }

      if (vendorId) {
        query.vendorId = vendorId;
      }

      const tickets = await SupportTicket.find(query)
        .populate('vendorId', 'businessName storeName email')
        .populate('subscriptionId')
        .populate('respondedBy', 'name email')
        .sort({ priority: -1, createdAt: -1 })
        .lean();

      return tickets;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats(vendorId = null) {
    try {
      const query = vendorId ? { vendorId } : {};

      const stats = await SupportTicket.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const priorityStats = await SupportTicket.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 },
          },
        },
      ]);

      return {
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        byPriority: priorityStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        total: await SupportTicket.countDocuments(query),
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new SupportTicketService();

