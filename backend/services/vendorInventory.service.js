import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import mongoose from 'mongoose';

/**
 * Get vendor inventory report
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} { inventory, stats }
 */
export const getVendorInventoryReport = async (vendorId) => {
  try {
    // Ensure vendorId is an ObjectId
    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    // Get all vendor products (including inactive ones for full inventory history)
    const products = await Product.find({ vendorId: vendorObjectId })
      .select('_id name price stockQuantity isActive')
      .lean();

    if (products.length === 0) {
      return {
        inventory: [],
        stats: {
          totalProducts: 0,
          totalStockValue: 0,
          totalSold: 0,
          lowStockItems: 0,
        },
      };
    }

    const productIds = products.map((p) => p._id);

    // Get all orders containing vendor's products (excluding cancelled and refunded)
    const orders = await Order.find({
      'items.productId': { $in: productIds },
      status: { $nin: ['cancelled', 'refunded'] },
    })
      .select('items status')
      .lean();

    // Calculate units sold per product
    const soldMap = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.productId?.toString();
        if (productIds.some((id) => id.toString() === productId)) {
          if (!soldMap[productId]) {
            soldMap[productId] = 0;
          }
          soldMap[productId] += item.quantity || 1;
        }
      });
    });

    // Build inventory data
    const inventory = products.map((product) => {
      const productId = product._id.toString();
      const currentStock = product.stockQuantity || 0;
      const price = product.price || 0;
      const stockValue = currentStock * price;
      const sold = soldMap[productId] || 0;

      return {
        id: productId,
        name: product.name,
        currentStock,
        price,
        stockValue,
        sold,
      };
    });

    // Calculate stats
    const totalProducts = inventory.length;
    const totalStockValue = inventory.reduce((sum, p) => sum + p.stockValue, 0);
    const totalSold = inventory.reduce((sum, p) => sum + p.sold, 0);
    const lowStockItems = inventory.filter((p) => p.currentStock < 10).length;

    return {
      inventory,
      stats: {
        totalProducts,
        totalStockValue,
        totalSold,
        lowStockItems,
      },
    };
  } catch (error) {
    throw error;
  }
};

