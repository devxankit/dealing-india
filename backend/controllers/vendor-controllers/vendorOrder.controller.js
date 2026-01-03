import {
  getVendorOrders,
  getOrderById,
  updateOrderStatus,
} from '../../services/order.service.js';
import { transformOrderWithVendorItems } from '../../services/vendorOrders.service.js';
import Order from '../../models/Order.model.js';
import Product from '../../models/Product.model.js';
import mongoose from 'mongoose';

/**
 * Get vendor orders
 * GET /api/vendor/orders
 */
export const getOrders = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { status, page, limit, search } = req.query;

    const filters = {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    };

    const result = await getVendorOrders(vendorId, filters);

    res.status(200).json({
      success: true,
      message: 'Vendor orders retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vendor order by ID (vendor-specific items only)
 * GET /api/vendor/orders/:orderId
 */
export const getOrder = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { orderId } = req.params;

    // Get order
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { orderCode: orderId };

    const order = await Order.findOne(query)
      .populate('customerId', 'name email phone')
      .populate('shippingAddress')
      .populate('items.productId', 'vendorId vendorName')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Verify order contains vendor's products
    const vendorProductIds = await Product.find({ vendorId, isActive: true })
      .select('_id')
      .lean();
    const vendorProductIdStrings = vendorProductIds.map((p) => p._id.toString());

    const hasVendorProducts = order.items.some((item) => {
      const productId = item.productId?._id?.toString() || item.productId?.toString();
      return vendorProductIdStrings.includes(productId);
    });

    if (!hasVendorProducts) {
      return res.status(403).json({
        success: false,
        message: 'Order does not contain your products',
      });
    }

    // Transform order to show only vendor-specific items
    const transformedOrder = await transformOrderWithVendorItems(order, vendorId);

    if (!transformedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this vendor',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor order retrieved successfully',
      data: {
        order: transformedOrder,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (vendor)
 * PUT /api/vendor/orders/:orderId/status
 */
export const updateStatus = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { orderId } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    // Verify order contains vendor's products
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { orderCode: orderId };

    const order = await Order.findOne(query).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const vendorProductIds = await Product.find({ vendorId, isActive: true })
      .select('_id')
      .lean();
    const vendorProductIdStrings = vendorProductIds.map((p) => p._id.toString());

    const hasVendorProducts = order.items.some((item) => {
      const productId = item.productId?.toString() || item.productId;
      return vendorProductIdStrings.includes(productId);
    });

    if (!hasVendorProducts) {
      return res.status(403).json({
        success: false,
        message: 'Order does not contain your products',
      });
    }

    // Get socket.io instance
    const io = req.app.get('io');

    // Update order status
    const updatedOrder = await updateOrderStatus(
      orderId,
      status,
      vendorId,
      'vendor',
      note,
      io
    );

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order: {
          id: updatedOrder._id,
          orderCode: updatedOrder.orderCode,
          status: updatedOrder.status,
        },
      },
    });
  } catch (error) {
    if (error.message.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Get vendor order statistics
 * GET /api/vendor/orders/stats
 */
export const getStats = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    // Get vendor's product IDs
    const vendorProductIds = await Product.find({ vendorId, isActive: true })
      .select('_id')
      .lean();
    const vendorProductIdStrings = vendorProductIds.map((p) => p._id.toString());

    if (vendorProductIdStrings.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Order statistics retrieved successfully',
        data: {
          total: 0,
          pending: 0,
          processing: 0,
          ready_to_ship: 0,
          dispatched: 0,
          shipped_seller: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          on_hold: 0,
        },
      });
    }

    // Convert string IDs to ObjectIds for aggregation
    const vendorProductObjectIds = vendorProductIdStrings.map(id => {
      try {
        return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
      } catch {
        return id;
      }
    });

    // Build aggregation pipeline
    const stats = await Order.aggregate([
      {
        $match: {
          'items.productId': { $in: vendorProductObjectIds },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Transform to object format
    const statsObject = {
      total: 0,
      pending: 0,
      processing: 0,
      ready_to_ship: 0,
      dispatched: 0,
      shipped_seller: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      on_hold: 0,
    };

    stats.forEach((stat) => {
      statsObject[stat._id] = stat.count;
      statsObject.total += stat.count;
    });

    res.status(200).json({
      success: true,
      message: 'Order statistics retrieved successfully',
      data: statsObject,
    });
  } catch (error) {
    next(error);
  }
};

