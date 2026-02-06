import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import mongoose from 'mongoose';

/**
 * Get all orders for a vendor with transformations
 * @param {String} vendorId 
 */
export const getAllVendorOrdersTransformed = async (vendorId) => {
    const vId = new mongoose.Types.ObjectId(vendorId);

    const orders = await Order.find({
        'vendorBreakdown.vendorId': vId
    }).populate('customerId', 'name email phone avatar').sort({ orderDate: -1 }).lean();

    return orders.map(order => {
        const vendorItems = order.vendorBreakdown.find(vb => vb.vendorId.toString() === vId.toString());
        return {
            ...order,
            vendorEarnings: vendorItems?.subtotal - (vendorItems?.commission || 0),
            customer: order.customerId || order.customerSnapshot
        };
    });
};

/**
 * Get vendor order stats
 * @param {String} vendorId 
 */
export const getVendorOrderStats = async (vendorId) => {
    const vId = new mongoose.Types.ObjectId(vendorId);

    const stats = await Order.aggregate([
        { $match: { 'vendorBreakdown.vendorId': vId } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                revenue: {
                    $sum: {
                        $reduce: {
                            input: '$vendorBreakdown',
                            initialValue: 0,
                            in: {
                                $cond: [
                                    { $eq: ['$$this.vendorId', vId] },
                                    { $add: ['$$value', '$$this.subtotal'] },
                                    '$$value'
                                ]
                            }
                        }
                    }
                }
            }
        }
    ]);

    return stats;
};
