import {
  getVendorOrders,
  getOrderById,
  updateOrderStatus,
} from '../../services/order.service.js';
import { transformOrderWithVendorItems } from '../../services/vendorOrders.service.js';
import Order from '../../models/Order.model.js';
import Product from '../../models/Product.model.js';
import Vendor from '../../models/Vendor.model.js';
import VendorWalletTransaction from '../../models/VendorWalletTransaction.model.js';
import mongoose from 'mongoose';

/**
 * Get vendor orders
 * GET /api/vendor/orders
 */
export const getOrders = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { status, page, limit, search, paymentMethod } = req.query;

    const filters = {
      status,
      paymentMethod,
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
    const vendorProductIds = await Product.find({ vendorId })
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

    console.log('Vendor updating status:', { orderId, status, vendorId });

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

    const vendorProductIds = await Product.find({ vendorId })
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
    console.error('Error in vendor updateStatus:', error);
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
    const vendorProductIds = await Product.find({ vendorId })
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

    // Build aggregation pipeline for status
    const matchStage = {
      $or: [
        { 'vendorBreakdown.vendorId': new mongoose.Types.ObjectId(vendorId.toString()) },
        { 'items.productId': { $in: vendorProductObjectIds } }
      ]
    };

    const statusStats = await Order.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Aggregate for payment methods
    const paymentStats = await Order.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: '$paymentMethod',
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
      prepaid: 0,
      cod: 0,
    };

    statusStats.forEach((stat) => {
      statsObject[stat._id] = stat.count;
      statsObject.total += stat.count;
    });

    paymentStats.forEach((stat) => {
      if (stat._id === 'cod' || stat._id === 'cash') {
        statsObject.cod += stat.count;
      } else {
        statsObject.prepaid += stat.count;
      }
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

/**
 * Get vendor earnings statistics (Pending vs Realized from Orders)
 * GET /api/vendor/orders/earnings
 */
export const getEarningsStats = async (req, res, next) => {
  try {
    const rawVendorId = req.user.vendorId || req.user.id;
    let vendorId;
    try {
      vendorId = new mongoose.Types.ObjectId(rawVendorId);
    } catch (err) {
      // If conversion fails, maybe it's already an objectId or invalid string
      vendorId = rawVendorId;
    }

    // Get vendor details for default commission rate
    const vendor = await Vendor.findById(vendorId);
    const defaultCommissionRate = vendor?.commissionRate || 0.1;

    // Get vendor products IDs to match items
    const vendorProducts = await Product.find({ vendorId }).select('_id').lean();
    const vendorProductObjectIds = vendorProducts.map(p => p._id);

    // If no products, return 0
    // (Unless vendor has orders via vendorBreakdown even without products now?)
    // But usually vendor needs products.
    // Let's proceed even if 0 products if there are breakdown entries.

    const pipeline = [
      {
        $match: {
          $or: [
            { 'vendorBreakdown.vendorId': vendorId },
            { 'items.productId': { $in: vendorProductObjectIds } }
          ],
          status: { $nin: ['cancelled', 'returned', 'refunded'] }
        }
      },
      {
        $project: {
          orderCode: 1,
          status: 1,
          items: 1,
          vendorBreakdown: 1,
          createdAt: 1
        }
      },
      // We need to calculate earnings per order
      {
        $addFields: {
          // Check if we have a direct breakdown entry
          breakdownEntry: {
            $filter: {
              input: { $ifNull: ["$vendorBreakdown", []] },
              as: "vb",
              cond: { $eq: ["$$vb.vendorId", vendorId] }
            }
          }
        }
      },
      {
        $addFields: {
          matchedBreakdown: { $arrayElemAt: ["$breakdownEntry", 0] }
        }
      },
      // Calculate from items if no breakdown
      {
        $addFields: {
          calculatedFromItems: {
            $reduce: {
              input: "$items",
              initialValue: { subtotal: 0, count: 0 },
              in: {
                $cond: {
                  if: { $in: ["$$this.productId", vendorProductObjectIds] },
                  then: {
                    subtotal: { $add: ["$$value.subtotal", { $multiply: [{ $ifNull: ["$$this.price", 0] }, { $ifNull: ["$$this.quantity", 1] }] }] },
                    count: { $add: ["$$value.count", 1] }
                  },
                  else: "$$value"
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          finalSubtotal: {
            $cond: {
              if: { $gt: [{ $ifNull: ["$matchedBreakdown.subtotal", 0] }, 0] },
              then: "$matchedBreakdown.subtotal",
              else: "$calculatedFromItems.subtotal"
            }
          },
          finalCommission: {
            $cond: {
              if: { $gt: [{ $ifNull: ["$matchedBreakdown.commission", -1] }, -1] },
              then: "$matchedBreakdown.commission",
              else: { $multiply: ["$calculatedFromItems.subtotal", defaultCommissionRate] }
            }
          },
          isVendorOrder: {
            $or: [
              { $gt: [{ $ifNull: ["$matchedBreakdown.subtotal", 0] }, 0] },
              { $gt: ["$calculatedFromItems.count", 0] }
            ]
          }
        }
      },
      {
        $match: {
          isVendorOrder: true
        }
      },
      {
        $addFields: {
          earnings: { $subtract: ["$finalSubtotal", "$finalCommission"] }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalOrderEarnings: { $sum: "$earnings" },
          pendingEarnings: {
            $sum: {
              $cond: {
                if: { $in: ["$status", ['delivered', 'completed']] },
                then: 0,
                else: "$earnings"
              }
            }
          }
        }
      }
    ];

    const result = await Order.aggregate(pipeline);
    const stats = result[0] || { totalOrders: 0, totalOrderEarnings: 0, pendingEarnings: 0 };

    // Calculate delivered earnings (earnings from delivered/completed orders)
    const deliveredEarnings = stats.totalOrderEarnings - stats.pendingEarnings;

    // Get total paid amount from approved withdrawals
    const withdrawals = await VendorWalletTransaction.find({
      vendorId: vendorId,
      transactionType: 'withdrawal',
      status: 'approved'
    }).lean();

    const paidEarnings = withdrawals.reduce((sum, w) => sum + w.amount, 0);

    // Outstanding is delivered but not yet paid
    const outstandingAmount = deliveredEarnings - paidEarnings;

    // Log the result to console for debugging
    console.log(`[Earnings Aggregation] Vendor: ${vendorId}, Found Orders:`, stats);
    console.log(`[Earnings Details] Delivered: ${deliveredEarnings}, Paid: ${paidEarnings}, Outstanding: ${outstandingAmount}`);

    res.status(200).json({
      success: true,
      data: {
        pendingEarnings: Math.round(stats.pendingEarnings * 100) / 100,
        totalOrderEarnings: Math.round(stats.totalOrderEarnings * 100) / 100,
        deliveredEarnings: Math.round(deliveredEarnings * 100) / 100,
        paidEarnings: Math.round(paidEarnings * 100) / 100,
        outstandingAmount: Math.round(outstandingAmount * 100) / 100,
        totalOrders: stats.totalOrders
      }
    });

  } catch (error) {
    console.error('Error fetching earnings stats:', error);
    next(error);
  }
};

