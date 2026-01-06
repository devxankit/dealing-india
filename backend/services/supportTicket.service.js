import SupportTicket from '../models/SupportTicket.model.js';
import TicketMessage from '../models/TicketMessage.model.js';
import mongoose from 'mongoose';
import SubscriptionService from './subscription.service.js';

class SupportTicketService {
  /**
   * Create a new support ticket (vendor)
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
        createdByRole: 'vendor',
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
   * Create a new support ticket (user)
   */
  async createUserTicket(userId, ticketData) {
    try {
      // Generate ticket number before creating
      const year = new Date().getFullYear();
      const count = await SupportTicket.countDocuments({
        ticketNumber: new RegExp(`^TKT-${year}-`)
      });
      const ticketNumber = `TKT-${year}-${String(count + 1).padStart(4, '0')}`;

      // Ensure userId is ObjectId
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;

      const ticket = await SupportTicket.create({
        ticketNumber,
        createdByRole: 'user',
        userId: userIdObj,
        subject: ticketData.subject,
        description: ticketData.description,
        category: ticketData.category || 'other',
        issueType: ticketData.issueType || 'other',
        priority: ticketData.priority || 'medium',
        status: 'open', // Explicitly set status
        statusHistory: [{
          status: 'open',
          changedBy: userIdObj,
          changedByModel: 'User',
          changedByRole: 'user',
          note: 'Ticket created',
        }],
        metadata: ticketData.metadata || {},
      });

      const savedTicket = await SupportTicket.findById(ticket._id)
        .populate('userId', 'name email')
        .lean();

      // Note: Admin notification would be broadcasted or sent to all admins
      // For now, we'll skip admin notification on user ticket creation
      // Admin can see new tickets in their dashboard

      return savedTicket;
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
      
      const query = { vendorId, createdByRole: 'vendor' };
      
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
  async getTicketById(ticketId, userId = null, userRole = null) {
    try {
      const query = { _id: ticketId };
      
      // If userId and userRole provided, ensure ticket belongs to user/vendor
      if (userId && userRole) {
        if (userRole === 'vendor') {
          query.vendorId = userId;
          query.createdByRole = 'vendor';
        } else if (userRole === 'user') {
          query.userId = userId;
          query.createdByRole = 'user';
        }
      }

      const ticket = await SupportTicket.findOne(query)
        .populate('vendorId', 'businessName storeName email phone')
        .populate('userId', 'name email phone')
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
   * Get tickets for a user
   */
  async getUserTickets(userId, filters = {}) {
    try {
      const { status, category, priority } = filters;
      
      // Ensure userId is converted to ObjectId for proper querying
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      const query = { userId: userIdObj, createdByRole: 'user' };
      
      console.log('getUserTickets query:', JSON.stringify(query, null, 2));
      
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
        .populate('userId', 'name email')
        .populate('respondedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      console.log(`Found ${tickets.length} tickets for user ${userId}`);
      
      return tickets;
    } catch (error) {
      console.error('Error in getUserTickets:', error);
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

      const changedByModel = changedByRole === 'admin' ? 'Admin' : changedByRole === 'user' ? 'User' : 'Vendor';

      ticket.status = newStatus;
      ticket.statusHistory.push({
        status: newStatus,
        changedBy,
        changedByModel,
        changedByRole,
        note,
      });

      await ticket.save();

      const updatedTicket = await SupportTicket.findById(ticketId)
        .populate('vendorId', 'businessName storeName email')
        .populate('userId', 'name email')
        .populate('subscriptionId')
        .populate('respondedBy', 'name email')
        .lean();

      // Create notification for ticket creator
      const recipientId = updatedTicket.userId?._id || updatedTicket.userId || updatedTicket.vendorId?._id || updatedTicket.vendorId;
      const recipientType = updatedTicket.createdByRole;
      if (recipientId && recipientType) {
        try {
          await notificationService.createNotification({
            recipientId,
            recipientType,
            type: 'ticket_status_changed',
            title: 'Ticket status updated',
            message: `Your ticket "${updatedTicket.subject}" status changed to ${newStatus}`,
            actionUrl: recipientType === 'user' 
              ? `/app/support-tickets/${ticketId}` 
              : `/vendor/support-tickets/${ticketId}`,
            metadata: {
              ticketId: ticketId.toString(),
              ticketNumber: updatedTicket.ticketNumber,
              status: newStatus,
            },
          });
        } catch (notifError) {
          console.error('Failed to create status change notification:', notifError);
        }
      }

      return updatedTicket;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add message/reply to ticket
   */
  async addTicketMessage(ticketId, senderId, senderRole, message, attachments = []) {
    try {
      const ticket = await SupportTicket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const senderRoleModel = senderRole === 'admin' ? 'Admin' : senderRole === 'user' ? 'User' : 'Vendor';

      const ticketMessage = await TicketMessage.create({
        ticketId,
        senderId,
        senderRole,
        senderRoleModel,
        message,
        attachments,
      });

      const savedMessage = await TicketMessage.findById(ticketMessage._id)
        .populate('senderId', 'name email businessName storeName')
        .lean();

      // Get ticket to determine recipient (ticket already fetched above)
      const ticketData = await SupportTicket.findById(ticketId).lean();
      if (ticketData) {
        // Determine recipient based on sender
        let recipientId, recipientType;
        if (senderRole === 'admin') {
          // Admin replied, notify ticket creator
          recipientId = ticketData.userId?._id || ticketData.userId || ticketData.vendorId?._id || ticketData.vendorId;
          recipientType = ticketData.createdByRole;
        } else {
          // User/vendor sent message, notify admin (would need admin ID or broadcast)
          // For now, skip admin notification - they can see updates in dashboard
          recipientId = null;
        }

        if (recipientId && recipientType) {
          try {
            await notificationService.createNotification({
              recipientId,
              recipientType,
              type: 'ticket_replied',
              title: 'New reply on your ticket',
              message: `Your ticket "${ticketData.subject}" has a new reply`,
              actionUrl: recipientType === 'user' 
                ? `/app/support-tickets/${ticketId}` 
                : `/vendor/support-tickets/${ticketId}`,
              metadata: {
                ticketId: ticketId.toString(),
                ticketNumber: ticketData.ticketNumber,
                messageId: savedMessage._id.toString(),
              },
            });
          } catch (notifError) {
            console.error('Failed to create ticket reply notification:', notifError);
          }
        }
      }

      return savedMessage;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get ticket messages
   */
  async getTicketMessages(ticketId) {
    try {
      const messages = await TicketMessage.find({ ticketId })
        .populate('senderId', 'name email businessName storeName')
        .sort({ createdAt: 1 })
        .lean();

      return messages;
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
        .populate('userId', 'name email')
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
      const { status, category, priority, vendorId, userId, createdByRole } = filters;
      
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

      if (userId) {
        query.userId = userId;
      }

      if (createdByRole) {
        query.createdByRole = createdByRole;
      }

      const tickets = await SupportTicket.find(query)
        .populate('vendorId', 'businessName storeName email')
        .populate('userId', 'name email')
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

